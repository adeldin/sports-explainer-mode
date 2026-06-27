# BUILD DOC — "Make the Call" (universal judgment quiz)

**For:** Claude Code (executor on Anthony's Mac)
**From:** Claude.ai (architect/reviewer — no repo access)
**Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · mobile app `sports-explainer-mobile-v2/`

---

## 0. HOW WE WORK (read first — same rules as always)

- **Anthony pushes ALL git himself.** You NEVER run `git add` / `commit` / `push`. When a gate is reached, STOP and tell Anthony what to commit; he runs git.
- Use **explicit file paths** in any git instructions you write for Anthony — never `git add .`.
- **Recon-first** before touching unfamiliar code. This doc has **review GATES** — STOP at each, summarize what you did, and wait for Anthony's go-ahead before continuing.
- **Do NOT touch** the live Academy components: `components/QuizCard.tsx`, `components/academy/QuizGame.tsx`. We COPY their mechanics into dedicated files (the FormationQuiz precedent). If you find yourself editing either, STOP.
- **Do NOT register Make the Call in `ACADEMY_GAMES`** (`lib/academyGames.ts`). It is a Coach's Corner piece, not an Academy game. It mounts via a TEMP dev entry point now; the real Coach's Corner tab mounts it later.
- No engine-math changes; no `localStorage`; apostrophes inside string literals use double-quotes, backticks, or escapes (never a bare `'` inside a single-quoted string).
- Safe rails: never touch `entitlement.tsx`, `caps.ts`, or the live `explain` path.

---

## 1. WHAT WE'RE BUILDING (one paragraph)

A universal judgment quiz. The user is shown a real game **situation**, picks the best **call** from 2–4 plausible options, and gets the **answer + the "why"** that teaches the underlying principle. Mechanic = the Academy quiz framework (scenario → options → reveal). It's the universal spine that makes Coach's Corner serve all ~14 sports, not just soccer. **v1 ships three sports: baseball (`'mlb'`), soccer (`'soccer'` + the other soccer keys), and football (`'nfl'`).** Text-first — no diagrams in v1.

**The architecture in one sentence:** the *content* (authored scenarios) lives in a static data file and is independent of the *engine* (the quiz UI), so the two can be built and filled in parallel — the engine ships against a small starter content set, and the full 3-AI-authored content drops in later without touching code.

---

## 2. THE PRECEDENT YOU'RE COPYING (confirmed by recon)

`FormationQuizGame.tsx` + `FormationQuizCard.tsx` are the template. They copy the live QuizGame/QuizCard mechanics into dedicated files so the live Academy quiz is never touched. Make the Call does the same, **with two fixes** the recon flagged:

1. **`MakeTheCallGame` MUST take `AcademyGameProps`** — i.e. `({ sportKeys, categoryEmoji }: AcademyGameProps)`. (FormationQuizGame took no props, which is why it can't be hosted by `GameHost`. We fix that here so Make the Call is mountable the moment the Coach's Corner tab exists.)
2. **The header uses `categoryEmoji`** (like the live QuizGame), not a hardcoded emoji.

Everything else — the copied `QUIZ_POINTS`/`COMBO_BONUS_CAP` consts, the `onCorrect`/`onWrong` award block, `flashPointsGain`, `celebrateRankUp`, `onQuizAnswered`, the `QuizOption` sub-component, the Fisher–Yates option shuffle + answer-index remap, the no-repeat cycling, the level pills — is copied from the Formation pair verbatim in behavior.

**Shared hooks that are safe to call** (confirmed generic in recon): `awardPoints(amount)`, `recordQuizActivity()`, `getRank`, `RANK_EMOJI`, `RANKS`, `level`/`setLevel` — all from `useAppState` / `lib/appState`. `scheduleQuizReminder` from `lib/notifications` is also generic. These are the ONLY shared touch-points; scoring constants and card UI are copied, not imported.

---

## 3. FILES TO CREATE (all NEW — nothing existing is edited except the temp mount in Gate 3)

```
lib/makeTheCall.ts                          # scenario type + content bank + selector (the data layer)
components/academy/MakeTheCallGame.tsx       # scoring wrapper (copies FormationQuizGame body, fixes the 2 deltas)
components/academy/MakeTheCallCard.tsx        # card mechanic (copies FormationQuizCard, swaps pool, text-only)
```

(Yes, the components live in `components/academy/` even though this isn't an Academy game — that's just the established folder for game components. Naming convention, not surface assignment.)

---

## ▓▓▓ GATE 1 — THE DATA LAYER (`lib/makeTheCall.ts`) ▓▓▓

Build `lib/makeTheCall.ts` ONLY. Do not build the components yet. STOP at the end of this gate.

### 3.1 The scenario type

```ts
import type { Sport, Level } from "./api";

// A logical sport bucket for Make the Call. Soccer is split across several Sport
// keys (soccer | worldcup | epl | laliga); we author once per logical sport and
// resolve the real Sport key onto it (see resolveBank below).
export type MTCSport = "mlb" | "soccer" | "nfl";

export interface MakeTheCallScenario {
  // --- reused verbatim from the QuizQuestion shape (facts.ts) so scoring + the
  //     card already understand these fields ---
  q: string;              // the situation + the question, in one string
  options: string[];      // 2-4 plausible calls
  answer: number;         // 0-based index of the correct option
  explanation: string;    // the "why" — teaches the principle, not just "correct"
  difficulty: Level;      // 'kid' | 'beginner' | 'intermediate' | 'expert'

  // --- added for Make the Call ---
  id: string;             // stable unique id, e.g. "mlb-count-001" (for de-dupe + future tracking)
  sport: MTCSport;        // which logical bank this belongs to
  conceptTag: string;     // e.g. "count-leverage" — the bridge hook (see note below)
  watchFor?: string;      // optional: what this decision changes / what to watch next
  // diagramRef?: string; // RESERVED for a future visual version. Leave OUT of v1 entirely.
}
```

**Why `conceptTag` matters even though nothing reads it in v1:** it's the hook that later lets a missed Make the Call route to an Academy drill, and lets a Live moment link to the matching lesson (the "Learn more in Coach's Corner →" bridge in FEATURE_IDEAS). Cheap to author now, expensive to retrofit. Author every scenario with one. Keep tags `kebab-case` and reuse them across sports where the concept is genuinely the same (e.g. `risk-vs-reward` appears in all three sports).

### 3.2 The content bank

```ts
export const MAKE_THE_CALL: Record<MTCSport, MakeTheCallScenario[]> = {
  mlb: [ /* starter scenarios — see §3.4 */ ],
  soccer: [ /* … */ ],
  nfl: [ /* … */ ],
};
```

### 3.3 The selector + sport resolver

```ts
// Map a real Sport key onto its logical Make the Call bank.
// Returns null for sports we have no MTC content for yet (the caller shows an empty state).
export function resolveBank(sport: Sport): MTCSport | null {
  if (sport === "mlb") return "mlb";
  if (sport === "nfl") return "nfl";
  if (sport === "soccer" || sport === "worldcup" || sport === "epl" || sport === "laliga") return "soccer";
  return null;
}

// Build the pool for a set of sport keys at a given level. Mirrors how the live
// QuizCard does `sportKeys.flatMap(k => QUIZ[k]).filter(difficulty===level)`,
// but de-duped by logical bank so soccer's four keys don't 4x the pool.
export function buildScenarioPool(sportKeys: Sport[], level: Level): MakeTheCallScenario[] {
  const banks = new Set<MTCSport>();
  for (const k of sportKeys) {
    const b = resolveBank(k);
    if (b) banks.add(b);
  }
  const pool: MakeTheCallScenario[] = [];
  for (const b of banks) {
    for (const s of MAKE_THE_CALL[b]) {
      if (s.difficulty === level) pool.push(s);
    }
  }
  return pool;
}

// Convenience: which logical sports actually have at least one scenario at this level.
export function sportsWithContent(level: Level): MTCSport[] {
  return (Object.keys(MAKE_THE_CALL) as MTCSport[]).filter(
    b => MAKE_THE_CALL[b].some(s => s.difficulty === level)
  );
}
```

### 3.4 STARTER CONTENT (paste these in verbatim — they are the day-one test set)

These are hand-authored to the quality bar (plausible distractors, teaching "why"). They are deliberately few — **2 per sport per the two most common levels** — just enough that the engine has something real to run against at `beginner` and `intermediate`. The full per-level content comes from the 3-AI workflow in Gate 4. Paste them exactly.

```ts
// ---------- MLB ----------
{
  id: "mlb-count-001", sport: "mlb", conceptTag: "count-leverage", difficulty: "beginner",
  q: "It's a 3-0 count with no one on base. The batter is the other team's best power hitter. What's the smart pitch?",
  options: [
    "A fastball over the middle to get a strike",
    "A fastball just off the plate, hoping he chases",
    "Your nastiest slider in the dirt",
    "Walk him on purpose with a pitch way outside",
  ],
  answer: 1,
  explanation: "At 3-0 the hitter is usually 'taking' (not swinging) unless he gets something juicy. You don't want to groove a fastball down the middle to a slugger, and a slider in the dirt risks ball four. A fastball just off the edge might steal a strike if he's swinging, and costs you little if he takes it.",
  watchFor: "If it's now 3-1, the pitcher is in trouble — the hitter can sit on a fastball.",
},
{
  id: "mlb-infield-001", sport: "mlb", conceptTag: "defensive-positioning", difficulty: "beginner",
  q: "Bottom of the 9th, tie game, the winning run is on third base with one out. Where should the infield play?",
  options: [
    "Back, to turn a double play",
    "In, to throw the runner out at home",
    "At normal depth",
    "Shifted toward the pull side",
  ],
  answer: 1,
  explanation: "With the winning run 90 feet away, a normal ground ball ends the game even if you get the out at first. Playing the infield 'in' lets them throw home to stop the run — they trade range (more balls get through) for the chance to save the game right now.",
  watchFor: "Playing in means more grounders sneak through for hits — it's a real gamble.",
},
{
  id: "mlb-bullpen-001", sport: "mlb", conceptTag: "bullpen-leverage", difficulty: "intermediate",
  q: "It's the 7th inning, your team leads by one, bases loaded, two outs. A dangerous left-handed hitter is up. Your starter is tiring. What's the move?",
  options: [
    "Leave the starter in — he got them here",
    "Bring in your left-handed specialist for the matchup",
    "Bring in your closer now, four outs early",
    "Intentionally walk in a run to reset the matchup",
  ],
  answer: 1,
  explanation: "This is the highest-leverage moment of the game — one swing flips it. A tiring starter facing a dangerous lefty is the matchup to avoid. The lefty specialist tilts the platoon advantage your way. Burning the closer for a four-out save is defensible but costs you later; walking in a run hands them the lead-tying run for free.",
  watchFor: "If the lefty reaches base, the manager may already be reaching for the closer.",
},
{
  id: "mlb-steal-001", sport: "mlb", conceptTag: "risk-vs-reward", difficulty: "intermediate",
  q: "Your team trails by two runs in the 8th. A fast runner is on first with no outs and your best hitters are due up. Should he try to steal second?",
  options: [
    "Yes — get into scoring position",
    "No — don't risk the out with the big bats coming",
    "Only if the pitcher throws to first",
    "Steal third instead",
  ],
  answer: 1,
  explanation: "Down two, you need baserunners more than you need 90 feet. Getting caught stealing wastes an out AND removes a runner right when your best hitters could drive him in — a double whammy. With one run down it might be worth it; down two with the heart of the order coming, the out is too costly.",
  watchFor: "Game state changes this — down one with weaker hitters up, the steal becomes smart.",
},

// ---------- SOCCER ----------
{
  id: "soccer-press-001", sport: "soccer", conceptTag: "pressing", difficulty: "beginner",
  q: "Your team is winning 1-0 with 10 minutes left. The other team has the ball deep in their own half. What's the smart team shape?",
  options: [
    "Push everyone up to win the ball high and score again",
    "Drop into a compact block and protect the lead",
    "Have just the strikers chase the ball",
    "Foul immediately to stop play",
  ],
  answer: 1,
  explanation: "Up by one late, the priority is not conceding. Committing everyone forward to press leaves space behind for a counterattack — exactly how late equalizers happen. Dropping into a compact, organized block makes the field small and forces the opponent to break down a wall. It's less exciting, but it's how leads are protected.",
  watchFor: "Watch the fullbacks — if they stop overlapping, the team has switched to lead-protection mode.",
},
{
  id: "soccer-width-001", sport: "soccer", conceptTag: "creating-space", difficulty: "beginner",
  q: "The other team is defending with everyone packed tightly in the center of their box. How do you create a good chance?",
  options: [
    "Keep passing through the crowded middle",
    "Spread the ball wide to stretch them, then attack the gaps",
    "Shoot from distance every time",
    "Send long balls hoping for a deflection",
  ],
  answer: 1,
  explanation: "A packed central defense has no space to give in the middle — forcing it there plays into their hands. Moving the ball wide makes defenders shift and the compact block stretch; the gaps that open between them are where the real chance gets created. Width isn't about crossing — it's about pulling the defense apart.",
  watchFor: "After a switch of play, watch for the gap that opens on the far side before the defense recovers.",
},
{
  id: "soccer-redcard-001", sport: "soccer", conceptTag: "adjusting-to-personnel", difficulty: "intermediate",
  q: "Your team just got a red card — you're down to 10 players — with 30 minutes left in a 0-0 game. What's the right adjustment?",
  options: [
    "Keep the same attacking shape and hope",
    "Sacrifice an attacker, drop into a disciplined low block, play for a draw or the counter",
    "Push everyone forward to score before they tire you out",
    "Have the goalkeeper play as an outfield player",
  ],
  answer: 1,
  explanation: "A man down, you can't cover the whole field — trying to leaves gaps a good team will exploit. The standard fix is to give up a forward, compact the remaining 10 into a tight defensive shape, and stay dangerous on the counterattack. You concede possession on purpose to stay solid where it matters.",
  watchFor: "Watch which player comes off — losing a striker for a midfielder signals the switch to survival mode.",
},
{
  id: "soccer-buildup-001", sport: "soccer", conceptTag: "build-up", difficulty: "intermediate",
  q: "The opponent presses high and aggressively whenever your goalkeeper has the ball. Your defenders look rushed. What's the better build-up plan?",
  options: [
    "Just boot it long every time to escape the press",
    "Keep forcing short passes under pressure",
    "Use a mix — bait the press with short passes, then play over it when they commit",
    "Have the keeper hold the ball as long as possible",
  ],
  answer: 2,
  explanation: "A pure long-ball bail-out concedes possession cheaply; forcing short passes into a committed press invites a turnover near your own goal. The strong answer baits the press — draw them in with short options, and the moment they over-commit, play over or through the space they vacated. Pressing aggressively leaves space behind; good build-up uses it.",
  watchFor: "When the press commits, watch for the space behind their midfield — that's the target.",
},

// ---------- NFL ----------
{
  id: "nfl-4thdown-001", sport: "nfl", conceptTag: "risk-vs-reward", difficulty: "beginner",
  q: "It's 4th-and-1 at midfield, early in the game, score tied. What's the modern smart call?",
  options: [
    "Punt and play field position",
    "Go for it — gain a yard, keep the drive alive",
    "Attempt a very long field goal",
    "Throw a deep pass into the end zone",
  ],
  answer: 1,
  explanation: "4th-and-1 is a high-percentage conversion, and analytics have shifted the consensus toward going for it in this spot — the value of keeping the drive alive outweighs the modest field-position gain from a punt. A 60+ yard field goal is a low-percentage waste, and a deep shot ignores the easy yard you need.",
  watchFor: "Field position and time left change this — pinned deep in your own territory, the punt comes back into play.",
},
{
  id: "nfl-coverage-001", sport: "nfl", conceptTag: "reading-coverage", difficulty: "beginner",
  q: "The defense shows two deep safeties split to the sidelines before the snap. Generally, where is the defense most vulnerable?",
  options: [
    "Deep down the middle of the field",
    "On short outside throws to the sideline",
    "Nowhere — it covers everything",
    "On deep sideline routes",
  ],
  answer: 0,
  explanation: "Two safeties split wide and deep (a 'two-high' look) means no one is sitting in the deep middle — that area is the soft spot. Offenses attack it with routes up the seam. The trade-off of protecting both sidelines deep is that the middle of the field opens up.",
  watchFor: "Safeties can disguise it — watch if one sprints to the middle after the snap, changing the picture.",
},
{
  id: "nfl-clock-001", sport: "nfl", conceptTag: "clock-management", difficulty: "intermediate",
  q: "You trail by 4 with 2:00 left, one timeout, ball at your own 25. A run play just gained 6 yards and the clock is running. What now?",
  options: [
    "Call your timeout immediately to save clock",
    "Let the clock run and huddle normally",
    "Snap quickly to run another play before calling timeout",
    "Spike the ball to stop the clock",
  ],
  answer: 2,
  explanation: "You need a touchdown (a field goal only ties... no, you're down 4, so a FG isn't enough) — you need the end zone, so you must balance scoring with saving your last timeout. Snapping quickly to get one more play off before stopping the clock preserves the timeout for later, when you'll need it most. Burning the timeout now wastes your only stoppage; a spike wastes a down you can't spare.",
  watchFor: "That last timeout is precious — it's what lets you stop the clock near the goal line.",
},
{
  id: "nfl-blitz-001", sport: "nfl", conceptTag: "pressure-vs-coverage", difficulty: "intermediate",
  q: "It's 3rd-and-long. The defense wants a stop. What's the trade-off of sending an all-out blitz?",
  options: [
    "There is no trade-off — more rushers is always better",
    "You pressure the QB fast, but leave receivers in single coverage with no help",
    "It only works against the run",
    "It guarantees a sack",
  ],
  answer: 1,
  explanation: "Blitzing trades coverage for pressure: extra rushers can force a hurried throw or a sack, but every rusher is one fewer defender in coverage — receivers get single coverage with no safety help behind. Against a quick, accurate QB it can backfire into a big play. It's a calculated gamble, not a free win.",
  watchFor: "If the QB gets the ball out fast, the blitz loses — watch for a quick slant beating the pressure.",
},
```

**END OF GATE 1.** STOP. Tell Anthony:
- The file `lib/makeTheCall.ts` is built with the type, bank, selector, resolver, and 12 starter scenarios.
- Run a TypeScript check the way this repo normally does (e.g. `npx tsc --noEmit` if that's the project's check — if unsure, ask Anthony which command the repo uses; do NOT guess and run something destructive). Report any type errors.
- What Anthony should `git add` when he's ready (he'll decide when to commit): `git add lib/makeTheCall.ts`. **You do not run git.**

