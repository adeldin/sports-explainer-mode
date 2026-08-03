# StockWise — Kickoff Brief
*2026-08-02. The hold on app #2 is lifted: SportsWise iOS v1.5 submitted today (build 33), extension live and stable, Android deferred until iOS settles, B&T v1.0 in review. Decision rationale lives in FEATURE_IDEAS.md § "🎯 App #2 — DECIDED 2026-07-15"; this doc is the execution plan.*

---

## 1. Roles — this app inverts them

On SportsWise, Anthony was the domain expert and Claude executed. On StockWise, **Anthony knows nothing about finance — by design** (the founder-is-the-confused-user origin pattern). The split:

- **Anthony:** UX judgment, product taste, the naive-user test ("do I understand this explanation?"), git, releases, and the two decisions in §8.
- **Claude:** finance domain end-to-end — curriculum, glossary, scenario banks, prompt personas, terminology correctness.
- **Consequence:** the two mitigations banked in FEATURE_IDEAS are now *load-bearing*, not optional:
  1. **Ground every explanation in real data from day one** (the GUMBO / AP-recap lesson, applied prospectively).
  2. **Recruit 2–3 finance-literate friends as correctness reviewers** — the "Chicago Hounds coach" role for this vertical. Content packs get a reviewer sign-off gate before shipping. *(Anthony's action item — see §8.)*

---

## 2. What we're building (one paragraph)

The real-time complexity translator, pointed at markets. **North star:** *"Coworkers won't stop talking about NVDA earnings tonight. She opens the app, gets a Kid-level explanation of what earnings are, why this one matters, and what 'beat expectations' means — and can participate in the conversation."* The novel blend: **the market is a daily lesson generator** — today's real event (Fed held rates, CPI printed hot, NVDA beat) explained at the user's level, then **the Academy quizzes you on it tomorrow**. Duolingo's content is abstract; Khan is pull-only; nobody does formative assessment on events the user actually lived through.

**Identity guardrail — "don't become a trading app":** educate, NEVER advise. No buy/sell, no price targets, no signals, no portfolio hooks. This is baked into the system prompt (a hard clause, like the no-gambling rule), plus a visible "education, not financial advice" disclaimer in-app. It keeps us clear of the financial-advice regulatory surface and it's the differentiator, not a limitation.

---

## 3. Engine recon — what the codebase audit found (2026-08-02)

Full recon run against the repo. Verdict: **cleaner than a codebase this size has any right to be** — the seams named in the FEATURE_IDEAS governing principle actually exist in code.

### Lifts nearly as-is (~15 files)
| Asset | Path | Note |
|---|---|---|
| Points / rank / streak engine | `sports-explainer-mobile-v2/lib/appState.tsx` | Self-documents as game-agnostic; rename 5 rank labels |
| Entitlement + RC paywall | `lib/entitlement.tsx` | Zero sport references; new RC key |
| Cap logic (client + server) | `lib/caps.ts`, `src/app/api/_lib/caps.ts` | Pure functions, free |
| Game host + registry | `components/academy/GameHost.tsx`, `lib/academyGames.ts` | **The best seam in the repo** — "adding a game is 'register a descriptor,' never 'edit the host'" |
| Data-layer registry | `src/app/api/explain/dataProvider.ts` | Its header literally says "A future [Topic]Wise app registers its own enrichers" |
| LLM adapter | `src/app/api/explain/llmProvider.ts` | Groq→Gemini switch, provider-agnostic |
| Cache + auth | `explanationCache.ts`, `_lib/redis.ts`, `api/auth/*` | Namespaced keys; generic magic-link |
| Level-persona prompt structure | `route.ts:200` | **The crown jewel** — 4 tiers change WHAT is taught, not tone: rule → meaning → craft → strategy. Maps 1:1 to finance |
| Content shape | `ScoreScenario` in `lib/readTheScore.ts` | `{board, prompt, options, answer, exp: Record<Level,string>}` is topic-neutral — swap the board type for a chart/quote |
| Theme, nav shell, error boundary, settings | `lib/theme.tsx`, `App.tsx`, etc. | Brand token + tab names are strings |

### Rewrites as content (StockWise-original work, ~120 files' worth on the SportsWise side)
Glossaries, facts/FAQ/quiz banks, all scenario banks, all field/court art, provider/enricher implementations, the `sportContext` prompt map. This is expected — it's the "content pack" layer of the three-layer principle, and on this app it's **my** work, not Anthony's.

### The three tangles (what NOT to port)
1. **`src/app/api/explain/route.ts` — 1,651 lines.** All prompt builders + duplicate ESPN config + caps + six action branches in one file; it doesn't use the clean `dataProvider.ts` it sits next to. **Do not port it. Re-derive the StockWise backend from `dataProvider.ts` + `llmProvider.ts` + the persona structure and leave the 1,651 lines behind.**
2. **`screens/LiveScreen.tsx` — 1,497 lines**, gating/fetching/cards interleaved. Same treatment: re-derive, don't port.
3. **Coach's Corner registry** — hand-maintained 40-id union + if-chain + 40 static imports. If we take one registry, take `academyGames.ts` (the clean descriptor array), not this.

---

## 4. Architecture decision — greenfield + provenance (recommended)

Three options considered:
- **(A) Extract-first:** carve a shared core package out of SportsWise, refactor SportsWise to consume it, then build StockWise on it. Purist, but it churns SportsWise *while v1.5 is in App Review* and forces a validation rebuild.
- **(B) Pure greenfield:** copy patterns loosely, let the forks drift. Fast, but throws away the extraction FEATURE_IDEAS says gate 1 is for.
- **(C) Greenfield + provenance — RECOMMENDED:** new repo; copy the ~15 clean-seam files **verbatim where possible**, each logged in a `PROVENANCE.md` mapping it to its SportsWise origin file + commit. The true shared package gets extracted later as a diff-driven job across two living apps, and gets backported into SportsWise at its next natural major version — never while a release is in review.

(C) honors both halves of the governing principle: the seam is real (verbatim copies + provenance = a de-facto extraction), and the anti-over-engineering discipline holds (no plugin framework while the second app is still finding its shape). **SportsWise's binary and backend are touched zero times.**

New repo: `~/projects/stockwise` (matches the B&T separate-repo pattern), own Vercel project, own Expo app. Day-zero setup runs the **API-first script pattern** already banked (repo + Expo scaffold + RevenueCat v2 API + ASC API app record; keys collected once into `~/.config/`). ⚠️ The SportsWise backend runs Next 16.2.6 with breaking changes vs. older conventions — whatever Next version the new repo pins, **read `node_modules/next/dist/docs/` before writing backend code** (AGENTS.md rule carries over).

---

## 5. Data layer — the fixture list is (mostly) free

SportsWise's data economics: keyless ESPN backbone + keyed enrichers, all server-side, client holds zero keys. The finance equivalent is **better**, because the "fixture list" is published by the government a year in advance:

| Role (SportsWise analog) | Source | Cost / auth |
|---|---|---|
| The fixtures — Fed (TuneInCard) | **FOMC meeting calendar** — federalreserve.gov, published yearly | Free, static, no API needed |
| The fixtures — CPI / jobs | **BLS release schedule** — bls.gov | Free, static |
| The fixtures — earnings | Earnings calendar API (Finnhub / FMP) | Free tier, keyed |
| The base scoreboard (ESPN's role) | **Finnhub** — leading candidate: real-time US quotes, earnings calendar, company news on free tier (60 calls/min) | Free tier, keyed, server-side |
| Macro grounding (GUMBO's role) | **FRED** (St. Louis Fed) — rates, CPI, unemployment, yields; authoritative government series | Free key, generous |
| Fallback / enrichers | FMP (250/day), Twelve Data (800/day), Stooq (keyless EOD CSV), Yahoo (keyless but ToS-gray) | Free tiers |
| Likely NOT worth it | Alpha Vantage (now ~25 req/day) and Polygon free (5/min, EOD-only) — too tight | — |

**COGS insight:** an education app doesn't need tick data. One server-side market-pulse fetch every few minutes during market hours, cached in Upstash, serves every user — near-zero marginal cost, same shape as the SportsWise caching story. Volatility spikes (the acquisition events) don't spike our API bill.

**Phase 1 verifies all of this empirically** — free tiers drift; run the `DATA_SOURCES.md` methodology (live curl probes, ranked by value × testability) and bank it as `STOCKWISE_DATA_RECON_BANK.md` before committing. Architecture is the same registry: base provider + optional enrichers merging into one normalized shape, best-effort degradation.

---

## 6. Curriculum v0 — the four personas, translated

The `route.ts:200` ladder ("difficulty changes WHAT is taught, not tone") maps cleanly:

| Tier | Sports version | Finance version — what is taught |
|---|---|---|
| **Kid/Rookie** | the rule / outcome (WHAT) | What a stock *is* (a tiny piece of a company). What "the market went up" means. What a ticker is. |
| **Beginner** | what it MEANS | Why prices move (buyers vs sellers reacting to news). What earnings are. What an index is (S&P 500 = a basket). Who the Fed is and why anyone cares. Dividends. |
| **Intermediate** | the craft / SKILL | Reading a quote and a chart (OHLC, volume, 52-wk range). P/E and market cap. Sectors. How "beat expectations" actually works (estimates vs. actuals vs. guidance). Bonds and yields, diversification. |
| **Expert** | the WHY behind the WHY | Why stocks fall on good earnings (expectations were higher; guidance rules). Rates → discount rates → why growth stocks feel Fed moves hardest. The yield curve. Liquidity and positioning. CPI → Fed → everything linkage. |

**Academy game mapping** (per the FEATURE_IDEAS generalization list, on the `ScoreScenario` shape):
- term-matching → **finance glossary** (~100 terms, 4-tier definitions — the first content pack I author)
- read-the-score → **read-the-quote** (structured quote board: price/change/%/volume/range — "which number tells you X?")
- read-the-play → **read-the-chart** (already named in FEATURE_IDEAS; candle/line scenarios: "what happened at the open?")
- who's-this-player → **who's-this-company** (CrestRush pattern: description/logo → ticker)
- higher-or-lower → **which is bigger?** (live market caps — the standings-data pattern)
- make-the-call → **you-make-the-call** ("Earnings beat, stock fell 5% — why?" judgment scenarios)
- daily / rapid-fire / this-or-that → already topic-neutral

**Content rules that port verbatim:**
- The `readTheScore.ts` evergreen rule → *every scenario teaches a MECHANISM — never real returns, never "company X is good," never predictions.* Real tickers appear only on live-grounded surfaces with real data attached. (This is also how the guardrail stays enforced at the content layer, not just the prompt layer.)
- The authoring-standard distractor rule → *every wrong option is punished by a specific, named mechanism, declared before placement* ("that's guidance, not the EPS number, and here's why the market cares more").
- Pure data libs, zero RN imports; boards are structured data, never JSX; art lives separately.
- The pre-placed one-line Pro seams (`poolForLevel(bank, isPro ? level : capFree(level))`) ship *from day one* on StockWise — finance monetizes; intermediate/expert tiers are the natural gate (the banked Academy-Pro thesis).

**MVP surface note:** markets don't have plays the way sports do — the "play" is the day. So the MVP live surface is a **Today tab**: market pulse (indices + biggest movers), *this week's fixtures* (earnings/Fed/CPI — the TuneInCard analog), and the **market-close recap** ("why everything was red today" — the north-star surface, daily cadence, cheap to serve). The per-event intraday loop (halts, Fed statement drops) comes after MVP.

---

## 7. Phase plan (gated, per the BUILD-doc working model)

| Phase | What | Gate |
|---|---|---|
| **0. Decisions + day-zero** | Anthony decides §8; then the day-zero API-first script: repo, Expo scaffold, RC project, ASC app record (reserves the name), Vercel project | Name cleared + repo exists |
| **1. Data recon** | Live curl probes of Finnhub/FMP/Twelve Data/Stooq/FRED + static FOMC/BLS calendars → `STOCKWISE_DATA_RECON_BANK.md` | Base provider + enrichers chosen on evidence |
| **2. Core port** | Copy the ~15 clean files + PROVENANCE.md; re-derive backend (dataProvider registry + llmProvider + finance personas + guardrail clause); app shell: Today · Academy · Settings | App boots; one hello-world explanation grounded in a real quote |
| **3. Content pack v1** | Glossary (4-tier), quiz bank, read-the-quote bank, 2–3 games registered; `marketContext` prompt map | **Reviewer sign-off** (the finance-literate friends) |
| **4. Live loop MVP** | Today tab: market pulse + week's fixtures + market-close recap; caps + paywall armed | Anthony passes the naive-user test on a real market day |
| **5. Daily lesson generator** | Yesterday's event → today's quiz (the novel thesis; rides the Academy registry) | Post-MVP |

Working model carries over from `HANDOFF_COACHES_CORNER.md` §HOW WE WORK: Anthony runs all git; gated build docs per feature; HTML-spike-first for any visual module (read-the-chart will get a spike before RN port).

---

## 8. Decisions — LOCKED 2026-08-02 (Anthony sign-off)

1. **Name: StockWise.** ✅ Decided. Day-zero probe found an exact-name "Stockwise" (indie, Finance) on the App Store — listing names are unique full strings, so the ASC listing name needs a suffix (recommended: **"StockWise: Learn the Market"**); the name under the icon stays "StockWise". MarketWise was off the table anyway (trademark conflict — MarketWise, LLC, publicly traded financial publisher).
2. **Repo: `~/projects/stockwise`.** ✅ Created 2026-08-02 — Next 16.2.12 backend at root + `stockwise-mobile/` Expo SDK 54 three-tab shell. See its `DAY_ZERO.md` for the infra checklist.
3. **Extraction strategy: greenfield + provenance (option C).** ✅ Signed off. SportsWise untouched until its next natural major; `PROVENANCE.md` in the new repo tracks every copied file.
4. **Reviewer recruitment** (still open, Anthony's alone): 2–3 finance-literate friends willing to review content packs. Doesn't block phases 0–2; blocks the phase 3 gate.
