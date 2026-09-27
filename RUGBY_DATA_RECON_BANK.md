# 🏉 RUGBY DATA RECON BANK — Nations Cup 2026 Readiness

**Date of recon:** July 2, 2026 (2 days before tournament kickoff)
**Status:** Data capability CONFIRMED ✅ / Tournament coverage NOT YET PRESENT ❌ — re-check on/after July 4
**Owner:** Anthony (SportsWise) — architect/reviewer chat + Claude Code executor

---

## TL;DR (read this first)

We set out to answer: *is there ANY free source with typed, timestamped rugby match events for the World Rugby Nations Cup 2026?*

**What we proved today:**

1. ✅ **Free typed+timestamped rugby event data EXISTS.** Rugby Micro (a SportDevs reskin on RapidAPI) returns real incident streams: tries, conversions, penalties, cards, substitutions — each with a match minute, player attribution, team side, and running score. This passes the make-or-break test for the event-triggered learning reframe.

2. ❌ **The World Rugby Nations Cup 2026 is NOT in the provider's catalog as of July 2.** The only "Nations Cup" entries are stale/wrong: defunct 2017 IRB Nations Cup, IRB Pacific Nations Cup, European Nations Cup. No July-4 emerging-nations event, no Americas competition in the window.

**What this means:** The hard part (does the data shape work?) is DE-RISKED. The only remaining unknown is whether the provider ADDS the Nations Cup to its catalog when it kicks off — providers routinely add competitions on/just before opening day. **This is knowable only on July 4+.** Run the re-check below.

---

## The naming resolution (settled)

- **Target = World Rugby Nations Cup 2026.** Confirmed real, separate, *second-tier*, inaugural competition. Runs **July 4 – Nov 21, 2026**.
- **12 teams:** Canada, Chile, Georgia, Hong Kong China, Portugal, Romania, Samoa, Spain, Tonga, USA, Uruguay, Zimbabwe.
- **Opener:** Uruguay vs Georgia, Montevideo, July 4. July window is Americas-hosted; Nov window Europe/Asia.
- **USA + Canada are in it** (relevant for US-newcomer audience; USA matches on Paramount+, most matches on RugbyPass TV).
- **NOT the same as** the top-tier "Nations Championship 2026" (England/France/Ireland/All Blacks/Springboks, same dates, Twickenham finals). Different tournament, different coverage.
- **Hard truth:** a brand-new second-tier emerging-nations competition is the *worst case* for free API coverage — no historical league ID to inherit, providers prioritize marquee events. Today's absence confirms this risk but does NOT rule out a kickoff-day addition.

---

## VALIDATED API: Rugby Micro (SportDevs reskin)

**Host:** `rugby-micro.p.rapidapi.com`
**Access:** via RapidAPI subscription (free tier). Key in env var `RAPIDAPI_KEY` (shared with tennis/golf providers).
**Backend signature:** PostgREST-style (`?field=eq.VALUE&limit=N&offset=N&lang=en`) → confirms this is **SportDevs** underneath.

> ⚠️ **Production wiring note (decide BEFORE building):** Because this is a SportDevs reskin, going **SportDevs-direct** (their own free tier ~300 req/day, separate key) would (a) not stack on the RapidAPI quota shared with tennis/golf, and (b) give a more generous limit. Recommend evaluating SportDevs-direct vs RapidAPI-Rugby-Micro before committing rugby to the RapidAPI key. Deferred, not yet done.

### Confirmed endpoints + syntax

| Purpose | Endpoint | Example query |
|---|---|---|
| List all leagues | `/leagues` | `?limit=200&offset=0&lang=en` |
| Leagues by class (country/region bucket) | `/leagues-by-class` | `?class_id=eq.42&limit=50&offset=0&lang=en` |
| Seasons for a league | `/seasons` | `?league_id=eq.1803&limit=5&lang=en` |
| Matches (filter by league) | `/matches` | `?league_id=eq.1803&limit=5&lang=en` |
| **Match incidents (THE event stream)** | `/matches-incidents` | `?match_id=eq.1334&lang=en` |

**Endpoints that DON'T exist (404 — don't retry these):** `/matches-by-league`, `/matches-by-season`.

**Rugby Union class_id = `337`** (`class_name:"Rugby Union"`). Rugby *League* (different sport, do NOT use) = class_id `379`. Sevens = `60`.

### Reference IDs captured (for testing the event shape any time)

- Six Nations league_id = **1803**; season "Six Nations 2026" season_id = **4265**.
- Validated finished match: **id 1334** "Wales vs Italy" (Six Nations 2026, round 5).

### What the incident payload actually contains (validated on match 1334)

Each entry in the `incidents[]` array includes:

- `type` — e.g. `"goal"`, `"substitution"`, `"period"`
- `class` — sub-type, e.g. `"try"` (distinguishes try / conversion / penalty goal)
- `time` — **match minute** (e.g. `80`)
- `reversed_period_time_seconds` — sub-minute precision
- `player_id` + `player_name` — full attribution (e.g. "Paolo Garbisi")
- `is_home` — team/side (true/false)
- `home_score` / `away_score` — running score at that event
- For subs: `player_in_id/name` + `player_out_id/name`
- Period markers: `type:"period"`, `text:"FT"` etc.

**This is exactly the event vocabulary the event-triggered learning reframe needs.** A newcomer's "why did that just happen?" maps directly onto try / conversion / penalty / yellow_card / red_card / substitution — all typed, timed, attributed.

---

## ⏰ THE JULY-4 RE-CHECK (copy-paste, run on/after kickoff)

