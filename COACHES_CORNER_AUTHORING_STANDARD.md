# Coach's Corner — Visual Scenario Authoring Standard

**Purpose:** The bar a visual Coach's Corner scenario must clear *before* it's worth Anthony's review. Applies across all sports and all interaction types (binary judgment, tap-the-read, multi-step). Paste this into the build chat as an upfront constraint so scenarios are authored *to* this standard, not corrected against it after rendering.

**Updated 2026-09-03 for the emulator era:** Claude now drives the iOS Simulator and the Android emulator on the Mac mini directly (render, tap, swipe, screenshot — see the `ios-simulator-driving` memory and `~/.local/bin/simclick`/`simdrag`). Anthony is no longer the render-verification loop. The old workflow — Anthony playing every build on his phone and ferrying screenshots back — is retired; his role is now exactly two gates, defined in "Verification workflow" below.

**Why this exists:** Real review sessions kept surfacing the same underlying flaw four different ways — a wide pass that looked open, a correct answer with no defender contesting it, two options stacked so the answer was obvious. All one root cause: *the wrong answers weren't tempting, so there was no read to teach.* These rules make that flaw impossible to author in the first place, so expert review is spent on genuine tactical judgment, not coordinate nudges.

---

## The one load-bearing rule

**Every wrong option must be punished by a specific, named defender or line — declared before the scenario is placed.**

If a wrong option looks open, the scenario is broken. Full stop. A wrong answer that a reasonable viewer would pick and be right to pick is not an instructive wrong answer — it's an authoring error.

Before any scenario is rendered, the build chat must write, as plain text, the punishment for each wrong option:

> - Option RB (wrong): their right winger at ~(210,110) shades the lane; the up-the-line ball gets jumped.
> - Option long ball (wrong): concedes possession, no teammate contesting the second ball.
> - Option #6 (correct): receives on the half-turn, first presser already beaten.

Anthony validates *that text* in seconds with his eye. Only after the tactical claim holds does the scenario get drawn. **Text claim first, render second.** This is the single biggest saver of expert review time.

---

## Supporting rules (all fall out of the same principle)

1. **The correct answer must be contested, not the only open lane.** The right pass/read should feel like threading it — a defender recovering onto it, a window closing — not a gimme that's correct because everything else is walled off. If the correct option is the only open one, there's no read; it's a spot-the-open-guy exercise, which is the opposite of the teaching thesis.

2. **No two options stacked on the same line or depth.** When two options sit at the same vertical/horizontal line, the geometry telegraphs the answer before the viewer reads anything ("the nearer one's the pass, the other's a decoy"). Every option sits at a distinct depth *and* angle so each is a genuine consideration.

3. **Qualitative before quantitative.** Teach the concept without a number wherever possible (a window is "tight," a bar gets "bigger"). If a real figure appears (offside by a step, run expectancy, 4th-down threshold), it must be correct — hardcode from a published reference; facts aren't copyrightable. Lean conceptual first; the lesson lands without the exact figure.

4. **The teaching point must survive the reveal in one sentence.** If you can't state what the viewer learns in a single plain-language sentence a newcomer understands, the scenario is teaching mechanics, not a read. Cut it or simplify it.

5. **Wrong-answer copy explains the *leverage*, not just the outcome.** "Covered" is not teaching. "The defender was inside-and-deep — the ball outside him was the open one" is. Every verdict names *why* the read was right or wrong in terms of leverage/space/timing.

---

## Interaction-type addenda

**Binary judgment (e.g. Onside or Off?):**
- The line is drawn to the **second-to-last defender at the moment of the pass** — freeze on the pass, not the run. This is the entire scenario; get it wrong and the module teaches the rule wrong.
- Show the line on reveal, both when right and wrong.
- Author both a clearly-onside and a clearly-offside variant before any marginal one — marginal calls are for later difficulty tiers, not the teaching baseline.

**Tap-the-read (e.g. Find the Open Man / Killer Pass):**
- Exactly one correct option per scenario.
- The load-bearing rule bites hardest here — every non-correct receiver needs a visible reason it's covered.
- On a wrong pick, flash the correct window so the viewer sees what they missed.

