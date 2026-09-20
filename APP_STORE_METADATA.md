# SportsWise — store listing copy

Canonical source for App Store / Google Play listing text. Apple's keyword field and subtitle can
only be changed by submitting a **new app version**, so anything under "Queued" below is applied
during the next release, at the `create-version` step in `SPORTSWISE_v1.9_RELEASE.md`.

---

## SUBMITTED with 1.9.1 on 2026-09-20 — awaiting App Review (written 2026-09-19)

Applied to App Store Connect version **1.9.1** (build 41) via the API and verified stored: keywords
100/100, subtitle on the WAITING_FOR_REVIEW appInfo. Goes live when Apple approves the build.

**Subtitle** (30 char limit) — replaces `Any game, explained your way`

```
Cricket, rugby, NFL explained
```
29/30 characters.

**Keywords** (100 char limit, comma-separated, no spaces) — replaces
`explain,beginner,rules,learn,strategy,coach,soccer,baseball,football,offside,fan,quiz`

```
mlb,nba,nhl,wnba,soccer,epl,offside,wicket,scrum,beginner,novice,newcomer,glossary,tennis,golf,rules
```
100/100 characters.

Apply to locale **en-US** (the only App Store locale configured).

### Why

Measured 2026-09-19 from App Store Connect analytics (roughly three months live):

| Stage | Count |
|---|---|
| Impressions | 1,180 |
| Product page views | 66 |
| First-time downloads | 26 |
| Redownloads | 4 |

The page converts about **2 in 5 viewers**, which is healthy — the screenshots and description are
doing their job. The failure is upstream: ~13 impressions a day means almost nobody is shown the app.
That is a keyword problem, and the old keyword set had three faults:

1. **No cricket, rugby, NFL, NBA, NHL or MLB.** The Play listing was deliberately positioned
   cricket-first and rugby-first for overseas users; the iOS listing never got that treatment.
2. **Generic, high-competition words** (`learn`, `rules`, `coach`, `fan`, `quiz`) that this app will
   never outrank.
3. **15 of 100 characters unused.**

Design of the replacement:

- Apple indexes the app **name** and **subtitle** alongside keywords, so the subtitle now carries the
  three highest-intent sports and the keyword field never repeats them. Nothing is spent twice.
- Apple forms search phrases by **combining** fields, so `rules`, `beginner` and `offside` in the
  keywords pair with `cricket` / `rugby` / `NFL` in the subtitle to match "cricket rules",
  "rugby beginner" and so on.
- League abbreviations (`mlb`, `nba`, `nhl`, `wnba`, `epl`) beat the spelled-out sports: shorter,
  higher intent, and far less competitive than `football` or `basketball`.
- Cricket and rugby are the deliberate niche bet. They have a fraction of the App Store competition
  of soccer or football, and they match the Play positioning and the Coach's Corner rugby content.

**Tradeoff to be aware of:** a cricket/rugby-first subtitle may read as narrower to a US browser.
That is an accepted bet — discovery is currently near zero, so there is little to lose and a
defensible niche to win.

---

## LIVE — Google Play (all five English locales; do NOT change)

```
Title (28/30):  SportsWise: Sports Explainer
Short (80/80):  Cricket, rugby, football & more explained in plain English - ball by ball, live.
Locales:        en-US, en-GB, en-IN, en-AU, en-ZA
```

This copy is good and is not the reason Android has no installs. Measured 2026-09-19: **1 total
install, 0 active devices, ~1 store-listing acquisition per month.** A Play search for "sportswise"
finds the app; "sports explained beginners" and "learn cricket rules app" do not. That is a cold
start — Google ranks on install velocity and ratings, and with one install and zero ratings there is
no signal to rank on. Rewriting the listing will not break that loop. External traffic from an
existing audience (the Chicago Hounds partnership idea) and the first genuine ratings will.
