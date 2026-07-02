# BUILD DOC — Golf leaderboard: show most-recent (live OR final) tournament (Build 2.5)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode`

## WHAT THIS IS & WHY
On-device finding: when a tournament ENDS, golf drops from the full leaderboard to the old one-line
ESPN thin card. That makes golf feel empty most of the year (PGA events are ~weekly with off-season
gaps). Fix: the provider should show the leaderboard for the **most-recent tournament** when none is
currently live — clearly LABELED as Final (with its date) so "most recent" reads as intentional, not
stale. Golf gets a rich board year-round; the label carries the honesty about live-vs-done.

Two small, bounded changes:
- **Backend (provider):** `getCurrentTournId()` → live first, else fall back to the most-recently-
  ENDED tournament (from the same `/schedule` it already fetches). Carry a clear status.
- **Client (UI):** the `GolfLeaderboard` header labels Final vs live + shows the tournament date when
  it's a finished board.

## HOW WE WORK
- You NEVER run git. STOP at each gate; Anthony commits. Backend deploys LIVE via Vercel on push.
- Best-effort preserved: any failure still returns null → the existing ESPN thin line (unchanged).
- ADDITIVE: don't change the live path's behavior when a tournament IS live — only add the
  fall-back-to-most-recent when nothing's live. Touch only `/schedule` + `/leaderboard`, never `/scorecard`.
- `npx tsc --noEmit` clean (ignore pre-existing `strategy_tips_*.ts` errors).

---

## ▓▓▓ GATE 1 — Backend: getCurrentTournId() falls back to most-recent ▓▓▓
In `src/app/api/explain/golfLeaderboardProvider.ts`:
- `getCurrentTournId()` today finds the tournament whose window spans now (`start <= now <= end+DAY`)
  and returns null otherwise. CHANGE: keep that as the PRIMARY (live) match. If no live match, pick
  the tournament with the LATEST `date.end` that is `<= now` (most-recently-completed). Return that.
  Only return null if the schedule is empty/unfetchable (then the ESPN thin line still shows).
- Return enough for the UI to label honestly. Extend the return + cache to carry:
  `{ id, name?, isLive: boolean, endDate?: number }` where `isLive` = (now is within the live window)
  and `endDate` = the tournament's `date.end` (epoch ms) for the "Final · {date}" label.
- Keep the 5-min `TOURN_TTL` cache; cache the new fields too.
- `fetchGolfLeaderboard()` then threads these onto the `Leaderboard`: add `isLive: boolean` and
  `endDate?: number` (or a single `state: 'live' | 'final'`) to the `Leaderboard` interface, set from
  the resolved tournament. The top-level `status`/`roundStatus` from the leaderboard response still
  flow as today (they'll read "Official" etc. for a finished event) — `isLive` is the authoritative
  live-vs-final flag for the UI, derived from the schedule window, not the leaderboard's status string.
- Best-effort unchanged: any throw/!ok → null.
- `npx tsc --noEmit`. STOP. Report + `git add` target.
- Proof (optional, valuable since Travelers just ended): the scratchpad mirror (or a quick curl of the
  endpoint after Gate 2) should now resolve Travelers as the most-recent **final** board with
  `isLive: false` and a real `endDate`.

NOTE on the live-window definition: today `end + 1 DAY` pads the final round. For the "is it live"
flag, keep that same padded window as the `isLive=true` condition so a tournament still mid-final-round
reads live. Past that padded window → `isLive=false`, and it becomes the most-recent-final candidate.

---

## ▓▓▓ GATE 2 — Client: label Final vs live in the header ▓▓▓
In `components/GolfLeaderboard.tsx` (and the mirrored `Leaderboard` type in `lib/api.ts` — remember
the client type is a SEPARATE mirror of the provider's, keep them in sync):
- Add the new field(s) (`isLive` / `endDate` or `state`) to the client `Leaderboard` type.
- Header logic:
  - Live → keep today's behavior: `Round {currentRound} · {status}` (e.g. "Round 3 · In Progress").
  - Final (`!isLive`) → show a clear finished label, e.g. `Final · {Mon D}` formatting `endDate`
    (e.g. "Final · Jun 27"). A small "FINAL" pill/eyebrow is fine if it fits the existing style —
    keep it restrained (reuse `t.textMuted` / `t.accentText`, no new colors).
- Everything else about the board is identical (rows, ties, under-par teal). This is just the header
  honesty label.
- `npx tsc --noEmit`. STOP. Report + `git add` targets.

---

## ON-DEVICE TEST (Anthony — Expo Go)
Travelers is over, so this is immediately testable:
- Open golf → the FULL leaderboard now appears (not the thin line), headed "Travelers Championship"
  with a clear **Final · Jun 27** label. Leader Hovland -20, ties "T3", finished "F".
- Confirm it still reads as SportsWise (palette/font/cards consistent).
- Confirm golf's learn Q&A / FAQ / Academy still work below it (additive, unchanged).
- Confirm other sports (mlb/soccer/nfl) render exactly as before.
- (When a tournament is NEXT live, the header should read the live "Round N · In Progress" form again —
  can't test live now, but the isLive=false path is what's on screen tonight.)

## GIT (Anthony, per gate)
- G1: `git add src/app/api/explain/golfLeaderboardProvider.ts`
- G2: `git add sports-explainer-mobile-v2/components/GolfLeaderboard.tsx sports-explainer-mobile-v2/lib/api.ts`

## AFTER THIS — Build 3 (teaching layer)
With a real board visible year-round, Build 3 layers the tappable teaching: tap "-20" → to-par,
"T3" → ties, "F"/thru → thru, etc., at the user's level, from `golf_teaching_content.ts`. That's the
north-star finish that makes the board TEACH, not just show.
