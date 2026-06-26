# BUILD DOC — Academy Full Parity + Tap-to-Pair Matching Game

> **Goal:** Make every Academy sport complete. (1) Add curated glossaries for the 7 sports that
> lack them (NBA, WNBA, NHL, Soccer, Tennis, Golf, Cricket), (2) add a short `match`-label field to
> every glossary entry (new sports ship with it; existing MLB/NFL/Rugby get it back-filled), (3) add
> a `supportedSports` field to the game registry so each sport shows only the games that work, and
> (4) replace the quiz-like Term Match with a real **tap-to-pair matching game** that reads the short
> labels — mechanically distinct from the quiz (the current Term Match was too quiz-like; this fixes
> that).
>
> **Staged in 3 gates.** Content/wiring lands and is proven FIRST (with the existing Term Match still
> working), THEN the registry gate, THEN the new matching game. Don't collapse them — the staging
> isolates content bugs from game bugs.

---

## 0. GROUND TRUTH (confirmed from recon — do not re-derive)

**`lib/glossary/types.ts`:** `GlossarySport = 'mlb' | 'nfl' | 'rugby'`. `GlossaryEntry = { term, def, sport, aliases? }`. Adding `short?: string` is backward-compatible — no consumer reads field count.

**`lib/glossary/index.ts`:** imports each `*_GLOSSARY`, maps app `Sport` → array in `BY_SPORT` (`mlb→baseball, nfl→football, rugby→RUGBY, mlr→RUGBY`), `getGlossary(sport)` returns `BY_SPORT[sport] ?? []`, `GLOSSARY` is the flattened concat.

**Entry format (from baseball.ts):** `import { GlossaryEntry } from './types';` then `export const X_GLOSSARY: GlossaryEntry[] = [ { term, def, sport, aliases? }, … ]`. **Defs containing an apostrophe MUST use double-quoted strings** (build-safety convention).

**`.def` consumers (5 display sites + segmenter + TermMatchGame):** PlayCard, CoachCard, RecapCard, VisionModal, GlossaryText, segment.ts, TermMatchGame. All reference `.def`/`.term` explicitly — a new `short` sibling is invisible to them. **The live tap-to-define feature uses `def` — do NOT change any `def` text.**

**`lib/academyCategories.ts`:** 10 categories. Multi-league sportKeys: soccer = `['soccer','epl','laliga','worldcup']`, rugby = `['rugby','mlr']`. All others single-key. The category emoji is already threaded to games via `categoryEmoji`.

**`lib/academyGames.ts`:** `AcademyGameId = 'quiz' | 'term-match'`. `AcademyGameProps = { sportKeys, categoryEmoji? }`. Registry iterated by the home shell; `getAcademyGame(id)` lookup. Two registered games today.

**`components/academy/TermMatchGame.tsx`:** the current quiz-like Term Match (term → 4 long defs → tap one). **This gets REPLACED by the tap-to-pair game in Gate C.**

---

## 1. WORKFLOW & SAFETY RULES (unchanged)

- **Anthony pushes ALL git himself. Claude Code NEVER `git add`/commit/push.** Write files only; STOP and report at each gate.
- **Do NOT touch `lib/entitlement.tsx`.** Out of scope.
- **Do NOT change engine math** (`awardPoints`, `QUIZ_POINTS`, `COMBO_BONUS_CAP`, `RANKS`).
- **Do NOT change any existing `def` text** — the live tap-to-define feature shows it verbatim.
- **Do NOT build progression Stage 3** (mastery nudge / new persisted mastery state).
- **No `localStorage`/`sessionStorage`** — AsyncStorage via the existing `appState` pattern only.
- **Apostrophe rule:** any `def` or `match` string containing an apostrophe MUST use double quotes.
- Spell out terminal commands in full. STOP at each gate. No unilateral scope changes.

---

## 2. THE GLOSSARY CONTENT (authored + curated — paste verbatim)

> The 7 new sports' content is provided by Anthony in the chat as `term | def | match` lines (one
> per term). Claude Code's job is to transcribe them faithfully into typed `GlossaryEntry[]` files —
> **do NOT rewrite, summarize, or "improve" any def or match text.** The content was human-curated;
> transcribe it exactly. Anthony will paste each sport's curated block.
>
> **The new field is `match` (the short tile label), not `short`** — name it `match?: string` to be
> unambiguous (it's the matching-game label). [If you'd prefer `short`, that's fine too — just be
> consistent everywhere. Default: `match`.]

**Content note for back-fill:** MLB/NFL/Rugby already have `def`; they need `match` labels added.
Anthony will provide those too (Claude Code does NOT author them). Until provided, those entries may
ship without `match` — the matching game falls back gracefully (see Gate C).

---

## 3. ⭐ GATE A — Glossaries + the `match` field (content & wiring; prove it loads)

**What to build:**

1. **`lib/glossary/types.ts`:**
   - Widen `GlossarySport` to: `'mlb' | 'nfl' | 'rugby' | 'nba' | 'wnba' | 'nhl' | 'soccer' | 'tennis' | 'golf' | 'cricket'`.
   - Add `match?: string;` to `GlossaryEntry` (optional → backward-compatible). Document it: "Short 2–5 word label used by the Term Match / matching game; falls back to nothing when absent."

