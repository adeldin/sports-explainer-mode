# BUILD DOC — Golf live leaderboard provider (backend, Build 1 of 3)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · backend `src/app/api/explain/`
**Recon:** DONE (the 5-part golf recon). Findings are baked in below — read them, don't re-derive.

## WHAT THIS IS
The BACKEND half of giving golf a live leaderboard. Build a NEW parallel provider
(`golfLeaderboardProvider.ts`) that fetches the RapidAPI live-golf-data leaderboard, normalizes it
into a NEW shape (`Leaderboard`/`LeaderboardRow`), and exposes it to the client — WITHOUT touching
the enricher system, `getGameData`, or golf's existing learn-mode path. This is Build 1 of 3; the
`GolfLeaderboard` UI (Build 2) and the teaching-content wiring (Build 3) come after, against this.

## THE ARCHITECTURE (recon-proven — do NOT force this into an enricher)
The recon established, with reasons, that golf does **NOT** fit the enricher model:
- `getGameData('golf')` returns `null` (learn-mode short-circuit at dataProvider.ts:107) — the
  enricher seam is literally unreachable for golf.
- `NormalizedGameData` is hard-wired home/away/score; a 72-player leaderboard has no two-team identity.
- Golf is a NEW SOURCE (RapidAPI live-golf-data), not ESPN depth.
So: build a SIBLING provider with its own shape. REUSE the enricher's *discipline* (server-side key,
best-effort degrade, TTL cache, recursive Extended-JSON unwrap) but NOT its registry or `getGameData`.

