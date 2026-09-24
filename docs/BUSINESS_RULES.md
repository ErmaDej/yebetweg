# YeBetWeg — Business Rules 📜

The authoritative, code-grounded statement of **how the business works**: every
actor, every flow, every rule that governs money, content, and trust. The
[Project Bible](PROJECT_BIBLE.md) explains *what the product is*; this document
explains *what the system permits, forbids, records, and charges*. If code and
this document disagree, trust the code and fix this doc.

**Conventions used below**

- "Users table" = `public.users` (the custom profile table; one row per person,
  joined to Supabase Auth via `users.auth_uid = auth.uid()`).
- "RPC" = Postgres function callable from the client through PostgREST; all
  write paths go through SECURITY DEFINER RPCs or RLS-guarded direct writes.
- Amounts are **ETB** (Ethiopian Birr). Dates are UTC.

---

## 1. Roles & privileges (who can do what)

`users.role ∈ {user, premium, pro, admin}` (CHECK constraint
`users_role_enum`), with `users.status ∈ {active, banned?}` gating sign-in.
Higher tiers inherit everything below them.

| Capability | anon (visitor) | user | premium | pro | admin |
|---|---|---|---|---|---|
| Browse approved listings, free market prices, free tips, blogs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sign up / sign in (Supabase Auth + custom RPC login) | signup | ✅ | ✅ | ✅ | ✅ |
| Ask tip questions (10+/day caps, spam-heuristics) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Answer / reply / vote in tip Q&A | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Expert badge** on answers/replies | — | ❌ | ✅ | ✅ | ❌ (by design) |
| Save/bookmark into collections; BOQ estimates & actuals | ❌ | ✅ | ✅ | ✅ | ✅ |
| Submit listings (pending moderation) & inquiries | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pro BOQ export (CSV/print) & share permalinks | ❌ | ❌ | ❌ | ✅ | ✅* |
| Read premium market prices (`access_level ≠ free`) & premium tips | ❌ | ❌ | ✅ | ✅ | ✅ |
| Admin RPCs (via `admin_actions` edge function + `admin_*` RPCs) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Moderate listings/RFQs/Q&A/users; revenue & tax reporting | ❌ | ❌ | ❌ | ❌ | ✅ |
| Read own subscription payments; delete own account | — | ✅ | ✅ | ✅ | ✅ |

\* Admins pass entitlement checks but are not the target audience.

**Authorization architecture (three layers, all enforced server-side):**

1. **RLS on every table.** Custom-DB auth: policies use
   `auth.uid()` joined through `users.auth_uid` — never a bare `true` for
   writes. Anon is default-deny everywhere except public reads (approved
   listings, free prices, free tips, blogs).
2. **SECURITY DEFINER RPCs** own every state-changing flow (activation,
   RFQ/listing/inquiry submission, Q&A, voting, admin management). They
   re-validate identity (`users.auth_uid = auth.uid()`), ownership, rate
   limits, and content rules — the UI is never trusted. EXECUTE is revoked
   from `public`/`anon` on privileged RPCs (hardened Sep 2026).
3. **Edge functions** for third-party boundaries (Chapa webhook with HMAC
   verification, Telegram webhook with `secret_token`, admin_actions with
   re-checked admin role, digests with service-role + Resend).

Entitlement predicate: `user_has_premium_entitlement()` = active premium/pro
subscription **or** role in (premium, pro, admin). Gated content is filtered
at the RPC/RLS layer (`get_visible_market_prices`, `get_visible_tips`) so the
UI blur is progressive enhancement, not protection.

---

## 2. Authentication & account lifecycle

- **Sign-up/sign-in:** Supabase Auth (email/password; OAuth providers
  google/facebook) + a custom RPC layer (`authenticate_user`, `login`) that
  validates against the users table (`status='active'` required). On first
  login, `ensure_auth_user_profile` creates the users-table row (`role='user'`).
- **Login hardening:** `record_login_attempt` + `check_login_rate_limit`
  (login_attempts table) throttle brute force; failed logins are logged.
- **Roles are not self-service.** Signup always creates `role='user'`.
  premium/pro are granted **only** by payment activation (§5). admin is
  granted only manually in the DB (`scripts/fix-admin-login.sql` pattern).
- **Banned/inactive users** cannot authenticate (login RPC + every RLS policy
  requires `status='active'`).
- **Account deletion (self-service):** `delete_own_account()` SECURITY DEFINER
  RPC anonymizes profile fields, revokes sessions, cascades owned content,
  and records the action — GDPR-style erasure without orphaning ledger rows.

---

## 3. Telegram supplier price funnel

Suppliers never touch the web app. They message a Telegram bot:

- `/submitprice <material> <price> [unit] [city] [category]` → the
  `telegram-webhook` edge function (protected by Telegram's `secret_token`,
  `--no-verify-jwt`) calls `upsert_market_price_from_telegram` with the
  **service role**.
- Rules: prices land as `source_type='telegram_observed'`,
  `freshness_status='verified'`, confidence ~50 (vs 90 for admin-verified),
  `access_level='free'` unless stated otherwise; same (material, city,
  category) upserts **replace** rather than duplicate. Material names are
  matched case-insensitively (`idx_market_prices_telegram_match`).
- These prices are *observations*, not admin-verified quotes — they display
  with their lower confidence and expire like any other price.

---

## 4. Market prices: freshness, gating, lifecycle

- **Sources:** `admin_verified` (Market Desk, confidence 90) >
  `telegram_observed` / `supplier_quoted` (50) > `community_reported`.
- **Verification workflow (admin):** MarketPriceManager → create/edit/bulk CSV
  import via `admin_*_market_price` RPCs (admin-authorized through
  `admin_check_custom_user`) → prices go live immediately as admin_verified.
- **Freshness:** a 7-day threshold; `refresh_market_price_freshness()` (cron:
  freshness_cron) marks older prices `expired`; `expire_stale_market_prices` /
  `get_stale_market_prices` surface them; admins get freshness_alerts. Stale
  prices never render as fresh.
- **Premium gating:** `access_level ∈ {free, premium}` — gated rows are
  excluded server-side for non-entitled viewers (the Sep 2026 probe fix: anon
  previously leaked gated rows over PostgREST).
- **Admin CSV export** exists for the whole desk.

---

## 5. Payments & subscriptions (Chapa, pass-through fee model)

**Canonical pricing:** premium **500 ETB** / pro **1000 ETB** per 30 days.
Telebirr exists as a secondary gateway reference field; Chapa is primary
(Telebirr, CBE Birr, cards via Chapa).**Pass-through rule (Sep 2026):** the buyer pays the listed price **plus a checkout fee** covering the gateway's transaction fee, so YeBetWeg nets the full listed price.

- **Fee rates are configurable per payment method** (app_settings key
  `fee_config`, admin-editable; served to the client by the public
  `get_fee_config()` RPC and applied server-side by `checkout_fee_rate(method)`):
  `chapa`/`telebirr` default to 2%, `chapa_card` (international cards) to 1% by
  default — EDIT these to the actual Chapa contract schedule. Unknown methods
  fall back to `default_rate`; rates clamp to [0, 10%).
- **Charging rule:** at initiate time the buyer's channel isn't known yet
  (Chapa shows the channel chooser), so the checkout computes the gross with
  the **highest configured rate** — a buyer on a cheaper channel can only
  over-pay the fee slightly (business windfall), never under-pay.
- Gross-up: `gross = ceil(base / (1 − rate))` (single source of truth in
  `src/lib/fees.ts` `withCheckoutFee` and SQL `checkout_fee_split` — identical
  math). At 2%: 500 → **510.21**, 1000 → **1020.41**.
- The checkout UI shows the split (price + fee = total) before payment.
- Ledger semantics on `subscription_payments`: `amount` = buyer-paid gross,
  `base_amount` = net revenue (tax base), `gateway_fee` = fee covering Chapa.
  Legacy rows (pre-fee) are backfilled with `base_amount = amount, fee = 0`.
- Reporting everywhere (Revenue monitor, Analytics, weekly digest, CSV,
  print) sums **net revenue** as the headline/tax figure and treats
  `gateway_fee` as a cost. VAT (15% output, Proclamation 285/2002) or Turnover
  Tax (2%, Proclamation 308/2002) applies to net revenue, not gross.

**Payment flow:**

1. User picks a tier → `usePayment.initiatePayment` computes the gross via
   `withCheckoutFee`, generates a tx ref, and redirects to Chapa with a
   callback to the `chapa-webhook` edge function and a return URL to
   `/payment/success`.
2. **Activation is double-pathed and idempotent:** both the return page and
   the webhook call `activate_subscription(reference, gateway)`. The RPC
   converges (`already_active` on repeats), flips the subscription
   (`is_active`, 30-day expiry, extends if renewed), promotes the user's role
   (premium/pro only), and inserts the **ledger row** (gross/net/fee split,
   idempotent on reference unique index).
3. `chapa-webhook` verifies the **HMAC signature** (`x-chapa-signature`) on
   the raw body before anything else; events are stored in
   `payment_webhook_events` for audit/replay.
4. Stuck payments (webhook + return page both failed) are healed by admins
   via `admin_activate_subscription(reference, note)` — admin-gated, marks
   the ledger row `reconciled_by/at` with a note, and writes moderation_log.