**Goal:** determine whether the provider has added the World Rugby Nations Cup 2026 to its catalog once matches are live.

**Prereq — load the key into the shell first** (from backend repo root):

```
cd /Users/anthonydeldin/Desktop/sports-explainer-mode
source .rapidapi.env
echo ${#RAPIDAPI_KEY}     # must print 50, not 0
```

### Step 1 — Is the tournament in the league catalog now?

```
curl -s --url "https://rugby-micro.p.rapidapi.com/leagues?limit=300&offset=0&lang=en" \
  -H "x-rapidapi-host: rugby-micro.p.rapidapi.com" \
  -H "x-rapidapi-key: ${RAPIDAPI_KEY}" \
  -o /tmp/leagues.json -w "HTTP %{http_code}\n"; \
  grep -ioE '"name":"[^"]*nations[^"]*"' /tmp/leagues.json; \
  echo "--- americas/pan-am ---"; \
  grep -ioE '"name":"[^"]*(americas|pan.?american|pacific)[^"]*"' /tmp/leagues.json
```

**Reading it:**
- Look for a NEW "Nations Cup"-type entry with a **2026-07** start date (NOT the 2017 defunct one, id 2431). If a fresh league appears with July 2026 dates → **tournament is carried.** Note its `id`.
- If only the same stale entries (2431 IRB Nations Cup 2017, 2378 Pacific, 2861 European) appear → **not added yet.** Try again in a day or two; providers sometimes lag the opener by 24–48h.

### Step 2 — Scan live/recent matches for your teams (catches it even if named oddly)

```
curl -s --url "https://rugby-micro.p.rapidapi.com/matches-live?lang=en" \
  -H "x-rapidapi-host: rugby-micro.p.rapidapi.com" \
  -H "x-rapidapi-key: ${RAPIDAPI_KEY}" \
  -o /tmp/live.json -w "HTTP %{http_code}\n"; \
  grep -ioE '"name":"[^"]*(uruguay|georgia|portugal|samoa|tonga|zimbabwe|chile|romania|spain|canada|usa|hong kong)[^"]*"' /tmp/live.json | sort -u
```

*(Note: `/matches-live` endpoint spelling is inferred from the "Matches Live" UI endpoint — if it 404s, try `/matches?date=eq.2026-07-04` or find the live path via the RapidAPI endpoint list. Confirm on the day.)*

**Reading it:** If any Nations Cup fixture (e.g. Uruguay vs Georgia) shows up here, grab its `id` and `league_id`.

### Step 3 — If the tournament IS carried: confirm the incidents stream lights up

Once you have a Nations Cup `match_id` (from Step 2), pull its incidents mid-match or post-match:

```
curl -s --url "https://rugby-micro.p.rapidapi.com/matches-incidents?match_id=eq.MATCH_ID_HERE&lang=en" \
  -H "x-rapidapi-host: rugby-micro.p.rapidapi.com" \
  -H "x-rapidapi-key: ${RAPIDAPI_KEY}" \
  -o /tmp/inc.json -w "HTTP %{http_code}\n"; \
  head -c 1500 /tmp/inc.json; echo
```

**Reading it:** If you see `type:"goal"`/`class:"try"`, `type:"substitution"`, card types, with `time` minutes and player names — same shape as match 1334 — **rugby event data for YOUR tournament is live and real.** Green light to build the rugby explain path on it.

---

## Decision tree from the re-check

- **Tournament carried + incidents populate** → ✅ Build rugby event-triggered explain on Rugby Micro (or SportDevs-direct — see wiring note). This is the win scenario.
- **Tournament carried but incidents thin/empty** → Partial. May get scores + basic events only; design explanations around scoring events + cards (the confusing-moment reframe still works — tries, penalties, cards are exactly what newcomers ask about).
- **Tournament NOT carried at all** → Fallbacks in priority order:
  1. **SportDevs-direct** — check if their direct catalog (vs the RapidAPI reskin) carries it; sometimes reskins lag.
  2. **ESPN free** — check for at least scores/fixtures (your existing base layer, already used for MLR). Event depth unproven for this comp.
  3. **Highlightly** (distant) — you already pay for it, but research says scores + video highlights, no text event stream. Not worth a dedicated recon; its real value is post-match clips, a *different* feature.
  4. **Wizard-of-Oz** — for a few marquee USA matches, manually trigger explanations to prove the concept without automated data.

---

## What we deliberately did NOT do (and why)

- **Did not recon Highlightly.** Three prior AI passes independently found it lacks a typed event stream; it shares Rugby Micro's tournament-coverage risk while being weaker on capability. Doesn't earn its place vs SportDevs-direct/ESPN as a backup.
- **Did not build anything.** Recon-first. No wiring on the live explain path until the tournament coverage is confirmed on July 4.
- **Did not evaluate SportDevs-direct yet.** Flagged as the pre-build wiring decision (quota isolation + higher free limit). Do this before committing rugby to the shared RapidAPI key.

---

## Security note (for the record)

During this recon the shared `RAPIDAPI_KEY` was rotated (old key exposed in a screenshot). New key is live in Vercel env + local `.env.local` + `.rapidapi.env`; old RapidAPI authorization deleted. Golf smoke-test confirmed the new key works (HTTP 200 on live-golf-data schedule). No action outstanding.

---

*Recon banked so the July-4 re-check is instant. The hard question — "does free typed rugby event data exist?" — is answered YES. The only open question is provider catalog timing, resolvable only at kickoff.*
