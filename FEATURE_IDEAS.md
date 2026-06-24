# Feature Ideas & Roadmap

> **🚀 MILESTONE — 2026-06-21: SportsWise submitted to the App Store (in review).**
> v1.0 launched FREE (build 11): four-level explanations, ~14 sports, Academy (579-question
> quiz + facts + FAQs), local quiz-reminder notification, English + Spanish. Freemium is the
> v1.1 plan (see MONETIZATION.md). Everything below marked "road to launch" is now DONE unless
> noted; remaining items are post-launch.

## 🎯 Core audience reframe

The primary audience is **"sports-curious" people** — partners, friends, and family of
fans who want to feel included. The app's job is to make someone **feel like they belong
in the conversation**, not to serve existing experts.

## ⭐ North star use case

> A girlfriend's boyfriend loses his mind over Shohei Ohtani's complete-game one-hitter.
> She opens the app, gets a **Kid-level** explanation of *what* happened **and** *why* it's
> historically significant (the Babe Ruth comparison), and can now **participate in the
> conversation**.

## 🧭 Three product modes

- **Live Companion** *(built)* — explains plays in real time, ask anything, follow along
  during games.
- **Team Knowledge Companion** *(new)* — learn about a specific team before/outside games:
  standings context, player spotlights, key stats explained for non-fans.
  Use case: *"I just started dating a Bears fan, teach me about the Bears."*
- **News Companion** *(new, complex)* — breaking sports news translated for non-fans.
  Proactive / push-based. Requires a notification system or feed — **later phase**.

## 🎓 Founding principle — teaching, not just explaining

The origin: the founder is a **professor** who got confused watching a sport he didn't
understand, and built a way to *learn* it. The platform's real DNA is **PEDAGOGY** — taking the
teaching principles used in a lecture hall and bringing them into an app to make any topic fun and
educational. SportsWise is the **first instance**; the reusable engine is **"teach any topic
well."** Every feature should be evaluable against real teaching principles:

- **Scaffolding** — support the learner exactly where they need it, remove it when they don't
  (→ tappable on-demand definitions).
- **Differentiated instruction** — meet each learner at their level (→ the four difficulty levels
  changing WHAT is taught, not just vocabulary).
- **Formative assessment** — check whether learning actually happened (→ the Academy quizzes /
  progression as the measurement loop).
- **Learning is pull, not push** — the learner reaches for what they don't know rather than being
  lectured at (→ tap-to-define, go-deeper opt-in).

**North-star test for ANY feature:** does a user leave going *"oh, I didn't know that"* / *"that
answered my question"* / *"I learned something today"*? If not, reconsider it.

## 🔒 V1.0 scope lock

**IN — ✅ shipped:** translation fix · team logos · dark mode · FAQ chips · soccer/rugby UI ·
past plays (MLB/NHL/NBA/WNBA). _Bonus, beyond original scope:_ bottom-tab nav · Academy tab
(579-question difficulty quiz + facts) · first-run scrum intro · real logo/branding.

**IN — ✅ since done:** Live-screen design pass (cog removal, Academy CTA, section cards,
empty-state CTA) · real `APP_ID` (`6781028656`) + native in-app review · support/privacy
URLs confirmed live (`privacy.sportswise.app`, `feedback@sportswise.app`, `sportswise.app`).

**IN — ✅ LAUNCHED (2026-06-21):** App Store submission complete — submitted as "SportsWise:
Watch & Ask Why," in review. Languages trimmed to **English + Spanish** for launch (the other
8 translations stay in code, hidden in the picker; the ja/zh/ko/ar native-review blocker is
moot — they're not exposed). 579-question quiz bank. Local quiz-reminder notification. Five
App Store screenshots (cream/navy/orange, built GPT Image → Canva at 1290×2796).

**OUT (explicitly v2.0):** TV app · GovWise · StockWise · full language
UI (backend done, UI later) · pop-up facts system · Team Knowledge Companion mode ·
historical data · past plays for soccer.

**Timeline:** ✅ Submitted 2026-06-21. Now in Apple review (typically 24–48h). Post-launch
work = v1.1 (see roadmap below).

---

## ✅ Completed and live (backend expansion)

- ✅ **Languages backend** — all user-facing fields, including `playType`, translate consistently.
- ✅ **Soccer / World Cup backend** — ESPN site API (`usa.1` / `fifa.world`); play text via the summary `keyEvents` path (soccer has no `plays[]` array).
- ✅ **Rugby backend** — ESPN Core-API two-step `$ref` fetch (default league: URC `270557`).
- ✅ **Stray root `babel.config.js` removed** — it was silently breaking **all** Vercel deploys (Next picked up an Expo/React-Native babel config and failed every build). Fixed in `7f25d22`.
- ✅ **`playType` translation** — dedicated `translatePlayText()` Groq call running in parallel with the explanation (no added latency); replaced the unreliable model-returned `playSummary` field.
- ✅ **Debug instrumentation** — added to diagnose translation, then removed cleanly (`eb019ca`).

**Remaining backend: nothing — the backend expansion is complete.**

## 🔜 Next phase — Mobile UI

**Shipped:**
- ✅ Widened `Sport` type (+`soccer`/`worldcup`/`rugby`) in `lib/api.ts`.
- ✅ Soccer, World Cup, rugby in the sport picker (rugby via the Core-API two-step `$ref` fetch; leagues match the backend so `gameId`s align). (`ae35462`)
- ✅ Language picker in `SettingsScreen.tsx` — 10 languages, persisted, re-fetches on change. (`ae35462`)
- ✅ Team logos on game cards (ESPN logo URLs, graceful fallback). (`3126058`)
- ✅ Dark / light / system theme (`ThemeProvider` + semantic tokens; `userInterfaceStyle: automatic`). (`d5561f2`)
- ✅ Per-sport "Common Questions" FAQ — collapsed-by-default section above the games, routed through the ask path; pre-translated into all 10 languages (`lib/faqs.ts`).
  - ⚠️ **Before App Store submission:** the CJK + Arabic FAQ translations (ja / zh / ko / ar) are an AI-generated **v1 first pass** and need **native-speaker review**. (es/fr/pt/de/it are higher-confidence but a proofread wouldn't hurt.)

**Shipped since:**
- ✅ **Past plays** — scroll back through a game's plays and tap one to explain. Live for **MLB / NHL / NBA / WNBA** (`PastPlays.tsx`, wired in `LiveScreen`). NFL verify in-season; soccer (`commentary[]`/`keyEvents[]`) remains v2.
- ✅ **Live-screen design pass** (`340fd53`) — removed the redundant header settings cog, Academy CTA now navigates to the Academy tab, consistent section card-grouping/spacing, enlarged centered empty-state CTA + carded ask area.
- ✅ **Real `APP_ID` + native in-app review** (`fa7741e`) — App Store ID `6781028656`; Rate action uses `expo-store-review` (`requestReview`) with an `apps.apple.com?action=write-review` fallback.
- ✅ **Support/privacy URLs confirmed live** — `privacy.sportswise.app`, `feedback@sportswise.app`, `sportswise.app` share link (all tested working).
- ✅ **Local quiz-reminder notification** (`fd89f0e`) — one-off DATE local notification scheduled
  for the next 7pm, re-armed on each quiz so it only fires if the user goes quiet; respects the
  "Game Alerts" toggle; resolved the prior orphaned-permission App Store risk (permission is now
  legitimate). Only fires on real device builds.
- ✅ **Launch languages trimmed to English + Spanish** (`7730c01`) — picker shows en/es only;
  hidden-language preferences coerce to English on load (self-healing). Other 8 translations
  remain in code for later.

**Active, in order (the road to submission):**
1. **TestFlight builds + on-device QA** — incl. verifying the MLR/rugby Core-API team-name/score fix on a live fixture.
2. **App Store submission prep** — native review of ja/zh/ko/ar + Academy content, screenshots/metadata, then submit. (Full checklist: mobile repo `HANDOFF.md` §8.)

---

## 🧭 North star: "A coach in your pocket"

**The vision:** SportsWise isn't just an app that explains plays — it's the **expert access
most people never get.** Almost nobody can sit with a head coach and have rules, terminology,
and *strategy decisions* explained in real time. SportsWise can be that coach in your pocket.

**Origin proof:** the founder has a real relationship with the head coach of the **Chicago
Hounds** (MLR) and *still* can't follow rugby on TV — if even he can't get on-demand coaching,
almost no fan can. That gap is the product. (Texted exchange, May 2026.)

**The principle — it must THINK like a coach, not just narrate:**
- **Anticipates**, not just reacts — "watch the weak-side defender next."
- **Reveals intent** behind decisions — not "they punted" but *why* they punted.
- **Teaches patterns** across a game — "third time they've run this; setting up a counter."
- **Has informed opinions** / reads tendencies — judges calls, doesn't just describe them.
- **Speaks insider language, then translates it** (this is what the four levels already do).
- **Conveys feel, momentum, stakes** — "this is the moment the game turns."

The current **WHY IT MATTERS** card is a start (intent/stakes, not just events). Several future
features ladder up to this.

**Use as a lens:** when evaluating any future feature, ask *"does this make it feel more like a
coach, or just more like an info app?"*

---

## 🗺️ v1.1 build sequence *(agreed 2026-06-21)*

Ordered to build retention first, then quality, then revenue, then the big bet — each step
builds on the last, never blocked:

1. **Gamify the Academy** — **daily streak ✅ shipped (2e11ea7):** a persisted day-over-day
   streak (header chip + day-boundary logic + streak-aware reminder), with the in-session
   counter renamed "combo." **Still open:** the broader gamification — the **progression
   system** (earn-your-way level-ups) and **badges / achievements**. Retention foundation;
   cheap; no API cost or review risk.
2. **The live explanation → a real teaching loop** *(reframe of "Improved AI")* — the MVP is a
   **tight teaching loop on every play** (one primary lesson + tappable glossary + conditional
   watch-next + plain-language significance), **NOT** the premium stat layer. Authoritative plan:
   **📚 The live explanation — full learning design** (validated by two external critiques). The
   premium GUMBO **"moment"** stats are a later **packaging** layer (Step E), not the starting
   point. Core-quality win; the `GROQ_MODEL` hook still feeds the free/paid model split.
3. **Freemium / subscription** — RevenueCat + StoreKit; now calibrated with real launch usage
   data. (See MONETIZATION.md.)
4. **Picture / video feature** — the premium flagship; lands with the subscription; vision model.
5. **Coach's Corner** — the biggest, most differentiating bet; do when it can get focus.

### 💳 Paid tier plan *(decided 2026-06-23)*

**Three premium features** make up the Pro tier:
1. **Post-game recap** — the final-whistle breakdown (see 🏁 Post-game summary / recap).
2. **Image/video "show me what's on screen"** — vision-model explanation of a TV screenshot
   (see 📸 Image / video upload).
3. **Coach's Corner** — animated X's-and-O's strategy diagrams (see 🏟️ Coach's Corner).

