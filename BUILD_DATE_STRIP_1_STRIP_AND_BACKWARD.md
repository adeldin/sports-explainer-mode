# BUILD 1 — Date Strip (event-model) + Backward Recap Reachability

**Goal:** Add a horizontal date strip so users can reach **yesterday's games (and their AP-grounded recaps)** and **tomorrow's schedule**, not just today. This completes the recap feature shipped today — recaps become reachable the morning after, when someone wants to talk about last night's game. Event-model: the strip shows game-days, skipping empty days (like Yahoo's World Cup strip: Jul11·14·15·18·19, not consecutive).

**Scope of THIS build (Build 1):** the date strip UI + range-query fetch + making past/today games (and their existing recap/live/pre rendering) reachable per selected day. The RICH forward planning-card (probable pitchers, records, weather, TV-as-first-class) is **Build 2** — Build 1 just lets you *navigate* to a forward day and shows whatever the existing pre-game state renders today.

**This is a MOBILE-ONLY build.** The games list is fetched client-side (`lib/scoreboard.ts` `fetchScoreboard`), not via backend. No backend/Vercel change, no live-deploy risk. Ships in the next EAS build like any binary change.

---

## Recon-confirmed facts (from prior recon — do not re-litigate)
- **Mobile owns the date.** `fetchScoreboard(sport, isCancelled)` in `lib/scoreboard.ts` hits ESPN directly. Backend not involved in the games list.
- **Range query works** on the site API: `?dates=START-END` returns all game-days in ONE call (MLB −3d…+3d = 94 events across 8 days). Group by `event.date` (local day) → the keys ARE the game-day list. No day-by-day looping.
- **The range pattern already exists** in `fetchScoreboard`'s **core-sport branch** (scoreboard.ts:124, rugby) using `dates=${start}-${end}`. Lift it to the site branch (currently bare `/scoreboard` at scoreboard.ts:213).
- **Gap-skipping is free:** empty days simply don't appear in the grouped response (MLB All-Star break: 07-13/07-14 absent). "Skip empty day" = "day not in grouped keys."
- **Empty day = `events: []`** (clean empty list, key present) — never an error.

## Gotchas (recon-flagged — MUST handle)
1. **Local-day grouping, NOT UTC.** The existing code deliberately uses local `YYYYMMDD` (scoreboard.ts:118), never `toISOString()` — because UTC rolls the day for behind-UTC users (Central time = UTC-5/6; a UTC date shows "tomorrow's" games late at night). Group the range response by **local** day and reuse the existing local-date formatter.
2. **Range edge-bleed.** ESPN's range returns a stray ±1 day at boundaries (a `…-20260705` query returned a `20260706` event). Group by local day and only surface days actually inside the intended window; don't treat bled-in edge days as real strip cells.
3. **Soccer bare ≠ today (find-next-fixture — Option B).** Soccer's BARE scoreboard means "current/next matchday" (jumps forward to next fixtures). A range query returns literal calendar truth (empty when no games in-window). For the **forward "next game" beat**, a bounded range won't find a fixture weeks out. **Option B (chosen):** the "next game day" must reach forward far enough to land on the actual next fixture — either a widened forward window or a fallback to the bare scoreboard for the next-fixture lookup. For daily sports (MLB/NBA in-season) this is moot (window always has games); it matters for offseason/intermittent leagues.

---

## GATE 0 — RECON (read-only, confirm the seam)

