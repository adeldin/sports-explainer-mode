# SportsWise — v1.4 Build Manifest & Session Handoff
*Generated 2026-07-02, end of a large build session. Read this alongside SPORTSWISE_HANDOFF.md (the 2026-06-30 orientation doc). This captures everything shipped/built AFTER that handoff, and defines exactly what goes into the v1.4 EAS build.*

**Purpose of this doc:** (1) hand off cleanly to a new chat, (2) make the v1.4 EAS build contents explicit so nothing is forgotten in the "What's New" release notes, (3) list what's already-live-on-backend vs. ships-in-binary.

---

## ⚡ CRITICAL DISTINCTION — backend-live NOW vs. ships-in-v1.4-binary

SportsWise has two deploy paths (see handoff §2):
- **Backend (Vercel):** deploys INSTANTLY to ALL app versions. Affects explanation/recap TEXT, not the binary. **Already live to every user, including v1.3 on the App Store.**
- **Mobile (EAS binary):** ships only when you cut a new build + Apple approves + users update. **This is what "v1.4" is.**

**Today's work split across both. The "What's New" notes for v1.4 should describe the MOBILE features (below). The backend improvements are already silently live and improve v1.3 too.**

---

## 🟢 ALREADY LIVE (backend — deployed to all users today, including v1.3)

These shipped via Vercel during this session and are ALREADY improving the live App Store app. They are NOT "new in v1.4" per se (users already have them) — but worth noting they landed.