5. Weekly `revenue-digest` edge function emails (Resend) the owners: net
   revenue MoM, buyer-paid gross, fees, tax context, pending activations.
6. **Lifecycle emails** (`subscription-lifecycle` edge function, daily cron):
   renewal reminders to actives expiring within 3 days and win-back emails to
   members expired 1–14 days ago with no active subscription — idempotent per
   cycle via `notifications.meta->>'dedup_key'` (no double-sends; dry-runs
   write nothing). See docs/EDGE_FUNCTIONS_RUNBOOK.md §5c. All four HTTP cron
   jobs (this one plus the three digests) resolve their guard secret from
   `app_settings` ('cron_secret') at fire time via the locked-down
   `current_cron_secret()` RPC — secret rotations apply immediately and no
   secret is stored in the cron command; the platform `CRON_SECRET` must be
   kept in sync via `supabase secrets set`. The function also accepts
   `{"sandbox":true}` to send test emails through Resend's sandbox sender
   (delivers only to the Resend account owner) until the sending domain is
   verified — cron never sets this flag.

**Cancellation/refunds:** none self-service; expiry is time-based
(30 days); admins manage everything manually.

---

## 6. Commissions & revenue recognition

- YeBetWeg's marketplace revenue model is the **subscription** described
  above — there is **no per-transaction commission** on listings, RFQs, or
  inquiries. The 2% "commission" language in the fee model refers to Chapa's
  processing fee, which is passed through to the buyer, not absorbed.
- Revenue is recognized when `subscription_payments.status='completed'` rows
  exist; `amount − gateway_fee = base_amount` must hold per row (RPC-guaranteed).
- Monthly analytics (RevenueAnalytics) compute MoM growth, subscriber
  movement, and the Ethiopian tax figures (VAT/ToT) from net revenue.

---

## 7. Marketplace listings & their transactions

**Listing lifecycle:** `pending → approved → sold` (or `→ rejected` with a
`rejected_reason`).

1. Any signed-in user submits a listing (`create_listing` RPC / RLS insert —
   requires a users row; anon cannot). Title/price/location constraints
   enforced by CHECKs; status starts `pending`.
2. **Only approved listings are public** (`Public can read approved listings`
   policy). Owners see their own pending ones; admins see all.
3. **Moderation (admin):** `admin_actions` edge function `moderate_listings`
   (admin role re-verified server-side) approves/rejects with a reason;
   owners can edit their own and delete pending ones.
4. **Transaction rule:** YeBetWeg never touches the money. Contact happens
   off-platform (`contact_phone` / `contact_email`) and buyer→seller
   interest is expressed through **inquiries** (`submit_inquiry` RPC:
   name/email/phone/subject/message, optionally tied to a listing or
   professional). There is no escrow, no booking, no platform-side payment.
5. Marking a listing `sold` is an owner action; re-listing requires a new
   submission.

---

## 8. RFQ (request for quote) management

Purpose: buyers who need bulk materials describe a bill of materials and
YeBetWeg's team routes it to suppliers manually.

1. **Submission:** `submit_rfq` RPC (authenticated only — the Sep 2026
   hardening revoked anon EXECUTE after a live probe proved anon could create
   RFQs). The RFQ header + `rfq_items` rows insert atomically; status starts
   `new`.
2. **Status machine:**
   `new → reviewing → sent_to_supplier → quoted → closed` (+ `spam` as a
   terminal trash state). CHECK-enforced.
3. **Admin workflow (RfqManager):** filter/search the backlog, set status
   (`admin_update_rfq_status`), attach `admin_notes`, bulk-select and bulk
   status change, and generate a **supplier Telegram message** (prefilled
   text with requester, city, items, target prices, phone) that the admin
   sends manually — suppliers are not on the web app.
4. **Quoted stage** means suppliers replied; the admin communicates quotes
   back to the requester off-platform (phone/email). Nothing is charged.
5. Spam triage: obvious junk goes to `spam` (rate limits + phone validation
   on submission keep volume manageable).

---

## 9. Tip Q&A: questions, threaded replies, voting

Community help layer on Construction Tips. All writes go through RPCs;
reads are RLS (`to authenticated`).

**Questions (`ask_tip_question`):** ≥10 chars, ≤500; rate-limited 5/hour and
15/day per user; spam heuristics (duplicate-of-own-recent, ≥3 links,
URL-shortener domains, ALL-CAPS shouting); max 5 open questions per user per
tip. Every new question notifies all active admins in-app
(`notify_admins_new_tip_question` trigger, type `tip_qa`).

