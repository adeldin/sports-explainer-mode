# BUILD DOC — Golf leaderboard UI (frontend, Build 2 of 3)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · mobile `sports-explainer-mobile-v2/`

## WHAT THIS IS
The CLIENT half of golf's live leaderboard. Add a new `GolfLeaderboard` screen (the app's FIRST
vertical-list archetype) that renders the `Leaderboard` JSON from the Build-1 endpoint
(`/api/leaderboard`). This is the CLEAN BOARD ONLY — position / name / total / today / thru. The
tappable teaching concepts are Build 3, layered on top after this looks right on device.

## THE PLAN (recon-proven from the 5-part golf recon)
- Golf's live data comes from the standalone `/api/leaderboard` endpoint (Build 1, shipped). Shape:
  `{ leaderboard: Leaderboard | null }` where `Leaderboard = { tournId, name?, status, currentRound?,
  roundStatus?, rows: LeaderboardRow[] }` and each row = `{ playerId, name, position, total, today,
  thru, roundComplete, isAmateur, status, teeTime?, rounds[] }`. (Provider exports these types.)
- The UI replaces golf's CURRENT one-line `tournamentCard` branch in `LiveScreen` (around :684),
  selected by a NEW `liveFormat: 'leaderboard'` flag on `SPORT_CONFIG`, kept ORTHOGONAL to `learnMode`.
- **ADDITIVE, NOT SUBTRACTIVE.** Golf KEEPS `learnMode: true`. We are ADDING a render branch + a
  client API call. Nothing about other sports' rendering changes. The `learnMode` Q&A, FAQ, Academy
  for golf all stay exactly as they are — when there's a live leaderboard we show it ABOVE/INSTEAD OF
  the thin tournamentCard line, but the learn-mode plumbing underneath is untouched.
- **Degrade contract:** endpoint returns `leaderboard: null` (no live tournament, or RapidAPI down) →
  the client shows TODAY'S existing ESPN thin tournamentCard line, exactly as now. The leaderboard is
  an upgrade-when-available, never a replacement of the fallback.