**Build order — plumbing FIRST, then easiest→hardest feature:**
1. **Freemium / paywall plumbing** — **RevenueCat + StoreKit + entitlement gating**, built
   **independent of any feature.** This de-risks the launch-blocking IAP integration up front,
   and means each premium feature can be **gated as it's built** — so the app can **ship paid
   after any single feature lands**, not only once all three are done.
2. **Post-game recap** *(easiest hard-build)*.
3. **Image/video** *(middle)*.
4. **Coach's Corner** *(hardest)*.

**Tier line:**
- **Free** keeps its **felt ceiling** — **Kid + Beginner** levels, **daily cap**.
- **Pro** unlocks **all four levels + unlimited usage + the three premium features.**

(Mechanics/pricing in MONETIZATION.md.)

---

## 📚 The live explanation — full learning design *(FINALIZED + externally validated 2026-06-21 — AUTHORITATIVE)*

> **Status:** validated by **two independent external AI critiques** (2026-06-21); the build order
> below is their converged recommendation. **This supersedes** the earlier scattered "improved AI /
> leveled explanation / premium stat layer" notes — it is the authoritative live-explanation plan.

**The reframe:** what we called **"Improved AI"** (v1.1 item #2) is really **the live explanation
becoming a real teaching loop.** The MVP is **NOT** the premium stat layer and **NOT** the full
learning engine — it's a **tight teaching loop on every play.**

**The core problem it solves:** any single play contains MANY possible lessons at many levels. A
strikeout looking on a splitter could teach: what a strikeout is, what "freezes / strike looking"
means, what a splitter is, what a "put-away pitch" is, or the pitch-sequencing strategy behind it.
WHICH lesson matters depends entirely on who's watching and what they don't yet know. The design's
answer is not "show all of them" — it's **pick the single best one.**

**THE MVP — the minimum that delivers "I learned something":**
- **One primary lesson per play** — not all-at-once; the app picks the **single best teachable
  concept** for this user/play.
- **Tappable curated-glossary definitions** for the jargon within that lesson (scaffolding).
- **A "watch next" cue — conditional only:** show it ONLY when there's a genuinely observable next
  signal; **never forced** (a bad/forced watch-next is worse than none).
- **A plain-language significance sentence** *(FREE)* — "why it mattered" in words, no numbers
  needed.

That loop = *"I understood this play, I could unpack the confusing term, and I know what to watch
for next."* **That's the product.**

**CONFIRMED BUILD ORDER (both critiques converged on this).** Lettered Steps A–F to avoid
collision with the v1.1 build-sequence's top-level numbering:
- **Step A — One-primary-lesson explanation rework** *(foundation)* — difficulty changes the
  **LESSON**, not just vocabulary: Kid = rule/outcome ("he didn't swing — that's a strike; three
  you're out"); Beginner = outcome + basic why; Intermediate = the craft/tactic ("a splitter —
  looks like a fastball then drops; his put-away pitch"); Expert = the strategy, outcome assumed
  ("sequenced him — fastballs up to set the eye, then the splitter below the zone"). *Same play,
  four different LESSONS.* Needs an explicit **lesson-selection rubric**: relevance + level-fit +
  novelty + importance + teachability.
- **Step B — Curated glossary + tappable definitions** — start with the top **~50–100
  high-frequency terms per launch sport** (**baseball & football first**). One plain-language def
  per term, same for all levels; tap-to-reveal inline (no hover/tooltip; dismissable). **Content
  authoring is the real bottleneck, not code.** Reusable asset (feeds explanation + Academy + FAQs
  + the platform engine).
- **Step C — Watch-next** *(conditional only)* — render only when a real observable next signal
  exists.
- **Step D — Question-framed expansion** — instead of a generic "Go deeper," surface the **1–2
  relevant questions** for this specific card ("Why did it work? / What's a [term]? / Why did it
  matter?") — **dynamic, not a fixed set.**
- **Step E — Free/paid stat layer** *(a PACKAGING layer, built AFTER teaching value is proven)* —
  where the GUMBO premium **"moment"** stats live (leverage, win-probability swing, drama index,
  charts / historical comps). **Demoted** from its earlier "Phase A next" priority. Free =
  plain-language significance; paid = quantified significance. (Monetization mechanics in
  MONETIZATION.md.)
- **Step F — Learning engine — STAGED, not one build:**
   - **Phase 1:** exposure tracking + **recent-exposure suppression** ("don't reteach the same
     concept repeatedly in one game" — this alone already feels adaptive).
   - **Phase 2:** **post-game recap** ("today you saw: X, Y, Z — 30-sec quiz?") — ties into the
     parked **post-game summary / recap** concept below.
   - **Phase 3:** retrieval quizzes.
   - **Phase 4:** real mastery adaptation.
   - ⚠️ **exposure ≠ mastery** — seeing a concept isn't understanding it; treat exposure as **weak
     evidence only.**

**KEY PRINCIPLES (surfaced by the critiques):**
- **Don't overbuild v1.** The learning engine is the long-term **moat**, but the MVP is the tight
  teaching loop. *"Build the part that makes every explanation better before the parts that make
  the product look smarter."*
- **Confidence layer.** Distinguish **observed fact** ("he struck out looking") from
  **interpretation** ("the pitcher LIKELY wanted…"). Don't overstate certainty on intent — this
  protects trust.
- **Not every play deserves an explanation.** It's a **"teachable-moment feed," not a
  play-by-play feed.** Need an **importance threshold** — explain when confusing / important /
  unusual / strategically revealing / tied to an active learning thread.
- **Per-card controls** ("Simpler / More strategy / I know this") may beat fixed difficulty for
  live — captured as an **idea to consider** (not committed).
- **Content granularity varies by sport** — play-level (baseball / football) vs.
  possession / drive / shift-level (others); **don't force one card grammar everywhere.**
- **Glossary governance.** As it scales across sports / terms / contexts it becomes
  **knowledge-design work** — plan for canonical-definition standards and "when a term graduates
  into a reusable concept card."
- **Free/paid line.** Plain-language significance is **FREE**; quantified significance (exact
  win-prob %, leverage, charts, historical comps) is **PAID.** Guard against premium metrics
  becoming **necessary to understand** the free explanation.

---

## 🔴 Live Now / Step D session — status + backlog *(added 2026-06-23)*

**✅ Done this session (committed; owner pushes from terminal):**
- ✅ **Step D Phase 1 — layered PlayCard** (`6d3ce94`) — derived headline + core lesson + WHY
  (open) + RULE (collapsed), glossary inside; expand/collapse + glossary state reset via a
  context-key remount (`sport|game|level|language`). Pure `derivePlayHeadline` + unit harness.
- ✅ **Watch Next (Step C card) + Live Now dual-trigger** (`003e97e`) — end-of-game
  **"Watch Next" 👀** plus a second trigger so the card also appears when the current sport has
  nothing live: offseason / no-games / learn-mode and the scheduled "hasn't started yet" card,
  titled **"Live Now" 🔴**. `excludeCurrentSport` threading (Trigger A false / B true via
  `LEAGUE_TO_SPORT`) fixes the confirmed **World-Cup-recommends-World-Cup** bug. Also fixed the
  offseason/learn-mode early-return that never set `gamesFetched`, so Live Now fires on those
  states. Localized titles (10 locales). 21-case `selectWatchNext` harness.
- ✅ **Step D Phase 2 — live Q&A as in-place layers** (`df3a713`) — **supersedes the earlier
  "in progress" status; Phase 2 is shipped.** Chip answers render as PlayCard layers (about the
  play → on the play); typed free-text answers render **under the input box** (where the user's
  attention is); per-item loading/error; glossary works inside answers. New-play detection via a
  pure, tested **`derivePlayKey`** (`lib/playKey.ts`): **"fresh play, fresh card"** — Q&A clears
  on a genuine new play but **persists through the 60s same-play refresh**. Also: **FAQ now
  collapsible in learn-mode/no-games** (removed the `|| learnMode` force-open; default-open
  derived from `[sport, learnMode]`, still toggleable, re-applies on sport switch).
  - Known, accepted limitation: sports with no `rawPlay` + constant `playType` (rugby/MLR) yield
    a constant play-key, so Q&A there persists across plays. Noted, not hacked around.

**🔜 Queued — near-term (decided, not yet built):**
- **Previous Play** — store the last play in memory + a **back-arrow** to re-read a play that
  refreshed away mid-read. Works for **ALL sports** (no data dependency — just remembers the
  already-fetched play). **Reuses Phase 2's `derivePlayKey`** play-identity signal. Comes right
  after Phase 2. ⚠️ Do **NOT** confuse with full play-by-play (data track below) — this is the
  small, shippable version.
- **Golf leaderboard** — replace the one-line tournament stub with a real leaderboard. ESPN golf
  endpoint appears feasible.
- **State color-coding** — deliberate design pass on coloring game cards by state (upcoming /
  live / final). Must reconcile with the existing per-sport card tints in `GameCard`
  (`SPORT_COLORS`) — don't let it conflict. A design decision, not a quick build.

**🧊 Data track — deferred (all blocked on "ESPN free tier too thin, need a real provider"):**
- **Rugby play-by-play** — Opta / Stats Perform. The central unlock for expert-grade rugby; ties
  to the Hounds/MLR strategic relationship. ESPN exposes **no** MLR play-by-play.
- **Live tennis & golf data** — ESPN gives only thin tournament context (leaderboard line), no
  live game data. Real live data needs a non-ESPN source.
- **Full play-by-play for sports ESPN doesn't provide it for** — the LARGE version of "Previous
  Play." A **data-sourcing** problem, NOT a code feature. ⚠️ Do **NOT** fabricate or
  LLM-generate play data to fill the gap — confident-but-wrong play data is the cardinal failure
  (the same trap as the rugby placeholder).

> **Note:** the three data-track items cluster into **ONE sourcing decision** when revisited
> (which provider, cost, partnership route) — tackle together, not piecemeal.

---

## 🏁 Recap enhancements (banked)

### News-API "lede signal" for recap news-judgment *(banked — revisit post-core)*

**Problem:** the recap generates from ESPN box-score data, which has the stats but not the
editorial context — it knows Ronaldo took 7 shots but not that the goal was historic. So the
recap can lead with secondary stats and miss the real storyline. The prompt-fix (lead with the
most significant thing in the data) addresses **ordering**, but can't surface context that
isn't in the data at all (records, milestones, narrative stakes).

**Idea:** before generating a recap, query a news API (e.g. **TheNewsAPI**, **GNews** — both
have free tiers returning title + description + snippet, **NOT** full article text) for the game
("Portugal Uzbekistan World Cup"), and feed the top 2–3 headlines/descriptions to the model as a
"here's what the press considered the story" **signal**. The model writes its own original recap
led by the real storyline. **Headlines as a signal, not reproduced content** — sidesteps
copyright (we never display their text).

**Why banked, not built:**
- Adds an API dependency, free-tier rate limits, latency (extra call before every recap), and
  fuzzy game→headline matching.
- Helps marquee games (lots of coverage) but does **NOTHING** for thin-data wedge sports
  (MLR/rugby have ~no news coverage) — so it improves exactly the games that need help least,
  which is backwards from our strategic focus.
- The cheap prompt-fix captures most of the perceived improvement (story-first ordering) for
  none of the complexity.

**Related higher tiers (the data-partnership path, already tracked):**
- **Sportmonks / Statorium (United Robots):** licensable pre-written AI recap articles via API —
  solves recap-generation outright, but paid + soccer-centric (doesn't cover our 14 sports) +
  displays their content rather than ours. Revisit at revenue.
- **Sportradar / Opta / Stats Perform:** richer stats (deeper play-by-play, key moments) — but
  even rich stats may lack editorial context like records. Already our ~1,000-paying-user data
  move.

**Decision:** ship the **prompt-fix now** (free, fixes ordering); revisit the news-API signal
once the core recap is solid and we've weighed the extra API/latency/complexity against the
marquee-game-only benefit. Don't reflexively integrate — it's a deliberate later upgrade.

---

## 💳 Caps / paywall — banked tweaks

Surfaced during the daily-cap gate fix (`fix(caps): refresh must not bypass the daily cap
gate`). Both deliberately deferred — neither blocks anything now.

- **Skip the auto-refresh fetch when `explainBlocked`** — while a free user is capped, the 60s
  auto-refresh still fires the explanation fetch and then discards it (the accepted "bounded
  post-fetch waste" of the per-(gameId,playKey) gate). Cheap optimization: short-circuit the
  refresh fetch when already blocked. Separate, later — correctness is already handled by the
  gate; this is just spend.
- **Explanation path doesn't re-fetch on `isPro` flip** — a mid-view Pro purchase won't
  auto-lift a *blocked explanation* until the next fetch (the explanation effect's deps don't
  include `isPro`; the **recap** effect already does this right — mirror it). Real but unrelated
  to the gate bug. **Matters once purchases work — fix before sandbox purchase testing.**

---

## 📸 Vision enhancements (banked)

### AI clarifying follow-up *(banked — the next vision enhancement after the core is solid)*

When the model can't confidently analyze an image (unclear sport, unreadable score, ambiguous
play), instead of fabricating OR flatly giving up, it should ask the user a **clarifying
question** ("I can see a sports broadcast but it's dark — what sport is this, and can you read me
the score?"), then incorporate the answer into a grounded explanation. Turns a dead-end into a
conversation — more honest, and more "Watch and ask why," than either failure mode.

**Why banked, not built now:** a real feature, not a prompt tweak. Needs (1) **UI** to render the
model's *question* and capture the user's reply (a different flow than the current explain → ask),
and (2) **prompt logic** for the model to decide **ask vs. answer** and return a structured "I
need X" signal the client can branch on. Build after the core vision feature is proven solid.
Pairs with the never-fabricate work — the prompt already hedges honestly (incl. sport/score-type);
this turns the hedge into a productive next step instead of a stop.

---

## ⚙️ Backend cost / reliability (banked)

Surfaced during the 2026-06-24 triage of intermittent "Failed to fetch explanation" — root cause
was the **Groq free tier's 100,000 tokens/day (TPD) cap** being hit (`llama-3.3-70b-versatile`,
99,574/100,000 used → HTTP 429 → 500). NOT a code regression (the vision deploy was purely
additive; vision runs on OpenAI and consumes zero Groq tokens). Two banked follow-ups:

- **Token-burn reduction.** The explain action fires **two Groq calls** per request —
  `explainPlay` + `translatePlayText`. `translatePlayText` early-returns for English, so **en users
  pay one call**; **non-English** (two calls) **and the 60s auto-refresh** (per open game) are the
  multipliers that burn the daily budget. Levers: **upgrade Groq to Dev Tier** (account/billing
  change, no code — the direct fix), and/or **throttle or cache the auto-refresh** and revisit
  per-request call count. Banked; revisit if quota pressure recurs after a tier upgrade.
- **Fold Coach's Corner `state` into the explain response.** Coach's Corner v1 makes a separate
  cheap (no-Groq) `coach:state` call per live play to get the normalized situation for the hook +
  data-sufficiency gate. `explain` already hits ESPN every live play — so `explain` could extract
  the same `situation` and return it, letting `CoachCard` read it from the explanation result and
  dropping the extra per-play fetch. Deferred because it touches the shared `explain` path (v1 kept
  `coach` strictly additive). Pairs with the auto-refresh throttle / token-burn note above — same
  "fewer per-play calls" theme. (The Groq `coach:full` read stays a separate on-expand call.)
- **Production silent-failure UX.** A real 429/500 on `/api/explain` currently shows the user
  **nothing** in production — there is **no explanation error banner** (handleFetch's `catch` only
  `console.error`s; what looked like a banner in testing was the **dev LogBox**). In prod the user
  just sees a stale/non-updating card. Someday: a lightweight **"couldn't refresh — tap to retry"**
  affordance. Pure mobile UI; low priority, but the honest-failure surface matters once on a paid
  tier where 429s should be rare.

### 🧯 LLM resilience — fallback provider + paid-primary plan *(Groq Dev Tier blocked)*

Groq is currently the **single hard dependency** for ALL explanations / coach / recap (free tier
100k tokens/day; the **Dev Tier upgrade is BLOCKED** — Groq "temporarily unavailable due to high
demand"). One LLM outage = the core feature breaks. Resilience plan:

- **(a) Swappable explanation-provider adapter** — mirror the existing `visionProvider.ts` pattern
  (provider behind an interface, env-driven) so no single LLM outage breaks the core. (This is the
  text-model version of what vision already has.)
- **(b) Immediate $0 fallback — Gemini Flash FREE on 429.** Groq stays primary; Gemini fires ONLY
  when Groq caps. Gemini 3 Flash free ≈ **10 RPM / 250k TPM / 1,500 RPD**. Acceptable because we
  send **PUBLIC sports play text, not PII/proprietary data**. ⚠️ **Caveat:** Google's free tier may
  **train on inputs/outputs** — fine for public sports text (conscious accept), **NOT** for
  anything sensitive.
- **(c) Durable fix — a PAID primary we control** instead of engineering around a free tier. **Paid
  Gemini Flash** is a strong candidate (~**$0.15/$0.60 per M tokens** — a few $/mo at our volume,
  **no daily cap, no data-training**); may be a better primary than Groq regardless of whether Dev
  Tier reopens. Decide when there's a beat — **don't chain two volatile free tiers** (free-Groq +
  free-Gemini) as the permanent architecture.
- **(d) ⚠️ GOTCHA:** enabling billing on a Gemini project **DELETES that project's free tier
  entirely** (every call billable from token 1) — so to run free-test + paid-prod, use **SEPARATE
  Google Cloud projects**.
- **(e)** Also **retry Groq Dev Tier periodically** — it has Spend Limits when it reopens; the
  upgrade (no code change, just a higher ceiling) is still worth it if it comes back.
- **(f) ✅ SHIPPED + PROVEN (`feat(llm)` `60e5fb8`):** the swappable adapter (`llmProvider.ts`,
  `createChatCompletion` drop-in, all 7 Groq sites routed, env-toggled via `LLM_FALLBACK_PROVIDER`)
  is live, and the Groq→Gemini fallback was verified end-to-end locally (forced a Groq bad-model
  404 → caught → Gemini served a valid same-shape explanation).
  - **GAP found during that test — Gemini fallback isn't retried on a transient 503.** Gemini
    occasionally returns **503 "overloaded"** (seen once, cleared immediately on retry). Today a
    single 503 → the adapter throws → both-failed → user sees the error. Compound failure (Groq
    capped AND Gemini 503 on the same call) is rare, but the fix is cheap: **one retry / short
    backoff on the Gemini fallback call before giving up.** Hardening, not correctness — bank and
    add when convenient.

---

## 🛰️ Per-sport data upgrade roadmap *(researched 2026-06-24)*

**Core architecture move — a `sportDataProvider` abstraction** (the SAME swappable-adapter pattern
as `visionProvider.ts`: env-driven, one file, each adapter normalizes its source's JSON into our
internal shape). **ESPN stays the DEFAULT for all sports**; specific sports override with a richer
source via an adapter. Because each adapter normalizes to our format, **everything downstream
(explanation prompt, UI, difficulty levels) is unchanged**. The first adapter is the real work;
each subsequent one is incremental.

**Tiered framework across the 14 sports:**
- **Tier 1 — rich on ESPN, keep as-is:** NFL, NBA, MLB (full play-by-play). **Coach's Corner
  launches here**, no data change.
- **Tier 2 — thin on ESPN, cheap/free upgrade available (the opportunity):** soccer, cricket,
  tennis, golf, rugby.
- **Tier 3 — thin on ESPN, expensive upgrade only, defer:** rugby **expert-grade**
  (Opta / Stats Perform) for deep phase data; revisit when partnerships develop.

**Key strategic insight — Highlightly as a consolidated second provider.** Highlightly
(highlightly.net, also on RapidAPI) has a **FREE tier — 100 requests/day, no credit card, every
core feature** — and covers **soccer** (950+ leagues incl. EPL/La Liga/Serie A/Bundesliga/Ligue 1/
MLS/Champions League/World Cup), **cricket** (900+ leagues, ball-by-ball), AND **rugby** (100+
competitions incl. World Cup, Six Nations, URC, Premiership, Top 14, Super Rugby, MLR, Sevens). So
**ONE Highlightly account + ONE adapter could upgrade three of our thinnest, most strategically
important sports — including both investor-target sports, cricket + rugby — in a single move.**
This reframes the question: maybe we don't need many APIs — we need **ESPN (default) + Highlightly
(thin-sport upgrade)** behind the adapter, with specialists/Opta only where Highlightly proves
insufficient. Paid tiers ~**$9.49–$45.99/mo** if we outgrow free.

**Highlightly tier — ✅ RESOLVED (PRO, 2026-06-24).** Subscribed to **Highlightly PRO ($9.49/mo:
7,500 req/day, 720/min)**. Rationale: removes the BASIC 100/day constraint during the in-season
**World Cup** window (the download driver), avoids immediate rate-limit issues, cancelable
month-to-month.
- **Request math (for future tier decisions):** ~**100 Highlightly requests per live match watched
  end-to-end** (60s polling) — and it's **per-MATCH, not per-user**, thanks to the enricher's 60s
  events-cache. So **BASIC 100/day ≈ 1 live match/day** (solo testing only); **PRO 7,500/day ≈ ~75
  match-views** — covers real early World Cup traffic. ULTRA ($20.99/25k) / MEGA ($45.99/65k) are
  for **thousands of concurrent users** — not needed until real scale.
- **PRO unlocks the broader Highlightly provider** (950+ soccer leagues, **cricket**, **rugby** =
  the best expansion targets) — but those sports still need their **own enrichers BUILT**
  (cricket/rugby enrichers, post-1.1); only `worldcup→1635` is wired today. **EPL/LaLiga/MLS** just
  need league IDs added to the enricher's `LEAGUE` map (**quick win**).

**Per-sport specifics (alternatives to Highlightly, for reference):**
- **Soccer:** API-Football ($19/mo, events feed updated every 15s — goals/cards/subs/lineups with
  timestamps, the play-level data ESPN withholds; free plan exists). football-data.org free = 12
  comps but DELAYED scores + no events (weak for live). **Biggest live-lineup impact** of any
  upgrade (World Cup live now + 3 major leagues).
- **Cricket:** CricketData.org (lifetime-free 100 hits/day; $5.99/mo 2k/day; $12.99/mo 10k/day;
  ball-by-ball). Sportmonks (€29+/mo, ball-by-ball commentary). **Highest strategic value** — cheap
  AND investor-target sport.
- **Tennis:** point-by-point feeds (Goalserve, Enetpulse, Matchstat, api-tennis.com, many RapidAPI
  hobby-priced) — score before/after each point, server, serve speed, break-point context; some
  **classify the meaning of each point** (break/set point, momentum) — gold for "watch and ask
  why." Simple structure, easy adapter.
- **Golf:** Slash Golf (free prototyping tier, hole-by-hole real-time). Richer (OddsMatrix/
  SportsDataIO) go to shot-by-shot/strokes-gained — more than we need; hole-by-hole + leaderboard
  is plenty.
- **Rugby:** Highlightly (free, all major leagues) is the easy grab. Data Sports Group (Union +
  League, live tries + commentary). Goalserve (free trial). **OPEN QUESTION / ACTION:** unconfirmed
  whether any free/cheap rugby API exposes **deep phase-by-phase event data** (rucks/mauls/
  breakdown/territory) for expert-grade explanation, or just scores + tries. **Action: grab the
  free Highlightly key, hit it during a live match (Six Nations / URC / Super Rugby), inspect the
  event payload depth** — that one test answers whether Highlightly closes the rugby gap "enough"
  or rugby still genuinely needs Opta. ESPN gives rugby **zero** play-by-play
  (`playByPlayAvailable: false`), so anything is an upgrade.

**Suggested build sequence (after Coach's Corner):** soccer first (biggest live-lineup impact,
World Cup live, free to start) → cricket second (strategic + cheap) → rugby (grab free Highlightly,
run the depth test) → tennis/golf opportunistically → Opta for rugby expert-grade only when
partnerships develop.

**Cross-link to Coach's Corner:** this roadmap directly **extends** Coach's Corner — richer data
per sport = Coach's Corner works for **soccer/cricket/rugby, not just US sports**. Build Coach's
Corner **data-source-agnostic with clean degradation** so the data upgrade *extends* it rather than
requiring a rebuild.

---

## 💡 Feature concepts

### 🚀 First-launch onboarding flow *(banked)*

**Primary job — ACTIVATION, not a sales pitch.** Teach the core loop (pick a game → get an
explanation) and **set the user's difficulty level to their actual knowledge**. Feature-discovery
— especially the **📸 camera/vision** feature, which is invisible until you know to tap it — is a
secondary but real win: surface that the camera exists and what it does.

**Format:** swipeable intro screens — low friction, **skippable**, NOT a forced interactive
tutorial. A few screens:
1. What SportsWise does ("Watch and ask why").
2. The four difficulty levels + **ask the user to pick their level**.
3. The core loop (tap a live game → plain-language explanation).
4. The camera feature (point at the screen → get it explained).

Land them in the app with their **level pre-set**.

**The standout element — difficulty-setting up front.** Ask *"how well do you know this sport /
how much do you want explained?"* → pre-set their level (Kid / Beginner / Intermediate / Expert).
Directly serves the founding mission (help fans who feel like outsiders **meet the game at their
level**) and teaches the four-level concept in the process.

**OPEN DESIGN QUESTION — who sees it / when it triggers (decide at build time, intentionally
deferred — Anthony unsure):**
- (a) all first-time users, once, on first launch;
- (b) first-timers **+ a separate Pro-specific tour** when someone upgrades (Pro unlocks
  camera/recap — a "here's what you just got" moment);
- (c) everyone, but tailored free vs Pro.

**Dependencies / notes:**
- Pure **UI + one persisted `hasOnboarded` flag** (reuse the `appState` persistence pattern). No
  backend. The Pro-tour variant (b) would also key off the **`isPro` flip**.
- Could fold in **camera-permission priming** — explain *why* we need the camera before the iOS
  permission prompt → better grant rates (pairs with the vision feature's permission flow).
- **Topic-agnostic engine candidate:** onboarding (teach-the-loop + set-the-level) is a
  **core-package** feature for the future `[Topic]Wise` extraction, not SportsWise-specific.

### AMC pop-up format
While a game is selected, small contextual **fact-cards float up periodically**
(non-blocking, dismissable). Tap for a full explanation; ignore it and it fades.
Genuinely distinct from what any current sports app does.
Examples: team-history facts, "did you know," context beyond the play itself.

### FAQ / common questions *(low lift, do soon)*
A browsable list of commonly-asked questions per sport when a game is selected.
Tap one → routes through the existing ask path → level-appropriate answer.
An expanded version of the existing follow-up chips.

### Capture user questions *(medium-high, later)*
Log free-text questions users type (anonymized) to find real patterns, and promote the
most common into the curated FAQ. Requires a datastore + privacy consideration.

### "What did the announcer mean?" *(low, mostly works already)*
Viewers don't understand broadcast jargon. The free-text box already handles this — it's
mostly a **surfacing/prompting** problem. Add framing near the ask box like
*"Heard a term you don't know? Ask what it means."*

### 📸 Image / video upload — "show me what's on screen" *(v2, post-launch)*

**Concept:** User points their phone at the TV, takes a photo or screenshot of a confusing
moment, and uploads it. An AI **vision** model analyzes the image and returns a
**level-appropriate** explanation of what it sees. Fills the gap when the live data feed
misses something that's only visible on the broadcast.

**Use cases:**
- A confusing play the ESPN API didn't capture clearly.
- A referee/official explanation graphic shown on screen.
- A replay graphic showing penalty or call details.
- A booth-review decision displayed on the broadcast.
- A stats or standings graphic the user doesn't understand.
- Anything on screen the live data feed misses.

**Technical path:**
- **Still photos preferred over video** — faster upload, cheaper, more reliable.
- **Vision model:** GPT-4o vision (most capable), Claude vision, or Gemini — pick during build.
- **Backend:** new `/api/explain-image` endpoint accepting **base64 image + sport + level + language**.
- Same **four expertise levels** and **language support** as the text explanations.
- **Prompt shape:** *"This is a screenshot from a live [sport] broadcast. Describe what is
  happening and explain it at a [level] level."*

**Monetization:** a natural **paid-tier** feature. Free = live API explanations; Paid = image
upload for the moments the API misses. (See `MONETIZATION.md`.)

**Platform extension:** the same capability applies to every future vertical —
courtroom broadcast screenshot → **LegalWise**; financial news chart → **StockWise**;
government hearing graphic → **GovWise**. Ties into the "[Topic]Wise" family above.

**Challenges:**
- Phone-camera angle / glare on TV screens (manageable).
- Video too large/slow — **stick to still frames for v1**.
- Higher cost per query than text — reinforces the paid-tier positioning.

**Priority:** post-launch **v2**. Build **after App Store submission**.

### 🏟️ Coach's Corner *(v1.1+ — the differentiator bet)*

**Concept:** a new mode (possibly a tab between **Live** and **Academy**) where the user picks a
sport and sees **animated X's-and-O's play diagrams** — a coach's whiteboard that draws plays,
explains strategy, and shows a couple of marquee concepts per sport. Proactive and visual:
you go *to* it to learn strategy, vs. Live (reactive) and Academy (quiz/facts). Fills the gap —
there's currently no place that just *teaches the game's strategy on demand*.

**Build path:** **Lottie** (pre-made vector animations — best fit for a fixed library of plays)
or **Rive** (interactive, scrub-through plays — more effort, more "drawing live" feel). Design
frames in Figma → animate in Lottie/Rive. `lottie-react-native` is already a dependency.

**The real work is content, not code** — playing a Lottie/Rive file is trivial; *creating* each
play animation (Fiverr hire or own Rive learning) is the effort, per sport, per play.

**Subset approach for v1:** 1–2 marquee plays per sport (rugby scrum, basketball pick-and-roll,
baseball double play) — ship small, see if people love it before building a library.

**Why it matters:** most *differentiating* potential feature, most screenshot-worthy, directly
serves the "coach in your pocket" north star. Biggest lift, so do it when it can get focused
attention — after the cheaper wins.

**Build note (when we write the doc):** build it **data-source-agnostic** (per the 🛰️ per-sport
data roadmap — clean degradation when a sport's feed is thin) AND **domain-seam-aware** (per the
🧱 governing design principle — takes a domain config, sports assumptions not hard-coded). Frame it
as a **live-context-explainer that happens to be configured for sports**, not a sports feature with
strategy bolted on — so it extends to soccer/cricket/rugby (and later `[Topic]Wise` verticals)
rather than needing a rebuild.

**Pedagogy pillar — teach like Khan Academy, not a hype-man.** Coach's Corner's *voice* should:
- **meet the viewer at their level** (tie to the existing 4 difficulty levels);
- **walk the reasoning out loud** — *"they're running here, and here's why that's smart: …"*;
- explain the **why behind the mechanic**, not just state the rule;
- **build understanding** so the viewer can read the *next* situation themselves.

The anti-pattern is the **fortune-cookie insight** (*"big moment, watch closely!"*) — flagging
drama without teaching. App-wide split: **Academy = Duolingo** (the practice loop) · **Coach's
Corner = Khan Academy** (the live explanation that makes the hard thing click) — **practice +
comprehension**. This split generalizes to every `[Topic]Wise` vertical.

**Soccer Coach's Corner *(banked — needs a timeline/momentum model)*:** the Highlightly soccer
enricher adds an `events` TIMELINE (goals/cards/subs by minute), not the current-state `situation`
(count/down) that `hasSufficientState` reads — so soccer correctly stays "coming soon" (it does
NOT auto-light, by design). Lighting soccer coaching up *well* needs a soccer-specific notion:
**man-down after a red card · chasing a goal late · momentum swings** — distinct from the
count/down situation model. Design it when soccer events are flowing and banking is unblocked
(the premium card can't be sold during banking processing anyway, so a weak version costs nothing
to defer). The visible in-season win is the **better soccer explanations** (event context), which
the enricher already delivers on the free path.

### 🖼️ Images / illustrations in quizzes *(post-launch)*

**Concept:** add **optional** images to Academy quiz questions — player/equipment photos,
sketched-out plays, trophies, etc. — so some questions show a visual: *"which trophy is
this?"*, *"name this play."* Makes the quiz richer and more game-like.

**Effort:** moderate — but the **code is the easy part**. Add an optional `image` field to
the `QuizQuestion` type and render an `<Image>` in `QuizCard` when present. The real work
is **sourcing/creating the images**, not the wiring.

**Three sourcing options:**
1. **Bundled images** (shipped in the app) — low-moderate code effort; main cost is sourcing
   **properly-licensed** images. Cannot use random web images (copyright + player-likeness
   issues, especially for photos).
2. **Remote images** (CDN/URL) — keeps app size small, but needs hosting + a live connection.
3. **AI-generated brand illustrations** (the chibi / scrum art style) — *recommended.*
   Sidesteps licensing (original art), fits the brand, and **reuses the illustration style
   built for the intro animation**.

**Size math:** optimized illustrations ~30–80 KB each; ~300 images ≈ **10–25 MB** added to
the app — acceptable, though it could 2–3× current app size. AI illustrations compress
better than photos.

**Recommended approach:** don't image **every** question — only a **subset (~20–40%)** where
a visual genuinely helps (equipment, trophies, play diagrams); skip it for text-only
questions (*"how many strikes is a strikeout?"*). The **optional** `image` field means
questions without images work exactly as they do now — incremental, **no migration**.

**Priority:** post-launch enhancement, **not pre-launch**. The text quiz already works;
images make it **nicer, not functional**. Pairs naturally with the **Rive / illustration
intro-animation** work — the same art style feeds both.

### 🗞️ Rethink the no-games / off-season screen *(post-launch)*

**Problem:** SportsWise's core value is learning **during live games** ("watch and ask
why"). When a sport has no live game, the Live screen currently falls back to an "Ask
anything about [sport]" box + a "Common [sport] Questions" accordion. Now that the empty
state has a clear **"Test your knowledge in the Academy →"** CTA, that ask box +
common-questions section is **redundant** — it duplicates what the Academy does better and
doesn't reinforce what makes the app special. It's prime real estate filled with a generic
fallback.

**Direction:** when there are no live games, pull users toward either **(a) the Academy**,
to learn (the CTA already does this — keep/strengthen it), or **(b) something timely** that
keeps them connected to the sport until games return. Priority of purpose: learning during
live games is **#1**; using the Academy when there are no games is **#2**.

**Success bar — must be screenshot-worthy:** the rebuild is only worth doing if the result
is **compelling, creative, or genuinely useful enough to feature as an App Store screenshot
/ selling point**. A generic screen isn't worth the effort; a delightful one becomes
marketing. Go/no-go filter: *"would we proudly screenshot this?"* (For launch, we are **NOT**
screenshotting the no-games screen — current screenshots lead with the live "ask why" flow +
Academy quiz, which are the real selling points.)

**Options for the "timely" content** (cost / feasibility):
- **Recent results / "last 5 games + what they meant" recap** — *cheapest / most feasible;*
  likely reuses existing score data, no new rights. Strong first candidate, and
  recap-with-context is on-brand ("ask why").
- **Next-game countdown + "what to watch for" primer** — cheap, uses schedule data, builds
  anticipation, on-brand.
- **News feed** — needs a content source/API; licensing + quality questions. *Maybe.*
- **Highlights / video clips** — *high friction;* leagues guard highlight rights tightly,
  likely infeasible for an indie app without licensing. **Probably not.**

**Recommended:** start with **recent-results-with-context** and/or the **next-game primer**
(cheap, on-brand, no rights issues, and the most plausibly screenshot-worthy). News = maybe;
highlights = likely infeasible.

**Priority:** post-launch. The current no-games screen **works** (ask box + common questions
function) — it's **suboptimal, not broken**, so **not a launch blocker**. Deserves its own
focused design session. Don't start while build-7 / question-splice work is uncommitted.

### 🏁 Post-game summary / recap *(v1.1+)*

**Concept:** when a game is **over** (FT/Final), show a **recap** instead of just the last play —
final score, how it played out, the turning point, key performances, and what it means
(standings/stakes), at the user's level. People often open the app *after* a game to understand
what happened.

**Why it fits:** ladders up to the "coach in your pocket" north star (a coach breaks down the
game after the whistle, not just live), and overlaps the parked **no-games-screen rethink**
(recent-results-with-context). Screenshot-worthy. Likely an AI call on the final game state, so
it carries the same per-request cost as other explanations — a candidate for a richer **premium**
version (see MONETIZATION.md).

**Priority:** post-launch v1.1+.

---

## 🎮 Gamification / Learning progression *(v2)*

Duolingo-inspired learning mechanics. The point isn't game-for-game's-sake — it's making
the core promise (**getting wiser**) visible and rewarding, and building a daily habit loop.

> **Quiz infrastructure is now shipped** (Academy tab): a **579-question bank** across four
> difficulty tiers (**kid / beginner / intermediate / expert**) in `lib/facts.ts`, with an
> on-card level picker (synced to the global app level), per-question answer shuffle, and
> a streak mechanic. The remaining gamification work below now sits on top of this.

### 🦉 Academy → "Duolingo for sports" — game catalog *(banked)*

Expands the Duolingo-inspired vision from "quiz + streak" into a **library of game types**, every
one inheriting the four difficulty levels. Grouped by mechanic:

- **Visual ID:** *who's-this-player* (photo → name, difficulty-scaled); *whose-logo/kit*
  (crop → team); *name-the-equipment* (gear → what/why; beginner-friendly, on-mission);
  *read-the-play* (diagram / freeze-frame → guess the play or formation; upper-level).
- **Matching / sorting:** *term → definition* (generate from the existing **206-term glossary**);
  *player → team* / *player → position*; *sort-the-sequence* (order the phases of a play — downs /
  an over / a possession).
- **Recall:** spaced-repetition **flashcards** on rules / terms / signals (referee **hand-signals**
  = a strong ready-made visual set).
- **Trivia / quiz — differentiated from the current quizzes by FORMAT:** *rapid-fire* timed rounds
  (Sporcle-style "name all 30 teams"); *this-or-that* binary speed rounds (offside/onside,
  fair/foul); *daily challenge* (one shared puzzle/day → streak/retention loop).
- **Scenario / judgment:** *"you make the call"* (situation → reveal what the pros do + why) — the
  off-couch twin of a Coach's Corner moment.

**Content-engine insight — much of this is closer than it looks.** The existing **206-term
glossary** + the **Kid/Beginner/Intermediate/Expert** levels are ready-made engines: matching,
flashcards, and term-quizzes can be **generated from the glossary**, and every game inherits the
**4-level scaling** for free (pairs with the `awardPoints()` engine + per-game difficulty-mastery
designed below — adding a game = content + per-game mastery + the same points hook).

**Characters (banked for later):** a Duolingo-style **mascot / coach character** — half of Duo's
retention magic. Could guide the Academy AND **voice Coach's Corner insights**, unifying the app's
personality. A big later swing.

**Coach's Corner ↔ Academy bridge:** Coach's Corner spots the teachable moment **live**; a
"learn more" tap routes **into the relevant Academy lesson**. Coach's Corner finds it in the wild;
Academy holds the structured lesson. (See **Sporcle** for more game-format inspiration.)
**Deferred from Coach's Corner v1** — the routing needs Academy lessons indexed by situation-type
(the quiz bank isn't lesson-structured yet); build the bridge once that structure exists.

### ✅ Streaks — daily streak now shipped *(2e11ea7)*
**✅ Shipped (2e11ea7):** a **real persisted day-over-day streak** now exists — a header chip
in the Academy ("🔥 N day streak"), with local-date day-boundary logic: it increments on
**any** quiz activity (right or wrong), **once per day**, continues if the last quiz day was
yesterday, and **resets to 1 on a 2+ day gap** (no decrement on app load — the reset is
computed lazily on the next quiz). The former **in-session** counter (consecutive correct,
resets on a wrong answer / unmount) was **renamed "combo"** internally, with a new callout
ladder — **Heating up 🔥 (3) / On fire 🔥🔥 (5) / Unstoppable ⚡ (7) / Legendary 🏆 (10)**.
The quiz-reminder notification is now **streak-aware** ("don't lose your N-day streak" copy
at 2+ days). The earlier "in-session only, daily streak still to build" clarification is
**resolved.**

### 🎇 Richer streak / combo celebrations *(nice-to-have polish — not urgent)*
The streak **mechanic** works (chip, day-boundary logic, combo callouts); this is about making
it **feel** rewarding. Upgrade from the current text-popup callouts to fuller moments —
e.g. an **animated flame that grows with the streak**, **sound**, richer milestone
celebrations, and a **streak-history view** ("you've hit 30 days!"). Post-MVP polish: ship it
when the cheaper retention/quality wins are in. Founder instinct — the loop is built, this
makes it land emotionally.

### 🏆 Progression rank system *(designing — Phase 1 next build)*

**Two layers (the core model, designed to scale to ~5 games):**

- **LAYER 1 — Difficulty (per-game content depth).** Each game (quiz today; later
  diagram-match, card-stat-match, player-match, etc.) has its own Kid→Expert content range.
  You advance through a game's difficulties by **demonstrating mastery of that game's current
  level** — e.g. "answer N Kid quiz questions correctly → prompt to try Beginner." This is
  **per-game** (being good at the quiz doesn't advance diagram-match difficulty) and driven by
  performance **in that game**, NOT by rank. Difficulty stays **freely changeable anytime**
  (never locked).
- **LAYER 2 — Rank (global journey, ties all games together).** Rank
  (Rookie→Starter→All-Star→Champion→Legend) is driven by **total points accumulated across ALL
  games at ALL difficulties.** It's the umbrella over everything — the journey from "knows
  nothing" to "Legend." A hard Expert quiz answer and a hard diagram-match both feed the **same**
  global points→rank.

**Rank and difficulty are NOT linked.** (We briefly considered "rank up → advance difficulty" —
**rejected after on-device testing.** The right model: difficulty advances by **per-game
mastery**; rank advances by **total points across everything**. A Legend is never forced to
Expert difficulty; difficulty is earned per-game, separately.)

**The full journey:** Rookie (just starting, playing at low difficulties) → climbing (mastering
difficulties **within** games + breadth **across** games, points accumulate) → Legend
(demonstrated mastery of hard content across multiple games — a real achievement, not just
grinding easy questions).

**Why this scales:** each new game plugs into the same global points→rank engine (the
`awardPoints()` architecture already built) and brings its own per-game difficulty-mastery
progression. Adding a game = **new content + new per-game mastery logic + the same
`awardPoints()` hook.**

**Ranks (5 tiers, from total points):** Rookie (0–99) → Starter (100–299) → All-Star (300–699)
→ Champion (700–1499) → Legend (1500+). Tuned to feel quick early, prestigious at the top.

**Points engine — sport-agnostic AND game-agnostic.** One persisted points total; a single
`awardPoints()` function that ANY activity feeds. Phase 1 wires ONLY the quiz; future games
(diagram-match, card-stat-match, player-match) call the same function — so adding a game is a
"+points hook," never a progression rebuild. Build the engine once, right.

**Phase 1 points (quiz):** correct = scaled by difficulty (Kid 5 / Beginner 10 / Intermediate
20 / Expert 40); wrong = 0 (never negative — don't punish); small combo bonus (e.g. +1 per
combo level, capped). Tune in practice.

**Phase 1 (build now, quiz only):**
- ✅ Global points→rank **engine + rank card** (built — `2e11ea7`-adjacent, uncommitted): one
  card in the Academy showing rank name + badge, progress bar to next rank, "X / Y to [next
  rank]," "maxed" at Legend.
- Add: **"+points" visual feedback** on correct answers (scoring is currently invisible /
  confusing) — float a "+8 🔥" near the rank card, flame when the combo bonus applies.
- Add: **per-game difficulty-mastery nudge for the QUIZ** — "you've answered N [level] questions
  correctly → ready for [next level]?" — driven by quiz performance, **dismissable, never
  forced**, difficulty still manually changeable.
- Make the rank card clearly read as **"overall journey across the Academy,"** visually distinct
  from the difficulty pills (resolves the rank-vs-difficulty confusion found in testing).
- **Remove any rank→difficulty linkage.**

**Phase 2+ (later):** the other 4 game types (each = content + per-game mastery + `awardPoints()`
hook); **per-sport ranks** ("Baseball Legend, Soccer Rookie") + overall profile; richer point
feedback.

**Process for adding a future game type** (the repeatable pattern):
1. Founder defines the game concept (what the user does, what "correct" is).
2. Founder provides the CONTENT (diagrams / stat lines / photos + correct answers, per sport) —
   this is the real work, like the quiz questions. Engine is easy; content is the effort.
3. Founder sets scoring intent (how many points, does difficulty scale it).
4. Build the game UI (new card/screen) + its **per-game difficulty-mastery logic** (advance
   Kid→Expert by performance in this game).
5. Wire it to `awardPoints()` — trivial, because the engine was built game-agnostic in Phase 1.

### ✅ Quick quiz moments *(shipped — Academy tab)*
The "Quick Quiz" card: one multiple-choice question at a time, animated green/red reveal
with explanation, difficulty-filtered, switchable level, no-repeat cycling. Originally
"Priority 3" — **done.** (Surfacing a quiz inline *after a Live explanation* is still an
open variant; the standalone Academy quiz is what shipped.)

### Knowledge progression *(superseded — see 🏆 Progression rank system above)*
**Superseded 2026-06-21.** The original idea here was "earn your way through the difficulty
levels (Kid→Expert) instead of setting them manually." That's been REPLACED by the agreed
design in the 🏆 Progression rank system subsection above, which deliberately keeps **difficulty
separate from progression** — difficulty stays freely chosen (you're never locked out of a
simple explanation), and a separate earned **rank** (Rookie→Legend) is the progression. See
that subsection for the live design.

### Priority 4 — Badges / achievements
*"First rugby game explained,"* *"Asked 10 questions,"* *"5 sports explored."* AsyncStorage
counters, cheap to build, moments of delight. Commission badge assets from a Fiverr designer.

### Priority 5 — Daily challenge
A featured play or sports moment each day. A reason to open the app **outside of watching a
game**. Requires content curation — AI-generated or editorial. Solves the offseason
engagement problem.

### Skip
- **Lives / hearts** — punishing in a live-companion context.
- **Mandatory lesson gates** — kills the core use case.
- **Leaderboards** — needs user accounts + critical mass.

### Connection to the platform vision
The same progression system applies to **all `[Topic]Wise` verticals**. LegalWise:
Kid → Beginner → Intermediate → Expert in legal literacy. GovWise: same for civic
knowledge. **The progression system *is* the platform's core learning promise.**

**Priority:** streaks + quick quiz are **shipped**. The remaining on-brand build is the
**🏆 Progression rank system** (earned rank separate from difficulty — see above), now
unblocked by the shipped quiz/streak/level infrastructure. Badges, daily challenge, and
capture-user-questions remain v2, after App Store launch.

---

## 🧲 Yahoo Sports features to steal

- **Team logos on game cards** — already on the list; **reprioritize as a fast win.**
- **Recent games (last 5) per team** — W/L and scores for context.
- **More Info section per game** — venue, broadcast channel, weather.
- **Compact pill-style game cards** — more important as the sport count grows.
- **Team stats / rankings bar chart** — context before explaining plays.
- **SKIP:** pick-your-winner/odds (conflicts with brand), community/discuss (too complex),
  generic banner ads (see `MONETIZATION.md`).

---

## 📺 TV app vision

- A **true overlay** over another app is **OS-level impossible** on all TV platforms.
- **Streaming live sports** is a **legal wall** (broadcast rights), not a technical one.
- **Buildable:** an **Apple TV app (tvOS)** via the **Expo TV target** — same codebase,
  different build. The user watches the game through their own service; the app runs alongside.
- **Picture-in-Picture:** user puts YouTube TV in a PiP corner, SportsWise fills the
  main screen — the closest thing to the overlay vision, and it **works today on tvOS**.
- **TV provider integration** *(longer term)*: user signs in with YouTube TV/cable, the app
  knows what game they're watching = more relevant explanations.
- **Living-room use case:** family watching together; non-fans see explanations without
  picking up a phone.
- **Priority:** after the mobile App Store launch.

---

## 🌐 Platform vision — the "[Topic]Wise" family

The core product is a **real-time complexity translator**. Sports is the beachhead.

**Test for a new vertical:** Live/event-based · Complex · Outsiders feel locked out ·
Repeated explanation needed · Wildly different expertise levels.

**Candidate verticals:**
1. **Government / News** — *highest-priority second vertical.* Live legislation, Supreme
   Court rulings, election results, political terminology. The AMC pop-up format fits
   perfectly. Enormous underserved audience.
2. **Finance / Markets** — Fed decisions, earnings, market moves, economic terms. Strong fit.
3. **Legal proceedings** — trials, verdicts, contract language. Strong fit.
4. **Medical / Health** — needs liability guardrails. Later.
5. **Science / Space** — more episodic than real-time; a different mode.

**Key:** all verticals share the **same engine** (Groq + four expertise levels + ask
anything). New verticals = **new data feeds + prompt context, not new architecture.**
Brand asset: the **"[Topic]Wise"** naming pattern is clean and scalable.

**Sequencing:** prove SportsWise fully first, then expand — but keep the architecture
**topic-agnostic**: no sports-specific hardcoding in the explanation layer.

### 🧱 Governing design principle — generic mechanism + pluggable content + data adapters

Design every feature in **three layers** so it crosses over to future `[Topic]Wise` apps
(politics, finance/stocks/taxes, etc.):
1. **Core engine** — topic-agnostic loop / UI / logic.
2. **Content packs** — glossary, image sets, scenario banks, domain prompts, *per topic*.
3. **Data adapters** — normalize any source into our internal shape.

SportsWise = core + sports content + sports adapters; **app #2 = the same core + new content +
new adapters.**

- **Academy generalizes** — every game type is mechanism + pluggable content:
  *who's-this-player → who's-this-person*, *name-the-equipment → name-the-object*,
  *read-the-play → read-the-chart*, *term-matching → any glossary*, *you-make-the-call → any
  decision*; daily / rapid-fire / this-or-that are already topic-neutral. **Academy is a
  game-engine framework, not a sports feature.**
- **Coach's Corner generalizes** — it's a **"live contextual event explainer"**: real-time feed →
  strategic *why* + *what's-next*, at the user's level. Stocks (market moves), politics
  (votes/hearings) fit the **same engine**; only the **data source + domain prompt** change. Build
  it taking a **domain config**, not sports-hardcoded.
- **`sportDataProvider` → conceptually `dataProvider`** — the adapter pattern (see the per-sport
  data roadmap) is a **core primitive**; sports adapters are just the first set. Likely the most
  reusable thing being built.

**Discipline — anti-over-engineering:** do **NOT** build the plugin framework now (only one app
exists). Build SportsWise **concrete and shippable, but seam-aware** — don't weave sports
assumptions through the code; keep the "sports" parts **identifiably swappable**. **Design the
seam now, extract when app #2 is real.** (The "audit into core / content / app-shell buckets" step,
applied prospectively.)

---

## 🧊 Parked

- **Cricket live data** — ✅ cricket is now a **live sport in the app** (in `SPORTS`, with
  quiz / FAQ / learn-mode content). What remains parked is **live match data**: ESPN's
  public API still has no usable cricket feed (site API 404s; Core API lists the sport but
  exposes zero leagues/events), so cricket runs in **learn-mode only** (no live scoreboard).
  Revisit live data with ESPNcricinfo or a paid source; a code comment in `route.ts` marks
  where it would slot in.
- **Cold-start empty-state flash (~0.01s)** — on cold launch the Live screen paints its
  no-selection empty state for a split second before data loads. Sub-perceptible; fix later by
  making **loading** and **empty** distinct states (show a loader while fetching, empty only
  after). Very low priority.
- **Notification deep-link** — tapping the quiz reminder currently just logs; route on
  `data.type === 'quiz-reminder'` to the Academy tab (handler is the `responseListener` in
  App.tsx). Trivial, low priority.
- **Spanish native review** — es is a real translation already; a native proofread (founder has
  a fluent contact) is polish, folds into a later build. Non-blocking.