**Multi-step (e.g. Build-Up: Play It Out):**
- One intended spine (one best option per step); wrong options resolve *immediately* with a consequence and let the user retry the step. No branching trees.
- **Every step is a full scenario and must independently pass all rules above** — a multi-step module is only as good as its weakest step. (In practice, fixing step 3 and leaving steps 1–2 with soft wrong-answers is the trap.)
- Auto-advance on a correct pick after a brief verdict beat; stop and hold on a wrong pick so the consequence registers.
- Before building: validate that the *newcomer* understands what the sequence is *for*, not just which pass is right. Multi-step tactical modules assume the viewer already values the "why" — confirm that assumption holds for the target level, or gate the module above Rookie.

---

## Difficulty scaling (the "Four Levels" wrapper)

Same frozen scene, more revealed per level — expertise = noticing more at once:
- **Rookie:** labels on, the bare read ("in time / wrong side"), obvious helpers visible.
- **Beginner:** the read plus the basic reason.
- **Intermediate:** add the leverage arrow / contested-window framing.
- **Expert:** append the leverage note (rub, bail, inside-leverage, disguise) and remove helpers.

A scenario should be authored so the *same* placement scales across levels by changing what's visible/annotated — not by re-authoring positions.

---

## Output & engine hygiene (the second category — non-tactical failures)

Everything above is about whether a scenario is *tactically sound* — the judgment only Anthony can give. This section is different: it's about whether the *artifact itself* is clean and whether its *behavior* is correct. These failures aren't soccer/football knowledge; they're authoring discipline, and they should never reach review. Real sessions burned multiple correction rounds on exactly these — a debug number leaking into fan-facing text, a runner starting too close to teach the moment, and a runway change silently breaking animation speed. Each is preventable with a stated rule.

**The principle:** Anthony's eye is for tactical judgment. Any round spent catching a leaked coordinate, an illegible motion, or a cascade bug is a round stolen from the thing only he can do. Author to this bar so review stays tactical.

1. **Fan-facing text is prose only — no internals ever surface.** The user reads plain soccer/football, never coordinates ("≈512"), variable names, internal keys, geometry values, or debug references. If a number reasons about the geometry, it lives in code and comments, *never* in the `why`/verdict/label strings the user sees. Before render, scan every user-facing string for digits-as-coordinates and internal tokens; strip them.

2. **Motion must have enough runway to be legible.** Any scenario with movement (a run, a pass, a developing play) must give the moving element enough distance/time for the teaching beat to *read*. A runner who starts already next to the line can't show "he timed it and went a beat early" — the lesson has no room to breathe. If the teaching moment is a *timing* or *developing* read, the setup must visibly build to it, not start at the payoff.

3. **State the animation invariant once, so distance changes can't regress speed.** The classic cascade: giving an element more runway silently makes it move *faster*, because playback advances by timeline-units at a fixed rate regardless of path length — longer path in the same time = higher on-screen speed. Prevent it by fixing the invariant up front: **all moving elements travel at a constant on-screen pace (px/sec) regardless of path length; playback duration scales to distance, not the reverse.** With that stated, a runway change can't cause a speed bug, because the invariant holds automatically. (Durations then legitimately vary — a longer run *should* take longer to watch — but the visual speed stays constant.)

4. **When a change alters one property, check the properties it cascades into.** The runway→speed bug is the template: fixing property A (distance) broke property B (speed) because B depended on A through a shared mechanism (the timeline rate). Before declaring an edit done, name what else the changed value feeds into and verify those didn't move. Distance feeds speed; position feeds spotlight/arrow anchors; adding an option feeds the stacked-line check; changing a label feeds the localization/leak scan. Edits are rarely as local as they look.

5. **Consistency across a set is itself a rule.** In a multi-scenario module (six VAR clips, five modules), the scenarios must feel like siblings — same visual pace, same interaction grammar, same framing, same text voice. One scenario that moves faster, uses a different tap behavior, or shows numbers when the others don't reads as *broken*, not varied. Author each new scenario against the set, not in isolation, and re-check the whole set's consistency after adding one.

---

## UX / interaction hygiene (learned the hard way)