**ADDITIVE, NOT SUBTRACTIVE:** golf KEEPS `learnMode: true` everywhere. We are ADDING a live
leaderboard capability, not removing golf's learn-mode Q&A/FAQ/Academy plumbing. Nothing about the
existing golf learn path changes. (The client flag `liveFormat: 'leaderboard'` is Build 2's concern.)

## THE FREE-TIER FALLBACK (recon gift — degrade target already exists)
Golf TODAY shows a thin ESPN-sourced one-liner ("🏆 {tournament} — Leader: {name} ({score})", built
in route.ts:119-144 / mirrored client-side). That EXISTING thin line is our best-effort fallback: if
RapidAPI fails / rate-limits / no live tournament, the provider returns null/empty and the app shows
the ESPN thin line exactly as today. "Degrade to still-good, never broken" — for free.

## CONFIRMED LIVE DATA SHAPE (curled against live Travelers, tournId=034 — build against THIS, not the doc)
A leaderboard row (row[0] = leader; rows arrive PRE-SORTED, leader first):
```
{ lastName:str, firstName:str, playerId:str, isAmateur:bool, courseId:str, status:str,
  position:str("1" or "T3"), total:str("-20"), currentRoundScore:str("-4"),
  totalStrokesFromCompletedRounds:str, currentHole:int, startingHole:int, roundComplete:bool,
  rounds:[{roundId:int, scoreToPar:str, strokes:int, courseName:str, courseId:str}],
  thru:str("17" or "F"), currentRound:int, teeTime:str("2:00pm"), teeTimeTimestamp:int(epoch ms) }
```
Top-level: `{ status:"In Progress", roundId, roundStatus, lastUpdated, cutLines, leaderboardRows[~72] }`.

**NORMALIZER LANDMINES (recon-confirmed — handle every one):**
1. **Extended-JSON everywhere** — numbers/dates wrapped `{"$numberInt":…}`/`{"$numberLong":…}`/`{"$date":…}`. A recursive unwrap helper is MANDATORY (mirror the one in the recon spike).
2. **Mixed types per field** — `position`/`total`/`thru` are STRINGS; `currentHole`/`startingHole`/`currentRound` are INTS. Coerce PER FIELD; never blanket-cast.
3. **`position` carries the "T" tie prefix** ("T3") — keep the string for DISPLAY; derive a numeric rank separately only if you need to sort/group (you don't — see #4).
4. **Rows are pre-sorted** (leader first) — the provider does NOT need to sort.
5. **No name field** — join `firstName` + `lastName` for display.
6. **`thru` is "F" when a round's done** (else a hole number) — UI/consumers must handle both.
7. **`cutLines` is round-dependent** — present-but-empty after the cut's applied; treat as optional.

## RATE LIMITS (recon-confirmed — respect or get throttled)
- `requests`: 250 / ~28d — leaderboard polling lives here. Fine for a reasonable poll + cache.
- `scorecards`: 20 / ~14h — **do NOT touch scorecards in this build.** (Drill-in is a later build, lazy + hard-cached.) This build hits ONLY `/leaderboard`.

## HOW WE WORK
- You NEVER run git. STOP at each gate, summarize, give `git add` targets; Anthony commits + pushes.
- Backend deploys LIVE via Vercel with NO review buffer — best-effort + additive is non-negotiable.
- No engine-math changes. Don't touch the enricher registry, `getGameData`, or golf's learn path.
- `RAPIDAPI_KEY` is in `.env.local` (server-side only — never sent to client). Host header
  `x-rapidapi-host: live-golf-data.p.rapidapi.com`.

---

## ▓▓▓ GATE 1 — Build `golfLeaderboardProvider.ts` (provider + normalizer, not yet wired to a route) ▓▓▓
Create `src/app/api/explain/golfLeaderboardProvider.ts`:
- Define the new shape (export it):
  ```ts
  export interface LeaderboardRound { roundId: number; scoreToPar: string; strokes: number; courseName: string; }
  export interface LeaderboardRow {
    playerId: string; name: string;            // firstName+lastName joined
    position: string;                          // "1" / "T3" — display string
    total: string;                             // "-20"
    today: string;                             // currentRoundScore "-4"
    thru: string;                              // "17" or "F"
    roundComplete: boolean; isAmateur: boolean; status: string;
    teeTime?: string; rounds: LeaderboardRound[];
  }
  export interface Leaderboard {
    tournId: string; name?: string; status: string; currentRound?: number;
    roundStatus?: string; rows: LeaderboardRow[];
  }
  ```
- A recursive `unwrap(x)` helper for Extended-JSON (mirror the recon spike exactly).
- `getCurrentTournId()` — fetch `/schedule?orgId=1&year={year}`, unwrap, derive the live tournId by
  matching today's date to a tournament's start/end window (DO NOT hardcode 034 — derive it; that
  example is perishable). Return null if none live.
- `fetchGolfLeaderboard()` — get the live tournId; if none, return null. Else fetch
  `/leaderboard?orgId=1&tournId={id}&year={year}`, unwrap, map each row to `LeaderboardRow` with
  PER-FIELD coercion (strings stay strings, ints parsed), name joined, rounds mapped. Return `Leaderboard`.
- **Best-effort:** wrap everything in try/catch; on ANY failure (no key, no live tournament, fetch
  error, parse miss, rate-limit) return `null`. Never throw out of this function.
- **Cache:** a short module-level TTL cache (e.g. 30-60s) on the leaderboard response so a polling
  client doesn't burn the 250 request budget. Key by tournId.
- Hit ONLY `/schedule` and `/leaderboard`. NEVER `/scorecard` in this build.
- `npx tsc --noEmit`. STOP. Report + `git add` target.
- Optional proof: a temp `console.log` of the normalized leader row + row count for the live
  tournament (removed before commit) so we see real normalized output.

---

## ▓▓▓ GATE 2 — Expose it to the client (new endpoint or route branch) ▓▓▓
Wire the provider so the mobile app can fetch it. Mirror how the existing API is shaped (recon: the
client calls the explain API base in lib/api.ts). Choose the lowest-risk seam:
- Preferred: a dedicated endpoint (e.g. `src/app/api/leaderboard/route.ts`) that calls
  `fetchGolfLeaderboard()` and returns the `Leaderboard` JSON (or 204/empty when null). A separate
  endpoint keeps it OFF the live explain path entirely — safest.
- Add CORS headers consistent with the existing explain route.
- **Degrade contract:** when the provider returns null, the endpoint returns an empty/no-content
  response the client reads as "no live leaderboard" → client falls back to today's ESPN thin line
  (that fallback is Build 2's job; this gate just must not break when there's no data).
- Do NOT route this through `getGameData` or the explain handler. It's a standalone read.
- `npx tsc --noEmit`. STOP. Report + `git add` targets.

---

## LIVE VERIFICATION (Anthony — while Travelers is still live tonight)
- Curl the new endpoint locally (or hit the deployed Vercel URL after push) and confirm it returns
  the live leaderboard JSON: leader first, ~72 rows, real `position`/`total`/`thru` values, ties
  showing "T3", finished players showing `thru:"F"`.
- Confirm a graceful empty/no-content response when there's no live tournament (can simulate by
  pointing at a year with no live event, or trust the null path + the Gate-1 console proof).
- Scorecard budget MUST still read 20/20 — we never touched it.

## GIT (Anthony, per gate)
- G1: `git add src/app/api/explain/golfLeaderboardProvider.ts`
- G2: `git add src/app/api/leaderboard/route.ts` (+ any shared CORS util touched)

## AFTER THIS (not this build)
- **Build 2 — `GolfLeaderboard` UI:** new vertical-FlatList screen archetype (model list mechanics on
  the existing games FlatList), replaces golf's one-line tournamentCard branch in LiveScreen, selected
  by a NEW `liveFormat: 'leaderboard'` flag on SPORT_CONFIG kept ORTHOGONAL to `learnMode`. Buildable
  without live data once this provider's shape is locked.
- **Build 3 — teaching layer:** wire `golf_teaching_content.ts` (tappable concepts on rows + keep the
  learn-mode Q&A). The north-star layer that makes the board LEARNABLE, not a scoreboard.
- **Later — scorecard drill-in:** lazy, on tap, hard-cached (20/14h bucket). Its own build.
