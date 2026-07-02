# BUILD DOC — Golf leaderboard teaching layer (Build 3 of 3) — the north-star finish

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · mobile `sports-explainer-mobile-v2/`

## WHAT THIS IS & WHY
Make the golf leaderboard TEACH, not just show — the whole point of SportsWise ("watch and ask why").
A "golf-curious" viewer sees "-20" or "T3" or "F" and doesn't know what it means. Build 3 makes those
tappable: tap the thing you don't understand → learn it, at YOUR difficulty level. This is what turns
the board from a scoreboard into a SportsWise feature.

**Scope for v1 (tight):** tappable COLUMN HEADERS (POS / TOTAL / TODAY / THRU) + the LEADER ROW's key
cells (their position, total, today, thru). Each tap opens the matching concept at the user's level.
NOT every one of 72×5 cells — the headers + leader row are the obvious, sufficient entry points.

## THE CONTENT (already curated — must be MOVED into the app, not committed at root)
`golf_teaching_content.ts` exists at the REPO ROOT as an untracked file. It has `GOLF_GLOSSARY`
(18 concepts × 4 levels: rookie/beginner/intermediate/expert, each mapped to a leaderboard `field`)
and `GOLF_LENSES` (15 "how to read a leaderboard" insights).
- **DO NOT commit it at the repo root** — a root `.ts` file is exactly what broke the production
  build earlier (it gets type-checked by `next build`). MOVE its content into a proper file inside
  the mobile dir, e.g. `sports-explainer-mobile-v2/lib/golfTeaching.ts` (mirroring how
  `lib/strategyTips.ts` holds the Coach's Corner tips). Then the root scratch copy can be deleted.
- The concept→field mapping is the wiring key: `to-par→total`, `today→currentRoundScore`,
  `thru→thru`, `ties→position`, etc. Use it to connect each tappable element to its concept.

## DIFFICULTY LEVEL
Concepts are 4-level (rookie/beginner/intermediate/expert). The app already has a user difficulty
level (internal keys `'kid'|'beginner'|'intermediate'|'expert'`, where `'kid'` displays "Rookie").
The teaching sheet shows the concept at the user's CURRENT level. Recon will confirm where that level
lives client-side so the sheet reads it (do NOT hardcode a level).

## HOW WE WORK
- You NEVER run git. STOP at each gate; Anthony tests on device (Expo Go). Anthony commits.
- Additive: don't change the board's data/layout — add tap targets + a concept sheet. Other sports
  untouched. No nested scroll. No localStorage. Apostrophes → double-quote/backtick.
- `npx tsc --noEmit` clean each gate (ignore unrelated pre-existing errors).

---

## ▓▓▓ GATE 1 — RECON (read-only: find the EXISTING teach pattern to reuse) ▓▓▓
SportsWise already shows concepts/definitions to users — reuse that pattern, don't invent one. Print:
1. How a concept/definition is currently shown elsewhere — the FAQ expander on LiveScreen (the
   "Common Golf Questions" accordion), the Academy concept cards, the "tap a term" behavior if any.
   Show the component(s) + how they present a term + explanation. We want the golf concept sheet to
   match the established interaction (a modal? a bottom sheet? an inline expander?).
2. Where the user's DIFFICULTY LEVEL lives client-side (the `'kid'|'beginner'|'intermediate'|'expert'`
   value) and how a screen reads it — so the concept sheet shows the right level.
3. The current `GolfLeaderboard.tsx` in full (post top-15 change) — the rows, the header, the cells —
   so we know exactly what to make tappable.
4. Any existing reusable "info sheet" / modal / bottom-sheet component in the app we should reuse for
   showing a tapped concept (vs. building a new one).
5. How `lib/strategyTips.ts` is structured + imported (the model for placing `golfTeaching.ts`).
STOP. Report all five. I'll confirm the Gate 2 plan against the real teach-pattern.

---

## ▓▓▓ GATE 2 — Land the content in the app ▓▓▓
- Create `sports-explainer-mobile-v2/lib/golfTeaching.ts` with the `GOLF_GLOSSARY` + `GOLF_LENSES`
  content from the root `golf_teaching_content.ts` (adapt exports/types to match the app's conventions
  as Gate-1 recon shows). Add a helper to look up a concept by its `field` (e.g.
  `conceptForField('total')`) and to get the level-appropriate text.
- Delete the root `golf_teaching_content.ts` scratch file (its content now lives in the app).
- `npx tsc --noEmit`. STOP. Report + `git add` targets (incl. the root-file deletion).

---

## ▓▓▓ GATE 3 — Tappable elements + concept sheet ▓▓▓
- Reuse the EXISTING concept/info presentation pattern from Gate-1 recon (modal/bottom-sheet/expander)
  — do NOT invent a new one. If there's a reusable component, use it; else build the minimal sheet
  matching the established style/tokens.
- In `GolfLeaderboard.tsx`: make the COLUMN HEADERS (POS/TOTAL/TODAY/THRU) tappable, and the LEADER
  ROW's corresponding cells tappable. On tap → open the sheet showing that concept (looked up by
  field) at the user's level. A subtle affordance that they're tappable (e.g. a hairline underline or
  an info tick) — keep it restrained, must still read as SportsWise.
- The sheet: concept term + the level-appropriate explanation. Optionally a "how to read the board"
  entry point to the lenses (or defer lenses to a later pass — keep v1 focused on the concepts).
- Degrade: if a concept lookup misses, the tap simply does nothing (never crash).
- `npx tsc --noEmit`. STOP. Report + `git add` targets.

## ON-DEVICE TEST (Anthony)
- Golf → tap the "TOTAL" header (or the leader's "-20") → a sheet explains to-par at your level.
- Tap "THRU"/the "F" → thru. Tap "POS"/the "T3" → ties. Tap "TODAY" → today's-round score.
- Change difficulty (if easy to) → the explanation depth changes (Rookie vs Expert wording).
- Board still looks like SportsWise; learn Q&A/FAQ below still work; other sports unchanged.

## GIT (Anthony, per gate)
- G2: `git add sports-explainer-mobile-v2/lib/golfTeaching.ts` (+ the root golf_teaching_content.ts deletion)
- G3: `git add sports-explainer-mobile-v2/components/GolfLeaderboard.tsx` (+ any new sheet component)

## AFTER THIS
Golf is COMPLETE: live/most-recent leaderboard, glanceable top-15, and a board that TEACHES at the
user's level. Then: GUMBO (v2 doc ready at Gate 2) to close the night.
