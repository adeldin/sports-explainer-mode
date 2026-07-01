# SportsWise — Project Handoff & Orientation
*Regenerated 2026-06-30 from the repo (not from memory or prior docs). Where this and older handoffs disagree, this reflects **repo reality**. Supersedes the 2026-06-29 version (which listed tennis as a future v1.4 item — tennis SHIPPED in v1.3).*

Read **§7 (Working model)**, **§4 (current state)**, and **§11 (principles)** first if you read nothing else.

---

## 1. THE APP

**SportsWise** — a live iOS sports-explainer app. Tagline: **"Watch and ask why."** It teaches casual viewers what's happening in a live game, in real time, at their chosen difficulty level (Rookie / Beginner / Intermediate / Expert), in 10 languages.

**North star:** *"Duolingo meets Khan Academy for sports."* Every feature must **TEACH the game**. The explicit failure mode is **"becoming a scoreboard"** — showing data without teaching. Test for any feature: does it help a sports-curious newcomer understand and feel they belong?

**Origin:** Anthony (founder, exercise-science professor) felt like an outsider at a Chicago Hounds MLR rugby game. SportsWise is the app that would have helped.

**Version:** **v1.3.0** (App Store release, June 2026). Repo root: `/Users/anthonydeldin/Desktop/sports-explainer-mode/`. Mobile app: `sports-explainer-mobile-v2/`. Backend: `src/app/api/`.

---

## 2. TECH STACK

- **Mobile:** React Native / **Expo SDK 54** (`sports-explainer-mobile-v2/`). Bundle ID **`com.adeldin.sportswise`**. EAS project `5019919d-136b-46ec-8cf7-259dd6259e8f`. Build/version: `app.json` `version: "1.3.0"`; **no manual `buildNumber`** — `eas.json` uses `appVersionSource: remote` + production `autoIncrement: true`, so EAS assigns build numbers. RevenueCat for IAP.
- **Backend:** **Next.js on Vercel** (`src/app/api/explain/route.ts` is the workhorse + sibling routes `leaderboard`, `tennis-live`, `feedback`). ⚠️ **Instant-deploy risk:** every push to the backend is live on prod immediately — there is no staging gate. Backend changes reach ALL current app versions at once (they affect explanation TEXT, not the binary).
- **AI:** **Groq** (primary) via `llmProvider.ts`. `GROQ_MODEL` env var selects the model; **code default is `llama-3.3-70b-versatile`** (`route.ts:11`). Prompts are tuned for **`openai/gpt-oss-120b`** (the intended prod value, set via the Vercel `GROQ_MODEL` env var — not hardcoded; verify in Vercel). **Gemini fallback** (`gemini-2.5-flash`) via `LLM_FALLBACK_PROVIDER=gemini` (default `none`). Vision uses a separate OpenAI/Groq vision provider.
- **Data sources:** **ESPN** (free/keyless site-API + core-API), **RapidAPI** (`live-golf-data` for golf, `tennis-api-atp-wta-itf` for tennis live points — one shared `RAPIDAPI_KEY`, separate per-API quotas), **MLB StatsAPI** (`statsapi.mlb.com`, GUMBO pitch data — keyless), **Highlightly** (soccer match events, keyed).
- **Cache:** **Upstash Redis** via raw REST fetch (no SDK — the `@upstash/redis` SDK breaks `next build`). Master kill-switch `CACHE_ENABLED` (see §6).

---

## 3. SPORTS & LIVE SURFACES

14 sports in the mobile `SPORT_CONFIG` (`lib/scoreboard.ts`). Backend routing lives in `route.ts` (`espnConfig`) + `dataProvider.ts` (`ESPN_CONFIG` + enricher registry).

| Sport | ESPN sport/league | Surface | Enricher |
|---|---|---|---|
| MLB | baseball/mlb | Live-explain | **GUMBO** (pitch type/velocity/zone) |
| NFL | football/nfl | Live-explain | — |
| NBA | basketball/nba | Live-explain | — |
| WNBA | basketball/wnba | Live-explain | — |
| NHL | hockey/nhl | Live-explain | — |
| Soccer (MLS) | soccer/usa.1 | Live-explain | **Highlightly** (match events) |
| World Cup | soccer/fifa.world | Live-explain | **Highlightly** |
| EPL | soccer/eng.1 | Live-explain | **Highlightly** |
| La Liga | soccer/esp.1 | Live-explain | **Highlightly** |
| Rugby (URC) | rugby/270557 (core API) | Live-explain | — (core API, identity only — ESPN exposes no rugby play-by-play) |
| MLR | rugby/289262 (core API) | Live-explain | — |
| **Tennis** | tennis/atp | **`learnMode` + `liveFormat:'tennis'`** | ESPN singles list (keyless) + **RapidAPI** live-point enrichment |
| **Golf** | golf/pga | **`learnMode` + `liveFormat:'leaderboard'`** | **RapidAPI** `live-golf-data` |
| Cricket | — | `learnMode` only (no ESPN scoreboard) | — |