2. **Author the 7 new glossary files**, one per sport, mirroring `baseball.ts` exactly (`import { GlossaryEntry } from './types';` + `export const NBA_GLOSSARY: GlossaryEntry[] = [...]`). Each entry: `{ term, def, sport, match }`. Transcribe Anthony's pasted `term | def | match` lines verbatim. **Apostrophe → double-quoted string.** Files:
   - `lib/glossary/basketball.ts` → `NBA_GLOSSARY` (sport: `'nba'`)
   - `lib/glossary/hockey.ts` → `NHL_GLOSSARY` (sport: `'nhl'`)
   - `lib/glossary/soccer.ts` → `SOCCER_GLOSSARY` (sport: `'soccer'`)
   - `lib/glossary/tennis.ts` → `TENNIS_GLOSSARY` (sport: `'tennis'`)
   - `lib/glossary/golf.ts` → `GOLF_GLOSSARY` (sport: `'golf'`)
   - `lib/glossary/cricket.ts` → `CRICKET_GLOSSARY` (sport: `'cricket'`)
   - **WNBA:** reuse NBA content. Simplest: WNBA category's sportKey (`wnba`) maps to `NBA_GLOSSARY` in `BY_SPORT` (same as rugby/mlr sharing). Do NOT duplicate the file. (The `sport` field on those entries stays `'nba'`; that's fine — it's a label, not a filter the game depends on.)

3. **`lib/glossary/index.ts`:**
   - Import the 6 new arrays.
   - Extend `BY_SPORT` with every category sportKey that should resolve to a glossary:
     - `nba: NBA_GLOSSARY`, `wnba: NBA_GLOSSARY`, `nhl: NHL_GLOSSARY`, `tennis: TENNIS_GLOSSARY`, `golf: GOLF_GLOSSARY`, `cricket: CRICKET_GLOSSARY`.
     - **Soccer is multi-league:** map ALL of soccer's sportKeys → `SOCCER_GLOSSARY`: `soccer: SOCCER_GLOSSARY, epl: SOCCER_GLOSSARY, laliga: SOCCER_GLOSSARY, worldcup: SOCCER_GLOSSARY`. (Mirror how rugby maps both `rugby` and `mlr`.)
   - Extend the flattened `GLOSSARY` concat to include the new arrays.

