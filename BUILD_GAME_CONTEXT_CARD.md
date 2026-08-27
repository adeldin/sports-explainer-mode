# BUILD — GameContextCard (extend TuneInCard to live games)

**Goal:** Extend the just-shipped TuneInCard into a reusable **game-context card** that renders for BOTH pre-game (as now) AND live games — placed at the **bottom of the page** (below the PlayCard for live games), matching the "Game Information" block Yahoo and ESPN both put there. Extends the companion-app "where to watch" value to the moment it matters most: when the game is actually on.

**Why:** The TuneInCard's info (time/venue/TV/weather/records/pitchers) is useful mid-game too — "what channel is this on," "who's pitching," "what's the weather at the park." Both Yahoo and ESPN place this context block at the bottom of the live game page. It's established, expected furniture that reinforces the mission.

**MOBILE-ONLY.** All data already flows (Gate 1 of Build 2 widened the Game type). Zero new API calls, zero Groq. Ships in next EAS build.

---

## Design (locked with Anthony)
**One reusable card**, two placements:
- **Pre-game (selected future game):** the card standalone (current TuneInCard behavior — unchanged).
- **Live game:** PlayCard stays primary (the teaching/play explanation), the context card appended **below** it. The `why` stays the star; context supports it.

**Fields (include as much as earns its place):**
- Time/date, venue + city
- **Where to watch / TV** — the star; multi-network row (as now)
- Weather (as-is; NO AccuWeather branding — clean own-styled presentation is legitimate on its own)
- Team records
- Pitchers — **probable** starters for pre, **starting** pitchers (who started) for live (stable, same `probables` data; do NOT chase current-pitcher)
- **Stage/round — NEW field** ("Playoff Round 1", "World Cup Round of 32") — educational context for a newcomer (stakes/format). Add this.
- **Series context — NEW field** ("Game 4 · PHI leads 2-1") — for multi-game series (MLB series, playoff series). Frames stakes for a newcomer the same way stage does — "this is game 4 and Philly's ahead." Conditional: only for sports/situations with a current series (regular MLB series, playoff series); absent for one-off games (World Cup group match) → omit. This is the one genuinely newcomer-valuable, non-stats field surfaced by the ESPN live-page walkthrough.

