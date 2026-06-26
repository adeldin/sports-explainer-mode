# DATA SOURCES — Live-Feed Recon & Integration Roadmap

> Evidence-based recon of candidate Live-tab data sources, probed against real endpoints
> (June 2026). Records, per source: working endpoints, real response shape, the traversal path
> to "the current play an explainer narrates," quirks + fixes, rate limits, and live-testability.
> Purpose: when a 1.3+ data-integration session starts, build from this evidence instead of
> re-deriving it. All shapes below were confirmed by live curl probes, not memory.

**Build sequence (by value × live-testability):**
1. **MLB GUMBO** — upgrades a SHIPPED core sport, deepest data, no key, no quirks, nightly games. **Build first.**
2. **Golf (Slash)** — new sport, live-testable, deep, but needs a normalizer for 3 quirks + tight scorecard cap.
3. **Tennis (ATP/WTA/ITF)** — clean shape but needs a live-match recon (missing livescore endpoint) before building.
4. **NHL (api-web)** — clean + ready, but OFFSEASON until ~Oct 2026; build + live-test in the fall.

All of this is POST-1.2. 1.2 ships the Academy. Most is also gated on 1.1 clearing App Store review.

---

## Architecture note (applies to all new sources)

Build each as a **per-sport data adapter** that normalizes the feed's quirks into our internal
shape — the same swappable pattern as `llmProvider.ts`. Adapter responsibilities: fetch, normalize
(unwrap quirks), map to the internal "current play / current state" object the engine consumes,
and cache. **Keys (golf/tennis) live in Vercel env server-side — never client-side, never in the
mobile app**, same as Groq/Gemini. MLB/NHL need no key. Every integration is proven against a LIVE
event before it goes near a build (evidence-over-assertion).

---

## 1. ⭐ MLB — GUMBO (statsapi.mlb.com)  — HIGHEST VALUE, BUILD FIRST

