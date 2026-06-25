# BUILD DOC — Academy Home Shell + First New Game (Term-Match)

> **Goal:** Turn the Academy from a single-quiz scroll into a **Duolingo-style home** that surfaces a
> recommended thing to do and a browsable library of games — built as a **game-registry shell** so
> every future game plugs in without redesigning the tab. Then prove the shell works by adding the
> **first new game: term→definition match**, generated from the existing 206-term glossary (near-zero
> new content authoring).
>
> **Staged on purpose.** Gate A builds and proves the SHELL with the existing quiz as its only
> registered game — nothing about the quiz's behavior changes, so if anything looks wrong it's the
> shell, not new game logic. Gate B adds term-match into the proven shell. Do NOT build them as one
> blob; the staging is the whole point.

---

## 0. GROUND TRUTH (confirmed from recon — do not re-derive)

**What exists today (`screens/AcademyScreen.tsx`):** a single vertical scroll — header (title + streak chip), a horizontal sport-category selector, a combo bar, the **rank card** (Stage 1+2 of progression: visible +N float, animated bar, rank-up beat — already shipped), then inline content: the **Quick Quiz** (`<QuizCard>`), **Did You Know** (`<DidYouKnow>`), and a per-sport **FAQ** section. The quiz reports up via `onCorrect`/`onWrong`, which is where `awardPoints()` + the Stage 1/2 feedback fire.

**The points engine (`lib/appState.tsx`):** one persisted points total; game-agnostic `awardPoints(amount)`; `getRank()`, `RANKS`, daily streak. Stage 3 of progression (per-difficulty mastery counter) is NOT yet built — **out of scope for this doc**; do not build it here.

**The glossary (`lib/glossary/*.ts`):** the 206-term curated glossary, per sport (e.g. `football.ts`, `rugby.ts`, …). This is the content source for term-match. **Recon needed at build time:** confirm the exact shape (term → definition) and which sports have glossary files before building Gate B.

**The quiz bank (`lib/facts.ts`):** `QUIZ: Record<Sport, QuizQuestion[]>`, `QuizQuestion = { q, options, answer, explanation, difficulty }`. Difficulty uses internal `'kid' | 'beginner' | 'intermediate' | 'expert'`.

**No UI architecture or game registry exists yet.** This doc establishes both. The banked pattern ("adding a game = +points hook + per-game mastery") gets extended into the UI: **adding a game = register it in the shell + wire awardPoints**.

---

## 1. WORKFLOW & SAFETY RULES (unchanged from prior build)

- **Anthony pushes ALL git himself. You (Claude Code) NEVER `git add`, commit, or push.** Write files only; STOP and report at each gate.
- **Do NOT touch `lib/entitlement.tsx`.** Out of scope.
- **Do NOT change engine math** — `awardPoints`, `QUIZ_POINTS`, `COMBO_BONUS_CAP`, `RANKS` thresholds all stay as-is.
- **Do NOT build progression Stage 3** (the mastery nudge / new persisted mastery state). Different build. If term-match wants per-game mastery later, that's a future doc.
- **No `localStorage`/`sessionStorage`** — React Native; AsyncStorage via the existing `appState` pattern only.
- **Preserve existing behavior.** The quiz, Did You Know, FAQ, streak, and rank card must all keep working exactly as they do now — this is a re-housing, not a rewrite.
- Spell out any terminal command in full for Anthony to run.
- **STOP at each review gate.** No running ahead. No unilateral scope changes.

---

## 2. DESIGN — the three-zone home + registry

**The layout (top to bottom):**
1. **Identity strip** — keep the existing header (title + streak chip) and the rank card. Compact, top of screen. This is the "your progress" hit; it's already built and good. The sport-category selector stays here too (it scopes which sport's content the games use).
2. **Hero slot** — ONE prominent card that *is* the recommendation, so the user rarely has to choose. **For Gate A, the hero = "Quick Quiz" (the existing quiz), presented as the featured action.** (A rotating Daily Challenge is the eventual hero, but that's a later build — for now the hero just points at the most recent / default game. Keep the hero a thin presentation layer reading from the registry so a Daily Challenge can replace it later without restructuring.)
3. **Game library** — a **grid of compact game tiles** (icon + name, optional small "new"/progress marker). Tapping a tile opens that game **full-screen** (its own focused mode), not an inline expand. Grid reads as "a collection of games"; full-screen-per-game gives each room to breathe and makes "back" a clean exit, consistent with how Live/Coach's Corner work.

**The registry — the load-bearing abstraction:**
- Define a single source of truth for "what games exist," e.g. `lib/academyGames.ts` exporting an array/registry of game descriptors. Each descriptor carries the metadata the shell needs to render a tile and open the game — at minimum: `id`, `title`, `icon` (emoji is fine for now), and a way to render/route to the game screen (e.g. a `route` key or a component reference). Keep it typed.
- The home shell renders the **hero** and the **grid** by reading this registry — it must NOT hardcode the quiz or term-match by name. Adding a future game = add one descriptor + its screen, nothing else in the shell.
- **Do NOT over-engineer.** This is a simple typed list + a render loop, not a plugin framework. The seam is: "shell reads a registry; games are descriptors." That's it. (Matches the doc's anti-over-engineering discipline — design the seam, don't build infrastructure for apps that don't exist.)
- Each game still wires to the existing `awardPoints()` exactly as the quiz does today — the registry is about *surfacing/navigation*, the points hook is unchanged.