**Explicitly NOT added (ESPN live-page has these; they're stats/fan-depth, off-mission — "becoming a scoreboard is the failure mode"):** box score, stat-line tables, team-stat comparison bars, LOB, injury report, win-probability graph, today's-at-bats narrative, pitch-by-pitch stat dumps. (NOTE: confusing stats reframed as *teaching visuals* — strike zone, base diamond, win-prob-as-momentum — are a SEPARATE banked direction: "PlayCard teaching-visuals." Not this build.)

**Excluded (locked):** NO gambling/odds/picks (regulatory baggage — note the giant gambling disclaimers on ESPN's screens), NO tickets, NO umpires/officials (deep-fan trivia, not newcomer-useful), NO venue photo (rights-encumbered like recap images).

---

## GATE 0 — RECON (read-only)
Confirm: (a) how TuneInCard is currently structured + rendered (so it can be reused, not duplicated), (b) where the PlayCard renders in the live (`in`) branch so the context card can append below it, (c) whether the `stage/round` field exists in the scoreboard/summary data across sports, (d) for a LIVE game, does `probables` still carry the starters (so "starting pitchers" works live)?

```
RECON ONLY — read-only, no edits, no git. Report, STOP.
cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2

echo "=== 1. TuneInCard structure (to reuse, not duplicate) ==="
sed -n '1,60p' components/TuneInCard.tsx
echo "--- how/where it's rendered in LiveScreen ---"
grep -n "TuneInCard\|selectedGameState === 'pre'\|=== 'in'\|PlayCard\|<PlayCard" screens/LiveScreen.tsx

echo ""
echo "=== 2. the LIVE (in) render branch — where PlayCard is, to append context below ==="
grep -n "=== 'in'\|isLive\|<PlayCard" screens/LiveScreen.tsx

echo ""
echo "=== 3. does the Game type carry stage/round + series? and does scoreboard/summary data have it? ==="
grep -n "stage\|round\|series\|season\|seriesSummary\|notes\|competition.type\|leagueName" lib/scoreboard.ts | head
echo "--- live probe: stage/round + series field across sports ---"
python3 << 'EOF'
import json, urllib.request, datetime
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    try: return json.load(urllib.request.urlopen(req,timeout=25))
    except Exception as e: return {'__err__':str(e)}
# World Cup (round of 32) + MLB (regular season series)
for path,label in [("soccer/fifa.world","WorldCup"),("baseball/mlb","MLB")]:
    d=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard")
    ev=(d.get('events') or [{}])[0]
    comp=(ev.get('competitions') or [{}])[0]
    print(f"{label}: event.notes={ev.get('notes')} | comp.notes={comp.get('notes')} | season.slug={ (ev.get('season') or {}).get('slug') } | comp.type={ (comp.get('type') or {}).get('text') }")
    print(f"  {label} series?: comp.series={comp.get('series')} | event.series={ev.get('series')}")
    # summary endpoint often has richer series data
    gid=ev.get('id')
    if gid:
        s=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={gid}")
        print(f"  {label} summary.seasonseries present?: {'seasonseries' in s} | keys w/ 'series': {[k for k in s.keys() if 'series' in k.lower()]}")
EOF

echo ""
echo "=== 4. LIVE game — does probables still carry starters? ==="
python3 << 'EOF'
import json, urllib.request
def get(url):
    import urllib.request
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    try: return json.load(urllib.request.urlopen(req,timeout=25))
    except Exception as e: return {'__err__':str(e)}
d=get("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard")
live=[e for e in (d.get('events') or []) if e.get('status',{}).get('type',{}).get('state')=='in']
if live:
    comp=(live[0].get('competitions') or [{}])[0]
    c=(comp.get('competitors') or [{}])[0]
    print("LIVE game probables present?:", bool(c.get('probables')), [(p.get('athlete',{}) or {}).get('displayName') for p in (c.get('probables') or [])])
else:
    print("no live MLB game right now to check")
EOF
```
**Gate 0 pass:** confirm TuneInCard can be reused as-is (or lightly refactored), the append-point below PlayCard in the `in` branch, where stage/round lives in the data (per-sport), and whether live games keep `probables`.

## GATE 1 — Add stage/round + series to the Game type (if not present)
If Gate 0 shows stage/round and/or series need capturing, add them to the normalizer + Game type (optional fields):
- `stage`/`round` from `event.notes`/`season.slug`/`comp.type` (per whatever Gate 0 found carries it)
- `series` from `comp.series`/`summary.seasonseries` — a short string like "Game 4 · PHI leads 2-1" (build the label from the series data; conditional — only present for multi-game series)
Output-neutral. tsc clean.

Commit: `Scoreboard: retain optional stage/round + series-context fields on Game type`

## GATE 2 — Two placements: compact TV up high (recessive) + full context card at bottom

The recon + Anthony's placement logic split this into TWO distinct placements, built/sequenced separately:

### PIECE 1 (do first) — compact `<WatchOn>` element, UP HIGH on the live card
- Extract the "Watch on" markup + styles from TuneInCard into a shared presentational `<WatchOn broadcasts language variant />` (~15 lines).
- Render it **up high** in the live (`in`) branch — near the score/matchup area (where `selectedGame` is in scope), so "where to watch" is glanceable without scrolling past the play.
- **CRITICAL DESIGN CONSTRAINT — recessive, not attention-grabbing:** the PlayCard is the star (the teaching/why). The live TV element must be *available but quiet* — it must NOT continually draw attention away from the PlayCard. So the LIVE variant is visually TONED DOWN vs. the pre-game TuneInCard version:
  - Smaller text (secondary/caption size, not the pre-game card's prominent size)
  - Muted/secondary color — NOT the bright accent orange, NOT `surfaceActive` fill, NOT a heavy accent border
  - Minimal chrome — reads like a quiet reference label ("📺 MLB.TV, NBC Sports Phil"), not a call-to-action button
  - Do NOT crowd the score/status line — sits near but under it, clearly subordinate
- The `<WatchOn>` component takes a `variant: 'prominent' | 'quiet'` prop: TuneInCard (pre-game) uses `'prominent'` (current bordered/accent look, unchanged); the live card uses `'quiet'`. Same info, two weights matched to context.
- Guard: `selectedGame?.broadcasts?.length` — no-TV games omit it.
- **Verify on-device:** the TV row is findable up high but visually recedes — your eye still goes to the PlayCard first. If it competes for attention, tone it down further.

Commit: `WatchOn: extract shared component; render quiet/recessive TV row high on live card (prominent variant unchanged for pre-game)`

### PIECE 2 (do next) — full GameContextCard, at the BOTTOM
- The full context block (venue/weather/records/pitchers/stage/series) appended **at the bottom** of the live card stack (below PlayCard/CoachCard/PastPlays/MatchTimeline) — where ESPN/Yahoo put "Game Information," the "more info if you scroll" reference block.
- Reuse TuneInCard's info block (minus the TV row, which is now up high via Piece 1 — or keep TV in the bottom block too if it reads fine; decide on-device).
- Add **stage/round** (from `event.season.slug`, prettified: `round-of-32` → "Round of 32", suppress `regular-season`) and **series** (from `comp.series`/`summary.seasonseries`, e.g. "Game 4 · PHI leads 2-1") — both conditional/optional.
- Conditional degradation throughout; lean for World Cup, rich for MLB.
- **No odds/tickets/umpires/venue-photo/box-score/stats/injury/win-prob.**

**Verify on-device:**
- Live MLB: quiet TV row up high + full context block at bottom (venue/weather/records/starting pitchers/stage/series). PlayCard clearly primary.
- Live World Cup: quiet TV up high + lean bottom block (venue/stage="Round of 32").
- Pre-game (TuneInCard): unchanged prominent TV + now stage/series if present.

Commit: `GameContextCard: full context block (venue/weather/records/pitchers/stage/series) at bottom of live card; no stats/odds/officials`

---

## SEQUENCING NON-NEGOTIABLES
- Gate 0 recon before edits (confirm reuse point + stage/round data + live probables).
- Output-neutral for the existing pre-game TuneInCard behavior (don't regress what just shipped).
- Every field conditional; lean cards look intentional, not broken.
- Pitchers: "starting" for live (stable `probables` data), don't chase current-pitcher.
- Stage/round is the one NEW field — educational newcomer context.
- NO gambling/odds/picks, NO tickets, NO officials, NO venue photo (all locked).
- Weather as-is, no AccuWeather branding chase.
- Mobile-only; ships next EAS build.
- Discard any tsconfig auto-reformat before committing.
