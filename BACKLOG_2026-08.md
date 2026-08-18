# SportsWise backlog — August 2026

The current "what's left" list. Supersedes the roadmap sections of `FEATURE_IDEAS.md`, which is
now **historical**: it was written in June, nearly everything it ranked shipped, and its bookkeeping
never caught up. Read that file for *vision and reasoning* (the pedagogy pillar, the
don't-become-a-scoreboard guardrail, the `[Topic]Wise` platform thesis — all still live). Read
**this** file for what to build next.

Ledger, so nobody re-audits it: **Tier 1 shipped 5/5. Tier 2 shipped 4/6. Tier 3 — the "future EAS
build, v1.4+" queue — shipped essentially in full**, including feedback, onboarding, FAQs, the
progression rank, recaps, more Academy games, and the individual-sport Coach's Corner fork. Two
"someday" swings shipped *larger* than planned: the animated X's-and-O's whiteboard became **38
interactive judgment modules across 8 sports**, and the no-games rethink became the **Next Game
Finder + Up Next cards**.

---

## 🐞 Open bugs

**Stale "THE PLAY" card on soccer.** Carried from `FEATURE_IDEAS.md` Tier 2 #4 and still untouched.
The card can sit frozen through long event-less stretches. Distinct from the CoachCard stale bug
(fixed in v1.3) — do not conflate. Needs a live match to verify, so it waits for a real fixture.

**Two `favorite_teams` weaknesses**, both flagged in code comments:
- It stores the **display abbreviation**, which is not unique across leagues — a favourited "LA"
  could match Galaxy and Lakers. Fine for sorting a board, wrong for filtering one. If team
  filtering grows teeth it wants `{sport, teamId}`, which `followed_teams` already does correctly.
- Notification **reschedule on postponement**: `resyncGameAlerts()` re-arms by stable id but never
  re-checks start times, so a postponed game notifies at its original time.

---

## 🎯 Buildable now — ranked

**1. Per-sport live indicators in the sport picker.** A dot on the MLB tile when something's live.
Recon-confirmed buildable back in June and still true: `gatherWatchCandidates` already fetches
cross-sport live status, so the data is in hand. Cheapest item here, highest glance-value.

**2. Daily challenge.** A featured play or question each day — a reason to open the app when
nothing's on, which is the offseason problem. Far more machinery exists now than when this was
banked: 400+ glossary terms, Jeopardy, Stat Geek, streaks, the rank system. Mostly curation logic
over parts that already ship.

**3. Badges / achievements.** AsyncStorage counters — "first rugby game explained", "5 sports
explored". Cheap, and the progression rank it was meant to complement now exists. Art has an answer
too: the icon pipeline (dormant, see below) can generate them.

**4. AMC-style floating fact cards.** Contextual "did you know" cards that surface during a live
game, dismissable, tap-for-more. Still genuinely unlike anything competitors do. Bigger design lift
than 1–3; the facts and strategy-tip banks it would draw from already exist.

**5. "What did the announcer mean?" framing.** One line of copy near the ask box. Coach Speak and
Stat Geek have since covered much of the underlying need, but the prompt is free.

**6. Match Timeline polish (soccer).** Two banked items: unknown event types render as a neutral dot
(the `10' • Bono` case — diagnose what `type` strings Highlightly actually sends, then map or filter
each), and per-row team identity (the `team` field is already flowing; flags for soccer, logos
later).

**7. Vision clarifying follow-up.** When the camera can't read a screen, ask a question instead of
hedging. Needs UI to render the model's question and a structured "I need X" signal to branch on.
Correctly still banked.

**8. Capture user questions.** Anonymized logging of free-text asks to find real confusion patterns
and promote the common ones into the FAQ. Needs a datastore and a privacy stance.

---

## 📅 Tournament calendar — staying ahead of the next big one

The World Cup went dead in the app a month before anyone noticed, because nothing watches the
calendar. This section is that watch. **All fixture counts below were probed against ESPN on
2026-08-13** — they are what the feed actually carries today, not what the tournament schedule says.

**Parked: FIFA World Cup.** The 2026 tournament ended 2026-07-19. `fifa.world` carries 104 past
events and **zero** forward across a 400-day lookahead. Switched off via `learnMode:true` in
`SPORT_CONFIG` and commented out of `SOCCER_LEAGUES`; key and content retained. **Re-enable: spring
2030.**

**SHIPPED 2026-08-14 — College football + men's college basketball** (`cfb`, `cbb`). Ordinary
site-API leagues, but two things made this more than a config line:

- **Volume.** A September Saturday is 68 FBS games. The merged-tile league filter was generalized
  with a `keysOf` selector so college narrows by CONFERENCE instead of league key — matching on
  EITHER side, since non-conference games are the marquee ones. Measured: 68 → SEC 13, Big Ten 10,
  ACC 7, with zero games falling outside the conference map. The chip row is capped at 10 (busiest
  first) because 22 conferences play on a Saturday and the row would have been five rows of chrome.
- **The off-season guard would have blanked NCAAF entirely.** CFB's opener is 15 days out and the
  guard cuts at 14, so the tile would have shipped empty a fortnight before the season. Fixed with a
  slate exception (≥20 games within 30 days), verified to change behaviour for CFB *only* — NBA,
  NHL, college basketball and every in-season sport blank or show exactly as before.

Conference ids are PER-SPORT and do not match across them (8 = SEC in football, Big 12 in
basketball), hence two maps in `lib/collegeConferences.ts`. AP rank is parsed with ESPN's 99 =
unranked normalized away; confirmed populating in-season (19–22 ranked sides on a real Saturday).

Deliberately deferred, not forgotten:
- **Women's college basketball** — 543 fixtures, still showing as unclaimed on the radar. Same
  one-line pipeline whenever wanted.
- **Academy crest + standings games** don't surface for college. Those two maps drive FETCHED pools,
  so pointing college at the pro key would serve NFL logos under a College Football heading. A real
  college pool is a design problem (134 FBS teams), not a config line.

**SHIPPED 2026-08-14 — European Champions Cup + Challenge Cup (rugby).** Slugs `271937` / `272073`,
48 and 36 forward fixtures from 2026-10-13, resolved teams + logos + venues. Wired through all 13
per-key maps plus both backend league tables. Rides in 1.8.

**Best-positioned major — Rugby World Cup 2027.** Slug `164205`, and **ESPN already carries all 36
pool fixtures**, verified to the day: **2027-10-01 to November**, in Australia, with teams already
resolved (Australia v Hong Kong at Optus Stadium, France v USA at Marvel Stadium). Worth flagging that this is the tournament this app is
most ready for: the Coach's Corner rugby modules were reviewed by an actual rugby coach, so the
teaching content is validated ahead of the event rather than scrambled together during it. Build
alongside the Champions Cup work, since it is the same one-line pipeline.

**Blocked on a draw, not on us — UEFA Champions League 2026-27.** `uefa.champions` is a live, rich
endpoint (189 past events) with **zero forward fixtures**, because the league-phase draw hasn't
happened yet. Nothing to build against until it does. **Re-probe in early September 2026** — if
fixtures have appeared, this is the single biggest soccer competition the app doesn't carry.

**Not in the feed yet — 2027 Women's World Cup** (`fifa.wwc`: 0 past, 0 forward) and **Women's
Rugby World Cup** (`289237`: 0 forward). Both are real events; ESPN simply hasn't populated them.
Re-probe alongside the Champions League check.

**Standing habit — now automated.** `npm run radar` (`scripts/fixture-radar.mjs`) enumerates all
354 leagues ESPN publishes across 17 sports, counts forward fixtures for each, and diffs that
against `SPORT_CONFIG` parsed straight from the source. It reports BROKEN (configured, no data
either direction — exits non-zero), DORMANT (between seasons, informational), FUTURE EVENTS
(unclaimed, first fixture >90 days out — the tournament-shaped class that ambushes you) and
ALREADY RUNNING. Keyless, so it runs anywhere with no secrets.

First real run, 2026-08-14: 0 broken, 3 dormant (Six Nations / Super Rugby / MLR, all Feb starts),
and it surfaced the **AFC Asian Cup — 51 fixtures from around 2026-12-12**, which nobody had
noticed. Blind spot: ESPN only, so Sportmonks cricket and Zyla Nations Cup still need human eyes.

---

## 🔌 Data-capped — not buildable, don't re-recon

**Live play-by-play for rugby and cricket.** Confirmed repeatedly: ESPN has no PBP feed for either,
and Highlightly carries rich *context* (lineups, standings, H2H, venue) but no events stream.
**Opta / Stats Perform remains the only real unlock**, at licensing costs an indie app can't carry.
The Coach's Corner judgment modules route around this entirely — they teach without needing a live
event feed, which is why rugby works today.

**Point-by-point tennis shot stats** (aces/winners/unforced errors per point). Same wall: the cheap
feeds don't carry it.

**Cricket fixtures beyond the trial leagues.** `getSmUpcoming()` now surfaces future fixtures, but
only for the three trial leagues (T20I / Big Bash / CSA T20). The €29 Major plan carries 26 —
widen `LEAGUE_IDS` in `sportmonksLive.ts` when the subscription lands. Note the *horizon* half of
this was NOT a subscription problem and is now fixed: the window was 45 days, cricket had 3
fixtures inside it and 62 just beyond, so the trial leagues looked emptier than they are.

---

## 🧊 Built but switched off — decisions, not builds

**Situation-keyed explanation cache** (`CACHE_ENABLED`, default off). Built, deployed, deliberately
disabled. The original rationale — "zero downloads, no cost pressure, and vivid named explanations
sell better than cached generic ones" — should be revisited against a real month of Groq/Gemini
bills, not re-argued from first principles. **Check actual usage in App Store Connect Analytics
before deciding.**

**Custom icon artwork** (`USE_IMAGE_ICONS`, default off). Full pipeline in `scripts/icons/` with a
four-level revert ladder. The art failed on contrast — the palette spec set the primary fill to
`#0d1b3e`, which *is* `theme.background`, so 28 of 36 icons measured below 3:1 against the UI. If
revived: invert the palette for a dark substrate, cut to 2–3 shapes per icon, and add a contrast
gate to the generator so sub-3:1 art can't be committed. Test **six** icons composited on navy at
real size before any full sweep.

---

## 🧾 Owed / housekeeping

**Coach's-read stat verification.** Every number in the 38 Coach's Corner modules is a
crowdsource-consensus value with honest rounding ("about 70%"). Never verified against primary
sources (PGA Tour ShotLink, ATP, NBA.com, ESPN cricket). **Oldest open item and the one with real
exposure** — the numbers are public and a rugby coach has vouched for the content.

**PlateFluent tenant eviction.** `/api/rdn-request` is inert here (missing env vars → 503) and
`/api/nutrition-ask` is **still load-bearing** for PlateFluent TestFlight builds 3–4. Do not delete
nutrition-ask until Kevin is confirmed on PlateFluent build 5. Eviction commit owed by the
PlateFluent session.

**Stat Geek football count.** The content brief specified 15 football entries; 13 were supplied.
Baseball (20) and basketball (12) are complete. Adding two is a data-only edit to `lib/statGeek.ts`.

**Screenshots.** The App Store listing still uses 1.4-era screenshots. Three of the nine are
Coach's Corner and they sell the interaction model well, so this is a marketing improvement rather
than a defect — but they show none of the eight-sport expansion, Stat Geek, or the finder.

---

## 💳 Data sources & paid subscriptions

Written down because nothing recorded it, and that cost real money: a **CricketData.org**
subscription auto-renewed for months against **28 lifetime API hits and zero integration**. It was
never referenced in this repo's entire git history and had no API key in `.env.local`, `.rapidapi.env`
or Vercel — so nothing could have called it even if code had tried. The name is one letter of
plausibility away from **cricsheet.org**, which is the source we actually use. Cancelled 2026-08-17.

| Source | Powers | Cost | Notes |
|---|---|---|---|
| **cricsheet.org** | Cricket archival (toss, officials, powerplays) | Free (ODC-BY) | Downloaded by `scripts/ingest-cricsheet.mjs`, **committed** as `matches.generated.ts` — no request-time call |
| **cricket.sportmonks.com** | Cricket live boards + upcoming fixtures | Paid | `SPORTMONKS_TOKEN`, gated by `CRICKET_SM_LIVE`. 2,000/hr cap. Trial leagues `[3, 5, 10]` |
| **ESPN** (site + core API) | Almost everything: all team sports, tennis, golf | Free, keyless | No account, no quota |
| **Zyla** | World Rugby Nations Cup only | Paid | `ZYLA_API_KEY` — not on ESPN |
| **Highlightly** | Soccer Match Timeline (goals/cards/subs) | Paid, **expires 2026-08-24** | See below |
| **Groq / Gemini** | Explanations | Paid | Groq primary, Gemini fallback |
| **RevenueCat** | Pro entitlement | Paid | |

Cricket precedence, since two sources overlap: **archival wins**. When the same match exists in
both, the Cricsheet entry is served and the Sportmonks twin dropped — deduped on teams+date because
the id spaces differ. Cricsheet is free, richer, and keys the validated explain path.

**Highlightly — RENEW, and now actually wired (corrected 2026-08-17).** An earlier draft of this
section said to let it lapse, on the strength of a code comment reading *"BASIC tier = 100 req/day →
PROTOTYPE ONLY"*. That comment was stale. Measured against the live API: the quota is **7,500
requests**, seventy-five times what the comment claimed. Reading a comment as current fact is how
that mistake happened; the headers settled it in one call.

The reason it looked worthless is separate and real: its league map held **only** `worldcup: 1635`,
and the World Cup ended 2026-07-19 — so the enricher had been enriching nothing at all, taking the
`!leagueId` early return on every soccer explanation while the subscription was paid.

Now mapped for all five club leagues, ids confirmed against `/leagues` on 2026-08-17 (they are
country-scoped and collide by name — a "Premier League" search returns 34, from England to Ethiopia):

| Key | Highlightly id | Country |
|---|---|---|
| `epl` | 33973 | England |
| `laliga` | 119924 | Spain |
| `soccer` (MLS) | 216087 | USA |
| `seriea` | 115669 | Italy |
| `bundesliga` | 67162 | Germany |

Match detail carries `events`, `statistics`, `venue`, `referee`, `forecast`, `predictions` — so the
Match Timeline (buildable item 6) now has live data behind it for the club seasons just starting.

**Watch the quota.** Five mapped leagues is a much larger surface than one dormant tournament. The
enricher caches match detail for 60s, but that cache is per serverless instance, so real-world hit
rate will be below ideal. A continuously-watched two-hour match costs roughly 120 upstream calls.
Failure is graceful (`{}` → ESPN base), so overrun degrades rather than breaks — but if soccer usage
grows, check consumption before assuming headroom.

---


## 📌 Reference — where things live

| Thing | File |
|---|---|
| Vision, pedagogy, platform thesis | `FEATURE_IDEAS.md` (historical for roadmap purposes) |
| Coach's Corner authoring bar | `COACHES_CORNER_AUTHORING_STANDARD.md` |
| Landscape port conventions | `COACHES_CORNER_LANDSCAPE_PORT_STANDARD.md` |
| Icon pipeline + revert ladder | `sports-explainer-mobile-v2/assets/icons/README.md` |
| Release history | `SPORTSWISE_v1.5_RELEASE.md` — 1.7 (build 38) READY_FOR_SALE 2026-08-17; 1.8 unreleased, carrying filters/college/golf/NBA horizon |
