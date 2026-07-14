# BUILD DOC — Academy Games Expansion v2 (visual games, 2–3 new per sport)

**Status:** recon complete, ready to build. Every "GROUND TRUTH" fact below was confirmed by
reading the code or by live-probing the API on 2026-07-14. **Do not re-derive it — trust it.**

**Who builds this:** Fable 5, end-to-end, no questions. Anthony reviews after.

---

## 0. THE PRODUCT THESIS — read this before anything else

**We are building Duolingo for sports.** That sentence is the north star, and every decision in this
doc bends to it. Internalize these five things:

1. **The goal is LEARNING, not trivia.** A user should finish a round *understanding the sport better*
   — not just having recalled a fact. Every game must have a **teaching beat**: after the answer, say
   *why*, at the user's level. The codebase already has this exact pattern — `VerdictCard` (with its
   4 difficulty tabs that re-explain the same scenario at 4 depths), and `exp: Record<Level, string>`
   in `lib/boxCount.ts` / `lib/findTheOpenMan.ts`. **Copy it. A game without a teaching beat is a bug.**

2. **The gamification IS the product, not decoration.** There is a full progression engine already
   built (§1.4): lifetime points, 5 ranks, day-over-day streaks, and streak-reminder notifications
   (`lib/notifications.ts → scheduleQuizReminder`). The 4 Coach's Corner field games **award zero
   points** — that's the mistake you are correcting. Every game you build **must** call `awardPoints()`
   and `recordQuizActivity()`. A user should be able to open this app *purely to play games and keep a
   streak alive*, the way they open Duolingo.

3. **Difficulty is a first-class dimension** (`kid | beginner | intermediate | expert`) — see §1.9.
   Author content at **every tier**. This is a product requirement, not a nicety: the plan is to keep
   the easy tiers free and gate intermediate/expert behind Pro. Build so that gate drops in later
   **without a rebuild**.

4. **The art is a placeholder — make it replaceable.** Anthony will bring in designers/software for
   real Duolingo-grade graphics and animation later. So: keep every pictogram, diagram, and shape in a
   **dedicated art/data module**, never inlined ad-hoc across components. Swapping the art must be a
   one-file job, not an archaeology dig. Optimize the *structure* for replacement; don't gold-plate the
   drawings.

5. **Anthony is walking away and reviewing at the end.** Do not stop to ask questions. Make the call,
   note it in a `## Decisions` section of your final summary, and keep going. If something is genuinely
   ambiguous, pick the option that best serves "Duolingo for sports" and move on.

---

## 0.5 HOW WE WORK (same rules as always)

1. **Do not edit `GameHost.tsx` or `AcademyScreen.tsx`'s hero/grid logic.** The Academy is
   registry-driven by design. Adding a game = push ONE descriptor into `ACADEMY_GAMES` +
   write ONE component. If you find yourself editing the host, you've gone wrong.
2. **One gate at a time.** Each gate below ends with a working, typechecking app.
3. **`npx tsc --noEmit` must exit 0** after every gate. It exits 0 today — that's your baseline.
4. **Never invent a sports fact.** See §2.4 — this is the #1 risk in this build and there is a
   strict rule for it.
5. Data libs are pure (`lib/*.ts`, zero React Native imports). Components are dumb renderers.
   That separation is load-bearing in this codebase — keep it.

---

## 1. GROUND TRUTH (confirmed by recon — do not re-derive)

### 1.1 What the Academy is TODAY

`screens/AcademyScreen.tsx` → 10 categories (`lib/academyCategories.ts`) → a registry-driven
hero + grid (`lib/academyGames.ts`) → `GameHost` opens a game full-screen.

**The Academy has exactly TWO games, and both are text-heavy** — which is the entire reason for
this build:

| id | title | file | shape |
|---|---|---|---|
| `quiz` | Quick Quiz | `components/academy/QuizGame.tsx` | text Q + 4 text options |
| `term-match` | Match Up | `components/academy/MatchGame.tsx` | text term ↔ text definition |

**Do not be misled by `components/academy/`.** It also holds `BoxCountGame`, `OnsideOrOffGame`,
`WheresThePlayGame`, `FindTheOpenMan`, `FormationQuizGame`, `MakeTheCallGame` — those are **NOT in
the Academy**. They are mounted by `screens/CoachesCornerScreen.tsx` via its own local `PIECE_GAME`
map. They are the *visual* games, and they are exactly the machinery you will reuse.