---

## ▓▓▓ GATE 2 — THE COMPONENTS ▓▓▓

Only start after Anthony clears Gate 1. Build the two components by copying the Formation pair and applying the deltas below. STOP at the end.

### `components/academy/MakeTheCallGame.tsx`

Copy `components/academy/FormationQuizGame.tsx` as the base, then apply EXACTLY these changes:

1. **Signature:** `export default function MakeTheCallGame({ sportKeys, categoryEmoji }: AcademyGameProps)` — restore the `AcademyGameProps` (FormationQuizGame dropped them; the live QuizGame has them — match the live one). Import `AcademyGameProps` from `../../lib/academyGames`.
2. **Header emoji:** use `categoryEmoji` like the live QuizGame (`{categoryEmoji ? \`${categoryEmoji}  \` : ''}…`), NOT a hardcoded emoji.
3. **Render the card:** `<MakeTheCallCard sportKeys={sportKeys} streak={combo} onCorrect={…} onWrong={…} />` — pass `sportKeys` and `streak` through (the live QuizCard takes these; FormationQuizCard didn't because it self-generated — but Make the Call's card pools BY SPORT, so it needs `sportKeys`).
4. Keep everything else byte-identical to FormationQuizGame: the copied `QUIZ_POINTS`/`COMBO_BONUS_CAP` consts, the `onCorrect` award block (`comboBonus`, `gained`, `awardPoints`, rank-cross check via `getRank(points)` vs `getRank(points + gained)`, `flashPointsGain`, `celebrateRankUp`, `setCombo`, `onQuizAnswered`), `onWrong` (reset combo + `recordQuizActivity`), the combo `useEffect`, `onQuizAnswered`, and all styles.
5. Import `MakeTheCallCard` instead of `FormationQuizCard`.

