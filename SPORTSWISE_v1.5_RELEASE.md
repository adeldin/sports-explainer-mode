# SportsWise v1.5 — release notes & build manifest

*Cut 2026-08-01. Previous binary: **v1.4.0, built 2026-07-07**. Everything below has been sitting in `main` unshipped since then, plus this session's Coach's Corner port.*

Branch: `v1.5-coaches-corner-ports` · EAS build: `15bdbae1-5107-401e-ba31-c1e303b62847`

---

## What's New (App Store copy — draft)

**Coach's Corner goes to eight sports.**
Eleven new interactive field modules join the tab, and five sports arrive with them: Basketball, Rugby, Tennis, Golf and Cricket. Each module drops you into one real decision — go for it or kick, press or drop, review the umpire or bank it — plays the moment out on the field, then grades your call with a coach's read at four depths.

**New in Coach's Corner**
· NFL — Fourth Down Call: go, field goal, or punt; the ball's nose decides it
· MLB — Own the Count, Steal or Stay?
· Soccer — Press or Drop, Counter or Keep?
· NBA — Help or Stay?
· Rugby — Posts, Corner, or Scrum?
· Tennis — Approach or Stay?
· Golf — Go or Lay?, Sucker Pin
· Cricket — Review or Save? (with a DRS scrubber you can drag frame by frame)

**Academy: six new visual games.**
Higher or Lower, Signal Decoder, Zone Tap, Crest Rush, Kit Clash and Read the Score — now across all ten sports, with the signals actually animated instead of described. Plus the Jeopardy board.

**Cricket, live.**
Full ball-by-ball coverage: live scores, the required-run-rate line anchored to the true after-this-ball state, national-side flags, and date filtering.

**Fixes.** Live games no longer open on an error card. Higher or Lower questions name their own season.

---

## Ships in this binary (mobile)

### Coach's Corner — 11 new field modules (this session)
Ported from the HTML spikes per `COACHES_CORNER_LANDSCAPE_PORT_STANDARD.md`. All landscape, all on `LandscapeGameShell`, orientation + tab-bar-hide inherited from `GameHost` via `landscape: true`.

| Sport | Module | The decision |
|---|---|---|
| NFL | Fourth Down Call | go / field goal / punt |
| MLB | Own the Count | pick the pitch by count leverage |
| MLB | Steal or Stay? | read the arm, time the jump |
| Soccer | Press or Drop | when to trigger the press |
| Soccer | Counter or Keep? | the five-second window |
| Rugby | Posts, Corner, or Scrum? | the captain's penalty menu |
| NBA | Help or Stay? | tag the roller or guard the corner |
| Tennis | Approach or Stay? | short ball — invitation or trap |
| Golf | Go or Lay? | par-5 second shot |
| Golf | Sucker Pin | aim the oval, not the flag |
| Cricket | Review or Save? | DRS, computed from ball-tracking |

New renderers: `BasketballCourt`, `CricketOval`, `RugbyPitch`, `TennisCourt` (in `components/academy/fields/`). `FieldEngine.tsx` untouched.

CC sport strip: 3 sports → 8 (NBA, Rugby, Tennis, Golf, Cricket added).

### Unshipped since the v1.4 binary (24 mobile commits)
- **Academy v2** — six visual games across all ten sports (`796006d`)
- **Jeopardy** — the capstone board (`141bda2`)
- **Signal Decoder v2** — animated signals; hands read as a ball unless fingers matter; jump-ball thumbs fixed (`8ed7f52`, `caac9cb`, `8576237`)
- **Zone Tap** — orienting context (markers, players), LOS label alignment (`9260c5d`)
- **Higher or Lower** — every question names its season; no "so far" on finished seasons (`e1e0eeb`, `829a3c5`)
- **Live games error card** — fixed opening on the error state until "Try again" (`d694fea`)
- **Cricket live coverage** — Gates 1–12b: canonical delivery model, Cricsheet ingest, Sportmonks normalizer + live feed, provider seam, three states on LiveScreen, required-total anchoring, short board scores, DNB, national-side flags, client-side date filtering

---

## Already live on the backend (not gated by this build)
Vercel deploys reach every app version instantly, including users still on v1.3/v1.4:
- Recap AP-story enrichment (real narrative, rewritten at the reader's level)
- Recap date-awareness (any game resolves via `summary?event=`)
- Game-id cast hardening
- Explanation/QA caps + entitlement enforcement (Pro gating)

---

## The port completed (build 2 — `37dccbac`)

All 25 remaining modules landed after build 22 was cut. **Coach's Corner: 7 pieces → 36.**

| Sport | Pieces |
|---|---|
| NFL | 6 — Box Count, Find the Open Man, Fourth Down Call, Give or Pull?, Man or Zone?, Read the Coverage |
| MLB | 5 — Where's the Play?, Own the Count, Steal or Stay?, Infield In or Back?, Tag and Go |
| Soccer | 6 — Onside or Off?, Read the Play, Make the Call, Press or Drop, Counter or Keep?, Switch the Play |
| Rugby | 5 — Posts/Corner/Scrum?, Numbers Out Wide, Draw and Pass, How Many In?, Where's the Line? |
| NBA | 4 — Help or Stay?, Pick Your Poison, Two-for-One, Foul Up Three? |
| Golf | 4 — Go or Lay?, Sucker Pin, The Pinch, Escape or Hero? |
| Tennis | 4 — Approach or Stay?, Serve Target, Serve +1, Pass or Lob? |
| Cricket | 4 — Review or Save?, Set the Trap, Pace the Chase, Bowl or Change? |

Two interactions were adapted for touch (both flagged by the porting agents, both the
right call): **Bowl or Change**'s hover-to-preview-a-field became an explicit eye toggle
per option (press-and-hold would collide with the committing tap), and **Where's the
Line**'s drag-anywhere-on-the-pitch became the native slider under the field, per the
port standard's gesture-disambiguation guidance.

**Held for review — the legacy soccer trio:** killer-pass, play-it-out, read-the-pass.
These predate the visual standard (no labeled actors, no living defense, stacked end
states). Porting them as-is would put modules in the app that this session's own
testing standards would fail. Decision needed: rebuild to standard, or retire.

**Stat verification queue:** every module's numbers are crowdsource-consensus values with honest rounding ("about 70%"). A verification pass against primary sources (PGA Tour ShotLink, ATP, NBA.com, ESPN cricket) is queued before these numbers are treated as citable.

**Device-verify checklist for this build** (from the port standard): each new module rotates to landscape and back; the tab bar hides in-module; no accidental exits; verdict fits without scrolling; tiers on one line; existing landscape modules (Box Count, Onside, Where's the Play, Find the Open Man) unregressed.
