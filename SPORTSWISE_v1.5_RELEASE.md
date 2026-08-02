# SportsWise v1.5 — release notes & build manifest

*Cut 2026-08-01. Previous binary: **v1.4.0, built 2026-07-07**. Everything below has been sitting in `main` unshipped since then, plus this session's Coach's Corner port.*

Branch: `v1.5-coaches-corner-ports` · **Shipped binary: build 33** (`0ee1d330-8952-4520-b15c-30c3f24800ab`, marketing version 1.5.0)
App Store Connect version **1.5** — `bdc407cd-b25d-4ae3-a32c-f349c44034dc`, state `PREPARE_FOR_SUBMISSION`, release `AFTER_APPROVAL`.

Store version string is **1.5**, not 1.5.0 — that matches the precedent set by 1.0–1.4, all of which
carried an `x.y` store string against an `x.y.0` binary.

---

## What's New (App Store copy — as set on the 1.5 version)

> NEW IN 1.5:
>
> Coach's Corner goes to eight sports — basketball, rugby, tennis, golf and cricket join NFL, MLB and soccer, with 32 new drills and 38 in all. Each one puts you inside a single real decision: go for it or punt, press or drop, attack the short ball or stay back, kick for the posts or go to the corner, review the umpire's call or save it. Make your call, watch it play out on the field, then get the coach's read at every level from Rookie to Expert.
>
> Pinch to zoom — every field, court, pitch and hole now zooms with two fingers, so the small details stay readable on a phone.
>
> Six new Academy games — Higher or Lower, Zone Tap, Crest Rush, Kit Clash and Read the Score, plus a full Jeopardy board, across all ten sports.
>
> Cricket, live — ball-by-ball coverage with live scores, the required run rate, national flags, and browsing by date.
>
> Fixes — live games no longer open on an error card, Higher or Lower now names the season it's asking about, and Coach's Corner stays in landscape instead of snapping back to portrait mid-drill. Plus polish and stability improvements throughout.

Counts in that copy are verified against the code, not estimated: `piecesForSport()` yields 38 sport
pieces across the 8 `CC_CANDIDATES` (NFL 6, soccer 6, MLB 5, rugby 5, NBA 4, tennis 4, golf 4,
cricket 4), of which 32 are new this release; Make the Call is level-gated and deliberately not
counted. The Academy ships 8 games — `quiz`, `term-match`, `read-the-score`, `crest-rush`,
`kit-clash`, `higher-or-lower`, `zone-tap`, `jeopardy`.

**Signal Decoder is withheld from this release** at the owner's call — the referee figure needs more
work. The component, its signal banks and its descriptor all remain in the tree and still compile;
the descriptor in `lib/academyGames.ts` is wrapped in a block comment. Deleting that wrapper is the
entire restore. This is why the copy above says *six* new Academy games and names five visual ones.

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
- ~~**Signal Decoder v2**~~ — built (`8ed7f52`, `caac9cb`, `8576237`) but **withheld from 1.5**; see above
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

---

## App Store Connect — staged, not submitted

Everything App Review checks is set. The Submit button is deliberately not pressed; that stays the
owner's action.

| Gate | State |
|---|---|
| Version | 1.5 · `PREPARE_FOR_SUBMISSION` · release AFTER_APPROVAL |
| Build | 33 attached, processing `VALID` |
| Export compliance | answered (`usesNonExemptEncryption: false`) — no Missing Compliance flag |
| What's New | set, 1098 chars |
| Description / keywords / support URL | carried over from 1.4 |
| Screenshots | 9 × `APP_IPHONE_65`, all `COMPLETE` — carried over from 1.4 |
| Review contact + demo account | carried over, untouched |
| Review notes | rewritten for 1.5 (1.4's still said "reviewing SportsWise 1.3") |
| Age rating | `TWELVE_PLUS` |
| Privacy policy | https://privacy.sportswise.app |

The review notes now tell the reviewer the drills are **landscape** and how to reach them without a
subscription — the previous notes did not, and a reviewer who never rotates the device sees none of
what this release is about.

### Two things deliberately left for a decision

**Screenshots are 1.4's.** They carried over intact, so nothing blocks submission — but they show
none of the eight-sport Coach's Corner, which is the entire headline of this release. New shots are a
marketing improvement, not a compliance fix.

**Stat verification is still queued.** Every number spoken by a coach's read is a crowdsource-consensus
value with honest rounding ("about 70%"). That was fine for TestFlight. Verification against primary
sources (PGA Tour ShotLink, ATP, NBA.com, ESPN cricket) has not been run.
