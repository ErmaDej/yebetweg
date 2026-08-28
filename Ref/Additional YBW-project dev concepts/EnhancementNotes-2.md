I'll dig into this properly — analyzing AddisBOQ directly, then scanning the broader Ethiopian construction-tech/marketplace space, then pulling in relevant global products for feature/UI inspiration.Found another direct competitor (addiscostestimator.com) already. Let me get the actual AddisBOQ site and Telegram channel now that they're search-indexed.Quick note before the analysis: I wasn't able to reach **addisboq.com** or **t.me/AddisBOQ** directly — my search tool doesn't have them indexed yet (likely because the site/channel is new and small), and my fetch tool can only open URLs that already surface in search results. If you can paste a few screenshots of their site/channel or their About page text, I can fold in a precise feature-by-feature teardown. In the meantime, I dug into the *rest* of the Ethiopian construction-tech landscape — which turned out to be more crowded than expected — plus global BOQ/estimating tools for UI and feature patterns you can borrow.

## 1. The Ethiopian competitive landscape is more crowded than "just AddisBOQ"

| Player | What it actually does | Overlap with YBW |
|---|---|---|
| **Addis Cost Estimator** (addiscostestimator.com) | Web app: create account → fill project form → generates a downloadable **Excel BOQ**, location-adjusted for Addis Ababa, Bahir Dar, Mekelle, Hawassa, Adama, Jijiga. Has a live "Material Prices" page, a **"Register as a Supplier"** flow, and markets itself as "Ethiopian-first." Built by Glyme Tech Solutions. | Direct competitor to your planned BOQ/estimator feature — closest analog to what you described wanting to build. |
| **Conlink** (conlink.et, 14.6K Telegram subs) | 15+ year old "A–Z construction materials catalogue" for architects/engineers/consultants, plus a tenders feed (tenders.conlink.et, 7.9K subs) | Overlaps with your "market prices" and "professional directory" ambitions — it's the incumbent trust brand here. |
| **Construction Resources / Construction Proxy / Conmaret** (Telegram channels + blogs) | Manually-updated Telegram posts of material prices (cement, rebar by diameter, tiles, sand) sourced from Mercato suppliers; Conmaret adds an actual e-commerce storefront | Directly competes with your "ዋጋ ዛሬ" (Price Today) series — these channels already own that habit-forming daily-price-check behavior |
| **EthioBuildConnect** | Real estate + construction + "expo" marketplace: property listings, contractors, consultants, suppliers, financing partners in one place | Prefigures your Phase 2 marketplace |
| **AddisList / Ethiopia Property Centre / Live Ethio** | Established real estate portals with agent networks, verified listings, category filters (houses/flats/land/commercial) | Sets the UX bar for your future listings module |
| **Ethiopian Association of Civil Engineers** (Telegram, 4.4K subs) | Professional body channel — opportunities, standards discussion | Adjacent audience-capture play for your "Believe/Belong" pillars |

**What this tells you:** no single competitor combines *content/education + philosophy + BOQ tooling + marketplace* the way YBW aims to. But each individual piece you plan to build already has an entrenched, focused competitor. Your moat isn't "we also have a BOQ tool" — it's the bilingual construction-plus-philosophy content engine *feeding* a BOQ/marketplace tool that others don't have.

## 2. What to infer about AddisBOQ specifically (from its name/positioning + the pattern above)

Given it's described as having "robust features" and BOQ modules "for various places in and outside Addis Ababa," it's almost certainly playing the same lane as Addis Cost Estimator: location-adjusted BOQ generation + Telegram distribution for reach (the Telegram-first-for-Ethiopia pattern is consistent across every competitor above — Conlink, Construction Resources, Conmaret all lean on Telegram over the web app for daily engagement, because Telegram penetration and light data usage beat web traffic in Ethiopia). If you can share what you saw on their site, I can confirm or correct this — but I'd bet on: multi-city BOQ line items, a materials/price database, and a bot-driven Telegram channel posting price updates and BOQ snippets to build habit before pushing users to the paid/full web tool.

## 3. Global BOQ/estimating tools worth stealing UI patterns from

For your future BOQ module (Phase 2+), the current best-in-class small-contractor tools are **Buildxact**, **PlanSwift**, and **CostX**:

- **Digital takeoff**: upload a plan (PDF/image) → click-to-measure walls/rooms → quantities auto-populate line items. Even a simplified version (manual room dimension inputs → auto-quantity calc) would leapfrog Addis Cost Estimator's plain form.
- **Template-based BOQ structure**: Buildxact keeps quantities/rates/totals in reusable templates per building type (G+1 residential, G+2 apartment, etc.) — matches the Ethiopian BOQ documents in your project files (SUBSTRUCTURE → SUPERSTRUCTURE → FINISHING sections).
- **Live supplier pricing feed**: Buildxact's differentiator is pulling live vendor prices instead of static defaults — this is exactly the gap Addis Cost Estimator and AddisBOQ are trying to fill with "register as supplier" flows. If YBW's Telegram content strategy can source real supplier prices weekly, that data becomes your moat.
- **Export to Excel/PDF report** with cost summary — table stakes, already in your Prompt 2 spec.

## 4. Concrete recommendations for YBW, mapped to your existing roadmap

**Now (Phase 1 polish, before Phase 2 marketplace build):**
- Treat the Telegram bot not just as a content-distribution tool but as a **price-data collection funnel** — the same tactic Construction Resources/Conmaret use. A simple `/submitprice` bot command from verified suppliers could seed your `market_prices` table with real data faster than manual entry.
- Fast-follow the "Register as a Supplier" pattern (Addis Cost Estimator) into your existing `listings` table plans — you already scoped a `professionals`/`materials` listing type in Prompt 2.

**Phase 2 (marketplace/CMS):**
- Add a lightweight **BOQ generator** as a premium-tier feature, structured like the docs already in your project (Substructure/Superstructure/Finishing sections with unit/qty/rate), even before you build full digital takeoff. Ship it as a guided form first (like Addis Cost Estimator), Excel export via a Supabase Edge Function.
- Borrow AddisList/Ethiopia Property Centre's listing UX: category tabs, verified badges, sub-city filters — you already spec'd this in your marketplace section.

**Phase 3+ (differentiator):**
- Real digital takeoff (click-to-measure from an uploaded floor plan image) would put YBW ahead of every Ethiopian competitor found here — none of them have this; they're all form-based.
- Weekly price data, sourced through your Telegram community rather than scraped, becomes genuinely defensible if suppliers trust Betha's brand enough to self-report (this is the "engage first" community tactic already in your content strategy, redirected toward data collection).