**📋 PASTE INTO CLAUDE CODE:**
```
RECON ONLY — read-only, no edits, no git. Report, STOP.
cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2

echo "=== fetchScoreboard full (both branches, date handling, local-day fmt) ==="
sed -n '60,225p' lib/scoreboard.ts

echo ""
echo "=== how LiveScreen calls fetchScoreboard + holds game/day state ==="
grep -n "fetchScoreboard\|fetchGames\|selectedGame\|selectedGameId\|setGames\|games\b\|sport\b" screens/LiveScreen.tsx | head -30

echo ""
echo "=== where the sport tabs / SportStrip render (the strip goes just below) ==="
grep -n "SportStrip\|sportStrip\|<ScrollView\|styles.header\|styles.scroll" screens/LiveScreen.tsx | head

echo ""
echo "=== existing game-state gating (past=recap / today=live / pre=countdown) to confirm reuse ==="
grep -n "isFinal\|selectedGameState\|=== 'pre'\|=== 'post'\|=== 'in'\|<PlayCard\|<RecapCard\|EmptyState" screens/LiveScreen.tsx | head -20
```
**Gate 0 pass:** confirm (a) `fetchScoreboard`'s local-day formatter + the core-branch range pattern to lift, (b) how LiveScreen holds `games`/`selectedGame` state so a date param threads in, (c) where to mount the strip (below SportStrip), (d) that past/today game states already render recap/live/pre (they do — reuse, don't rebuild).

---

## GATE 1 — `fetchScoreboard`: add a date/window param + range for site sports

Extend `fetchScoreboard` to accept an optional target date (default = today). Lift the core-branch range-query pattern to the site branch:
- Signature: `fetchScoreboard(sport, isCancelled, targetDate?)` — `targetDate` defaults to today (local). **Backward-compatible:** all existing callers (LiveScreen live poll, Watch Next) pass no date → behave exactly as today.
- Site branch: when a `targetDate` (or day-window) is requested, query `?dates=START-END` (local `YYYYMMDD`) instead of bare `/scoreboard`, and filter/group results by **local** day. Reuse the core branch's existing `fmt` local-day helper (scoreboard.ts:118–119) — don't reinvent, don't use `toISOString()`.

**⚠️ TWO EXISTING SITE-BRANCH GUARDS FIGHT THE MULTI-DAY WINDOW — reconcile them (recon-flagged, load-bearing):**
1. **The 24h-stale filter (scoreboard.ts:219–224)** drops completed games >24h old. **This directly deletes the games the date strip exists to surface** — yesterday's evening finals can be >24h old by the next evening, so a naive lift would make "yesterday" silently drop games depending on time of day. When a `targetDate`/window is in play, this filter MUST be scoped to the windowed path (e.g. only apply staleness relative to the *selected* day, or skip it entirely for explicit-date fetches). This is the #1 correctness risk of the build.
2. **The end-of-season guard (scoreboard.ts:229–239)** clears the whole list when nothing is live/upcoming/dated ≥ today. For a windowed fetch deliberately looking at PAST days, this would wrongly nuke a valid past-day list. Scope it to the no-date (today) path only.

- **Preserve today's live behavior when no date is passed:** the 60s auto-refresh poll and Watch Next must stay byte-identical — both guards behave exactly as today when no `targetDate` is passed. Verify Watch Next candidates unchanged.

**Verify:** (a) existing live view + Watch Next byte-identical (no date passed, both guards active as before). (b) A windowed fetch returns yesterday's finals INCLUDING games now >24h old (proves the stale-filter reconciliation). (c) A past-day windowed fetch isn't cleared by the end-of-season guard. tsc clean.

Commit: `Scoreboard: add optional targetDate + site-API range query; scope 24h-stale + end-of-season guards to the today-only path (backward-compatible; live/WatchNext unchanged)`

## GATE 2 — Game-day discovery: find prev/next game-days (event-model)