- **Enricher pattern** (`dataProvider.ts`): `getGameData(sport, gameId)` = ESPN base + optional per-sport enricher merge (`{...base, ...depth}`). Registered: soccer family (soccer/worldcup/epl/laliga) → `highlightlyEnricher`, MLB → `gumboEnricher`. Best-effort (enricher failure → ESPN base).
- **`liveFormat`** is orthogonal to `learnMode`: tennis/golf keep `learnMode:true` (Academy/FAQ/ask stay) AND gain a live surface. Tennis live comes from `/api/tennis-live` (ESPN list + RapidAPI overlay); golf from `/api/leaderboard` (RapidAPI). Both are parallel providers, not enrichers.

---

## 4. CURRENT STATE (TL;DR)

**Live on the App Store as v1.3** — the biggest release since launch. Since the last shipped build (1.2.0), v1.3 adds **live tennis, the Coach's Corner tab, the golf live leaderboard, soccer formation diagrams, the Worth Noting callout, the feedback button**, plus backend upgrades (**GUMBO** MLB pitch data, the **situation-not-player** tennis rework, and prompts tuned for **gpt-oss-120b**). The **situation cache is built but deliberately OFF**. Working tree is clean (all app/backend code committed at HEAD `0c969c5` on `main`); only untracked docs/artifacts remain at the repo root (§9, §10).

---

## 5. FEATURE INVENTORY (as of v1.3)

**Bottom tabs (`App.tsx`):** **Live** · **Coach's Corner** · **Academy** · **Settings**.

- **Live explanations (the core loop):** for a selected live game, `PlayCard.tsx` renders THE PLAY → WHY IT MATTERS → THE RULE (conditional) → **💭 WORTH NOTING** (conditional) → live Q&A. Difficulty-scaled, 10 languages. Below it, **`CoachCard`** — the live strategic read (free "state" hook; Pro "full" Groq read on expand) for the data-rich sports (NFL/NBA/WNBA/MLB + soccer via the deterministic pulse); other sports show "coming soon."
- **💭 Worth Noting** (v1.3): optional general-context callout appended to explanations across MLB/soccer/NFL (shared `buildUserPrompt`) and golf/cricket (`buildLearnUserPrompt`) — empty on routine plays, never invents specifics (inherits the CRITICAL GROUNDING RULE; excluded from cached generic teaching so it stays team-agnostic). Tennis has its own guarded version (situation/general-knowledge only, never narrates the player).
- **🎾 Live tennis** (v1.3, the marquee): filterable ATP/WTA singles list (flags, seed, round, court, live set/game scores, serve dot, All/Men's/Women's filter) → tap a match → a `TennisLiveCard` situational read grounded in the real score. ESPN supplies the list; RapidAPI enriches the selected match (server / current-game points / hold-break timeline), name-joined + orientation-mapped to ESPN. Gated by `TENNIS_LIVE` (see §6).
- **⛳ Golf live leaderboard** (v1.3): real-time board (`GolfLeaderboard.tsx`) with tappable headers/cells that reveal 4-level teaching concepts. Most-recent-tournament fallback, collapse/expand.
- **📋 Coach's Corner tab** (v1.3): a proactive learning hub. Sport strip → pieces per sport → full-screen play. **Pieces:** Make the Call (judgment quiz), Formations (soccer), Read the Play (soccer). **`CC_CANDIDATES` = Soccer, MLB, NFL.** Make-the-Call banks (`makeTheCall.ts`) exist for **mlb / soccer / nfl**, each with **2 beginner + 2 intermediate** scenarios (⚠️ **no kid/expert scenarios authored yet**). Soccer always shows (level-independent formations/read-the-play). **Grey-out (v1.3):** `coachesCornerSports(level)` returns ALL candidates with an `enabled` flag; MLB/NFL render **dimmed + untappable** at Rookie/Expert (no scenarios at those levels) with a hint line ("MLB & NFL available at Beginner & Intermediate"), instead of disappearing. Selection guards to first-enabled so a disabled sport can never become active.
- **🎓 Academy:** Duolingo-style games hub (quizzes, Match Up, glossaries for all sports, progression/rank). Not cap-gated.
- **💡 Feedback button** (v1.3): one-tap lightbulb on each explanation → `/api/feedback` (Upstash, best-effort, ungated — independent of `CACHE_ENABLED`).
- **Caps / Pro gating** (`lib/caps.ts` + `lib/entitlement.tsx`): **`DAILY_FREE = 5`** play-explanations per local day; **`QA_FREE_PER_GAME = 3`** follow-up answers per game. Pro/trial bypasses both (`isPro` → `Infinity`). Same-play 60s refreshes reuse an already-counted key (free). Coach's Corner + Academy are **not** cap-gated. `DEV_FORCE_PRO = false` (only ever active under `__DEV__`, never prod).