## STYLING — belong to SportsWise, don't invent a new identity
This is a new screen INSIDE an app with an established identity. Derive everything from existing tokens:
- Brand: navy `#0d1b3e`, orange `#E87722`, amber `#F5A623`, teal `#14B8A6`; Space Grotesk.
- Match the existing theme system (the `t.surface`/`t.border`/`t.textPrimary` tokens used in
  LiveScreen's `tournamentCard` styles, etc.) — reuse them, don't hardcode new colors.
- Model the row visual on existing cards (GameCard / the Coach's Corner cards) so it reads as the same
  app. A leaderboard ROW is denser than a GameCard — keep it clean: rank, name, and the key numbers.
- Quality floor (per design guidance): readable at a glance (Weather-app north star — glanceable
  first), works on small screens, respects reduced motion, visible focus. No flashy motion.
- Score color convention (subtle, optional): under-par (negative) reads positive — a restrained use of
  your teal/green for red-figures vs neutral for over-par. Keep it tasteful, not a rainbow.

## HOW WE WORK
- You NEVER run git. STOP at each gate; Anthony tests ON DEVICE (Expo Go) — this is VISUAL, a curl
  won't verify it. Anthony commits.
- Expo Go: `cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2 && npx expo start -c` (press `s` if "Using development build", `r` to reload).
- `npx tsc --noEmit` clean before each STOP (ignore pre-existing `strategy_tips_*.ts` errors).
- No localStorage. Apostrophes in strings use double-quote or backtick. Don't touch `entitlement.tsx`.

---

## ▓▓▓ GATE 1 — RECON (read-only, confirm the render seam before adding to a shared screen) ▓▓▓
`LiveScreen` is shared by every sport — map the exact insertion point before touching it. Print:
1. The full per-sport render branch in `LiveScreen.tsx` (recon found a three-way: `games.length > 0 ?
   <FlatList of GameCard> : learnMode && learnContext ? <tournamentCard> : <EmptyState>`, around
   :648-688). Show it verbatim so we slot the leaderboard branch cleanly.
2. How the existing games `<FlatList>` is set up (:650-660) — the list mechanics to model the vertical
   leaderboard on (data, keyExtractor, renderItem, styling).
3. `SPORT_CONFIG` in `lib/scoreboard.ts` (the `SportCfg` type + golf's entry) — where `liveFormat`
   would be added.
4. The client API layer (`lib/api.ts`) — how it calls the backend (base URL, fetch pattern), so we add
   a `fetchLeaderboard()` call mirroring the existing style. Confirm the API base.
5. The existing `tournamentCard` styles + the theme tokens (`t.surface` etc.) so the new component
   reuses them.
STOP. Report all five. I'll confirm the Gate 2 plan against the real structure.

---

## ▓▓▓ GATE 2 — Client data: add the flag + the fetch (no UI yet) ▓▓▓
- Add `liveFormat?: 'leaderboard'` to the `SportCfg` type and set it on golf's `SPORT_CONFIG` entry
  (golf KEEPS `learnMode: true` — add the new flag alongside it, don't replace).
- Add `fetchLeaderboard()` to `lib/api.ts`: GET `{API_BASE}/api/leaderboard` (note: the leaderboard
  endpoint is a SIBLING of the explain endpoint — confirm the base path resolves correctly, since
  `lib/api.ts:35` hardcodes the explain URL; the leaderboard is `/api/leaderboard` on the same host).
  Return the typed `Leaderboard | null` (define/import the client-side type to match the provider).
  Best-effort: on any fetch error return null (client keeps the ESPN fallback).
- NO UI yet — just the flag + the data path. `npx tsc --noEmit`. STOP. Report + `git add` targets.

---

## ▓▓▓ GATE 3 — The GolfLeaderboard component ▓▓▓
- Create `components/GolfLeaderboard.tsx` (or `screens/` if that fits the pattern better — recon will
  tell): a vertical `FlatList` of rows. Each row: **position** (keep "T3" string as-is), **name**,
  **total** (to-par, the headline number), **today**, **thru** ("F" when done). A header showing the
  tournament `name` + `status`/round. Amateur "(a)" marker when `isAmateur`. Model list mechanics on
  the existing games FlatList; style from existing tokens (see STYLING above).
- Loading + empty states (per design guidance — empty is an invitation, not an apology): a brief
  loading state while fetching; if `null`, render nothing here (the LiveScreen branch falls through to
  the ESPN tournamentCard — see Gate 4).
- `npx tsc --noEmit`. STOP. Report. (Component not yet wired into LiveScreen — Gate 4 does that.)

---

## ▓▓▓ GATE 4 — Wire it into LiveScreen (additive branch) ▓▓▓
- In LiveScreen's render, add a branch BEFORE the `learnMode && learnContext` branch:
  `cfg.liveFormat === 'leaderboard' && leaderboard ? <GolfLeaderboard board={leaderboard} /> : …`
  so when a live leaderboard exists it shows; when it's null, fall through to the EXISTING
  tournamentCard line (unchanged). Fetch the leaderboard for golf in the same place the learn-context
  is fetched (mirror that effect; guard with the `liveFormat` flag so only golf triggers it).
- CRITICAL: every OTHER sport's render path must be byte-identical to before. Only golf gains the new
  branch. The `learnMode` Q&A/FAQ/Academy for golf stay intact — the leaderboard sits ABOVE the
  existing learn surface, it doesn't remove it.
- `npx tsc --noEmit`. STOP. Report + `git add` targets.

## ON-DEVICE TEST (Anthony — Expo Go)
- Open golf with Travelers live (if still on) → the leaderboard renders: leader first, ties "T3",
  finished players "F". Looks like SportsWise (palette/font/cards consistent).
- Confirm golf's learn-mode Q&A / FAQ / Academy still work (additive, nothing removed).
- Confirm OTHER sports (mlb/soccer/nfl) render exactly as before — no regression on the shared screen.
- If no live tournament (or after Travelers ends): golf falls back to the ESPN thin tournamentCard
  line, exactly as today.

## GIT (Anthony, per gate)
- G2: `git add sports-explainer-mobile-v2/lib/scoreboard.ts sports-explainer-mobile-v2/lib/api.ts`
- G3: `git add sports-explainer-mobile-v2/components/GolfLeaderboard.tsx`
- G4: `git add sports-explainer-mobile-v2/screens/LiveScreen.tsx`

## AFTER THIS — Build 3 (teaching layer)
Wire `golf_teaching_content.ts`: make leaderboard elements tappable → the 4-level concept for that
term (tap "-20" → to-par, "T3" → ties, "F"/thru → thru, etc.), at the user's difficulty level. Plus
keep the learn-mode Q&A. THAT is the north-star layer that makes the board teach, not just show.