Add a helper that, given a sport + anchor date, returns the **nearest game-days** in each direction by range-querying a window and grouping by local day:
- Query a bounded window around the anchor (e.g. −7d…+7d), group `events` by local day, produce the sorted set of game-days.
- `previousGameDay` = latest game-day < today; `nextGameDay` = earliest game-day > today (skipping empties — free from the grouping).
- **Option B forward reach:** if no `nextGameDay` in the bounded window (offseason/intermittent), widen the forward query OR fall back to the bare scoreboard's "next matchday" to find the actual next fixture. Cap the reach (don't scan into infinity — a sane bound like +45d, then show "no upcoming games" if truly nothing).
- Golf/tennis are learnMode/leaderboard-routed — **excluded** from the head-to-head strip (they don't do per-day head-to-head games; golf is tournament-spanning). The strip applies to MLB/NBA/NHL/NFL/soccer/worldcup/EPL/laliga/wnba.

**Verify:** MLB → prev=yesterday, next=tomorrow. Simulate an intermittent case (World Cup rest day, or NFL) → prev/next skip empty days and land on real game-days. tsc clean.

Commit: `Scoreboard: event-model game-day discovery (prev/next nearest game-day, gap-skipping, Option-B forward reach)`

## GATE 3 — The date-strip UI component

A horizontal strip of game-day cells, mounted **below SportStrip** in LiveScreen:
- Cells: day-of-week over date (e.g. "Thu / Jul 2"), "Today" word for today. Event-model days (may be non-consecutive — that's correct; the gaps show the sport's rhythm).
- Active day accented in brand **orange `#E87722`** (matches ESPN's pattern and your existing accent). Space Grotesk. Navy strip.
- Bounded window (not an infinite archive — a handful of game-days each direction, per the near-term social-rhythm mission).
- Horizontally scrollable; today centered/visible on mount.
- Tapping a day sets the selected date → refetches that day's games via Gate 1 → the existing game-state rendering (recap/live/pre) handles display.
- **Per-sport:** the strip's game-days are computed for the *currently selected sport* (switching sports recomputes the strip). This is correct — MLB's game-days ≠ golf's ≠ World Cup's.

**Verify on-device:** MLB strip shows consecutive days (daily cadence); tapping yesterday loads yesterday's finals; tapping a past final shows its **AP-grounded recap** (the payoff — recaps now reachable). Switch to World Cup → strip shows its (possibly non-consecutive) match-days.

Commit: `Date strip: event-model horizontal day selector below SportStrip (orange active day, per-sport game-days, taps refetch)`

## GATE 4 — Wire selected-date through LiveScreen state

Thread the selected date into LiveScreen's game-fetch + selection so:
- Changing the date refetches that day's game list and clears stale selection.
- Switching sports resets to today (or recomputes the strip for the new sport).
- The existing recap/live/pre rendering keys off the selected day's games unchanged.
- **Today remains the default** on app open and on sport-switch (don't strand users on a past date).

**Verify on-device:** full flow — open app (today), tap yesterday (finals + recaps), tap a game (recap loads), switch sport (resets sensibly), tap tomorrow (existing pre-game card shows — Build 2 will enrich it). Golf/tennis show no strip (excluded). No Groq calls from browsing/switching days — only from opening a past game's recap (confirm via network).

Commit: `LiveScreen: wire selected-date state through game fetch + selection (defaults to today; resets on sport-switch)`

---

## GROQ / COST NOTE
- The strip + day-browsing = **ESPN scoreboard fetches only, zero Groq.** Groq fires ONLY when a user opens a specific past game's recap (`fetchRecap`) or a live explanation.
- **Recap-cache interaction:** the strip surfaces OLDER games (yesterday, 2 days ago) that may have aged out of the Upstash recap cache. First open of an aged-out recap → one fresh Groq call → re-caches. Bounded to games users actually tap. Not a problem; just expect slightly more cache misses than the today-only pattern. (No cache change needed in this build.)

## OUT OF SCOPE (Build 2 or later)
- ❌ Rich forward planning-card (probable pitchers, records, weather, TV-as-first-class element) → **Build 2**.
- ❌ Golf/tennis date navigation (tournament-spanning, leaderboard-routed) — excluded from the head-to-head strip.
- ❌ Any backend change — this is mobile-only.

## SEQUENCING NON-NEGOTIABLES
- Gate 0 recon before edits.
- Gate 1 backward-compatible: **live view + Watch Next byte-identical when no date passed.** Verify before proceeding.
- Local-day grouping, never UTC (gotcha 1). Handle edge-bleed (gotcha 2). Option-B forward reach for soccer (gotcha 3).
- Each gate its own commit, explicit paths, never `git add .`.
- Mobile-only → no Vercel deploy, no live-user risk; ships in next EAS build.
- Discard any VS Code tsconfig auto-reformat before committing.