---

## 6. BACKEND / ENV STATE

Env vars the backend reads (grep of `src/app/api/explain/`):

| Var | Purpose | Default (code) / prod state |
|---|---|---|
| `GROQ_MODEL` | Groq model id | default `llama-3.3-70b-versatile`; **prod set to `openai/gpt-oss-120b`** via Vercel env (prompts tuned for it) |
| `GROQ_API_KEY` | Groq auth | required |
| `LLM_FALLBACK_PROVIDER` | `gemini` enables fallback | default `none` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_BASE` | fallback provider | `gemini-2.5-flash` |
| `TENNIS_LIVE` | tennis live kill-switch | **code default OFF** (`=== '1'`); **prod = ON** (flipped in Vercel for the v1.3 tennis launch) |
| `CACHE_ENABLED` | master cache kill-switch | **default OFF** (`=== '1'`); **prod = OFF by design** (vivid named explanations sell better at zero downloads; flip on when the Groq/Gemini bill climbs) |
| `CACHE_DEBUG` | `[cache]` logs | off |
| `RAPIDAPI_KEY` | golf + tennis providers | required for golf/tennis live |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | cache + feedback store | required |
| `HIGHLIGHTLY_API_KEY` / `_BASE` | soccer enricher | keyed |
| `VISION_PROVIDER` / `VISION_MODEL` | analyze-the-screen (premium #2) | vision provider |

Namespaces (`explanationCache.ts`): `ASK_NS='v1'` (Q&A cache), `EXPLAIN_NS='v2'` (soccer situation cache — bumped from v1 to abandon old team-named entries). When ON: caches a Q&A ('ask') response (all sports) + a soccer live-explain situation read (English-only), with team-agnostic generic teaching.

---

## 7. WORKING MODEL & CONVENTIONS

- **Two-instance workflow:** a **Claude.ai "architect"** writes gated build docs (recon-first, one gate at a time); **Claude Code** (this instance, on the Mac) executes; **Anthony runs ALL git himself** — Claude Code NEVER commits/pushes. Claude Code hands back explicit `git add <paths>` targets.
- **Recon-first, gated builds:** every change starts with a **read-only recon** (map the real code), then a **gated build** (STOP at each gate, show diffs, `tsc --noEmit` clean before proceeding). Don't work from memory — the repo is ground truth.
- **Git hygiene:** explicit file paths in `git add` (**never `git add .`**); no stray root-level `.ts` files (they break the Vercel type-check — the "strategy_tips" 2-hour outage); markdown/zip at root are harmless to the build.
- **Critical rails:**
  - `lib/api.ts:36` `API_URL` must stay the **prod URL** — a LAN IP left in the binary breaks the app for everyone. (Currently correct: `https://sports-explainer-mode.vercel.app/api/explain`.) Revert any local-test LAN swap before building.
  - **Backend = instant-live.** A prod deploy changes explanation text for all users immediately; there's no rollback gate. Guard risky changes behind an env kill-switch (the `TENNIS_LIVE` / `CACHE_ENABLED` pattern).
  - Never ship `DEV_FORCE_PRO` enabled; don't touch caps/entitlement numbers without intent.
  - No `@upstash/redis` SDK (breaks `next build`) — use raw REST fetch.
- **Testing:** backend via curl against prod (or local `next dev` for gated pre-prod checks); mobile on-device via **Expo Go** (point at prod, or temporarily at the Mac's LAN IP for local-backend testing, then revert `api.ts:36`).

---

## 8. WHAT SHIPPED IN v1.3 (changelog since 1.2.0)

New-to-users in the binary (all Jun 26–30):
1. **Live tennis** — full stack: ESPN singles list + RapidAPI live-point enrichment + `TennisLiveCard` + situational read.
2. **Coach's Corner tab** — Make the Call / Formations / Read the Play + the live `CoachCard` strategic read.
3. **Golf live leaderboard** + 4-level tappable teaching layer.
4. **Soccer formation diagrams + Read-the-Play quiz.**
5. **💭 Worth Noting** callout (all sports) + the feedback lightbulb.
6. **Tennis "situation-not-player" rework** — the read describes the score situation + general game knowledge and NEVER narrates a player's live actions (we can't see the court); narrow live-claim regex backstop + regen + deterministic fallback.
7. **Coach's Corner grey-out** — MLB/NFL dimmed (not hidden) at Rookie/Expert with a hint line.
8. **Tennis UX polish** — full-width hairline divider + orange "CURRENT SELECTION" eyebrow.