1. **Recap AP-story enrichment.** Post-game recaps were bland stat-summaries ("The Cubs' offense erupted for 23 runs"). Now grounded in ESPN's own AP recap → real story ("Dansby Swanson's three-home-run barrage... grand slam... 23-3"). Rewritten at the reader's level (not reproduced — copyright-clean), across MLB/NBA/NHL/NFL/soccer. Commits: `3608e57` (worthNoting removed) → `d813462` (capture fields) → `3842f13` (**the enrichment core** — ground prompt in AP recap, soften cardinal rule) → `ea98e83` (articleLink in JSON).
2. **Recap date-awareness.** `fetchRecapData` now resolves ANY game via `summary?event={gameId}` directly (was: searched only today's scoreboard → past games returned empty). Fixes past-day recaps, drops the core-branch scoreboard scan, removes a network hop. Uniform `summary.header` shape across all sports incl. rugby. Commit `6232005`.
3. **Game-id cast hardening.** `0675b64` — normalized game-id lookups to `String()===String()` across explain paths, fixing silent fallbacks to generic recaps on numeric IDs (was quietly degrading soccer/MLB quality).

---

## 📦 v1.4 EAS BUILD CONTENTS (mobile — ships in the binary; THESE are the "What's New")

Everything below is committed to `main` and ships when you cut the v1.4 EAS build. **Draft "What's New" copy at the bottom.**

### 1. Date strip (yesterday / today / tomorrow navigation)
- Horizontal **event-model** date strip below the sport tabs. Today accented in brand orange.
- **Event-model** = shows game-days, SKIPPING empty days (like Yahoo's World Cup strip: Jul11·14·15·18·19, not consecutive). Per-sport — MLB is daily/consecutive, World Cup skips rest days, offseason NBA/NFL jump to the nearest game-day.
- **Backward:** reach past days → their (now AP-grounded) recaps. The morning-after "talk to your friends about last night's game" use case.
- **Forward (Option B):** "next game day" reaches forward to the actual next fixture even weeks out (offseason leagues), capped ~+45d.
- Range-query based (`?dates=START-END`), gap-skipping is free from grouping. Local-day grouping (not UTC). Respects ESPN's ~100-event response cap (±3d primary window).
- Commits: `56aecea` (game-day discovery), `2ea1ccd` (strip + date-scoped fetch).

### 2. TuneInCard — rich pre-game "tune-in" card
- When you select a FUTURE game, a rich detail card: matchup + records, local start time, venue+city, **probable pitchers** (MLB, with W-L/ERA + headshots), weather, and prominent **"Watch on {networks}"** TV row.
- Conditional rendering — rich for MLB, lean for World Cup (no records/pitchers), nothing looks broken when a field is absent.
- No odds, no tickets (deliberate mission call — education-first, not gambling/commerce).

### 3. WatchOn — "where to watch" TV element (two placements)
- Shared `<WatchOn>` component, `variant: 'prominent' | 'quiet'`.
- **Prominent** on pre-game (TuneInCard) — where-to-watch is the main event when planning.
- **Quiet** high on the LIVE card — recessive TV row ("📺 MLB.TV, NBC Sports Phil") so someone glancing at a live game can flip to it, WITHOUT competing with the PlayCard's teaching. (Use case: watching game A, see game B is exciting, "oh I have that channel.")
- Free for all users (NOT Pro-gated — it's discovery furniture, verified outside the entitlement gate). Survives the daily explanation cap.
- Commit `6afcee4`.

### 4. GameContextCard — "GAME INFO" block (live games)
- A static game-info block, **dead-last on the live page** (after Common Questions): matchup+records, venue, **starting pitchers**, weather, **stage/round** ("Round of 32" — regular-season suppressed).
- Renders for any selected live game, **independent of explanation state** (shows before an explanation loads AND after the free daily cap is hit — it's static reference, decoupled from the dynamic play explanation).
- Free/ungated. Series context DEFERRED (it's the one field needing a new network call — a conscious later decision, not built).
- Weather-label bug fixed at source (ESPN inconsistently swaps `displayValue`↔`conditionId`; helper picks the non-numeric field).
- Commit `708e6d4`.

### 5. Recap "Read on ESPN" link
- The recap card now has a "Read the full recap on ESPN →" link (opens ESPN's recap page). Text-only, no image (ESPN/AP/Getty image rights — see LOCKED LEGAL CONCLUSION below). Part of the recap-enrichment mobile side.

---

## 📝 DRAFT "WHAT'S NEW" (v1.4 App Store release notes)

> **What's new in SportsWise 1.4**
>
> **Browse by day.** New date strip lets you catch up on yesterday's games (and their recaps) or see what's coming up — tap any day to jump there.
>
> **Know where to watch.** See what channel or stream a game is on, right in the app — so you never miss tip-off, first pitch, or kickoff.
>
> **Game info at a glance.** Venue, weather, team records, and probable/starting pitchers for every game.
>
> **Smarter recaps.** Post-game recaps now tell the real story of what happened — the standout performances and turning points, explained at your level. (Also live for everyone now!)

*(Adjust tone to match prior release notes. The recap note is technically already live via backend, but worth mentioning since v1.3 users may not have noticed.)*

---

## 🔒 LOCKED DECISIONS (carry forward — do not re-litigate)

- **ESPN/AP/Getty images: DO NOT display.** Three research passes + PicRights automated enforcement risk ($750–150k/image statutory). Unofficial API (no license), Disney ToU bans commercial use, images are wire-licensed to ESPN only. Caching makes it worse (forfeits the hotlink server-test defense). **Text = fine (we rewrite/transform + link out); images = never; visual relief comes from OWN imagery** (SportDevs free logos or own templates). Revisit only with revenue + IP-attorney consult. (Full detail in BUILD_RECAP_ARTICLE_ENRICHMENT.md.)
- **No odds / no gambling / no tickets** anywhere. Education-first app, partly for newcomers/younger users; avoids the gambling-disclaimer regulatory surface. Differentiator, not a limitation.
- **No umpires/officials, no box-score/stats/injury/win-prob** on cards — that's ESPN's stats-destination game; "becoming a scoreboard is the failure mode."
- **Series context deferred** — the one context field needing a new network call. Conscious "is it worth a per-game fetch" decision for later.
- **Where-to-watch is FREE** (never Pro-gated) — it's a discovery/acquisition feature; gating it is counterproductive.

---

## 🏉 ACTIVE WORKSTREAM — Rugby Nations Cup readiness (pre-v1.4 headliner)

**The play:** A major rugby tournament (July 4 – Nov 21, 2026) is the ideal SportsWise launch moment — the app's ORIGIN is rugby (Anthony felt like an outsider at a rugby game), rugby is the sport US newcomers most need help with, and it's a 5-month competition pulling in exactly the curious-but-confused audience. **Plan: solve rugby DURING the tournament, ship v1.4 with rugby as HEADLINER.** Long runway to harden after kickoff.

### ⚠️ KEY RESEARCH FINDING (3 AI sources, unanimous) — free granular play-by-play does NOT exist for rugby
**There is NO free/freemium API with genuine timestamped phase-by-phase rugby play-by-play** (scrums, lineouts, rucks, phase play) for this tournament. That granularity is **paid/enterprise ONLY** (Sportradar ~gold-standard/sub-second but enterprise-only no free prod tier; Opta/Stats Perform; Data Sports Group; Goalserve). Sportradar-class = the $24K+/yr territory already flagged non-viable pre-revenue.

**What free tiers DO carry:** scores, fixtures, standings, lineups, and **basic scoring events + cards** (tries, conversions, penalties, yellow/red cards, subs) with timestamps — but NOT phase-by-phase.

### ✅ THE REFRAME — the constraint aligns with the mission (this is GOOD news)
The naive plan (phase-by-phase live rugby like MLB/soccer) is dead pre-funding. But **event-triggered learning is BETTER for SportsWise's actual audience:** a newcomer doesn't need "14th-phase ruck" explained — they need **"why did that guy get a yellow card?" / "why did they score?" / "what's a conversion?"** The BIG, LEGIBLE, confusing moments (cards, tries, penalties) are EXACTLY what free tiers carry AND exactly what newcomers are confused by. Phase-granularity is expert stuff (not the target audience). **So free rugby data covers precisely the moments newcomers need — a fit, not a failure.** It's the same event-triggered architecture the app already uses, just lower event-frequency (fewer, bigger triggers than MLB's every-pitch).

**v1.4 rugby scope (realistic):** event-triggered learning on **scoring events + cards** (free-tier-powered) + rugby **recaps** (summary endpoint already serves rugby inline — confirmed in recap date-aware build) + Coach's Corner rugby content. NOT phase-by-phase live explanation (waits for funded Opta/Sportradar). Still a strong, on-mission headliner.

### ⚠️⚠️ RESOLVE FIRST — the naming issue (could invalidate coverage assumptions)
One AI flagged: **"World Rugby Nations Cup 2026" (emerging/Americas nations, Jul 4 – Nov 21, the one in Anthony's screenshot) is a NEW SECOND-TIER competition.** The top-tier 12-team event is the SEPARATE **"Nations Championship 2026."** These are DIFFERENT tournaments with potentially very different API coverage — a second-tier emerging-nations cup may have WORSE/absent coverage in API-Sports/SportDevs league lists. **CONFIRM which tournament is the actual target BEFORE testing anything — the whole plan is moot if the specific competition isn't in the API.**

### Source landscape (from research)
- **ESPN hidden API:** Nations Cup coverage spotty/unclear; has a playbyplay endpoint but rarely populates for rugby (usually box scores only); unofficial + ToS-violating for commercial. Not safe to build on.
- **API-Sports / api-rugby:** free 100 req/day; fixtures/scores/standings + basic scoring events (tries/conv/penalties/cards/subs), NOT phase PBP; commercial-OK on free (one AI said verify); 1–5 min delay. Often available via RapidAPI (Anthony already pays RapidAPI — check).
- **Highlightly:** free 100 req/day; scores + video highlights, NO text event stream.
- **SportMonks:** no real rugby product. N/A.
- **SportDevs:** free 300 req/day; CLAIMS events/livescore/stats/lineups/penalty-history — strongest hint of event-level data among free; rugby PBP fields UNVERIFIED. **Test candidate.**
- **SportsAPI Pro:** documents a rugby **"Match Incidents"** endpoint (tries/conv/penalties/cards/subs); freemium claimed, limits + coverage UNVERIFIED. **Strongest documented PBP-ish freemium candidate — test FIRST.**
- **World Rugby/PulseLive (official):** full PBP exists, NO public dev API, scraping violates ToS. Not an option.

### Phase 0 (sharpened by research)
1. **Resolve naming** — which tournament? (World Rugby Nations Cup / emerging-nations vs. Nations Championship / top-12). Single most important pre-step.
2. **Test the 2 named free candidates against THAT tournament** — SportsAPI Pro (first — documented Match Incidents), SportDevs (300/day, claims events). Verify 3 things each: (a) league list explicitly includes the tournament, (b) live match payload has a real `events` array, (c) events are rugby-specific action-types WITH timestamps (not just score-state changes). Also check API-Sports (likely on Anthony's RapidAPI already).
3. **Data-source routing (free-first):** ESPN free base-layer where possible; paid enrich only where free falls short; factor QUOTA HEADROOM (rugby on RapidAPI stacks on tennis/golf; on Highlightly stacks on soccer). Existing pattern: Soccer→ESPN+Highlightly; Tennis/Golf→ESPN+RapidAPI; MLB→ESPN+GUMBO. Caching (Upstash) + polling cadence are quota levers.

### Fallbacks (from research, if free events insufficient)
- **"Wizard of Oz"** manual entry for a few high-profile matches — prove the concept (to investors/friends) without enterprise pricing.
- Rugby recaps + Coach's Corner as the headliner if live events don't pan out.
- Paid PBP (Sportradar/Opta) only when funded.

### Phased timeline
- **Phase 0 (NOW, pre-kickoff):** naming + candidate testing above.
- **Phase 1 (kickoff Jul 4):** live-test what feeds actually carry during opening matches (can't test live until games on).
- **Phase 2 (through tournament):** harden, then ship v1.4 with rugby headlining once proven.

**⚠️ Security:** API keys (RapidAPI/Highlightly/SportsAPI Pro/SportDevs) NEVER committed or printed — env vars only, redact in recon output.

---

## 🔜 BANKED — designed/discussed, NOT yet built (for the next chat)

1. **Capped-state tease** (IN PROGRESS as of this session's end — build doc `BUILD_CAPPED_STATE_TEASE.md`, Gate 0 recon done, Gate 1 next). Replace the bland "Keep going with Pro" cap card (shown when a free user hits their 5-play daily limit on a live game) with a recap-style **locked-headers tease**: show 🎙️ THE PLAY / 💡 WHY IT MATTERS / 📜 THE RULE / 🧠 COACH'S READ headers with greyed placeholder blur bars + the existing `presentPaywall` CTA — so the user sees what they're missing ON THIS SPECIFIC PLAY. Render-layer only (the `explainBlocked` branch never fetches), reuses an extracted `<LockedSection>` from RecapCard + PlayCard's labels. **NOTE (recon correction):** original premise "skeleton preserves a Groq cost saving" was WRONG — the cap is post-fetch (see cost bug #3); skeleton is still the right call for UX/simplicity, not cost.

2. **PlayCard teaching-visuals** (design direction, not yet spec'd — write-up owed). The reframe: confusing "stats" (strike zone, base-runner diamond, win-probability-as-momentum, the count) are NOT stats-to-avoid — they're **visual teaching moments** that ALSO solve the app's text-density problem. Filter: "does explaining it help a newcomer understand what they're watching, and does the visual carry the teaching." Ranked candidate: **strike zone first** (most common "why was that a strike?" confusion, GUMBO pitch data already available, contained single visual). Discipline: **choose-don't-cram** (a card with 6 visuals is its own wall). Architecture question: live-embedded IN the PlayCard vs. a bridge/link FROM the live moment TO the Coach's Corner visuals already being built. Deserves its own focused session.

3. **⚠️ COST BUG — capped free users still incur discarded Groq calls** (surfaced 2026-07-02 during the capped-tease recon). The daily-explanation cap is a **POST-FETCH display gate, not a cost gate**: `handleFetch` (LiveScreen.tsx:296–336) fetches the explanation from Groq, derives `playKey` from the response, THEN checks the cap and discards the result if over-limit. So every capped play still costs a Groq call whose answer is thrown away — on a live game where a capped free user keeps tapping, that's repeated wasted spend. **Fix = pre-fetch cap check in `handleFetch`. Non-trivial:** the cap unit is keyed on `playKey` which is *derived from the response*, so a pre-fetch check needs a way to identify "new play vs. re-read" without the response (a lightweight pre-fetch play identifier, or a cheaper pre-check). Real money leak, worth fixing, deserves its own focused design session. NOT addressed by the capped-tease build (which is render-layer only).

3. **Onboarding spotlight tour** — fully specced earlier, waiting on friend feedback (4 friends sent v1.3, hadn't reported). Hand-rolled spotlight (SVG+reanimated+gesture-handler, new-arch-safe), 2 beats (PlayCard + ask box), gated `live_tour_seen`, beat-3 (level changeability) handled as a separate nudge not a spotlight step.

4. **Coach's Corner geography rule** — fold into COACHES_CORNER_AUTHORING_STANDARD.md: named pitch locations must resolve to zone constants verified against a grid (from the Killer Pass session — carrier rendered in own half). Still pending.

5. **tvOS recon** — exploratory, banked. Backend ~100% reusable, UI needs full rebuild for focus-engine/D-pad.

6. **"Stats aren't the story" / incident-story frontier** — the deeper thread (why THIS offside/red-card was controversial, not just what offside IS). Recap enrichment was the beachhead (post-hoc data exists). Live-controversy detection needs commentary/social signal — a real research project, banked. External sources report: `sports_story_sources_report.md`.

---

## 🛠️ WORKING MODEL (unchanged — for the new chat)

- **This chat = architect/reviewer** (no repo access): writes recon-first gated build docs + "PASTE INTO CLAUDE CODE" blocks.
- **Claude Code = executor** on Anthony's Mac.
- **Anthony relays** between them and **runs ALL git himself** — explicit file paths, **never `git add .`**, Claude Code never pushes.
- **Recon-first** before wiring, especially on the live/backend path. **One gate at a time.** **Vercel-green check** after every backend push (instant-live risk).
- **Filter: "Does this earn its place?"** Ship narrow, prove, then scale. Verify output-neutral before changing behavior.
- **Big-paste caveat:** large pastes from Claude Code auto-convert to file attachments that arrive EMPTY in chat. Workaround: paste in chunks, paste only the summary+commit, screenshot, or summarize.
- **Standing papercuts:** VS Code auto-reformats `tsconfig.json` — `git restore tsconfig.json` before committing. Untracked `BUILD_*.md` + `COACHES_CORNER_AUTHORING_STANDARD.md` accumulate at repo root (uncommitted by choice; can be version-controlled anytime with explicit paths).

---

## 📍 COMMIT LINEAGE THIS SESSION (on `main`, all pushed; HEAD = `708e6d4`)

*In order (oldest → newest). "backend" = live-to-all-users on push; "mobile" = ships in v1.4 binary.*

- `3608e57` — Remove worthNoting field from explain path and card — backend
- `1222097` — Hygiene: commit docs, gitignore spike dir + zips, exclude spikes from tsc — repo
- `0675b64` — Normalize game-id lookups to String()===String() across explain paths — backend (fixed silent generic-recap fallback on numeric IDs)
- `d813462` — Recap: capture ESPN article headline/lede/link into RecapData (output-neutral) — backend
- `3842f13` — Recap: ground buildRecapPrompt in ESPN AP recap (soften cardinal rule, rewrite-not-reproduce; stats-only fallback byte-identical) — backend **[the recap enrichment core]**
- `ea98e83` — Recap: include articleLink in recap response JSON — backend
- `b86dd93` — Recap card: add "Read on ESPN" link-out (text only, no image) — mobile
- `56aecea` — Scoreboard: event-model game-day discovery (prev/next, gap-skipping, Option-B forward reach) — mobile
- `2ea1ccd` — Date strip: date-scoped fetch + event-model day selector (today path byte-identical) — mobile
- `6232005` — Recap: resolve game via summary?event= directly (summary.header) all sports — fixes past-day recaps, drops core-branch scan — backend
- `190b2db` — Scoreboard: retain optional pre-game fields (records/probables/weather + multi-network broadcasts) on Game type — mobile
- `97df199` — TuneInCard: pre-game detail card (matchup/time/venue/records/probables/weather + first-class Watch-on-TV; no odds/tickets) — mobile
- `6afcee4` — WatchOn: extract shared component (quiet live / prominent pre-game) — mobile
- `708e6d4` — GameContextCard: stage/venue/records/pitchers/weather block, dead-last, decoupled from explanation state, free; weather label fix — mobile

**Backend commits (already live to all users, incl. v1.3):** `3608e57`, `0675b64`, `d813462`, `3842f13`, `ea98e83`, `6232005`
**Mobile commits (ship in v1.4 binary):** `b86dd93`, `56aecea`, `2ea1ccd`, `190b2db`, `97df199`, `6afcee4`, `708e6d4`

Working tree at session end: app/backend committed & pushed; only untracked `BUILD_*.md` docs + modified `COACHES_CORNER_AUTHORING_STANDARD.md` remain (by choice).