**Auth:** none. Free, public, unauthenticated. **Rate limits:** none returned (poll politely; reuse the existing ~60s cadence — there's no published limit to lean on).

**Why first:** upgrades baseball — a sport we ALREADY ship via ESPN's (shallower) free feed. GUMBO is
Statcast-grade pitch-by-pitch. Same engine, dramatically better input → better explanations. Higher
leverage than any new sport because it improves something users already use.

**Endpoints (confirmed 200):**
- Schedule: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD`
  → `{ totalGames, totalGamesInProgress, dates:[{ games:[…] }] }`. Each game: `gamePk`, `status.abstractGameState` (Preview/Live/Final), `status.detailedState`, `teams.away/home.team.name`, `teams.away/home.score`. **Filter `abstractGameState==='Live'` to find an in-progress game and grab its `gamePk`.**
- GUMBO live feed: `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`
  → the big object (~774 KB). Top level: `{ copyright, gamePk, link, metaData, gameData, liveData }`.

**Shape (clean but big + deeply nested):**
- `gameData`: `status` (abstractGameState/detailedState), `teams` (away/home names), `players` (~52, keyed `"ID######"`), `venue`, `weather`, `probablePitchers`.
- `liveData`: `{ plays, linescore, boxscore, decisions, leaders }`.
  - `liveData.linescore`: `currentInning`, `currentInningOrdinal`, `inningState`, `isTopInning`, and the **live count: `balls` / `strikes` / `outs`**, plus `innings[]`, `teams` (R/H/E), `offense`/`defense`.
  - `liveData.plays`: `allPlays[]` (~71 for a 9-inning game), `currentPlay`, `scoringPlays[]`, `playsByInning[]`.

**Pitch-by-pitch depth (Statcast-grade — the headline):**
A single play = `{ result, about, count, matchup, runners, playEvents[], atBatIndex }`:
- `result`: `event` ("Flyout"), `eventType` ("field_out"), **`description`** ("Salvador Perez flies out to left fielder Chandler Simpson."), `rbi`, `awayScore`/`homeScore`, `isOut`.
- `about`: `inning`, `halfInning`, `isScoringPlay`, `hasOut`, `captivatingIndex`.
- `matchup`: full `batter`/`pitcher` objects (fullName), men-on-base.
- `playEvents[]` = each pitch: `details` (description "Ball", `call`, pitch `type` e.g. "Sweeper", isStrike/isBall/isInPlay), `count` after, and **`pitchData`**: `startSpeed`/`endSpeed` (81.6/74.3), `zone`, `breaks` (spinRate, breakAngle, vertical/horizontal), `coordinates` (pfxX/pfxZ, release & velocity vectors).

**Traversal for the explainer:** `liveData.plays.currentPlay` → `.result.description` + `.about` (inning/half) + `.matchup` (batter/pitcher names) + `.playEvents[last]` (latest pitch type/speed/call); live count from `liveData.linescore.balls/strikes/outs`. ~3 levels deep, stable, logically organized.

**Quirks:** NONE. No Extended-JSON, no array-unwrap. Only cost is payload size (~774 KB/fetch) + nesting depth → fetch the live feed on the poll cadence and extract just the slice the explainer needs; don't ship the whole object around.

**Live-testability:** YES — MLB plays nightly in season. (At probe time all of that day's 9 games were already Final; catching a Live one later the same day is trivial.)

---

## 2. GOLF — Slash Golf (live-golf-data.p.rapidapi.com)  — NEW SPORT, NEEDS NORMALIZER

**Auth:** RapidAPI key (`x-rapidapi-key` + `x-rapidapi-host: live-golf-data.p.rapidapi.com`). Key → Vercel env when shipping.

**Rate limits (separate buckets — the scorecard cap binds):**
- `x-ratelimit-requests`: **250** (reset ~28 days) — general calls (schedule/leaderboard).
- `x-ratelimit-scorecards`: **20** (reset ~14 h) — **the binding constraint. Scorecards are precious.**
- `x-ratelimit-rapid-free-plans-hard-limit`: 500000.

**Endpoints (confirmed 200):**
- Schedule: `…/schedule?orgId=1&year=YYYY` → `{ orgId, year, schedule[~48], timestamp }`. Each tournament: `tournId`, `name`, `date.start/end` (Extended-JSON ms), `format`, `purse`, `winnersShare`, `fedexCupPoints`. **Derive the live `tournId` from the schedule by date — do NOT use stale hardcoded examples.**
- Leaderboard: `…/leaderboard?orgId=1&tournId={id}&year=YYYY` → `{ status ("In Progress"), roundId, roundStatus, lastUpdated, cutLines, leaderboardRows[~72] }`. Rows carry live progress: `position`, `total`, `currentRoundScore`, `currentHole`, `startingHole`, `thru` ("F"/hole#), `roundComplete`, `teeTime`, `rounds[]` (scoreToPar, strokes, courseName).
- Scorecard: `…/scorecard?orgId=1&tournId={id}&year=YYYY&playerId={pid}` → **a 1-element ARRAY** `[ {…} ]`; the object has `holes` = a **dict keyed "1".."18"**, each `{ holeId, holeScore, par }`. Hole-level (not shot-by-shot) — plenty for explanations.

**Quirks (3 — adapter needs a normalizer):**
1. **MongoDB Extended JSON everywhere** — every number/date wrapped: `{"$numberInt":"4"}`, `{"$numberLong":"…"}`, `{"$date":{"$numberLong":…}}`. Write a recursive unwrap helper across the whole adapter.
2. **Scorecard top-level is a 1-element array** — `[{…}]`. Same fix as the Highlightly `/matches/{id}` quirk: `Array.isArray(x) ? x[0] : x`.
3. **`holes` is an object keyed by string**, not an array — iterate `Object.values()` / "1".."18".

**Design implication (scorecard cap):** leaderboard is the cheap frequent-poll source (already carries `thru`/`currentHole`/`total`); **scorecards must be lazy (only on user drill-in) and cached hard** — 20/14h won't survive per-player polling across 72 players.

**Live-testability:** YES this week — Travelers Championship was live (tournId=034) at probe time, `status: "In Progress"`.

**Fit note:** golf is a surprisingly GOOD fit — a leaderboard is glanceable (Weather-app north star), and "what's a cut / why does this score matter" is squarely the engine's wheelhouse.

---

## 3. TENNIS — ATP/WTA/ITF (tennis-api-atp-wta-itf.p.rapidapi.com)  — NEEDS LIVE RECON FIRST

**Auth:** RapidAPI key (`x-rapidapi-host: tennis-api-atp-wta-itf.p.rapidapi.com`).

**Rate limits (the tighter bucket binds):**
- `x-ratelimit-limit`: **100** / reset 60 s (the per-minute throttle).
- `x-ratelimit-requests`: **50** (reset ~14 h) — **the real constraint, tighter than the per-minute cap.**
- hard-limit: 500000.

**Endpoints (confirmed 200):**
- Today's fixtures: `…/tennis/v2/atp/fixtures/YYYY-MM-DD` → `{ data[~10], hasNextPage }`. Each fixture: `id`, `date`, `roundId`, `player1Id`/`player2Id`, `tournamentId`, `seed1`/`seed2`, **`live`** (null=scheduled; non-null when in-play — the built-in status flag), nested `player1`/`player2` `{ id, name, countryAcr }`.
- Generic fixtures: `…/tennis/v2/atp/fixtures` → same envelope.
- H2H match stats: `…/tennis/v2/atp/h2h/match-stats/{a}/{b}/{c}` → `{ data: { player1Stats, player2Stats } }`. Rich AGGREGATE: aces, doubleFaults, firstServe/Of, winningOnFirst/SecondServe, breakPointFaced/Saved/Chance/WonGm, winners, unforcedErrors, netApproaches, totalPointsWon, serve-speed (often null).

**Cleanliness:** the CLEANEST format probed — standard camelCase, `{data, hasNextPage}` envelope, nested player objects, built-in `live` flag. **No Extended-JSON, no array-unwrap.**

**Open questions before building (why it's not ready):**
- **No live event at probe time** — today's 10 fixtures all `live: null` (scheduled later). Couldn't validate the live path.
- **No score line in fixtures** — live scores would need a separate **livescore endpoint not in the tested set.** Must be found.
- **Aggregate stats only, NOT point-by-point** — great for a mid/post-match stats explanation, not a point-by-point feed.
- **Design around the 50-request/14h bucket.**

**Next step:** a focused recon DURING a live match to (a) find the livescore endpoint, (b) see the `live!=null` fixture shape, (c) confirm what live scores look like. Then decide build vs defer.

---

## 4. NHL — api-web.nhle.com  — CLEAN + READY, BUT OFFSEASON UNTIL ~OCT 2026

**Auth:** none. Free, public, unauthenticated. **Rate limits:** none returned (poll politely).

**Endpoints (confirmed 200):**
- Schedule: `https://api-web.nhle.com/v1/schedule/YYYY-MM-DD` → `{ gameWeek, regularSeasonStartDate/EndDate, playoffEndDate, … }`. (Offseason at probe → 0 games.)
- Scoreboard: `https://api-web.nhle.com/v1/scoreboard/now` → `{ focusedDate, gamesByDate:[{ date, games:[…] }] }`. Each game: `id`, `gameState` (LIVE/CRIT/OFF/FUT), `awayTeam`/`homeTeam` `{ abbrev, score }`.
- Play-by-play: `https://api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play` → `{ id, gameState, periodDescriptor, awayTeam, homeTeam, clock, plays[], rosterSpots[~40], summary }`.
- Boxscore: SEPARATE endpoint `…/gamecenter/{gameId}/boxscore` (not in the play-by-play payload).

**Play-by-play depth (full event-by-event — tested on a Cup Final game, ~343 plays):**
Each play: `{ eventId, periodDescriptor, timeInPeriod, timeRemaining, situationCode, typeCode, typeDescKey, sortOrder, details }`. ~14 event types: faceoff, hit, shot-on-goal, blocked-shot, missed-shot, giveaway, takeaway, goal, penalty, stoppage, period/game markers. `details` rich per type:
- goal → xCoord/yCoord, zoneCode, shotType ("wrist"), scoringPlayerId, assist1/2PlayerId, goalieInNetId, away/homeScore, highlightClip.
- shot-on-goal → shootingPlayerId, away/homeSOG.
- hit → hittingPlayerId/hitteePlayerId. Coordinates on everything.

**Cleanliness:** very clean, flat `plays[]` array. Two minor joins: (1) plays reference player IDs → names in `rosterSpots` (same payload, trivial lookup); (2) boxscore is a second call. No quirks.

**Live-testability:** NO — genuine offseason (last game a Cup Final on 2026-06-14, all `gameState: OFF`). **Build + live-test when preseason resumes (~late Sep/Oct 2026).** Bank the shape now.

---

## Cross-source summary

| Source | Auth | Live now | Depth | Quirks | Build slot |
|---|---|---|---|---|---|
| **MLB GUMBO** | none | yes (nightly) | pitch-by-pitch (Statcast) | none (big/deep) | **1.3 — first** |
| **Golf (Slash)** | RapidAPI key | yes (Travelers) | hole-by-hole | Extended-JSON + 1-elem array + holes-dict | 1.3 — second |
| **Tennis (ATP/WTA/ITF)** | RapidAPI key | no (none mid-match) | aggregate match stats (no PBP) | none, but missing livescore endpoint | after live recon |
| **NHL (api-web)** | none | no (offseason) | event-by-event | none (playerId→rosterSpots join) | ~Oct 2026 |

**Key reframe from this recon:** the original question was "should I add tennis & golf?" The evidence
answered a better one — the highest-value data work is **GUMBO upgrading the baseball already shipped**,
not a new sport. Chase value × live-testability, in that order.