Backend (already live on prod, reaches all app versions): **GUMBO** MLB pitch data in explanations; **gpt-oss-120b** model + prompt tuning; golf cache TTL 45→80s; the whole tennis explanation pipeline.

---

## 9. OPEN / BANKED WORK

- **Coach's Corner visual engines** — animated X's-and-O's / whiteboard plays. See **`COACHES_CORNER_VISUAL_ROADMAP.md`** (+ `COACHES_CORNER_IDEAS.md`).
- **Rookie/Expert Make-the-Call scenarios** — author kid+expert banks for mlb/soccer/nfl (currently beginner+intermediate only; the grey-out is the interim UX). Alternative: make the level filter fall back to the nearest level.
- **MLB structured situation cache** — rides GUMBO's `getGameData` reroute; a v2 sig from count/outs/bases. Deferred.
- **Rugby data unlock** — ESPN exposes no rugby play-by-play; the real teaching loop needs **Opta / Stats Perform** (or a probe of RapidAPI "Rugby Micro"/events feeds). Tied to the Hounds/MLR investor thesis. Recon-gated on a live tournament window.
- **Worth Noting frequency tuning** — watch how often the model fills it; tune the "empty when nothing warranted" instruction if it's too chatty/sparse.
- **Platform extraction** — the "[Topic]Wise" family vision (see FEATURE_IDEAS).
- **Minor hygiene:** make ESPN game-selection robust (`String(e.id) === String(gameId)` — the soccer/MLB/dataProvider paths use strict `===`, which drops a *numeric* `gameId` → fallback "A key play just happened"; the rugby paths already cast); **delete/merge the stale `worth-noting-and-gptoss` branch** (its work is already on `main`); commit or gitignore the untracked root docs; delete the stray `sports-explainer-1.0.1.zip` and `coaches-corner-spikes/`.

---

## 10. DOCS CATALOG (repo root)

**Roadmap/status:** `FEATURE_IDEAS.md` (the master roadmap — recently corrected to mark tennis SHIPPED), `MONETIZATION.md`, `DATA_SOURCES.md`, `README.md`, `AGENTS.md` / `CLAUDE.md` (project instructions).
**Coach's Corner:** `COACHES_CORNER_VISUAL_ROADMAP.md`, `COACHES_CORNER_IDEAS.md`, `HANDOFF_COACHES_CORNER.md`, `BUILD_COACHES_CORNER_TAB.md`, `BUILD_COACHES_CORNER_GATE5.md`, `BUILD_COACHES_CORNER_GATE5F.md`, `BUILD_soccer_coachs_corner.md`, `BUILD_MAKE_THE_CALL.md`.
**Build docs:** golf (`BUILD_GOLF_*`), GUMBO (`BUILD_GUMBO_ENRICHER*`), cache (`BUILD_SITUATION_CACHE_v1.md`, `BUILD_CACHE_v2_*`), academy (`BUILD_academy_*`, `BUILD_progression_phase1.md`), `glossary_content_package.md`, `FEATURE_IDEAS_DOCS_PASS_2026-06-29.md`.
**Prior handoffs:** `HANDOFF.md`, `SPORTSWISE_HANDOFF_2026-06-30.md` (this file supersedes the dated handoff copies).
**Untracked at root** (not yet committed — `git status`): many of the `BUILD_*` docs above, `COACHES_CORNER_VISUAL_ROADMAP.md`, `FEATURE_IDEAS_DOCS_PASS_2026-06-29.md`, both `SPORTSWISE_HANDOFF*.md`, `coaches-corner-spikes/`, and `sports-explainer-1.0.1.zip` (a build artifact — safe to delete).

---

## 11. GOVERNING PRINCIPLES

- **"Does this feature earn its place?"** — every feature must teach the game, not just show data.
- **"Come for live, stay for the rest."** Live is the acquisition hook (expensive — every play is a Groq call — and time-bounded); the Academy / Coach's Corner / glossaries are the cheap, evergreen retention + revenue engine. When the free live cap hits, the app hands users to those surfaces (which are not cap-gated).
- **"Becoming a scoreboard is the failure mode."** Data without teaching is the thing to avoid.
- **Data-ceiling reality.** The moments people most want explained (a controversial offside, a specific call) are exactly the ones thin free feeds describe worst. Lean on event-triggered concept teaching + vision-on-screen, not on chasing live-event data the free sources don't expose. Never fabricate specifics the feed doesn't carry — the honesty guardrails (tennis situation-not-player, the CRITICAL GROUNDING RULE, GUMBO's "only what's given") exist to enforce this.
- **The differentiator is teaching the game, not reporting the stats.** Depth + daily habit first, gating second — a Pro paywall is only as valuable as the free half is good.