**Answers & replies (`answer_tip_question(question_id, answer, parent_answer_id?)`):**
≥10 chars, ≤2000; 10/hour & 40/day caps; same link-spam/ALL-CAPS heuristics;
one answer per user per question (unique index); **premium/pro answerers get
`is_expert=true`** (the Expert badge).
- **Threading:** `parent_answer_id` must point at a **top-level answer of the
  same question** — the RPC rejects reply-to-reply and cross-question
  parents, so threads are strictly question → answer → replies (one level).
  Replies can be voted too.
- **Deletion:** owners may delete own questions (cascade deletes their
  answers) and own answers; admins may delete/update anything. Every
  deletion is audited (`log_tip_qa_deletion` triggers → `moderation_log` with
  a content snapshot, actor, target author).
- **Realtime:** `tip_questions`, `tip_answers`, `tip_qa_votes` are on the
  `supabase_realtime` publication (replica identity full) — open threads
  update live through a debounced refetch.

**Voting (`tip_qa_votes` + `vote_tip_qa` RPC):**
- One vote per user per target; `value = +1 (up) | −1 (down)`; same value
  again **toggles off**, opposite value **flips**.
- Exactly one target per vote row (question XOR answer) — CHECK-enforced,
  with partial unique indexes `(user_id, question_id)` / `(user_id, answer_id)`.
- Scores are derived from rows (never denormalized), aggregated for the
  client through `v_tip_qa_scores` (security_invoker view exposing only
  aggregates + the caller's own vote — raw voter rows are never exposed).
- Answers render newest-first within score bands; votes require sign-in.
- Weekly `tip-qa-digest` emails admins the top threads; TipQaModeration gives
  admins searchable, paginated deletion powers.

---

## 10. BOQ estimator, actuals & Pro exports

- **BOQ Lite:** multi-city estimates (inputs: city/project type/finish; outputs:
  category breakdown, totals) stored per user (`boq_estimates`,
  `handle_boq_updated_at` trigger maintains `updated_at`).
- **Actuals:** real spend tracked per estimate (`boq_actuals`) and compared
  against estimates with variance %.
- **Entitlement:** export (CSV/print report) and share permalinks are **Pro**
  (`canExportBoq` on the client + server-side gating; share tokens
  `rotate_boq_share_token`, public read via `get_shared_boq`).
- **Site logs:** per-user construction diaries (`site_logs`) — date, workers,
  payments, delays — power the dashboard actuals rollup.

---

## 11. Notifications, digests & admin surface

- **In-app notifications** (`notifications`, type enum: info, stale_prices,
  price_submission, rfq, listing, system, tip_qa): realtime INSERTs drive the
  bell; `mark_notifications_read` / `prune_notifications` manage the backlog;
  an unread index keeps queries fast.
- **Edge functions:** `freshness_cron` (expire prices), `revenue-digest`
  (weekly revenue/tax email), `tip-qa-digest` (weekly Q&A digest),
  `notify_user.ts` (ad-hoc email helper), `chapa-service`/`chapa-webhook`
  (payment verification), `telegram-webhook` (supplier funnel),
  `admin_actions` (the single admin RPC gateway; every action re-verifies the
  admin role server-side).
- **Moderation/audit:** `moderation_log` records Q&A deletions and payment
  reconciliations with actor + snapshot; login_attempts records auth abuse.

---

## 12. Cross-cutting workflow rules

1. **Every privileged action is verified server-side** — UI hiding is never
   the security boundary.
2. **Everything financial is ledgered** with idempotency keys (payment
   references) and is reconcilable against Chapa statements (gross = what
   Chapa received).
2b. **The tax report's business identity (legal name, TIN, address,
   VAT-registered flag) persists in `app_settings` key `tax_profile`**
   (admin-only KV, seeded with defaults, auto-saved from RevenueAnalytics) —
   never re-typed after a refresh.
3. **Everything destructive is audited** (moderation_log) and confirmed in
   the UI (ConfirmActionDialog).
4. **Spam/abuse controls are rate-limit + heuristic based, inside the RPCs**,
   so they cannot be bypassed by calling the API directly.
5. **Bilingual parity:** user-facing strings exist in English + አማርኛ
   (i18n keys), including all Q&A voting/reply affordances and the checkout
   fee breakdown.
6. **Migrations are the only way schema changes ship**; the CLI history is
   authoritative (`supabase db push`), and out-of-band applies must be
   repaired into history (`migration repair`), never left dangling.

---

*Source anchors: `src/lib/fees.ts`, `supabase/migrations/*` (esp.
20260924120000 fees, 20260924130000 Q&A replies/votes, 20260923200000 payment
hardening, 20260921010000 RFQ hardening, 20260918000000 entitlement RLS),
`supabase/functions/*` (admin_actions, chapa-webhook, telegram-webhook,
revenue-digest, tip-qa-digest, freshness_cron), `src/hooks/usePayment.ts`,
`src/hooks/useTipQa.ts`.*
