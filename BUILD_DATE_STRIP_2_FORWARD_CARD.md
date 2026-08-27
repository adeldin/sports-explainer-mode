# BUILD 2 — Rich Forward Tune-In Card (planning / "where to watch")

**Goal:** Enrich the forward-day (scheduled/`pre`) game card into a genuine **tune-in guide** — the on-ramp to the app's core "watch and ask why" value. Shows matchup, start time, venue, team records, probable pitchers (MLB), weather, and — first-class for a TV companion app — **where to watch (TV/streaming)**. No odds, no tickets (mission call: education-first, not gambling/commerce).

**Depends on Build 1** (date strip + range fetch). This build only enriches what a forward day *renders* — Build 1 already lets you navigate there.

**MOBILE-ONLY.** All data is already in the scoreboard response Build 1 fetches — **zero extra API calls, zero Groq.** Ships in next EAS build.

---

## Recon-confirmed field inventory (per scheduled `pre` game)
Every pre-game carries (verified live):
- **Matchup** — `event.name`, per-competitor `team.displayName`/`abbreviation`/`color`/logo.
- **Start time** — `event.date` (UTC ISO) + `status.type.shortDetail` ("7/5 - 12:30 PM EDT"). **Render in LOCAL time.**
- **Venue** — `competition.venue.fullName` + address (city/state).
- **TV/streaming** — `competition.broadcasts` (`{market:'national', names:['NBC','Peacock']}`) AND `competition.geoBroadcasts` (location-aware, sometimes carries regional/streaming). **The companion-app essential.**
- **Team logos/colors** — present all sports.

Sport-dependent (render CONDITIONALLY — recon proved these vary):
- **Team records** — MLB rich (`["50-34","25-15","25-19"]` overall/home/road); **World Cup empty `[]`** (knockout has no W-L). Show when present.
- **Probable starters** — **MLB-specific**: `competitor.probables[0]` = `{athlete.fullName, headshot, record:"(6-5, 3.27)"}` — pre-formatted W-L + ERA, ready to display. No equivalent for NBA/NFL/soccer. Show when present.
- **Weather** — MLB-present (`{displayValue:"Partly sunny", temperature:92}`); World Cup-absent. Show when present (you said yes — nice outdoor-baseball color).

## Mission calls (locked)
- ✅ **TV/streaming = FIRST-CLASS element**, not a buried field. This is a TV companion app — "here's where to watch" is core, not metadata. Present it as a clear, consistent affordance on the card.
- ❌ **NO odds.** Data carries a full DraftKings block (spread/ML/O/U). Education-first app, partly for newcomers/younger users — deliberately excluded. Differentiator, not a limitation.
- ❌ **NO tickets.** VividSeats affiliate links present in feed — commercial, not educational. Excluded.
- ⚠️ **Weather = yes, optional.** MLB-only, pure color, show-when-present.

## Known unknown (verify during build)
- NBA/NFL/EPL returned **0 events** in the July recon window (offseason) — so their **in-season** pre-game richness is UNVERIFIED. Inference: they carry records + TV in-season (standard ESPN shape), but probable-pitchers is MLB-specific and their analog (injuries/depth) wasn't observable. **Conditional rendering covers this regardless** — but verify the NBA/NFL forward card against a real in-season scheduled game before assuming parity with MLB. Not a blocker.
- **TV field completeness:** `broadcasts` showed `market:'national'` (nationally-televised). Regional/RSN games may appear under `geoBroadcasts` or be **absent**. Check BOTH fields; render TV line when present, omit gracefully when not. Don't assume every game has a TV field.

---

## GATE 0 — RECON: ✅ DONE. Key finding: there is NO pre-game detail card to enrich.

**Findings (recon + live probe):**
- **The current `pre` render at LiveScreen L1039 is the `WatchNextCard`** — a cross-sport "here's what's live now, tap to switch" recommendation strip. Selecting a future game does NOT show a detail card about *that game*; it shows a redirect-you-elsewhere card. **So this build must BUILD the pre-game detail card (Model A), not enrich an existing one.** This completes the three-state set: live→PlayCard, final→RecapCard, **pre→(new) TuneInCard**.
- **`Game` type already keeps:** `startTime`, `venue`, `broadcast` (SINGULAR string, e.g. "NBC"), `odds`. **Discards:** `records`, `probables`, `weather`, and multi-network broadcast detail.
- **Live probe confirms fields exist** in future MLB games: full broadcasts (`Padres Ballpark TV` + `MLBN`), venue, weather, records, probable pitchers (Pivetta vs Civale w/ W-L+ERA). Data to build a rich card is present.
- **The `broadcast` string is lossy** — raw data has multi-network (national + regional + streaming); current normalizer keeps one string. For first-class TV, widen it to capture the full picture.