4. **Back-fill `match` on existing MLB/NFL/Rugby** — Anthony provides these labels; transcribe them onto the existing entries in `baseball.ts` / `football.ts` / `rugby.ts` by matching on `term`. Do NOT touch their `def` text. (If Anthony provides these in a later message, do this as a sub-step then; if not yet provided, proceed and note they're pending — the game falls back.)

**Constraints:**
- Do NOT change any `def`. Do NOT change `aliases`. Only ADD `match` + the new files + index wiring.
- Typecheck clean (`npx tsc --noEmit`).
- The existing Term Match game still works (it reads `def`, unaffected) — that's the proof content didn't break anything.

**✋ REVIEW GATE A — STOP HERE.** Report: the widened union, the new files + term counts each, the `BY_SPORT` additions (especially the soccer multi-league mapping), whether MLB/NFL/Rugby `match` back-fill is done or pending, and how to verify on device (open Term Match on each new sport — it should now generate questions instead of the empty state). Anthony reviews + commits.

---

## 4. GATE B — `supportedSports` registry field

*Future-proofs the grid so a sport only ever shows games it can actually run. Even at full parity this is correct hygiene — and it's what lets the matching game be added safely in Gate C.*

**What to build:**

1. **`lib/academyGames.ts`:** add an optional `supportedSports?: Sport[]` to the `AcademyGame` interface. Semantics: if present, the game is shown ONLY for categories whose sportKeys intersect this list; if absent, the game is shown for ALL sports (default — the quiz works everywhere via the quiz bank).
   - Quiz descriptor: leave `supportedSports` absent (works everywhere).
   - Term Match descriptor: `supportedSports` = the sports with glossaries. After Gate A that's all 10, so it could be omitted — BUT set it explicitly to the glossary sports anyway, so the field is exercised and correct if a future sport lacks a glossary.

2. **A helper** (in `academyGames.ts`): `gamesForSportKeys(sportKeys: Sport[]): AcademyGame[]` → returns games where `supportedSports` is absent OR intersects `sportKeys`.

3. **`screens/AcademyScreen.tsx`:** the hero + grid currently iterate `ACADEMY_GAMES` directly. Change them to iterate `gamesForSportKeys(category.sportKeys)` so switching category filters the visible games. (Hero: feature the first supported game for the current category.) This is the ONLY shell change in this build.

**Constraints:**
- With full-parity glossaries from Gate A, every sport supports both games — so visually nothing should disappear yet. The point is the *mechanism* is in place. Verify by temporarily reasoning about a sport with no glossary (don't add one) → that game would correctly not show.
- Typecheck clean.

**✋ REVIEW GATE B — STOP HERE.** Report: the `supportedSports` semantics, the helper, the shell change, and confirm all 10 sports still show both games (parity). Anthony reviews + commits.

---

## 5. GATE C — The tap-to-pair Matching Game (replaces quiz-like Term Match)

*The real fix for "Term Match feels too quiz-like." This is mechanically DIFFERENT from the quiz: a board of term tiles and short-label tiles that the player taps to PAIR, clearing matches.*

**The game design:**
- Show a board of **N pairs** (start with **N = 5** — tune later): a column/list of **terms** and a shuffled column/list of their **short `match` labels**.
- Player taps a term, then taps a label (or vice-versa). Correct pair → both tiles animate out / lock in green (cleared). Wrong pair → brief red shake, both deselect, try again.
- When all N pairs are cleared → a "Round complete!" beat + a "Next round" that deals N fresh pairs from the pool. Award points per correct pair (or per completed round — see scoring).
- This is spatial, fast, and short-label-based — nothing like reading four long definitions. THAT is what makes it a distinct game.

**Content source:**
- Pool = the category's glossary entries (via `getGlossary` across `sportKeys`, deduped by term — same dedupe as the old Term Match for the rugby/mlr double-array).
- **Use `entry.match` as the tile label; fall back to a SHORTENED `entry.def` (e.g. first ~4 words) or skip the entry if it has no `match`** — so back-fill-pending sports still work, but prefer entries WITH `match`. Filter the pool to entries that have a `match` label when enough exist (≥ N); only fall back if too few.
- Pick N terms whose `match` labels are DISTINCT (they were curated to be, but guard against a dup by skipping a term whose match collides with one already chosen this round).
- Graceful empty state if a category somehow has < N usable entries (shouldn't happen post-parity, but keep the guard): show "Not enough terms yet for this sport" — though with parity this path is dead.

**Scoring & feedback:**
- Wire correct pairs → `awardPoints()`. Propose a value: e.g. **+5 per correct pair** (so a 5-pair round ≈ 25, comparable to a strong quiz streak) OR a flat **+20 per completed round**. Propose your choice at the gate; single named constant, tunable.
- Reuse the slim in-game header pattern (points line + categoryEmoji) for consistency with QuizGame/the old TermMatch. The "+N" float can fire on each correct pair if cheap; keep feedback simple if it requires shared-feedback refactoring.
- Combo-on-exit: non-issue (no persistent combo; points persist via `awardPoints`).

**Wiring:**
- Create `components/academy/MatchGame.tsx` (the new tap-to-pair game).
- In `lib/academyGames.ts`: repoint the `term-match` descriptor's `Component` to `MatchGame` (keep the id `term-match` so nothing else changes, OR rename to `match` and update the id union — your call; **default: keep id `term-match`, swap the Component + update title/blurb/icon** to reflect it's now a matching game, e.g. title "Match Up", icon 🧩, blurb "Pair the terms to their meanings.").
- **Delete or leave** the old `TermMatchGame.tsx`? Default: leave the file in place but unreferenced (no import) so the diff is smaller and it's recoverable; OR delete it if you prefer cleanliness. Propose at the gate.

**Constraints:**
- Do NOT fabricate labels — tiles come from real `match`/`def` content only.
- No engine-math change, no entitlement.tsx, no new persisted state.
- Reuse the Reanimated patterns already in the codebase; no new animation lib.
- Typecheck clean.

**✋ REVIEW GATE C — STOP HERE.** Report: the board layout, pair-selection + clear logic, the fall-back rule for entries without `match`, the scoring value, how registering it required only the descriptor swap (registry seam), and how to play it on device across several sports. Anthony reviews + commits.

---

## 6. DEFINITION OF DONE
- All 10 Academy sports have a glossary; every sport's games work (full parity, no dead empty states).
- `GlossaryEntry` has an optional `match` label; new sports ship with it, MLB/NFL/Rugby back-filled (or pending-noted with graceful fallback).
- `supportedSports` mechanism exists; the grid shows only supported games per sport (all show at parity).
- Term Match is replaced by a genuine tap-to-pair matching game that feels distinct from the quiz.
- No `def` text changed, no engine math, no entitlement.tsx, no new persisted state. No git by Claude Code.

## 7. OUT OF SCOPE (bank, don't build)
- Difficulty tiers for the matching game (level-agnostic v1).
- Rotating Daily Challenge hero, progression Stage 3, other catalog games (this-or-that, etc.).
- Translating the new glossaries (English-only v1, like the existing ones).
- Per-sport ranks, characters/mascot.

## 8. FIRST ACTION FOR CLAUDE CODE
Start GATE A only. First, confirm back to me: (a) this is a 3-gate staged build, (b) the safety rules (no git, no entitlement.tsx, no `def` edits, no engine math), (c) that you'll STOP at each gate. Then tell me you're ready to receive the curated glossary content — Anthony will paste each sport's `term | def | match` block for you to transcribe verbatim into the typed files. Do the types.ts widening + `match` field first, then transcribe each sport as pasted, then wire index.ts. STOP at Review Gate A. Do not start Gate B. Do not touch git.
