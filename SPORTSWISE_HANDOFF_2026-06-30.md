# SportsWise — Project Handoff & Orientation
*Updated 2026-06-30 (~late evening June 29 / into June 30). Read top-to-bottom to be fully oriented. Supersedes the 2026-06-29 handoff (which predated tonight's feedback button, cap redirect, and header cleanup — all now SHIPPED).*

---

## ⏰ IMMEDIATE PRIORITY (time-sensitive) — TENNIS DATA RECON WHILE WIMBLEDON IS LIVE

**Wimbledon is LIVE right now (June 30; tournament runs ~through July 12).** Tennis data recon has been blocked all along because nothing was live at probe time (the tennis endpoints 404'd / returned empty). **A live match is the window to confirm whether tennis can support the live explain path — do this recon first, while a match is in progress.**

**Goal (confirmed with Anthony):** FULL LIVE EXPLAIN PATH — tennis plays explained like baseball/soccer (not just scores, not a golf-style leaderboard view). So the recon must prove the data is rich enough to explain a *point/game/situation*, not just show a scoreline.

**Data source:** Likely the **RapidAPI `tennis-api-atp-wta-itf`** already in the stack (used elsewhere) — but CONFIRM in recon, don't assume. There may be a better live-point-data source. ESPN's free API is the default for other sports but tennis play-by-play depth is unknown — check it too.

**What the recon must answer (this determines whether tennis is buildable):**
1. Does a live tennis source expose **point-by-point / game-by-game live state** (current server, score within game like 30-15, set score, who won the last point and how — ace/winner/error/break point)? Or only match-level scores?
2. Is there enough **situational texture** to explain a play the way GUMBO gives baseball the actual pitch? (e.g. "break point at 4-5, server double-faulted" vs just "6-4 6-3"). **This is the make-or-break finding** — like rugby, if the data is thin (ESPN exposes ~zero play-by-play for some sports), tennis explanation quality is capped at the data, not the prompt.
3. What's the normalized shape — can it map into the app's existing `NormalizedGameData` / explain pipeline like the other sports?
4. Is the source best-effort safe (degrades to scores if live-point data missing), and what's the cost/rate-limit profile (RapidAPI quota)?

**Discipline (same as every data integration this project):** PROVE the data before building. 404/empty = defer, not block. Recon-first, output-neutral, one gate at a time. If the live data is rich → scope the build (likely a tennis enricher + explain-path wiring, mirroring GUMBO/soccer). If it's thin → bank the finding (like rugby) and defer; don't ship a tennis explainer that can only say the score.

**Why now:** This is recon, NOT a build, so it is NOT blocked by the July 1 EAS quota. The ONLY thing gating it is a live match — which exists right now. Miss this window and it waits for the next live tennis.

---

## WHAT SHIPPED TONIGHT (June 29 → into June 30) — all committed + pushed

1. **GUMBO — DONE, LIVE.** MLB pitch-data enricher (real pitch type/velocity/zone/result woven into live MLB explanations). Gates 3/4/5 all verified on live games. Backend (Vercel) — already reaching App Store users. Commits `ec8216c`, `75fb145`.
2. **Situation cache — BUILT, DEPLOYED, deliberately OFF.** Q&A cache (all sports) + soccer situation cache (English only). Master kill-switch `CACHE_ENABLED` (default OFF). Backend, in production but dormant. Commits `34a7315`, `eb8cd7b`, `436ea80`. **Flip ON when cost pressure warrants (real download volume hitting Groq) — it's the lever to safely allow more free live plays.**
3. **Feedback button — SHIPPED end-to-end.** One-tap "I learned something" lightbulb on the PLAY card (THE PLAY only). Backend `/api/feedback` (writes to Upstash UNGATED — independent of `CACHE_ENABLED` — best-effort never-500, verified in Upstash). App-side lightbulb with play-keyed state in LiveScreen (resets per play), localized en/es + 8 EN-fallback, discoverable copy ("Did this help you learn? (tap the lightbulb)"). Commits `fa8c456` (endpoint), `194ed9f` (app-side).
4. **Cap-hit redirect — SHIPPED.** The dead-end 5-free-play paywall is now a Pro-FIRST card: filled orange "Keep going with Pro →" primary, plus two orange text-link redirects to still-free teaching ("Test your knowledge in the Academy 🎓 →" / "Learn strategy in the Coach's Corner 📋 →"). Reworded body (en/es only — preserved 8 real translations). No cap number / metering changed. Commits in the `a40b2bc` range.
5. **Header LIVE pill — REMOVED.** Was redundant with per-game LIVE labels (and over-showed on scheduled/final games). Cleaner header. Commit `011f786`.

---

## CURRENT STATE OF v1.3 (cuts July 1 when EAS quota resets)

**Version bumped to 1.3.0 on 2026-06-27 (`892fcb1`). No git tags exist — Anthony doesn't tag builds (consider `git tag v1.3.0` at cut time for clean future changelogs).**

**App-side features shipping IN the v1.3 binary (new to users on update):**
- **Coach's Corner** — the full tab (Make the Call, Formations, Read the Play, Groq strategic read, the Coach's Read card). *Anthony flagged he wants a deliberate launch-readiness test pass before the cut — confirm it's solid on-device.*
- **Golf** — live leaderboard, teaching layer (tappable headers/cells), collapse/expand, status labels.
- **Soccer formation diagram + read-the-play quiz.**
- **Feedback button, cap redirect, header cleanup** (tonight's work, above).

**Already live via backend (NOT gated on v1.3):** GUMBO, the cache (OFF), `/api/leaderboard`, `/api/feedback`.

**NOTHING from this session is stuck waiting for v1.4 — every app-side thing built rides v1.3.** The only "waiting" items are things NOT YET BUILT (tennis, rugby, onboarding) — deliberate sequencing, not forgotten work.

---

## PENDING / TODO

- **[TIME-SENSITIVE] Tennis data recon — Wimbledon live NOW** (see top). Full explain path is the goal.
- **Apply the 8 FEATURE_IDEAS edits** from `FEATURE_IDEAS_DOCS_PASS_2026-06-29.md` to the repo's `FEATURE_IDEAS.md` via Claude Code + commit (pure docs, no deploy, no rush). Includes Edit 8 = the strategic thesis (below).
- **June 30 cut-prep** (not blocked): pre-flight test pass (esp. Coach's Corner launch-readiness), draft App Store release notes, optionally `git tag v1.3.0`.
- **July 1:** cut EAS v1.3 build + submit.
- **July 4+:** rugby Nations Cup data recon (probe for a real events feed — Highlightly = context not events; Opta is the real unlock).
- **Onboarding** — only buildable retention item left (app-side, no live-event dependency). Bigger build; if done + tested before July 1, could ride v1.3.
- **Cache-on** — flip `CACHE_ENABLED=1` in Vercel when cost pressure warrants.

---

## STRATEGIC THESIS (banked this session — "come for live, stay for the games")

Live-explain is EXPENSIVE (every play = a Groq call; it's what hit the 100k/day wall) and TIME-BOUNDED (a game ends). The Academy/games/Coach's Corner are CHEAP, EVERGREEN, GAMEABLE. So: **live = the acquisition hook; Academy/games/Coach's Corner = the retention + revenue engine.** The free live cap hands users off to these (uncapped) surfaces — "come for live, stay for the games." **Discipline: depth + daily-habit FIRST, gating SECOND** (a paywall's value ∝ the free half's quality; don't gate content you don't have). **Cost-link:** cache-on is what would let you be more generous with free live plays safely (a cached play ≈ free). Full version is Edit 8 in the docs-pass file.

---

## STACK / KEY FACTS

- **Mobile:** React Native, Expo SDK 54, EAS (project `5019919d-136b-46ec-8cf7-259dd6259e8f`, account `adeldin`). Repo `/Users/anthonydeldin/Desktop/sports-explainer-mode/`, mobile in `sports-explainer-mobile-v2/`. Bundle `com.adeldin.sportswise`. App Store ID `6781028656`.
- **Backend:** Next.js / Vercel (`sports-explainer-mode.vercel.app/api/`). **Deploys to live users INSTANTLY — confirm Vercel GREEN after every backend push. App-side ships only in EAS builds.**
- **AI:** Groq / Llama 3.3 70B (Gemini fallback armed). **Data:** ESPN free API (+ RapidAPI golf/tennis, MLB StatsAPI keyless, Highlightly PRO). **Cache:** Upstash Redis (REST, no SDK). **IAP:** RevenueCat (entitlement `pro`, lowercase; trial users → isPro true).
- **Brand:** navy `#0d1b3e`, orange `#E87722`, amber `#F5A623`, teal `#14B8A6`. Space Grotesk. 4 difficulty levels (`'kid'|'beginner'|'intermediate'|'expert'`; `'kid'` displays "Rookie"). 14 sports. 10 locales (en/es real, 8 EN-fallback). Caps: `DAILY_FREE=5` explain/day, `QA_FREE_PER_GAME=3`.
- **Safety rails:** `caps.ts` / `entitlement.tsx` — don't change cap numbers casually. `DEV_FORCE_PRO` (entitlement.tsx) — dev-only, never commit true, never `git add` that file.

---

## HOW WE WORK (two-instance model)

- **Claude.ai (the chat) = architect/reviewer.** No repo access. Writes "📋 PASTE INTO CLAUDE CODE" / "📋 RUN IN TERMINAL" blocks, reviews output, makes design calls. **Recon-FIRST always** (especially on the live path) — prove before building, one gate at a time.
- **Claude Code = executor** on Anthony's Mac. Recon-first, stops at gates, **NEVER runs git.**
- **Anthony relays + runs ALL git himself** (explicit file paths, never `git add .`). Tests on-device via **Expo Go** (`cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2 && npx expo start -c`, press `r` to reload).
- **Key learnings:** Recon before touching unfamiliar code. Output-neutral on the live explain path (byte-identical when unenriched). No stray root `.ts` files (breaks Vercel build). Display-rename, freeze internal values. When rewording an EXISTING localized string, check if it's already translated before applying EN-fallback. Prove data before building — 404/empty = defer not block. Anthony works as long as he can; don't prompt him to stop.