## GATE 1 — Widen the `Game` normalizer to keep pre-game fields
Extend `fetchScoreboard`'s normalization + the `Game` type to retain, **when present**:
- `records` (per-competitor summary strings, e.g. "50-34")
- `probables` (MLB: `{name, record:"(6-5, 3.27)", headshot?}`)
- `weather` (`{displayValue, temperature}`)
- **Widen `broadcast`** from a single string to capture multiple networks/streaming (national + regional). Keep the existing singular field working for current consumers OR migrate them — but don't lose the richer TV data. Check BOTH `broadcasts` and `geoBroadcasts`.

All optional. **Output-neutral for existing consumers** — live/recap/WatchNext paths ignore the new fields (and the existing `broadcast` string keeps working if you add a new richer field alongside it rather than replacing). Verify live view + Watch Next unchanged. tsc clean.

Commit: `Scoreboard: retain optional pre-game fields (records/probables/weather + multi-network broadcast) on Game type`

## GATE 2 — Build the TuneInCard (the new pre-game detail card)
Build a NEW card component (`components/TuneInCard.tsx`) — the pre-game analog of RecapCard/PlayCard — and render it in LiveScreen's `pre` branch **for a selected future game** (replacing/supplementing the WatchNext redirect for the selected-game case). Render **conditionally**, degrading gracefully:
- Always: matchup (logos/colors), **local** start time, venue + city.
- **TV/streaming — first-class:** a prominent "📺 Watch on {networks}" element using the widened broadcast field (national + regional + streaming like Peacock/FOX One). The companion-app hook. Omit only if truly no broadcast data.
- When present: team records ("36-51" / "50-34"), probable pitchers (name + "(6-5, 3.27)" + optional headshot), weather ("92°, partly sunny").
- **Never assume a fixed field set.** Rich MLB game → everything; bare World Cup fixture → matchup + time + venue + TV. Nothing looks broken when a field is absent.
- **No odds, no tickets.** (Locked — even though `odds` is already on the Game type, do NOT surface it.)
- **WatchNext behavior:** keep WatchNext for the *no-game-selected* / "nothing on in this sport" case (it's genuinely useful there — the offseason "here's what's live elsewhere" surface). The TuneInCard is for when a specific future game IS selected. Decide the interaction cleanly: selecting a future game → TuneInCard; no selection / empty day → WatchNext can still offer live alternatives.

**Verify on-device:** tap a future date → select an MLB game → rich TuneInCard (records + probable pitchers + TV + weather). Select a World Cup future game → lean card (matchup + time + venue + TV), no broken rows. TV renders prominently. WatchNext still appears for empty/no-selection cases.

Commit: `TuneInCard: pre-game detail card for selected future games (matchup/time/venue/records/probables/weather + first-class Watch-on-TV; no odds/tickets)`

## GATE 3 — (optional) TV as a consistent surface across states
If desired, extend the "Watch on {networks}" element to the **live** and **today's-scheduled** cards too — so "where to watch" is consistent app grammar, not just a forward-card feature. (Scope 2 from the discussion — mission-aligned, small.) Defer if Build 2 is already big enough.

Commit: `Where-to-watch: surface TV/streaming consistently on live + scheduled cards`

---

## SEQUENCING NON-NEGOTIABLES
- Depends on Build 1 shipped.
- Gate 1 output-neutral for existing consumers (live/recap ignore new fields).
- Every forward-card field CONDITIONAL — degrade gracefully, never assume MLB's richness on other sports.
- Local time for start times (not UTC display).
- Check BOTH `broadcasts` and `geoBroadcasts` for TV; omit gracefully when absent.
- No odds, no tickets (locked mission call).
- Verify NBA/NFL forward card against a real in-season game before assuming parity.
- Mobile-only; ships in next EAS build.
