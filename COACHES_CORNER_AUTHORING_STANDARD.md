# Coach's Corner — Visual Scenario Authoring Standard

**Purpose:** The bar a visual Coach's Corner scenario must clear *before* it's worth Anthony's review. Applies across all sports and all interaction types (binary judgment, tap-the-read, multi-step). Paste this into the build chat as an upfront constraint so scenarios are authored *to* this standard, not corrected against it after rendering.

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

## UX / interaction hygiene (learned the hard way)

- **Whole tap target clickable** — a stroked ring with no fill passes clicks through its center. Fill the tap target (invisible is fine) so the whole disc taps.
- **Primary action above the fold** — cap visual height so "Kick off" / the prompt sits on-screen without scrolling.
- **Motion that teaches** — the ball arriving *as the window closes* is the payoff; the animation should show the *consequence*, not just decorate.

---

## The pre-flight checklist (run before every scenario is rendered)

1. Have I named, in text, the specific defender/line that punishes each wrong option?
2. Is the correct option contested (threading it), not the only open lane?
3. Are all options at distinct depths *and* angles (nothing stacked)?
4. Does the teaching point state in one newcomer-legible sentence?
5. Does each wrong-answer verdict explain leverage, not just outcome?
6. (Multi-step) Does *every* step independently pass 1–5?
7. (Offside) Is the line anchored to the 2nd-last defender at the moment of the pass?
8. Any hardcoded number checked against a published reference?

If any answer is no, the scenario isn't ready for review yet.