**Navigation note (recon at build time):** check how the app currently navigates (the Live screen's past-plays / full-screen patterns, and whatever nav library is in use — React Navigation stack, modal, or a local "active game" state in AcademyScreen). Pick the lightest approach that gives a full-screen game with a clean back. If there's no stack nav in the Academy area today, a local `activeGameId` state in the Academy screen that swaps the scroll for a full-screen game view is acceptable and simplest — propose your approach at Gate A before finalizing.

---

## 3. ⭐ GATE A — Build the shell, register the EXISTING quiz only

**What to build:**
1. `lib/academyGames.ts` — the typed game registry. Seed it with ONE entry: the existing Quick Quiz.
2. Restructure `AcademyScreen.tsx` into the three zones: identity strip (existing header + rank card + sport selector) → hero slot (featured = quiz) → game grid (rendered from the registry; one tile for now).
3. Wire tile-tap → open the quiz **full-screen** (the focused game view). The quiz itself (`QuizCard`) is unchanged — it just now lives in a full-screen game container instead of inline. `onCorrect`/`onWrong` → `awardPoints` + the Stage 1/2 feedback must still fire exactly as today.
4. **Did You Know + FAQ:** decide placement and propose it at the gate — options: keep them on the home below the grid, or fold "Did You Know" into the hero area. Don't delete them; they're existing value. Default: keep them below the grid on the home for now.
5. Keep the rank card, streak chip, combo feedback, +N float, rank-up beat all working — verify nothing regressed.

**Constraints:**
- The shell reads the registry; it does not hardcode "quiz." Prove this by structure even though there's only one game.
- No engine math change, no new persisted state, no entitlement.tsx.
- Typecheck (`npx tsc --noEmit`) clean before stopping.

**✋ REVIEW GATE A — STOP HERE.** Report: the registry shape, the new screen structure, your navigation approach (full-screen mechanism), where Did You Know/FAQ landed, and how to verify on device that the quiz + all progression feedback still works. Anthony reviews + commits before Gate B.

---

## 4. GATE B — Add term→definition match as the second registered game

*Only start after Gate A is committed and the shell is proven on device.*

**The game (simplest viable version):** show a **term**, present 4 **definitions** (1 correct + 3 distractors), user taps the right one — same answer-feedback feel as the quiz (green/red reveal), same scoring hook. It's the quiz mechanic with glossary-sourced content, which is why it's the ideal shell-prover.

**What to build:**
1. **Recon first (read-only):** open the glossary files (`lib/glossary/*.ts`), confirm the exact term/definition shape and which sports have entries. Report the shape before building generation logic.
2. **Content generation from the glossary:** for the selected sport, pick a term as the prompt; its definition is the correct answer; draw 3 distractor definitions from OTHER terms in the same sport's glossary. Shuffle. (If a sport has too few glossary terms to form 4 options, fall back gracefully — skip that sport for term-match or pool across categories; propose handling at the recon report.)
3. **Difficulty:** the glossary defs aren't difficulty-tagged today. For v1, term-match can be **level-agnostic** (one flat set) OR scale by glossary subset if the data supports it — default to level-agnostic for v1 and note it; do NOT invent difficulty tags or fabricate content.
4. **Scoring:** wire `onCorrect` → `awardPoints()`. Reuse the quiz's scoring shape. Since term-match is level-agnostic in v1, pick a sensible flat award (propose the number at the gate — e.g. a mid value like the beginner/intermediate tier) rather than reading the global difficulty level. Keep the +N float / combo feedback consistent with the quiz if cheap; if it requires refactoring shared feedback, note it and keep term-match's feedback simple for v1.
5. **Register it:** add ONE descriptor to `lib/academyGames.ts`. It should now appear as a second tile in the grid and open full-screen — with ZERO changes to the shell's grid/hero code. **That zero-change registration is the proof the shell works.**

**Constraints:**
- Do NOT fabricate or LLM-generate glossary content — distractors come from real other-term definitions only. (Same cardinal rule as the rugby-placeholder lesson: confident-but-wrong content is the worst failure.)
- No engine math change, no entitlement.tsx, no new persisted mastery state.
- Typecheck clean before stopping.

**✋ REVIEW GATE B — STOP HERE.** Report: the glossary shape you found, the distractor logic, the scoring value chosen, confirmation that registering the game required NO shell changes, and how to play it on device. Anthony reviews + commits.

---

## 5. DEFINITION OF DONE
- Academy home shows: identity strip (streak + rank card + sport selector) → hero (featured game) → grid of game tiles.
- Tapping a tile opens that game full-screen with a clean back; all progression feedback (points, +N float, rank-up) still fires.
- A typed game registry (`lib/academyGames.ts`) is the single source of truth; adding term-match required only a new descriptor + its screen, no shell edits.
- Term-match plays: term → 4 glossary definitions → tap correct → scored via `awardPoints()`.
- Quiz, Did You Know, FAQ, streak, rank card all still work. No engine math, entitlement.tsx, or new persisted state touched.

## 6. OUT OF SCOPE (bank, don't build)
- Rotating **Daily Challenge** hero logic (the hero just features a game for now; rotation is a later build — but keep the hero a thin registry-reading layer so it can be swapped in).
- Progression **Stage 3** (per-difficulty mastery nudge / new persisted state).
- The other catalog games (visual ID, sort-the-sequence, flashcards, rapid-fire, this-or-that, you-make-the-call) — each a future descriptor.
- Per-sport ranks, characters/mascot, Coach's Corner↔Academy bridge.
- Difficulty-tagging the glossary for term-match — v1 is level-agnostic.

## 7. FIRST ACTION FOR CLAUDE CODE
Re-open `screens/AcademyScreen.tsx` in full and check how it's currently structured + how the app navigates (is there a nav stack available in the Academy area, or is everything inline?). Then propose your **shell structure + navigation approach** as the FIRST thing at Gate A — before doing the full restructure — so Anthony can sanity-check the navigation choice. Build Gate A only. STOP at Review Gate A. Do not start Gate B or touch git.
