# 📋 FEATURE_IDEAS.md — Docs-Pass Edits (2026-06-29)

**For Claude Code to apply to `/Users/anthonydeldin/Desktop/sports-explainer-mode/FEATURE_IDEAS.md`. Anthony commits.**

This brings the stale June-27 roadmap up to date with what shipped since: golf (full), GUMBO (done), the situation cache (built + deliberately OFF), and the tennis/rugby/offside findings. Each edit below is a precise find → replace. Apply them in order. Nothing here changes app/backend code — it's a markdown doc at the repo root (not type-checked, safe).

When done: `git add FEATURE_IDEAS.md` (explicit path — never `git add .`), commit, done. No Vercel concern (markdown doesn't deploy).

---

## EDIT 1 — Add a "since launch / recently shipped" status block under the milestone header

**FIND** (the milestone block near the top, ends at the `---` after "remaining items are post-launch."):

```
> v1.0 launched FREE (build 11): four-level explanations, ~14 sports, Academy (579-question
> quiz + facts + FAQs), local quiz-reminder notification, English + Spanish. Freemium is the
> v1.1 plan (see MONETIZATION.md). Everything below marked "road to launch" is now DONE unless
> noted; remaining items are post-launch.

---
```

**REPLACE WITH:**

```
> v1.0 launched FREE (build 11): four-level explanations, ~14 sports, Academy (579-question
> quiz + facts + FAQs), local quiz-reminder notification, English + Spanish. Freemium is the
> v1.1 plan (see MONETIZATION.md). Everything below marked "road to launch" is now DONE unless
> noted; remaining items are post-launch.

> **🟢 STATUS UPDATE — 2026-06-29.** Live on the App Store with subscriptions (Pro monthly/annual,
> 7-day trial, RevenueCat wired). **v1.3 staged** (golf live leaderboard + golf teaching layer +
> Coach's Corner tab + all-sports CoachCard stale/collapse fix), targeting a ~July-1 cut (EAS free
> build quota resets July 1; chose to wait rather than upgrade). Shipped since June 27 and now
> crossed off below: **soccer formation diagram + read-the-play quiz**, **golf live data (full) +
> golf teaching layer**, **tappable stat glossary mechanic**, **Coach's Corner tab**,
> **GUMBO (MLB pitch-data enricher) — DONE, all gates live+verified**, **situation cache —
> built + deployed but deliberately OFF** (see the CACHE section). Zero downloads by choice — GTM
> is event-timed (soccer friends at v1.3/World Cup, tennis at v1.4/Wimbledon, rugby at a tournament,
> broad outreach held until more built out). **Deliberate launch posture: cache OFF → every
> explanation is vivid + named + live** (vivid sells better with no users; flip the cache on when
> the Gemini bill climbs).
>
> _Cleanup note: a stray `sports-explainer-1.0.1.zip` sits untracked at the repo root — harmless
> (it's a zip, not a `.ts`, so it can't break the Vercel build), but worth deleting or gitignoring
> so it doesn't linger. (Reminder: only stray root `.ts` files break the build — the strategy_tips
> 2-hour outage — `.md`/`.zip` at root are harmless.)_

---
```

---

## EDIT 2 — Rewrite TIER 1 (everything except rugby/cricket has shipped)

**FIND:**

```
### 🥇 TIER 1 — DO NOW *(unblocked, in-season, high-value)* — in build order:
1. **Soccer formation diagram** — **FIRST build.** Data-driven visual; verifiable on finished-game data; no AI cost. → detail in *STRATEGY — visuals* (Tier 4 / Reference).
2. **Tennis live-data adapter + Coach's Corner** — in-season NOW (Wimbledon); point-by-point feeds classify point-meaning (break/set point) = gold for watch-and-ask-why; seize the window. → detail in *Per-sport data upgrade roadmap* (Tier 4) + *Coach's Corner — team sports vs. individual sports* (Active Build Detail).
3. **Golf live-data adapter** — in-season (tournaments most weeks); Slash Golf free hole-by-hole. → detail in *Per-sport data upgrade roadmap* (Tier 4).
4. **Tappable stat glossary** — cheap, static, on-mission; generatable from the 206-term glossary. → detail in *FEATURE — Tappable Stat Glossary* (Active Build Detail).
5. **GUMBO / MLB Statcast** — **LAST Tier-1 (biggest build).** Baseball live daily; enables the strike-zone visual. → detail in *Per-sport data upgrade roadmap* + *STRATEGY — visuals* (Tier 4 / Reference).
```

**REPLACE WITH:**

```
### 🥇 TIER 1 — *(mostly SHIPPED — see ✅ marks)*
1. ✅ **Soccer formation diagram + read-the-play quiz** — SHIPPED (soccer-only): layout engine, SVG renderer, 12-formation × 4-level library, quiz generator reusing Academy scoring. → detail in *STRATEGY — visuals*.
2. ⏳ **Tennis live-data adapter + Coach's Corner** — DEFERRED to **v1.4**, recon-gated (see TIER 2 #1 and the Tennis status block). Structurally identical to golf → a one-day build *once live data is proven during an actual Wimbledon match*. Wimbledon runs through July 12.
3. ✅ **Golf live-data adapter + teaching layer** — SHIPPED end-to-end: live leaderboard (RapidAPI live-golf-data, data-first recon) + tappable 4-level concept reveals (GOLF_GLOSSARY 18 concepts × 4 levels, column headers + leader-row cells reveal level-appropriate teaching). → detail in *Per-sport data upgrade roadmap*.
4. ✅ **Tappable stat glossary mechanic** — SHIPPED (the inline `glossaryDefBox` reveal pattern, reused across PlayCard/RecapCard/CoachCard and the golf teaching layer).
5. ✅ **GUMBO / MLB pitch-data enricher** — **DONE.** Gates 1–5 all live + verified on real games. MLB live-explain now names the actual pitch (type/velocity/zone) woven into the *why*. Backend-only (Vercel), reached users immediately, no EAS build needed. → detail in *Per-sport data upgrade roadmap* + the GUMBO section below.
```

---

## EDIT 3 — Rewrite TIER 2 (cache done-off; mark what shipped; keep the genuinely-open items)

**FIND:**

```
### 🥈 TIER 2 — DO SOON
1. **Situation-keyed cache** — HIGH: saves money (hit the 100k/day Groq wall). → detail in *FEATURE — Feedback button + situation-keyed explanation CACHE* (Active Build Detail).
2. **Gate D-1 live test + commit** — built/parked; needs live soccer. → context in *🧹 CLEANUP — soccerPulse knownLimitations* and *🔌 LLM PROVIDER*; the Gate D-1 code itself is committed-pending.
3. **Rugby + cricket Coach's Corner** — Highlightly PRO data already subscribed; needs enrichers BUILT (cricket/rugby); investor-target sports. → detail in *Coach's Corner — team sports vs. individual sports* (Active Build Detail) + *Per-sport data upgrade roadmap* (Tier 4).
4. **Stale PLAY-card bug fix** — recon now; fix needs live verify. → detail in *BUG (OPEN) — stale "THE PLAY" card on soccer* (Active Build Detail).
5. **More Academy games** — library of game types, mostly generatable from glossary + 4-level engine. → detail in *Academy → "Duolingo for sports" — game catalog* (Feature Concepts & Gamification).
6. **Recap polish (sparse "Key Performance")** — finished games; costs tokens. → detail in *Recap enhancements* (Active Build Detail).
```

**REPLACE WITH:**

```
### 🥈 TIER 2 — DO SOON
1. ✅ **Situation-keyed cache** — **BUILT + DEPLOYED, deliberately OFF.** Master kill-switch `CACHE_ENABLED` (default off). Covers a Q&A cache (all sports) + a soccer live-explain situation cache (English-only), with the team-agnostic teaching fix, namespace versioning, and Gate-4 seams. **Off on purpose: zero downloads = no cost pressure, and vivid + named explanations sell better than cached generic ones.** Flip on when the Gemini bill climbs. → full detail in the rewritten CACHE section below. (Open follow-on: MLB situation cache rides GUMBO's reroute; optional cache-warming script if cold-start ever bites.)
2. ⏳ **Tennis live adapter (v1.4 / Wimbledon)** — recon-gated. App-side (tennis is hard-routed to learn-mode → needs a new live-screen archetype, so NOT backend-only). DATA UNPROVEN: RapidAPI `tennis-api-atp-wta-itf` key works and fixtures carry a `live` flag, but the livescore endpoint is unfound (4 guesses 404'd) and point-by-point / break-point feed is unconfirmed. **Right sequence: recon live tennis data DURING an actual live Wimbledon match → if it confirms, build (one day, golf-shaped) → v1.4 catches the back half (Wimbledon ends July 12).** 404-on-recon = defer, not block.
3. ⏳ **Rugby + cricket Coach's Corner** — recon-gated, DATA-CAPPED. Read the full Highlightly rugby API docs: rich CONTEXT (live score-state, lineups w/ positions, standings, H2H, last-5, venue, referee, predictions) but **NO play-by-play events feed** — confirms the ESPN-zero-PBP wall persists; **Opta/Stats Perform remains the real unlock** for the live teaching loop. One RapidAPI source worth probing: **Rugby Micro (SportMicro)** — explicitly claims "events" + WebSockets (the signature of a real event stream); read ITS docs the way we read Highlightly's before trusting the "live events" blurb. World Rugby Pacific/Nations Cup starts **July 4** (Denver double-header incl. USA — aligns with the rugby-investor thesis / Chicago Hounds) = the live-recon window. Decision: July 4+, confirm coverage + whether any source has a true events feed → if yes, context+events rugby buildable; if no, context-only experience or hold for Opta. Recon, don't build.
4. **Stale "THE PLAY" card bug fix (soccer)** — STILL OPEN. recon now; fix needs live verify. → detail in *BUG (OPEN) — stale "THE PLAY" card on soccer* (Active Build Detail). **NOTE: this is DISTINCT from the CoachCard stale/collapse bug, which was RESOLVED in the Coach's Corner work and shipped in v1.3 — do not conflate the two. THE PLAY card (soccer, sparse-event staleness) is the one still open.**
5. **More Academy games** — library of game types, mostly generatable from glossary + 4-level engine. → detail in *Academy → "Duolingo for sports" — game catalog*.
6. **Recap polish (sparse "Key Performance")** — finished games; costs tokens. → detail in *Recap enhancements*.
```

---

## EDIT 4 — TIER 3: promote the three buildable-tonight retention items, note feedback-button ↔ cache seam

**FIND:**

```
### 🥉 TIER 3 — QUEUED
- **Feedback button** (pairs w/ cache) → *FEATURE — Feedback button + …CACHE* (Active Build Detail).
- **Per-sport live indicators in picker** → *Per-sport live indicators in the sport picker* (Active Build Detail).
- **First-launch onboarding** → *Feature concepts → First-launch onboarding flow*.
```

**REPLACE WITH:**

```
### 🥉 TIER 3 — QUEUED *(the buildable-now retention items — app-side, no live-event dependency, ship in a future EAS build / v1.4+)*
- **Feedback button** — HIGH leverage now: pairs with the cache's `cacheDelete` seam (already built), and is the mechanism that captures incoming-user reactions for the imminent World Cup / Wimbledon share. Best first retention build. → *FEATURE — Feedback button + …CACHE* below.
- **First-launch onboarding** — strong: first impression for the incoming F&F/event users. → *Feature concepts → First-launch onboarding flow*.
- **Per-sport live indicators in picker** — lightest of the three; nice polish, lower impact. Recon-confirmed buildable (gatherWatchCandidates already fetches cross-sport live status). → *Per-sport live indicators in the sport picker* below.
```

---

## EDIT 5 — Replace the cache/feedback section with the accurate "built + OFF" reality

**FIND** (the whole section from its header through the `---` before "Per-sport live indicators"):

```
## 💡 FEATURE — Feedback button + situation-keyed explanation CACHE ("the app learns, not the model")
```

…through and including everything down to (but NOT including) the line:

```
## 🔴 Per-sport live indicators in the sport picker (1.3/1.4)
```

**REPLACE the entire section with:**

```
## 💡 FEATURE — Situation-keyed explanation CACHE — ✅ BUILT + DEPLOYED, deliberately OFF *(2026-06-29)*

IMPORTANT FRAMING (unchanged): the LLM is STATIC — it does NOT learn from feedback. "The app learns" = CACHING + feedback, not model-learning.

**Current state: the cache is fully built, deployed to Vercel, and OFF by design.** With zero downloads there is no cost pressure, and a cache HIT serves *generic* teaching ("the attacking side scored late") while a live call serves *vivid, named* teaching ("Canada scored in the 90th to win it 1-0"). With no users, every explanation should be the vivid one — better demos, better early-user impression, sells the app better. The cache is insurance you arm when the Gemini bill climbs, not before.

### The master kill-switch — one flag, whole system
- `CACHE_ENABLED` (env, default OFF) in `explanationCache.ts`. When off, `cacheGet`→null and `cacheSet`→no-op *before* any Upstash call.
- It gates everything through one value: `eKey` is the single source of truth. `cacheIsEnabled()` gates `eKey`; `eKey` controls the HIT check, the write, AND the `forCache` generic-teaching prompt flag. So **OFF → eKey null → no read, no write, forCache false → every explanation vivid + named + live** (today's exact behavior). ON → caching + generic teaching activate together, and only for the exact set that gets cached.
- To activate: set `CACHE_ENABLED=1` + confirm `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel prod, redeploy. Self-warms in minutes under real traffic (no pre-seeding needed). Flip back off by unsetting the var.

### Two caches, different scopes
- **Q&A ("ask") cache** — ALL sports, all languages. Key `v1:ask:{sport}:{level}:{lang}:{normalizedQuestion}` (exact-match keying — lowercase/trim/strip-punct/collapse-whitespace; no semantic clustering in v1). 24h TTL. `ASK_NS='v1'`.
- **Soccer live-explain situation cache** — English soccer ONLY (MLB explain has no structured situation at the Groq call site until a future reroute rides GUMBO). Key `v2:explain:{sport}:{level}:{lang}:{sig}` where the soccer `sig = scoreState | phaseBucket | lastEventType | eventTeamSide` (all bucketed — scoreState lead2plus/lead1/level/trail1/trail2plus *event-team-relative*; phaseBucket early≤15/first≤45/second≤70/late≤85/closing; eventTeamSide home/away/none). 6h TTL. `EXPLAIN_NS='v2'` (bumped from v1 to abandon old team-named entries).

### Teaching-core / live-merge (the stale-data fix)
Only the 5 teaching fields are cached: `simple, whyItMatters, ruleDetail, showRule, complexity`. Live fields (`homeTeam, awayTeam, gameContext, events, playType`) are re-attached FRESH on every HIT. So the scoreboard + Match Timeline are ALWAYS correct; only the teaching prose is reused.

### Team-agnostic teaching (the cross-match correctness fix — the real launch-blocker, now solved)
The wrong-country risk: a cached "Canada scored…" `simple`/`whyItMatters` would, on a HIT for the same situation bucket in a Brazil-France match, render team-named prose under the (correct, live) Brazil-France scoreboard. Fix: a `forCache` flag (= `!!eKey`) on `buildUserPrompt`. When true, the prompt instructs GENERIC teaching — no team/player/city names, use roles ("the attacking side", "the leading team"); the live headline + scoreboard carry the real identities. **Applies ONLY to the cached path** (English soccer now, MLB later) — MLB/NFL/etc. keep their vivid named explanations because they're never cached. Inert when `CACHE_ENABLED` off (forCache always false) → vivid + named everywhere, today's behavior.

### Storage + Gate-4 seams
- **Upstash Redis** via REST-fetch (NO `@upstash/redis` SDK dependency — avoids a build-break risk; same GET/SET-EX semantics). Env vars set in Vercel prod + `.env.local` (gitignored, confirmed safe).
- `[cache]` logs guarded behind `CACHE_DEBUG=1` (via `cacheLog()`); hit/miss counters; `cacheDelete(key)` export (unused — the seam the future feedback button plugs into to blacklist a bad key).

### Verified working (before being switched off)
- Q&A cache proven MISS→HIT on live MLB (3 real keys: `how_far_is_home_plate`, `what_is_a_balk`, `why_is_home_…`).
- Soccer situation cache wrote a correct key during Canada vs South Africa: `v2:explain:worldcup:beginner:en:lead1|closing|goal|away` (Canada, the away side, scored ~90' to win 1-0 — sig accurate; stored teaching-only, no live fields). Sharp edge logged: the cached `whyItMatters` referenced group-stage points for a knockout game — exactly what the team-agnostic generic-teaching rule + the future feedback button are meant to catch/refine.

### Open follow-ons
- **MLB situation cache** — rides GUMBO's getGameData reroute (MLB explain now routes through it post-GUMBO; a v2 can compute an MLB sig from count/outs/bases there). Deferred.
- **Optional cache-warming script** — fire synthetic requests for the top-N common situations right AFTER flipping the switch, if cold-start ever bites. (We REJECTED write-only stockpiling-while-off: it would bank team-named/poisoned entries, the 6h TTL evaporates them before launch, and a cache is a hot buffer not a vault — it self-warms in minutes under traffic.)
- **Feedback button** (below) — the human-validation layer; plugs into `cacheDelete`.

---

## 💡 FEATURE — Feedback button *(Tier 3 — build-worthy on its own, pairs with the cache)*
A lightweight "was this helpful / I learned something" tap on each read — e.g. a greyed-out lightbulb that lights when tapped. Fits the learning/Academy identity, low-friction. Gives data we have ZERO of today: which explanations actually land. **Highest-leverage retention item right now** because (a) it captures incoming-user reactions for the imminent World Cup / Wimbledon share, and (b) it plugs into the cache's already-built `cacheDelete` seam (thumbs-down → blacklist/regenerate that situation key). App-side → ships in a future EAS build (v1.4+), tested in Expo Go.

---
```

---

## EDIT 6 — Mark the stale-PLAY-card bug entry to make the distinction explicit

**FIND:**

```
## 🐛 BUG (OPEN — Tier 2) — stale "THE PLAY" card on soccer (sits frozen for long stretches)
Observed live: Belgium-NZL at 47', but THE PLAY card still showed Trossard's goal from the 28th minute — 19 minutes of a live game with no new play explanation. The user sees/learns nothing new for that whole stretch. Coach's Corner updated correctly (showed 45'+3'); it's THE PLAY card specifically that's stale.
```

**REPLACE WITH:**

```
## 🐛 BUG (OPEN — Tier 2) — stale "THE PLAY" card on soccer (sits frozen for long stretches)
**⚠️ DISTINCT bug — do not conflate with the CoachCard stale/collapse bug, which was RESOLVED and shipped in v1.3. THIS one (THE PLAY card on soccer, sparse-event staleness) is still OPEN.**
Observed live: Belgium-NZL at 47', but THE PLAY card still showed Trossard's goal from the 28th minute — 19 minutes of a live game with no new play explanation. The user sees/learns nothing new for that whole stretch. Coach's Corner updated correctly (showed 45'+3'); it's THE PLAY card specifically that's stale.
```

---

## EDIT 7 — Bank the "confusing-moment / offside" product insight (NEW section)

**FIND** (the end of the stale-PLAY-card bug section — its closing line):

```
Separate from the Coach's Corner gates. Worth a dedicated recon of how soccer's "last play" is selected + how often it should refresh.

---
```

**REPLACE WITH:**

```
Separate from the Coach's Corner gates. Worth a dedicated recon of how soccer's "last play" is selected + how often it should refresh.

---

## 💡 PRODUCT INSIGHT — the "confusing-moment" opportunity *(banked 2026-06-29)*

Origin: a friend watching Iran-Egypt (World Cup) wanted a confusing offside / disallowed-goal explained — the platonic "watch and ask why" moment. But the teachable context (WHY the call was controversial) lives in commentary/replay/VAR lines, NOT in thin ESPN data. **The core tension: the moments people most want explained are exactly the ones thin data describes worst.**

Four approaches, ranked:
1. **Richer event data** — partial help; still data-capped (same wall as rugby PBP).
2. **Event-triggered concept teaching** — "offside happened" → teach offside *well* at the user's level. Tractable NOW with existing data; ~80% of the value. The cleanest near-term win.
3. **Vision on the user's screen** — already BUILT. User screenshots the replay / VAR lines, vision reads what's actually on screen. The real unlock for the *specific-call* case (the data can't describe the call, but the picture can).
4. **Commentary/news "controversial" detection** — hard; later/research.

Synthesis: the two best tools — **event-triggered concept teaching (#2)** and **vision-on-screen (#3)** — are already largely built. The product direction is to lean on those for the confusing-moment case rather than chasing richer live-event data that the free sources don't expose.

---
```

---

## After applying all 7 edits

```
cd /Users/anthonydeldin/Desktop/sports-explainer-mode
git add FEATURE_IDEAS.md
git commit -m "Docs: roadmap update — golf+GUMBO shipped, cache built+OFF, tennis/rugby/offside findings, fix PLAY-card bug conflation"
```

No Vercel concern — `FEATURE_IDEAS.md` is a root markdown doc, not type-checked, never deployed. (Same harmless category as the other untracked `BUILD_*.md` docs.)

---

# 📋 ADDENDUM — Edit 8 (added after the cap-redirect build)

## EDIT 8 — Bank the "Live is the hook, the Academy/games are the engine" strategic thesis

**FIND** (the TIER 4 strategy/reference pointer list — anchor on this existing line):

```
- **Platform / [Topic]Wise vision + governing design principle** → *Platform vision — the "[Topic]Wise" family*.
```

**REPLACE WITH:**

```
- **Platform / [Topic]Wise vision + governing design principle** → *Platform vision — the "[Topic]Wise" family*.
- **Free/paid strategy — "come for live, stay for the games"** → *STRATEGY — live as hook, Academy/games as engine* (below).
```

**THEN add this new strategy section** (place it in the Tier-4 / strategy reference area, near the other STRATEGY sections):

```
## 🧭 STRATEGY — live is the acquisition hook; the Academy/games/Coach's Corner are the retention + revenue engine *(thesis crystallized 2026-06-29)*

The live-explain loop is EXPENSIVE (every play is a Groq call → it's what hit the 100k/day wall) and TIME-BOUNDED (a game ends; live only matters while something's on). So live can't carry retention or revenue on its own. The evergreen surfaces — the Academy (quizzes/games), Coach's Corner, the tappable glossaries — are CHEAP (static/quiz-logic, little-to-no per-use AI cost), AVAILABLE 24/7 (no live game required), and GAMEABLE (streaks, daily challenge, progression). So the strategy:

- **Live = the acquisition hook.** It's the "watch and ask why" wow moment that gets someone in the door. Expensive, time-bounded — treat it as the demo, not the daily habit.
- **Academy / games / Coach's Corner = the retention + revenue engine.** Cheap, evergreen, habit-forming. This is where daily return lives (streaks/daily challenge) and where the Pro split can sit (lock half once the free half is genuinely good).
- **"Come for live, stay for the games."** The free live cap (5/day) hands the user off to these surfaces when live runs out — they're NOT cap-gated (confirmed: CoachesCornerScreen + AcademyScreen touch zero cap logic), so the app keeps teaching past the wall. The cap card (LiveScreen) now redirects there (Academy/Coach's Corner links) with Pro as the primary CTA — implemented 2026-06-29.

**Build-order discipline (important):** depth + daily-habit FIRST, gating SECOND. The value of a Pro paywall is proportional to how good the FREE half is — locking half of a thin Academy makes both tiers feel small. So: (1) deepen the Academy (more games) + the daily-return loop (daily challenge feeding the existing streak) until the free experience is genuinely good and habit-forming; (2) THEN gate the premium half as a real upsell. Don't gate content you don't have yet.

**Cost-link to the cache:** gating LIVE plays protects Groq (cost); gating ACADEMY games is purely monetization (those surfaces are cheap, so there's no budget forcing the decision — be deliberate that you're trading free-user delight for conversion there, not protecting a wall). And note: once the situation cache is ON, a free live play that hits a cached situation costs ~nothing — so cache-on is what would LET you be more generous with free live plays safely. The cap, the cache, and the games strategy are linked: deeper free games + cache-on = a more generous, lower-cost free tier that still converts.
```

**After applying Edit 8:** same commit as the rest of the docs pass (or a follow-up `git add FEATURE_IDEAS.md` + commit if you've already committed Edits 1-7).
