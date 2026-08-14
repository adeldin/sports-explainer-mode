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

**Ready to build NOW — European Champions Cup + Challenge Cup (rugby).** ESPN already publishes
**48 and 36 forward fixtures** respectively, both starting **2026-10-13** — about eight weeks out.
These are core-API slugs (`271937`, `272073`), which is the exact pipeline URC and Six Nations
already use, so each is a `SPORT_CONFIG` line plus a `RUGBY_LEAGUES` row. This is the cheapest
real coverage gain on the board right now.

**Best-positioned major — Rugby World Cup 2027.** Slug `164205`, and **ESPN already carries 36
fixtures**, first window opening 2027-08-09. Worth flagging that this is the tournament this app is
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

**Standing habit.** Before each release, re-run the forward-fixture probe over every configured
league. A competition that quietly drops to zero forward events is either finished or has changed
its league code, and both cases look identical from inside the app: an empty board.

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

## 📌 Reference — where things live

| Thing | File |
|---|---|
| Vision, pedagogy, platform thesis | `FEATURE_IDEAS.md` (historical for roadmap purposes) |
| Coach's Corner authoring bar | `COACHES_CORNER_AUTHORING_STANDARD.md` |
| Landscape port conventions | `COACHES_CORNER_LANDSCAPE_PORT_STANDARD.md` |
| Icon pipeline + revert ladder | `sports-explainer-mobile-v2/assets/icons/README.md` |
| Release history | `SPORTSWISE_v1.5_RELEASE.md` |