### 1.2 The registry contract (the ONLY integration point)

`lib/academyGames.ts`:

```ts
export type AcademyGameId = 'quiz' | 'term-match';   // ← WIDEN THIS UNION with each new id

export interface AcademyGameProps {
  sportKeys: Sport[];        // the category's pooled league keys, e.g. Soccer = [soccer,epl,laliga,worldcup]
  categoryEmoji?: string;
}

export interface AcademyGame {
  id: AcademyGameId;
  title: string;
  icon: string;              // emoji
  blurb: string;
  Component: React.ComponentType<AcademyGameProps>;
  supportedSports?: Sport[]; // ABSENT = shows for all sports. PRESENT = only where keys intersect.
  landscape?: boolean;       // GameHost locks landscape on focus, restores portrait on blur
}
```

`gamesForSportKeys(sportKeys)` filters the grid. **`supportedSports` is how you scope a game to the
sports it can actually run** (e.g. no crest game for golf).

### 1.3 The 10 Academy categories

`mlb`, `nfl`, `nba`, `wnba`, `nhl`, `soccer` (pools soccer+epl+laliga+worldcup), `rugby` (pools
rugby+mlr), `tennis`, `golf`, `cricket`.

### 1.4 XP / scoring — the exact contract

`lib/appState.tsx` exposes a game-agnostic engine. **Use it. Every new game must award points.**

```ts
const { level, points, rank, awardPoints, recordQuizActivity, dailyStreak } = useAppState();
awardPoints(gained);          // adds to lifetime total, persists, returns new total
recordQuizActivity();         // idempotent per-day; drives the 🔥 day streak
```

Ranks: Rookie 0 / Starter 100 / All-Star 300 / Champion 700 / Legend 1500 (`RANKS`, `getRank`, `RANK_EMOJI`).

Canonical award block (copy from `QuizGame.tsx` — it is duplicated verbatim in 2 other games already):

```ts
const QUIZ_POINTS: Record<Level, number> = { kid: 5, beginner: 10, intermediate: 20, expert: 40 };
const COMBO_BONUS_CAP = 10;
// on correct:
const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
const gained = QUIZ_POINTS[level] + comboBonus;
const beforeRank = getRank(points).name;
const afterRank  = getRank(points + gained).name;
awardPoints(gained);
flashPointsGain(gained, comboBonus > 0);
if (beforeRank !== afterRank) celebrateRankUp(afterRank);
```

> ⚠️ **Known gap you are fixing:** the 4 Coach's Corner field games award **ZERO** points — they
> never import `awardPoints`. Your new Academy games MUST wire it.

### 1.5 The visual engine — `components/FieldEngine.tsx` (441 lines, the centerpiece)

**Drawing tech is `react-native-svg` (15.12.1). Coordinates are viewBox PIXELS, not normalized.**

Three painted surfaces exist, and **only three**:

```ts
export const FIELD   = { vbW: 680, vbH: 380, los: 235, ... };  // football; offense LEFT, LOS x=235
export const PITCH   = { vbW: 680, vbH: 420, ... };            // soccer; attack L→R, right box x=578..674
export const DIAMOND = { vbW: 680, vbH: 560 };                 // baseball; home BOTTOM (340,490)
export const FOOTBALL_FIELD_RATIO / SOCCER_PITCH_RATIO / BASEBALL_DIAMOND_RATIO
export function FootballField({ players, overlay, fill, showLos })
export function SoccerPitch({ fill, children })
export function BaseballDiamond({ fill, children })
```

