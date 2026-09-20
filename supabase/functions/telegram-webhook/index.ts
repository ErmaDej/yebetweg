// ============================================================================
// telegram-webhook — YeBetWeg supplier price funnel
// ============================================================================
// Telegram bot commands (set webhook once):
//   supabase functions deploy telegram-webhook --no-verify-jwt
//   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
//     -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook" \
//     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
//
// Commands:
//   /submitprice <material> <price> [unit] [city] [category]
//     e.g. /submitprice Derba Cement 8200 Qtl "Addis Ababa" cement
//     Feeds market_prices (source_type=telegram_observed, confidence<=75,
//     freshness=community_reported — pending admin verification).
//   /watch            — weekly Cement & Rebar Watch (top 3 movers)
//   /start /help      — usage
//
// Secrets:
//   TELEGRAM_BOT_TOKEN        (required — bot token from @BotFather)
//   TELEGRAM_WEBHOOK_SECRET   (recommended — setWebhook secret_token)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

const MATERIAL_MAX = 120;
const MAX_SUBMISSIONS_PER_HOUR = 10;

// ---- per-chat rate limiting (in-memory; resets on isolate recycle) ----------
const RATE_KEY = "yebetweg-tg-rate";
const rateStore: Record<string, number[]> =
  ((globalThis as Record<string, unknown>)[RATE_KEY] as Record<string, number[]>) ??
  {};
(globalThis as Record<string, unknown>)[RATE_KEY] = rateStore;

function rateLimited(chatId: number): boolean {
  const now = Date.now();
  const window = (rateStore[chatId] ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (window.length >= MAX_SUBMISSIONS_PER_HOUR) {
    rateStore[chatId] = window;
    return true;
  }
  window.push(now);
  rateStore[chatId] = window;
  return false;
}

// ---- Telegram API -----------------------------------------------------------
async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).then((r) => r.text());
}

// ---- parsing ----------------------------------------------------------------
interface ParsedSubmission {
  material: string;
  price: number;
  unit?: string;
  city?: string;
  category?: string;
}

/**
 * Grammar: /submitprice <material words…> <price> [unit] [city] [category]
 * The material is every token before the first purely-numeric token;
 * the trailing tokens map positionally to unit → city → category.
 * A quoted segment is treated as one token (handles "Addis Ababa").
 */