- **Whole tap target clickable** — a stroked ring with no fill passes clicks through its center. Fill the tap target (invisible is fine) so the whole disc taps.
- **Primary action above the fold** — cap visual height so "Kick off" / the prompt sits on-screen without scrolling.
- **Motion that teaches** — the ball arriving *as the window closes* is the payoff; the animation should show the *consequence*, not just decorate.

---

## The pre-flight checklist (run before every scenario is rendered)

*Tactical soundness:*
1. Have I named, in text, the specific defender/line that punishes each wrong option?
2. Is the correct option contested (threading it), not the only open lane?
3. Are all options at distinct depths *and* angles (nothing stacked)?
4. Does the teaching point state in one newcomer-legible sentence?
5. Does each wrong-answer verdict explain leverage, not just outcome?
6. (Multi-step) Does *every* step independently pass 1–5?
7. (Offside) Is the line anchored to the 2nd-last defender at the moment of the pass?
8. Any hardcoded number checked against a published reference?

*Output & engine hygiene:*
9. Is every fan-facing string prose only — no coordinates, variable names, or internal tokens?
10. Does any moving element have enough runway/time for its teaching beat to read?
11. Does the animation hold the constant-pace invariant (so this scenario moves at the same visual speed as the rest of the set)?
12. For every value I changed, have I checked what else it feeds into (distance→speed, position→anchors, new option→stacking, label→leaks)?
13. Does this scenario feel like a sibling of the others in the set (pace, grammar, framing, voice)?

If any answer is no, the scenario isn't ready for review yet.

---

## Verification workflow (emulator era)

**Division of labor.** Claude verifies everything a machine can see or tap; Anthony judges only what requires his eye. Every screenshot Anthony used to take, Claude now takes; every tap Anthony used to test, Claude now performs via automation on both platforms.

**Anthony's two gates — the only times a scenario reaches him:**

1. **Text-claim gate (before anything is rendered).** The punisher declarations for every wrong option, as plain text. He validates the tactical claims in seconds. Unchanged from before — this remains the single biggest saver of his time.
   **Sport-expertise variant:** when the sport is one Anthony doesn't know (rugby, cricket), he can only approve the *shape*, not the tactical truth. For those sports the pre-build tactical check is: (a) ground every option and punisher in the cited World Rugby/ICC laws, (b) run the candidate slate through a multi-AI adversarial critique (see the 2026-09-03 rugby round: 3 models, 3 of 6 candidates killed, 2 law errors caught). The authoritative human check then happens POST-build by a domain expert — for rugby, Anthony's Chicago Hounds contact reviews the built scenarios before they ship.
2. **Final look pass (once, at the end).** One curated screenshot set per scenario — the frozen scene, the reveal states, and any level where the visuals differ — captured by Claude from a real device target, presented together. He approves feel and tactical truth. No iterative rounds: if Claude isn't confident a set passes, it isn't ready to show him.

**Claude's self-verification before that final pass (all mandatory):**

- **Render on BOTH platforms** — iOS Simulator and Android emulator (Expo Go is free; no build credits needed for authoring). The two must look like the same app: safe-area imports from `react-native-safe-area-context` only, no module-scope `Dimensions.get` (use `useWindowDimensions`), per the android-cross-platform-rules memory.
- **Tap every option by automation, on both platforms** — verify each tap target actually fires (whole-disc clickable), the verdict renders, retry/advance behaves per the interaction-type addendum. Seeing a button is not verification; tapping it is.
- **Landscape games get the release-build tap test on Android** — the orientation-lock race (GameHost `scheduleLock`) is masked by dev builds and only shows in release-style builds, ~2-in-3. Any new landscape module must be tap-tested in a release build, multiple trials, before shipping. Never judge this by a frame dump or a single trial.
- **Run the full pre-flight checklist against Claude's own screenshots** — stacked-option geometry (rule 3), text leaks (rule 9), runway legibility (rule 10), and set-consistency (rule 13) are all visible in captures; check them there, not in the code's intentions.
- **Animation checks by capture sequence** — screenshot before/during/after the motion beat to confirm the constant-pace invariant and that the consequence (not just decoration) is visible.

**Ship rule:** both stores together, always (ship-ios-and-android-together). New modules batch into the next dual-platform release; authoring and emulator verification are free and can happen anytime, but EAS builds wait for credit availability unless Anthony explicitly approves a paid build.