### `components/academy/MakeTheCallCard.tsx`

Copy `components/academy/FormationQuizCard.tsx` as the base, then apply EXACTLY these changes:

1. **Props:** `{ sportKeys, streak, onCorrect, onWrong }` — match the LIVE QuizCard's prop shape (not FormationQuizCard's `{ onCorrect, onWrong }`), because Make the Call pools by sport. Import `Sport` from `../../lib/api`.
2. **Pool source:** replace the formation generator import + `buildFormationQuestionPool(level)` with:
   ```ts
   import { buildScenarioPool, MakeTheCallScenario } from "../../lib/makeTheCall";
   // …
   const [pool, setPool] = useState<MakeTheCallScenario[]>(() => buildScenarioPool(sportKeys, level));
   ```
   and regenerate on `level` OR `sportKeys` change (the formation card regenerated on `level` only — add `sportKeys` to that effect's deps and rebuild via `buildScenarioPool(sportKeys, level)`).
3. **No visual:** REMOVE the `<FormationDiagram … />` block entirely. Make the Call v1 is text-only — render `question.q` as plain text above the options, exactly like the live QuizCard does. (Do not import `FormationDiagram`, `synthTeam`, or anything formation-related.)
4. **Keep identical:** the copied `QuizOption` sub-component, `shuffleOptions` (Fisher–Yates + answer-index remap), `pickIndex` no-repeat cycling, `choose`/`next`, the level-pill row (which calls `setLevel`), and the reveal + "Next" markup. The reveal shows `question.explanation`. If `question.watchFor` exists, render it under the explanation as a small muted line prefixed with something like "Watch for:" (this is the one NEW bit of UI — a single `<Text>` line, styled like a secondary caption; if it's not present on a scenario, render nothing).
5. **Empty state:** if `pool.length === 0` (a level/sport combo with no authored content yet), show a simple centered message like "No scenarios here yet — try another level." Do NOT crash or render a blank card. (The starter content only covers `beginner` + `intermediate`, so `kid` and `expert` WILL be empty until Gate 4 content lands — this empty state is what the user sees there.)

**END OF GATE 2.** STOP. Tell Anthony:
- Both components built. TypeScript check clean (report errors if any).
- What he can `git add` when ready: `git add components/academy/MakeTheCallGame.tsx components/academy/MakeTheCallCard.tsx`. **You do not run git.**
- Note: it's not mountable/visible yet — that's Gate 3.

---

## ▓▓▓ GATE 3 — TEMP DEV MOUNT (so Anthony can test on-device) ▓▓▓

Make the Call isn't registered anywhere (by design), so we need a throwaway way to SEE it in Expo Go. This is the ONLY existing file you edit, and it's explicitly temporary.

**Recon first:** look at how `AcademyScreen.tsx` mounts a game full-screen via `GameHost` (the recon showed: `activeGameId` → `getAcademyGame` → `<GameHost game={…} sportKeys={…} categoryEmoji={…} onBack={…} />`). We mimic that, but with a hand-built game descriptor pointing at `MakeTheCallGame` instead of a registry lookup.

**The temp mount — pick the LIGHTEST-TOUCH option and confirm with Anthony before wiring:**

Preferred: add a temporary dev button to `screens/AcademyScreen.tsx` (e.g. near the top of the games grid) labeled something obvious like "🧪 Make the Call (DEV)". Tapping it sets a local `showMTC` boolean; when true, render `GameHost` with an inline descriptor:

```tsx
// TEMP DEV MOUNT — REMOVE when Coach's Corner tab mounts Make the Call. (Gate 3, BUILD_MAKE_THE_CALL.md)
const MTC_DEV_GAME = {
  id: "make-the-call" as any,   // not a real AcademyGameId — dev-only cast
  title: "Make the Call",
  icon: "🎯",
  blurb: "Judgment quiz (dev)",
  Component: MakeTheCallGame,
};
```

and mount it with `sportKeys` = the current category's sport keys (the same `category.sportKeys` AcademyScreen already has) and `categoryEmoji={category.emoji}`, with `onBack={() => setShowMTC(false)}`.

**Wrap the entire temp block — the button, the boolean, the descriptor, the conditional render — in clearly-marked `// TEMP DEV MOUNT …` comments so it's trivially deletable.** Do NOT add it to `ACADEMY_GAMES`. Do NOT widen `AcademyGameId`. The `as any` cast on the dev descriptor's `id` is acceptable BECAUSE it's temp dev code that gets deleted — flag this to Anthony so he knows the cast is intentional and temporary.

**Make sure the test category actually includes one of the three sports** (`mlb`, `soccer`, or `nfl`) so the pool isn't empty. If AcademyScreen's categories don't cleanly map to those sports, tell Anthony — he may want to test from a category that includes MLB (in-season) at the `beginner` or `intermediate` level (the levels the starter content covers).

**END OF GATE 3.** STOP. Tell Anthony:
- The temp dev mount is wired in `screens/AcademyScreen.tsx`, clearly comment-fenced for later removal, and the `as any` cast is intentional/temporary.
- To test: start Expo Go the usual way —
  `cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2 && npx expo start -c`
  (press `s` if it says "Using development build," `r` to reload, Ctrl+C to stop).
  Then: open Academy → a category that includes MLB → set level to **Beginner** or **Intermediate** → tap the 🧪 dev button → play a few scenarios.
- **What to check on-device (the pre-test checklist):** options shuffle (correct answer isn't always in the same position); tapping right vs wrong shows the correct reveal + the explanation; "Watch for:" line appears when present; points float + combo + rank-up fire exactly like the Academy quiz; the level pills switch the pool; `kid`/`expert` show the empty state (not a crash); back button returns cleanly.
- What he can `git add` if he wants to commit the temp mount with the rest (his call — he may prefer to keep the temp mount uncommitted): `git add screens/AcademyScreen.tsx`.

---

## ▓▓▓ GATE 4 — CONTENT (the 3-AI authoring workflow) — runs AFTER the engine works ▓▓▓

This gate has **no code for Claude Code** — it's the content pipeline Anthony runs (crowd-source 3 AIs, curate, confirm-if-confused). It's here so the whole plan lives in one doc. Once the engine is verified on-device (Gate 3), the bank gets filled out by authoring scenarios at `kid` and `expert` (currently empty) and deepening `beginner`/`intermediate`, then pasting them into `MAKE_THE_CALL` in `lib/makeTheCall.ts`.

### The authoring prompt (Anthony pastes this into ChatGPT, Gemini, Perplexity — once per sport)

> I'm writing judgment scenarios for a sports-learning app feature called "Make the Call." Each scenario shows the user a real game situation and asks them to pick the best strategic decision, then teaches *why*. I need scenarios for **[SPORT]** at the **[LEVEL]** level (levels: Rookie = absolute beginner, just the rule/outcome; Beginner = outcome + basic why; Intermediate = the tactic/craft; Expert = the deeper strategy, outcome assumed).
>
> **Hard quality rules — follow all of them:**
> 1. **All wrong answers must be plausible to a knowledgeable fan.** If the right answer is the only sane option, the scenario is useless — reject it. Every distractor should be something a real coach/player might actually consider. No joke options, no obviously-illegal moves.
> 2. **The "why" must teach the transferable principle**, not just say "because it's correct." A good explanation makes the user understand the *trade-off* so they can read the next situation themselves. Khan Academy, not a hype-man.
> 3. **Scale the WHOLE scenario to the level** — at Rookie the situation and options are simple and the lesson is a basic rule; at Expert the situation assumes fluency and the lesson is genuine strategy. Don't just change vocabulary.
> 4. Each scenario needs: a `conceptTag` (kebab-case, the underlying principle, e.g. `count-leverage`, `risk-vs-reward`, `clock-management`), and a one-line `watchFor` (what this decision changes / what to watch next).
> 5. Situations must be realistic and correct for the sport. If you're not certain a call is genuinely the textbook-best answer, say so — flag it rather than guessing.
>
> Give me **8 scenarios**. For each, output exactly: the situation+question (one paragraph), 3-4 options, which option number is correct, the "why" explanation (2-3 sentences), the conceptTag, and the watchFor line.

### Curation (Anthony's job, with the professor hat on)

- Collect all three AIs' outputs per sport/level. Keep the ones that pass the two hard bars (plausible distractors + teaching why). Merge/dedupe overlaps.
- **The professor check:** is the "correct" answer *actually* the textbook-best call, or just defensible? Most you'll judge yourself. Where genuinely ambiguous (two calls are both legitimately right depending on philosophy), either pick the consensus-coaching answer and make the explanation acknowledge the alternative, or drop it. **This is the "confirm only if Claude is confused" point** — if the architect (me) is unsure whether a call is accurate when reviewing your curated batch, I'll flag it to you specifically; otherwise I curate against the quality bars and you don't have to weigh in on every card.
- Hand the curated batch back to me (Claude.ai) and I'll format them into valid `MakeTheCallScenario` objects with stable `id`s (`[sport]-[concept]-[NNN]`) ready to paste into the bank. Then Claude Code just drops them into `MAKE_THE_CALL` — pure data, no logic change.

### Target for a "feels real" v1 bank
Roughly **6-8 scenarios per sport per level** = ~24-32 per sport × 3 sports ≈ 80-100 scenarios. That's enough that the no-repeat cycling doesn't loop quickly. It's a content grind, not a code task — but it's the grind that decides whether this lands as top-10 quality or generic trivia.

---

## 4. WHAT WE ARE EXPLICITLY NOT DOING IN v1 (scope guardrails)

- **No diagrams / visuals.** Text-first (the catalog's MVP recommendation). `diagramRef` is reserved in a comment but unused.
- **No Coach's Corner tab.** Make the Call mounts via the temp dev button now; the real tab is a separate later build that will mount it (and remove the temp button).
- **No `ACADEMY_GAMES` registration.** It's a Coach's Corner piece, not an Academy game.
- **No live-game-generated scenarios.** All authored/static in v1. (`source` field isn't even in the type yet — add it only when live generation is real.)
- **No Academy/Live bridges yet.** `conceptTag` is authored now so the bridge is cheap later, but nothing consumes it in v1.
- **No translation.** English-first, matching the existing quiz + formation-quiz precedent.

---

## 5. SUMMARY OF GATES (the stop points)

1. **Gate 1 — data layer:** `lib/makeTheCall.ts` (type + bank + selector/resolver + 12 starter scenarios). STOP, tsc check.
2. **Gate 2 — components:** `MakeTheCallGame` + `MakeTheCallCard` (copy Formation pair, apply deltas, text-only, AcademyGameProps). STOP, tsc check.
3. **Gate 3 — temp dev mount:** comment-fenced dev button in `AcademyScreen.tsx`. STOP, Anthony tests on-device against the checklist.
4. **Gate 4 — content:** 3-AI authoring → Anthony curates → Claude.ai formats → paste into bank. (No Claude Code work until the formatted objects exist.)

At every gate: STOP, summarize, tell Anthony exactly what to `git add` (he runs git himself), wait for go-ahead.