export function parseSubmission(rawArgs: string): ParsedSubmission | { error: string } {
  // tokenize with quote support
  const tokens: string[] = [];
  const re = /"([^"]*)"|“([^”]*”?)|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawArgs)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  if (tokens.length < 2) {
    return {
      error:
        "Usage: /submitprice <material> <price> [unit] [city] [category]\nExample: /submitprice Derba Cement 8200 Qtl \"Addis Ababa\" cement",
    };
  }

  // split material prefix from the numeric price token
  const numIdx = tokens.findIndex((t) => /^[-+]?[\d,]+(\.\d+)?$/.test(t));
  if (numIdx <= 0) {
    return { error: "Could not find a numeric price.\nExample: /submitprice Derba Cement 8200" };
  }
  const material = tokens.slice(0, numIdx).join(" ").trim();
  const price = Number(tokens[numIdx].replace(/,/g, ""));
  if (!material || !Number.isFinite(price) || price <= 0) {
    return { error: "Material name and a positive price are required.\nExample: /submitprice Derba Cement 8200" };
  }
  if (material.length > MATERIAL_MAX) {
    return { error: `Material name too long (max ${MATERIAL_MAX} characters).` };
  }

  const rest = tokens.slice(numIdx + 1);
  return {
    material,
    price,
    unit: rest[0]?.replace(/["“”]/g, "") || undefined,
    city: rest[1] || undefined,
    category: rest[2] || undefined,
  };
}

const TREND_UP = ["up", "rose", "increased", "ከፍተኛ"];
const TREND_DOWN = ["down", "fell", "decreased", "ዝቅተኛ"];

function inferTrend(changePercent: number | null): string {
  if (changePercent == null) return "stable";
  if (changePercent > 0.5) return "up";
  if (changePercent < -0.5) return "down";
  return "stable";
}

// ---- weekly watch (cement + steel top movers) --------------------------------
interface PriceRow {
  material_en: string;
  unit: string;
  price: number | string;
  change_percent: number | string | null;
  city: string | null;
  category: string;
}

async function buildWatch(admin: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await admin
    .from("market_prices")
    .select("material_en, unit, price, change_percent, city, category")
    .in("category", ["cement", "steel"])
    .neq("freshness_status", "expired")
    .order("updated_at", { ascending: false })
    .limit(60);

  if (error) return "⚠️ Could not load market prices right now. Please try again later.";

  const rows = (data ?? []) as PriceRow[];
  if (rows.length === 0) {
    return "📭 No live cement/rebar prices yet — suppliers, be the first: /submitprice Derba Cement 8200";
  }

  const movers = rows
    .filter((r) => r.change_percent != null)
    .sort((a, b) => Math.abs(Number(b.change_percent)) - Math.abs(Number(a.change_percent)))
    .slice(0, 3);

  const lines = movers.map((r) => {
    const pct = Number(r.change_percent);
    const arrow = pct > 0 ? "🔺" : pct < 0 ? "🔻" : "➖";
    return `${arrow} <b>${r.material_en}</b> — ${Number(r.price).toLocaleString()} ETB/${r.unit} (${pct > 0 ? "+" : ""}${pct}% · 7d) · ${r.city ?? "—"}`;
  });

  return [
    "📊 <b>Weekly Cement &amp; Rebar Watch</b>",
    "Biggest movers across cement &amp; steel:",
    "",
    ...lines,
    "",
    "Suppliers: keep these fresh with /submitprice — verified entries appear on YeBetWeg with your source name.",
  ].join("\n");
}

// ---- main handler -------------------------------------------------------------
Deno.serve(async (req) => {
  // Secret-token verification (set via setWebhook secret_token)
  if (TELEGRAM_WEBHOOK_SECRET) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== TELEGRAM_WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: {
    message?: { chat?: { id?: number }; text?: string; from?: { id?: number; username?: string } };
  };
  try {
    update = await req.json();
  } catch {
    return new Response("ok"); // ignore non-JSON probes; Telegram only needs 2xx
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  const senderName = update.message?.from?.username
    ? `@${update.message.from.username}`
    : "Telegram supplier";

  // Always 200 so Telegram doesn't retry-storm; handle errors inline.
  try {
    if (!chatId || !text) return new Response("ok");

    if (!TELEGRAM_BOT_TOKEN) {
      await sendMessage(chatId, "⚠️ Bot is not configured (missing token).");
      return new Response("ok");
    }

    const [rawCmd, ...argParts] = text.split(/\s+/);
    const cmd = rawCmd.toLowerCase().replace(/@.*$/, ""); // strip /cmd@botname
    const args = text.slice(rawCmd.length).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      await sendMessage(chatId, "⚠️ Server configuration error.");
      return new Response("ok");
    }
    const admin = createClient(supabaseUrl, serviceKey);

    switch (cmd) {
      case "/start":
      case "/help": {
        await sendMessage(
          chatId,
          [
            "🏗 <b>YeBetWeg Price Desk</b>",
            "",
            "Share the prices you actually sell at — they feed the live market board after a quick admin check.",
            "",
            "<b>/submitprice</b> &lt;material&gt; &lt;price&gt; [unit] [city] [category]",
            "  /submitprice Derba Cement 8200 Qtl \"Addis Ababa\" cement",
            "<b>/watch</b> — this week's Cement &amp; Rebar Watch",
            "",
            "Units: Qtl (quintal), m³, pc, bag… · Categories: cement, steel, finishing, electrical, plumbing",
          ].join("\n"),
        );
        break;
      }

      case "/watch": {
        await sendMessage(chatId, await buildWatch(admin));
        break;
      }

      case "/submitprice": {
        if (rateLimited(chatId)) {
          await sendMessage(chatId, `⏳ Rate limit: max ${MAX_SUBMISSIONS_PER_HOUR} submissions per hour.`);
          break;
        }
        const parsed = parseSubmission(args);
        if ("error" in parsed) {
          await sendMessage(chatId, `⚠️ ${parsed.error}`);
          break;
        }

        const { data, error } = await admin.rpc("upsert_market_price_from_telegram", {
          p_material_en: parsed.material,
          p_price: parsed.price,
          p_unit: parsed.unit ?? null,
          p_city: parsed.city ?? "Addis Ababa",
          p_category: parsed.category ?? null,
          p_source_name: senderName,
        });

        if (error) {
          await sendMessage(chatId, `⚠️ Could not record that price: ${error.message}`);
          break;
        }

        const row = Array.isArray(data) ? data[0] : data;
        const replaced = Boolean(row?.replaced);

        // In-app notification: every admin sees pending community prices in
        // the app bell instantly (email stays the async digest channel).
        try {
          const { data: adminIds } = await admin
            .from("users")
            .select("id")
            .eq("role", "admin")
            .limit(20);
          if (adminIds && adminIds.length > 0) {
            await admin.from("notifications").insert(
              adminIds.map((a) => ({
                user_id: a.id,
                type: "price_submission",
                title: `Community price: ${parsed.material} — ${Number(parsed.price).toLocaleString()} ETB`,
                body: `${senderName} via Telegram · ${parsed.city ?? "Addis Ababa"}${parsed.unit ? ` / ${parsed.unit}` : ""} · awaiting verification`,
                link: "/dashboard",
                meta: { source: "telegram", replaced },
              })),
            );
          }
        } catch (notifErr) {
          console.error("price_submission notification failed:", notifErr);
        }

        await sendMessage(
          chatId,
          replaced
            ? [
                "✅ <b>Price updated</b>",
                `${parsed.material}: <b>${parsed.price.toLocaleString()} ETB</b>/${parsed.unit ?? "Qtl"} · ${parsed.city ?? "Addis Ababa"}`,
                "",
                "Marked as community-reported pending verification — thanks for keeping the market honest!",
              ].join("\n")
            : [
                "✅ <b>New price recorded</b>",
                `${parsed.material}: <b>${parsed.price.toLocaleString()} ETB</b>/${parsed.unit ?? "Qtl"} · ${parsed.city ?? "Addis Ababa"}`,
                "",
                "An admin will verify it shortly. Track the market with /watch.",
              ].join("\n"),
        );
        break;
      }

      default: {
        // Noisy-group safety: only respond to known commands
        if (cmd.startsWith("/")) {
          await sendMessage(chatId, "Unknown command. Try /help or /submitprice Derba Cement 8200");
        }
      }
    }

    return new Response("ok");
  } catch (e) {
    console.error("telegram-webhook error:", e);
    if (chatId) {
      try {
        await sendMessage(chatId, "⚠️ Something went wrong. Please try again.");
      } catch {
        /* ignore */
      }
    }
    return new Response("ok");
  }
});