Shared chrome (reuse, don't rebuild): `ScenarioPills`, `DifficultyTabs`, `VerdictCard`,
`NextButton`, `LandscapeGameShell` (field-left / controls-right, for `landscape: true` games).

Fixed field palette `FE` (a field is green in every theme). **Convention: field paint = `FE`;
chrome = theme tokens.**

**There is NO basketball court, hockey rink, tennis court, cricket ground, or golf hole.** Adding one
is a ~20-line renderer following `SoccerPitch` exactly + a `*_RATIO` export. That is a *known,
scoped* cost — see Gate 3.

### 1.6 Interaction — the two-circle tap pattern (NOT gesture handler)

Taps are `onPress` **on the SVG element itself**. No hit-testing math. Small dots get a transparent
oversized hit disc behind the visible one:

```tsx
<Circle cx={x} cy={y} r={40} fill="transparent" onPress={() => choose(k)} />   {/* hit target */}
<Circle cx={x} cy={y} r={18} fill="rgba(245,166,35,0.12)" stroke={AMBER} strokeWidth={2.5} onPress={() => choose(k)} />
```

`FindTheOpenMan` uses `const HIT_R = 36; // ~44px on-screen at football scale`. Match that.

### 1.7 Animation — two systems, know which is which

- **On-field motion = raw `requestAnimationFrame` + `setState`.** One `rafRef`, one owner, cleaned up
  on unmount. Copy the idiom from `WheresThePlayGame` / `FindTheOpenMan`. Helpers already exist:
  `lerp`, `bez`, `clamp01`, burst rings.
- **UI chrome = Reanimated v4** (points float, tile flash, rank-up banner).
- Note in the code: *"No SMIL pulse (doesn't port to react-native-svg)."* Don't try it.

### 1.8 Content banks that already exist

| bank | path | shape | per-sport |
|---|---|---|---|
| Quiz | `lib/facts.ts` → `QUIZ: Record<Sport, QuizQuestion[]>` | `{q, options[], answer, explanation, difficulty}` | 49–56 each; Soccer pools to 102 |
| Glossary | `lib/glossary/` → `getGlossary(sport)` | `{term, def, sport, match?, aliases?}` | 31–97; **402 total, every entry has `match`** |
| Facts | `lib/facts.ts` → `FACTS: Record<Sport, string[]>` | plain strings | 7 each |
| FAQs | `lib/faqs.ts` → `SPORT_FAQS` | `LocalizedText` | 7–8 each |

**The glossary (402 curated terms, all 10 sports) is your richest safe content source.** It is
already vetted, already sport-scoped, and contains no facts that can go stale.

### 1.9 ⚠️ Difficulty tiers — the `level` trap AND the future paywall

These two requirements pull against each other. Here is the resolution — **follow it exactly.**

**The trap.** `QuizCard` filters the pool by the **global** app level:
```ts
const questions = fullPool.filter(q => q.difficulty === level);   // kid|beginner|intermediate|expert
```
A level-tagged game **renders EMPTY if the user's level has no content.** This already bites in
production: epl / laliga / worldcup / mlr have **ZERO `kid` questions**.

**The product requirement.** Difficulty tiers are how this app will monetize (kid/beginner free;
intermediate/expert Pro). So games **cannot** be level-agnostic — the tiers must be real.

**THE RULE — all three, non-negotiable:**

1. **Author content at all four tiers**, for every sport, in every game. A tier is not optional.
   Tier the *content*, not just the scoring. (For rule-based games this is natural: `kid` = "which team
   is winning?", `expert` = "it's 2nd & 8 from the 40 with 1:02 left and one timeout — what does the
   defense expect?")
2. **NEVER render blank.** Always fall back: `const pool = byLevel.length ? byLevel : fullPool;`
   A blank game is the worst possible outcome — it reads as a broken app.
3. **Wire the paywall seam NOW, leave it OPEN.** The entitlement system already exists —
   `lib/entitlement.tsx → useEntitlement(): { isPro }`, plus a ready-made `components/LockedSection.tsx`
   and `presentPaywall()`. Structure each game's tier selection so that gating intermediate/expert later
   is *"wrap the tier picker in an `isPro` check"* — one small change, not a refactor.
   **Do NOT actually gate anything in this build.** Ship it all free; just don't paint us into a corner.

### 1.10 i18n

`UI_STRINGS` (chrome) is fully translated into 10 languages. **Quiz/glossary/facts content is
English-only.** New game *content* follows the existing convention: English body, translated shell.
Do not build a 10-language content bank.

### 1.11 Scope: mobile only

The Chrome extension has **no** Academy (grepped: zero hits for academy/quiz). Ship once, in
`sports-explainer-mobile-v2/`.

---

## 2. LIVE DATA — what you can actually reach (probed live, 2026-07-14)

### 2.1 ✅ ESPN is keyless and callable DIRECTLY FROM THE PHONE

The app already does this (`lib/scoreboard.ts` calls ESPN with no backend hop, no auth).

**Team list + crests + brand colors — VERIFIED WORKING TODAY:**
```
https://site.api.espn.com/apis/site/v2/sports/{path}/teams
→ sports[0].leagues[0].teams[N].team.{ displayName, abbreviation, logos[0].href, color, alternateColor }
```

| category | path | teams | crests | colors |
|---|---|---|---|---|
| MLB | `baseball/mlb` | 30 | ✅ | ✅ |
| NFL | `football/nfl` | 32 | ✅ | ✅ |
| NBA | `basketball/nba` | 30 | ✅ | ✅ |
| WNBA | `basketball/wnba` | 15 | ✅ | ✅ |
| NHL | `hockey/nhl` | 32 | ✅ | ✅ |
| Soccer | `soccer/eng.1` (EPL), `soccer/esp.1` (La Liga) | 20 each | ✅ | ✅ |
| Rugby | `rugby/164205` (Rugby World Cup, 20 nations) ⭐, `rugby/267979` (Gallagher Prem, 10), `rugby/242041` (Super Rugby, 12) | ✅ | ✅ | ✅ |
| Cricket | **NO `/teams` route (404)** — see 2.2 | — | — | — |

⚠️ `rugby/270559` (Top 14) returns teams but **NO logos** — do not use it.

**Logo CDN patterns (stable, direct):**
```
https://a.espncdn.com/i/teamlogos/{mlb|nfl|nba|wnba|nhl}/500/{abbr}.png    e.g. .../mlb/500/ari.png
https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png
https://a.espncdn.com/i/teamlogos/rugby/teams/500/{id}.png
https://a.espncdn.com/i/teamlogos/cricket/500/{id}.png                     (India=6, Australia=2 — confirmed)
```

Render with a bare RN `<Image source={{ uri }} />` — already proven in `components/GameCard.tsx:111`.
**Zero shipped assets. Zero API keys.**

### 2.2 Cricket workaround

Cricket has **no `/teams` route** and `SPORT_CONFIG` marks it `{ learnMode: true }` (no data source at
all). But crest URLs resolve on the CDN path above. **Hardcode the ~12 Test nations' ids** into the
data lib — they are evergreen and will not go stale.

### 2.3 ✅ Standings — VERIFIED WORKING (keyless)
```
https://site.api.espn.com/apis/v2/sports/{path}/standings
→ children[].standings.entries[].{ team.displayName, stats[{name, displayValue}] }
```
NBA returns 2 conferences × 15 entries with `avgPointsFor`, `avgPointsAgainst`, `differential`, etc.

### 2.4 🚨 THE CONTENT-ACCURACY RULE (the #1 risk in this build)

Every game you build must draw its content from ONE of these two safe classes:

- **(A) RULE-BASED / EVERGREEN** — scoring rules, officials' signals, field zones, positions,
  equipment, glossary terms. These are *facts about how the sport works*. They don't go stale and
  they're verifiable from the existing glossary. **You may author these.**
- **(B) LIVE-FETCHED** — crests, colors, team names, records, standings. Pulled from ESPN at runtime.
  Cannot be hallucinated and cannot go stale.

**❌ FORBIDDEN: hardcoded player/record trivia** ("who has the most career home runs", "who won the
2019 final"). It is the highest-hallucination-risk content and it rots. If a game seems to need it,
redesign the game. This rule is why the catalog below looks the way it does.

### 2.5 Server-only — a mobile game CANNOT reach these
Slash Golf, Tennis RapidAPI, Highlightly, **Zyla rugby** — all key'd, server-side. `TENNIS_LIVE` and
`RUGBY_LIVE` kill-switches **default OFF** (those endpoints return `{matches: []}` in prod).
**Do not design any game against them.** ESPN rugby crests are fine — that's a different path.

---

## 3. THE GAME CATALOG — 6 engines, every sport gets 2–4

Design principle: **build ENGINES parameterized by content, not 30 bespoke games.** One engine ×
10 content banks = a game in every sport. This is the only way this scope is sane.

### Engine 1 — 🛡️ **Crest Rush** (image recall; Sporcle-style)
Show a crest → pick the team from 4 names (and the inverse: name → pick from 4 crests). Timed streak.
- **Content:** class (B) — live `/teams`. Cache the pool in-memory per session.
- **Sports (8):** mlb, nfl, nba, wnba, nhl, soccer, rugby (use RWC 164205 — the 20 nations are the most
  recognizable), cricket (hardcoded 12).
- **Cost: CHEAP.** It's the QuizCard shell with `<Image>` swapped in for the question text.

### Engine 2 — 🎨 **Kit Clash** (color recall; zero text)
Show two color swatches (`color` + `alternateColor` from `/teams`) → pick the team. Pure color.
- **Content:** class (B) — same fetch as Engine 1, so it's nearly free once Engine 1 exists.
- **Sports (8):** same as Engine 1.
- **Cost: CHEAP.** Ship as a *mode* inside Crest Rush if the grid gets crowded.

### Engine 3 — 🔢 **Read the Score** (scoring literacy) ⭐ **BUILD THIS FIRST**
Render an SVG scoreboard/scorecard → "who's winning?" / "what happens on the next point?" Tap to answer.
- **Why it's the most valuable game in this doc:** scoring notation is the #1 barrier for a new fan,
  and it is *exactly* what a sports-explainer app should teach. Tennis deuce/advantage, cricket
  overs/wickets, golf under-par, baseball's count, NFL down-and-distance.
- **Content:** class (A) — rule-based, evergreen, zero hallucination risk. Author it.
- **Sports: ALL 10.** This is the one engine that covers every category.
- **Cost: CHEAP-MEDIUM.** The "board" is a simple SVG panel per sport, not a field.

### Engine 4 — 🚩 **Signal Decoder** (officials' signals; pictograms)
Show a referee/umpire signal → what does it mean? Cricket's umpire signals are iconic; NFL's ref
signals are instantly recognizable.
- **Content:** class (A) — rule-based, evergreen.
- **Sports (7):** mlb, nfl, nba, nhl, soccer, rugby, cricket.
- **Cost: MEDIUM.** ~8 signals × 7 sports of SVG pictograms. Draw them as simple geometric
  stick-figures (arms/torso as `<Line>`/`<Circle>`) — do NOT attempt realistic art.

### Engine 5 — 📍 **Zone Tap** (spatial literacy; tap the surface)
"Where does the shortstop stand?" / "Tap the red zone" / "Tap the crease" → tap the spot on the surface.
- **Content:** class (A) — positions and zones are rule-based. The glossary already defines most of them.
- **Sports: ALL 10** — but **NFL / soccer / MLB are free** (surfaces exist in `FieldEngine`), and
  **nba, nhl, tennis, cricket, golf each need a new ~20-line surface** (court / rink / court / ground /
  hole). Golf's "hole anatomy" (tee, fairway, rough, bunker, green) is genuinely great teaching.
- **Cost: CHEAP for 3 sports, MEDIUM for the other 5** (the new surfaces are the work).

### Engine 6 — ⚖️ **Higher or Lower** (stats; Sporcle-style)
Two teams → which has the better record / higher scoring average? Live standings.
- **Content:** class (B) — live `/standings`. Never stale, never hallucinated.
- **Sports (8 team sports):** mlb, nfl, nba, wnba, nhl, soccer, + rugby/cricket only if standings
  resolve (verify at build time; drop the sport if they don't).
- **Cost: CHEAP.** Two cards, one tap.

### Per-sport coverage (the deliverable: 2–3+ per sport)

| category | new games | count |
|---|---|---|
| MLB | Crest Rush, Read the Score (count/innings), Signal Decoder (umpire), Zone Tap (positions 1–9) | 4 |
| NFL | Crest Rush, Read the Score (down & distance), Signal Decoder, Zone Tap | 4 |
| NBA | Crest Rush, Read the Score, Zone Tap (court*), Higher or Lower | 4 |
| WNBA | Crest Rush, Read the Score, Zone Tap (court*), Higher or Lower | 4 |
| NHL | Crest Rush, Read the Score, Signal Decoder, Zone Tap (rink*) | 4 |
| Soccer | Crest Rush, Read the Score, Signal Decoder, Zone Tap | 4 |
| Rugby | Crest Rush (RWC nations), Read the Score, Signal Decoder, Zone Tap | 4 |
| Cricket | Crest Rush (12 nations), Read the Score (overs/wickets), Signal Decoder (iconic) | 3 |
| Tennis | Read the Score (deuce/advantage ⭐), Zone Tap (court*), Kit Clash → **swap for Slam Surfaces** (clay/grass/hard) | 3 |
| Golf | Read the Score (par/birdie/bogey), Zone Tap (hole anatomy*) | 2–3 |

`*` = needs a new FieldEngine surface.

**Every category clears the 2–3 bar.** Tennis and golf are thinnest because they're individual sports
with no crests — that's inherent, not a gap in the plan.

### Engine 7 — 🎪 **Sportswise Jeopardy** (the board) — ✅ **Anthony asked for this; build it**
A 5×5 grid: 5 columns (categories) × 5 rows (increasing point values). Tap a tile → a clue → answer →
the tile flips and banks the points. Clear the board.

**Build it as a SHELL that routes into the other engines — not as a new text quiz.** This is the whole
design constraint, and it's what makes it *not* text-heavy:

- Each **column is an engine**, scoped to the current sport. E.g. for NFL:
  `🛡️ Crests | 🔢 Read the Score | 🚩 Signals | 📍 Zones | 🧠 Terms`
- Each **row is a difficulty tier** (mapping cleanly onto §1.9 — row 1 = `kid` … row 5 = `expert`),
  and the point value scales with it. The tier ladder *is* the row ladder. This is a very natural fit.
- The clue rendered in a tile is that engine's **visual** clue (a crest, a signal pictogram, a
  scoreboard panel, a field tap) — **never a wall of text**. The `🧠 Terms` column can pull from the
  402-entry glossary (§1.8).

**Why this is the right capstone:** it's the Duolingo "lesson" unit — a bounded, completable session
with a clear finish and a satisfying score, rather than the endless one-question-at-a-time loop the
current Quick Quiz has. It's also the single strongest "come back tomorrow, keep the streak" surface in
the app. **Award points per tile cleared and call `recordQuizActivity()` on board completion.**

**Sports: ALL 10** (columns vary by what each sport supports — reuse `gamesForSportKeys` logic).
**Cost:** MEDIUM, but only *after* Gates 1–5 exist, because it is composed entirely of them. Build last.

---

## 4. GATES (build order — each ends typechecking and playable)

- **GATE 1 — Read the Score, all 10 sports.** Highest teaching value, zero data dependency, zero
  hallucination risk. Proves the registry path end-to-end. Ship it before anything else.
- **GATE 2 — Crest Rush + Kit Clash (8 sports).** First live-data game in the Academy's history.
  Build the `lib/espnTeams.ts` fetcher + cache once; both engines share it.
- **GATE 3 — Zone Tap.** Start with the 3 free surfaces (NFL/soccer/MLB). Then add the 5 new surfaces
  (nba, nhl, tennis, cricket, golf) — each ~20 lines, following `SoccerPitch` verbatim.
- **GATE 4 — Signal Decoder.** The SVG pictogram authoring gate. Most art, least dependency.
- **GATE 5 — Higher or Lower.** Standings fetcher + a two-card compare.
- **GATE 6 — Sportswise Jeopardy.** The capstone board. Composed of Gates 1–5, so it must come last.

---

## 5. DEFINITION OF DONE

**Engineering**
- [ ] `npx tsc --noEmit` exits 0 (it does today — keep it that way).
- [ ] `AcademyGameId` union widened; every new game registered in `ACADEMY_GAMES` with correct
      `supportedSports`.
- [ ] `GameHost.tsx` and `AcademyScreen.tsx` grid/hero logic **unchanged**.
- [ ] Live-data games degrade gracefully offline (cached pool, or a friendly empty state — never a crash).
- [ ] Art (pictograms/diagrams) lives in dedicated modules and is swappable in one place (§0.4).

**Product — "Duolingo for sports" (§0)**
- [ ] Every new game calls `awardPoints()` **and** `recordQuizActivity()`. No exceptions.
- [ ] Every new game has a **teaching beat** — it explains *why*, at the user's level, after the answer.
- [ ] Every new game has content at **all four tiers** (kid/beginner/intermediate/expert)…
- [ ] …**and can never render blank** — always falls back to the full pool (§1.9).
- [ ] The Pro seam is open: gating intermediate/expert later is a one-line `isPro` wrap, not a refactor.
      **Nothing is actually gated in this build — ship it all free.**
- [ ] Every category in `ACADEMY_CATEGORIES` shows **≥2 new games** in its grid.
- [ ] No hardcoded player/record trivia anywhere (§2.4).

## 6. OUT OF SCOPE (bank, don't build)

- Drag-and-drop / sortable games. `react-native-sortables` + `gesture-handler` are installed but have
  **zero precedent in the codebase** — greenfield risk. Use **tap-to-select / tap-in-sequence** instead;
  it's proven and it's the same game.
- Lottie animation (installed, zero precedent).
- A 10-language content bank (§1.10).
- Any game built on Zyla / RapidAPI / Highlightly (§2.5).
- Backend changes. Everything here is client-side against keyless ESPN.
