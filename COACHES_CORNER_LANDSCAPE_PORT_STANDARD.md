# Coach's Corner — Landscape Port Standard

**Purpose:** The bar a Coach's Corner visual module must clear when it's ported from the HTML prototype into the React Native / Expo app **as a landscape field module**. This is the porting/layout companion to `COACHES_CORNER_AUTHORING_STANDARD.md` (which governs whether a scenario is *tactically sound*). This document governs whether the *ported artifact is laid out correctly and its orientation mechanism is sound*.

**Why this exists:** The first field module ported to landscape (Box Count, NFL) took **over four hours** — and almost none of that time was spent on things that were genuinely hard. It was spent re-solving the *same layout problems in sequence*, discovering iOS orientation gotchas the hard way, and changing the same three or four things multiple times because the first (and second) fix addressed the symptom instead of the cause. This document exists so the **next** port is authored *to* these rules from the first commit, and the expert review time is spent on the module's tactical content — not on giant pills, clipped buttons, and cards touching the field for the fourth time.

**How to use this:** Paste this into the build chat as an upfront constraint *before* writing any landscape layout code. Read it end to end. The "Traps" section is not optional background — each trap cost real time on the first port and will cost it again if not pre-empted.

**Status after four ports:** Box Count (NFL, static field), Onside/Off (soccer, animated scrubber), Where's the Play? (MLB baseball, tap-a-base), Find the Open Man (NFL, tap-a-receiver + functional tiers). Each was faster than the last because the traps were pre-empted and the shared `LandscapeGameShell` + `FieldEngine` absorbed the common work — time went to genuinely-new problems, not re-fighting solved ones.

**Read this first, mentally:** The layout scaffold, the field renderers, the orientation mechanism, and the contrast token now live in shared code (`FieldEngine.tsx` incl. `LandscapeGameShell`, `lib/theme.tsx`, `GameHost.tsx`) and a new module inherits them — see "LandscapeGameShell" and "Reusable constants" below. But the *content, the interaction, and the per-module judgment* live in the module and in nobody's memory. Claude Code has **no memory of the previous port.** If you start cold, you will rediscover every problem below from scratch. Don't.

---

## The one load-bearing principle

**A field module's landscape layout is not "the portrait stack, rotated." It is a different layout: field on the left sized by HEIGHT, controls/verdict on the right, with a real navy cushion between them — and the pre-call and post-call states are structurally different.**

Everything below falls out of that. The single biggest time-sink on the first port was treating landscape as a reflow of the portrait column instead of authoring it as its own layout with its own sizing axis and its own state transitions.

---

## The landscape layout skeleton (author to this shape from the start)

```
┌─────────────────────────────────────────────────────────┐
│  [pills row: Light Box | Even | ...]      [count pill]   │  ← thin fixed-height top band
├──────────────────────────────┬──────────────────────────┤
│                              │                          │
│      FIELD (sized by         │   CONTROLS / VERDICT      │
│      HEIGHT, fills the        │   (right column)         │
│      row height, dots big)   │                          │
│                              │   pre-call:  Call Run    │
│   ← navy cushion (real        │              Call Pass   │
│      transparent margin)      │              Reset       │
│                              │   post-call: verdict card│
│                              │              Reset + Next │
├──────────────────────────────┤                          │
│  👆 hint under field          │                          │
└──────────────────────────────┴──────────────────────────┘
```

Rules that define the skeleton:

1. **Top band is a fixed-height row**, holding the scenario pills (left) and the count-pill slot (right). It must be `flexShrink:0, flexGrow:0` so it holds only its natural height. See Trap #1 — this is the single most important constraint in the whole layout.
2. **The field is sized by HEIGHT in landscape, not width.** In portrait a field sizes by width (`width:100%` + aspectRatio) — that's correct there. In landscape the binding constraint is height, so the field takes the row's full height and derives its width. `FieldEngine` exposes `fill: 'width' | 'height'` for exactly this; landscape passes `fill='height'`. See Trap #2.
3. **The field-and-controls row is `flex:1`** — it takes all remaining height after the thin top band.
4. **A real navy cushion separates the field from the controls column** — a transparent margin, NOT `justifyContent:'space-between'`. See Trap #4 — this one was fixed wrong twice before the real cause was found.
5. **The pre-call hint lives UNDER the field with a 👆 (up) arrow**, pointing at the defenders above it — not in the top-right pointing down at nothing. See Trap #6.
6. **Pre-call and post-call are different layouts** (not the same layout with a card appended). On reveal, the call buttons *unmount* to free space for the verdict card. See Trap #3.

---

## LandscapeGameShell — the skeleton above is now shared code (use it)

As of port #2 (Onside/Off), the skeleton above is no longer hand-authored per module. It is a component — `LandscapeGameShell` in `FieldEngine.tsx` — extracted from Box Count + Onside/Off and now used by all field modules. **Author your landscape layout by filling its slots, not by re-building the field-left/controls-right/cushion/measurement scaffold.** Re-typing that scaffold is exactly how port #1 re-hit Traps #1, #2, #4, and #5; the shell encodes their fixes in code. (The skeleton diagram above is still the *what*; the shell is the *how*.)

### The load-bearing principle: the shell knows NO module vocabulary
It measures the body, computes the field/controls split, and renders slots. It has no concept of a verdict, scrubber, count, `judged`, `answered`, run/pass, onside/offside, or difficulty tier. **The module decides what goes in each slot and owns every state transition.** "Different content pre-call vs. post-call" is an `if` in the module that picks which nodes to hand the shell. The moment the shell learns one module's vocabulary, it stops fitting the next.

### The prop API
```ts
export function LandscapeGameShell({
  aspectRatio,            // number — the renderer's OWN viewBox ratio (FOOTBALL_FIELD_RATIO /
                          //   SOCCER_PITCH_RATIO / BASEBALL_DIAMOND_RATIO). Never hardcode.
  belowFieldReserve = 0,  // number — height reserved UNDER the field for {belowField}, ALWAYS,
                          //   so the art size never jumps. 0 if there's no under-field content.
  pills,                  // ReactNode — scenario pills, top-left.
  topRight,               // ReactNode? — optional top-bar accessory (count pill, etc.).
  field,                  // ReactNode — the field/pitch element (its default fill='width').
  belowField,             // ReactNode? — content in the reserved strip under the field.
  controls,               // ReactNode — right column; SCROLLS internally.
  controlsFooter,         // ReactNode? — optional footer PINNED below the scroll.
})
```

### What the shell owns (so you don't re-solve it) — trap-by-trap
- **Top band never grows (Trap #1)** — fixed-height row; pills ride it.
- **Field sizing (Trap #2 & #5)** — computes `controlW = clamp(bodyW × 0.42, 300, 480)` and `fieldW = min((bodyH − belowFieldReserve) × aspectRatio, bodyW − controlW − 24)` from an `onLayout` measurement. You pass `aspectRatio` + `belowFieldReserve`; you no longer set `fill='height'` by hand.
- **The navy cushion (Trap #4)** — a real transparent `marginRight: 24`, baked in.
- **The pinned-footer guarantee** — pass `controlsFooter` and the shell puts `controls` in a `flex:1` scroll and pins the footer at the bottom. Long verdict scrolls internally instead of pushing the forward action off-screen.
- **Controls-absorb-slack for near-square fields (added port #3)** — see the baseball note below; the controls column grows past its base reserve (up to ~480) to absorb horizontal slack a near-square or reserve-carrying field leaves.

### What's still YOURS
- **Pre-call/post-call split (Trap #3)** — you pass different `controls`/`controlsFooter` nodes by your own state. Reset + Next STAY on reveal; only the call/judge buttons unmount.
- **What goes in `belowField` / `topRight` (Traps #6, #7)** — hint, count pill, dropping the redundant chip.
- **`textSecondaryOnDark` (Trap #8).**

### Opt-out rule
`LandscapeGameShell` is the **default** for a field-left/controls-right module — **not a mandate.** A module with a genuinely different landscape need renders its own View tree. Don't contort a bespoke layout into the three slots; if you're fighting it, render your own. The opt-out is *why* the shell is safe to depend on.

### Seam helpers
- `NextButton` takes `variant: 'outline' | 'filled'` + `style` so a primary forward action composes into a footer row.
- Each renderer exports its aspect ratio next to it (`FOOTBALL_FIELD_RATIO`, `SOCCER_PITCH_RATIO`, `BASEBALL_DIAMOND_RATIO`) — import, never recompute.

---

## Traps — what went wrong on the first port, and the cause (READ THESE)

Each trap below was a real, time-consuming detour on the Box Count port. The "changed N times" ones are the expensive ones — they mean the first fix treated the symptom.

### Trap #1 — Pills that grow to fill vertical space (caused 4 visible bugs at once)
**Symptom:** In landscape the scenario pills rendered as **giant full-height vertical blocks** eating the top half of the screen. This *cascaded*: the giant pills starved the field (tiny, microscopic dots), which pushed the controls column into overflow (Call Pass clipped off the bottom), and shoved the hint around.
**Cause:** The pills component was a horizontal `ScrollView`. Dropped into a landscape flex-*column*, a ScrollView grows to fill available vertical space. One wrong container caused all four symptoms.
**Fix:** In landscape, pills must be a **fixed-height flex-wrap row** (`flexDirection:'row', flexWrap:'wrap'`), natural height, never growing. Keep the prototype's compact pill sizing (`padding: 7×12, borderRadius: 20`) — do NOT inflate them. Portrait keeps its ScrollView.
**Lesson for next time:** If anything in the landscape layout looks huge, look for a `ScrollView` or a `flex:1`/growing container that's stretching in the cross axis. The visual size bug is almost never a font/padding problem — it's a container-growth problem.

### Trap #2 — The field sized by width in landscape (overflow → scroll)
**Symptom (the ORIGINAL complaint that started the whole port):** landscape field was *too big and the screen scrolled* — you had to scroll down to reach the buttons.
**Cause:** The field sized by `width:100%` + aspectRatio. On a ~812pt-wide landscape screen that forces field height ≈ 812/1.79 ≈ 454pt — taller than the ~390pt landscape viewport → overflow.
**Fix:** `fill='height'` in landscape — the field takes the row height and derives width. It's small only if something *else* starved its height (see Trap #1); fix the starvation, not the field.
**Lesson:** In landscape, height is the constraint. Any field-sizing that keys off width will overflow.

### Trap #3 — Verdict card appended below buttons (clipped off-screen)
**Symptom:** After making a call, the verdict card appeared *below* the call buttons and fell off the bottom of the screen ("Rethink it" / body clipped).
**Cause:** The right column was one fixed stack (count → Run → Pass → Reset/Next → verdict). Nothing made room for the verdict.
**Fix:** Pre-call and post-call are **different layouts.** On reveal, **unmount Call Run and Call Pass** (`{!answered && runBtn}`) so the verdict takes their vacated space.
**CRITICAL sub-rule (this was explicitly almost lost):** On reveal, unmount **ONLY** the two call buttons. **Reset and Next scenario must STAY mounted and visible** — they are the user's path forward, not call actions. "Hide the buttons on reveal" is dangerously easy to over-apply to the whole column. Reset stays; Next scenario appears/stays.

### Trap #4 — The navy cushion (fixed WRONG twice before the real cause) ⚠️
**Symptom:** The verdict card's lighter-blue panel touched the green field directly — no navy strip between them. The card should float on navy with a visible band.
**Attempt 1 (wrong):** reserved space via `justifyContent:'space-between'`. Result: distributed slack between two edge-pinned columns, but the card's *background* still filled its column to the edge → still touching. No visible navy.
**Attempt 2 (wrong):** bumped a `gap`/reserved-width value. Result: still absorbed by the panel background — reserving width doesn't help if the panel fills that width.
**Attempt 3 (CORRECT):** a **real transparent `marginRight` on the field's left column** (`LS_CUSHION = 24`), with `lsBody` set to `flex-start` (not `space-between`). The margin is genuinely empty, so the navy root background shows through as a definite band.
**Lesson — the general principle this taught:** "Reserve space" and "show a background-colored gap" are different problems. If you want a **color** to show between two elements, the gap must be a transparent margin *outside* both elements' backgrounds — not slack that a panel's background then fills. `space-between` gives slack; it does not give a visible band. Reach for a real margin on a transparent container.

### Trap #5 — Difficulty tiers wrapping to two lines
**Symptom:** Rookie / Beginner / Intermediate / Expert wrapped — "Expert" dropped to a second row.
**Cause:** The controls column was too narrow because the height-driven field took a variable, unbounded share of the width.
**Fix (widen, don't shrink):** Reserve the controls column a guaranteed width — `controlW = clamp(bodyW × 0.42, 300, 380)` measured via `onLayout` — then size the field to fill the rest (`fieldW = min(bodyH × ratio, bodyW − controlW − gap)`). At `controlW ≥ 300` the compact tiers (~247pt) clear one line **without** shrinking the font further.
**Lesson:** When content doesn't fit horizontally and there's unused screen width, the fix is to *give it the width*, not to shrink the font. Shrinking is the last resort, not the first. (The one-line headline DOES use `adjustsFontSizeToFit` min 0.7 — that's fine for a single title, but don't solve whole-row layout with font-shrink.)

### Trap #6 — Hint pointing at nothing
**Symptom:** The "Optional: tap defenders" hint sat top-right with a 👇 arrow, but it pointed down at the *scenario pills* while the defenders it refers to are in the field to its left.
**Fix:** Move the pre-tap hint **under the field** and flip 👇 → 👆 so it points up at the defenders. Keep the count-pill readout in the top-right slot (they do different jobs: the hint is an instruction that belongs near the defenders; the count is a readout that belongs with the scenario context). On first tap, the under-field hint disappears and the count pill appears top-right.
**Layout note:** reserve a fixed slice of body height for the under-field hint (`LS_HINT_RESERVE = 34`) *always* — so the field size stays stable whether or not the hint is showing (no reflow jump when it vanishes).
**Lesson:** an arrow that points at the thing it describes. Obvious in hindsight; missed because the hint was placed by available-slot convenience, not by what it points at.

### Trap #7 — Redundant verdict text
**Symptom:** the verdict showed a chip "6 in box · 6 blockers" AND a headline "6 in the box, 6 blockers → run it" — saying the same thing twice.
**Fix:** In landscape, drop the chip (the count already lives in the top pill; the headline carries it). Keep the one-line headline. Portrait keeps its chip.

### Trap #8 — Font too dark on dark chrome (the contrast token)
**Symptom:** secondary text (verdict body, count pill, mode tag) was too dark to read on the navy surfaces.
**Cause:** all of it used `theme.textSecondary` (`#6b7690`) — a value designed for *light* cards, too dark on navy.
**Fix:** a **dedicated token** `textSecondaryOnDark` (dark `#aab4cb`, clears AA; light `#5b6573`, unchanged). Apply it to field-module secondary text. Do NOT bump `theme.textSecondary` app-wide (ripples everywhere). The doubly-dark mode chip got its own treatment (light chip bg + dark text).
**Lesson:** one dedicated token is one lever every field module reuses. Editing individual usages scatters the fix and the next module reintroduces the problem. Same principle as the `landscape?` descriptor flag: solve it once, in the right place.

---

## Interactive / animated modules (port #2, Onside/Off)

If a module has motion or a draggable control, these apply (the Box Count traps don't cover them):

- **The `t`-loop:** a single `t` (0–100) drives every element's position via `posAt(t,…)`, advanced by one `requestAnimationFrame` loop with a single `rafRef`. Per-module, not shared. `stopLoop` cancels it on freeze, on choose, and on unmount. Do NOT spin up a second animation owner.
- **Transient states strobe (the "ball played" flash).** A thin discrete state (`atStrike = ±1.2 t-units ≈ 3 frames`) will flash on/off every playback and `React.memo` CANNOT save you (it's a real state transition, not a redundant repaint). Fix: gate the thin state on `!playing` — `phase = (!playing && atStrike) ? 'strike' : (t < strikeT ? 'before' : 'after')` — so it only shows when parked, not mid-motion.
- **Reveal/scrub coherence:** the snap-to-decisive-frame on reveal drives the SAME `t` the scrubber binds and the drawn lines use, so frozen frame + control + lines stay coherent.
- **Interactive controls (scrubbers/sliders):** wide controls go UNDER the field (reserve height via `belowFieldReserve`, e.g. `LS_SCRUB_RESERVE ≈ 56–64`), NOT in the narrow right column. Use a NATIVE control (`@react-native-community/slider`) that self-captures its gesture — sidesteps pan-vs-tap disambiguation. Native deps need a fresh EAS dev build.

## Near-square fields & on-field tap interactions (port #3, Where's the Play?)

Baseball (a near-square diamond, tap-a-base) surfaced two things the wide-field ports couldn't:

- **Near-square fields go height-bound → dead right gutter → controls-absorb-slack.** The shell's `fieldW = min(height-fill, width-leftover)`: WIDE fields (football 1.79) are width-bound (slack lands as invisible empty height under the field). A NEAR-SQUARE field (baseball 1.21) — OR any field carrying a `belowFieldReserve` (soccer's scrubber pushes it height-bound too) — flips to height-bound on wide/large phones, leaving a ~90px dead navy gutter off the right edge with the controls floating mid-screen. **Fix (shipped, in the shell):** let the controls column grow past its 300–380 reserve up to ~480 to absorb the slack; field stays hard-left, cushion stays 24. It's a **no-op for width-bound football** (slack ~0) and a **benign improvement for soccer** (reclaims a pre-existing gutter into usable controls width — pitch untouched). It's device-dependent (only bites on wider screens), so verify on the review device. Do NOT special-case per sport — the rule "absorb slack when height-bound" is correct universally; special-casing would be shell-vocabulary creep.
- **On-field tap targets need an on-field coherence anchor.** When the answer lives ON the field (tap a base / receiver / target), "tap-left → verdict-right" feels DISCONNECTED without on-field feedback. Required, not polish: the action animates to the tapped target, a colored result fires there (teal/amber/red by grade), a **persistent highlight stays on the chosen target through the verdict**, and the **verdict headline names the target** ("Throw to second"). This is the tap-a-target analogue of Onside's frozen-strike-frame — the left side acknowledges *where* you tapped, the right side explains *why*.
- **Hit targets on a scaled field:** the two-circle pattern (transparent hit disc + visible ring). At a height-bound scale the SVG shrinks ~0.5×, so a viewBox `r=24` becomes ~24px on-screen — under the 44px touch minimum. **Bump the hit radius (e.g. `r=40` in viewBox).** SMIL `<animate>` pulses don't port to react-native-svg — static ring, or Reanimated.
- **Resolve-phase motion stays on the single rafRef:** if actors keep moving during a throw/resolve (e.g. a forced runner bearing down so the force reads as a *race*), thread them into the SAME resolve loop — don't add a second rAF. The continued motion is often the teaching beat (you see the ball beat the runner to the bag), so freezing everything can cost the lesson — a "does it teach" call to make on-device.

## Functional difficulty tiers in landscape (port #4, Find the Open Man)

Box Count had display-only tiers; Onside and baseball had none. Find the Open Man is the first landscape port where the tier selector is **functional** — it changes what's revealed (Rookie = labels + bare read; Intermediate = +leverage arrow; Expert = +leverage note). Consequences: the tier row is real UI that needs a home (top band or its own row), and Trap #5 (tiers on one line via reserved `controlW`) fires again for the first time since Box Count. The reveal content is module state the shell knows nothing about — the module swaps what it draws by tier; the shell just renders the nodes.

---

## The iOS orientation mechanism (Gate A) — get this right BEFORE any layout

This is the part most likely to pass in Expo Go / dev and then **fail on a TestFlight build**, so it must be proven on a real device build first.

1. **Do NOT test orientation in Expo Go.** `expo-screen-orientation` is a native module; Expo Go lacks it and manages its own orientation. You need a **dev build** (EAS `--profile development`), installed on the phone, connected via `expo start --dev-client`.
2. **The iOS gotcha:** if `app.json` sets `orientation: "portrait"`, the generated `UISupportedInterfaceOrientations` is portrait-only, and iOS can **refuse** a runtime `lockAsync(LANDSCAPE)` to an orientation the app doesn't declare. **The robust setup:** set `app.json` `orientation: "default"` (allow all), lock PORTRAIT globally at the app root (`App.tsx`, on mount), and only unlock/landscape on the field screen. This guarantees iOS honors the per-screen exception.
3. **Mechanism lives at GameHost, gated by a descriptor flag.** GameHost owns the lock/unlock (lock LANDSCAPE on focus, restore PORTRAIT on blur), gated by an optional `landscape?: boolean` on the AcademyGame descriptor. Field modules set the flag; quiz/portrait modules don't. One place, opt-in, inherited by every future field module — do NOT put orientation code in the module component.
4. **Verify on a real device build** (not Expo Go): every other screen stays portrait on rotation; the field module rotates to landscape; backing out restores portrait; switching tabs from within restores portrait.

### Gate A-bis "intermittent rotate-back" — RESOLVED (was a red herring)
Port #1 flagged an apparently-intermittent bug: while in a landscape module, the screen sometimes spontaneously rotated back to portrait AND dropped the user to the Coach's Corner list. A whole focus-race investigation was mounted (instrumentation, idempotent-lock plan, two suspects) and it could never be reproduced on demand.

**Port #2 found the actual cause, and it was not a race.** The trigger was the **OS bottom tab bar**, painted `theme.surface`/navy so it *camouflages against the dark field*. Its active Coach's Corner tab sits bottom-left; tapping it fires the existing tap-active-tab→root listener → pops you out of the piece → GameHost unmounts → PORTRAIT restore fires → you rotate out. It felt "intermittent" only because the user was tapping an invisible target without realizing it. No focus race; instrumentation never caught a false blur because there wasn't one — it was a real back-navigation from a real (invisible) tap.

**Fix (shipped):** hide the tab bar (`tabBarStyle:{display:'none'}`) whenever a `landscape:true` piece is open; restore on close. **Now lives in GameHost** (folded into the same `useFocusEffect` as the orientation lock, keyed on `game.landscape`) so every landscape piece on any host tab inherits both the orientation lock and the phantom-tab protection from one place. Confirmed on-device across ports #2 and #3: normal play never rotates out on its own. The focus-race suspects are retired, not worked around.

**Lesson:** if a landscape module "spontaneously" exits, suspect an **invisible/camouflaged touch target** (a navy control on a dark field) BEFORE a focus/orientation race. Cheap to check, and it was the answer. Hide the tab bar in landscape pieces as standard practice (immersive + prevents accidental exit).
---

## Reusable constants / seams (already in code — REUSE, don't rebuild)

- **`LandscapeGameShell`** (FieldEngine) — the layout frame. Fill its slots; it owns the measurement, `controlW`/`fieldW` math, the cushion, the pinned footer, and controls-absorb-slack. You pass `aspectRatio` + `belowFieldReserve`; you do NOT hand-set `fill='height'` or the sizing constants anymore.
- **Renderers, one per sport** — `FootballField` (680×380, 1.79), `SoccerPitch` (680×420, 1.62), `BaseballDiamond` (680×560, 1.21) — each on `FieldCanvas`, each exports its ratio (`FOOTBALL_FIELD_RATIO` etc.). A new sport adds its own renderer + ratio; reuse an existing one if the sport already has it.
- `theme.textSecondaryOnDark` — secondary text on dark chrome. Reuse for every module.
- The AcademyGame descriptor `landscape?: boolean` flag — set it on field modules; GameHost reads it AND hides the tab bar off it. Opt-in seam.
- GameHost owns the orientation lock/unlock **and** the landscape tab-bar-hide — do not duplicate either per module.
- `NextButton` — `variant: 'outline' | 'filled'` + `style`, composes into a footer row.
- `@react-native-community/slider` — native scrubber (port #2). Native dep → new EAS dev build.
- Per-module reserve values you pass to the shell: `LS_HINT_RESERVE = 34` (under-field hint), `LS_SCRUB_RESERVE ≈ 56–64` (under-field scrubber), or `0` if there's no under-field content. The shell owns `LS_CUSHION = 24` and the `controlW`/`fieldW` math internally.
- **Per-module code NOT extracted** (copy as reference, mind the gotchas): the `t`-loop harness (single rafRef, cleanup, pace normalization), the parked-phase label pattern, the native-scrubber config, the on-field tap-target + burst + highlight coherence pattern.

---

## Pre-flight checklist (run before rendering a landscape port)

*Layout skeleton — if using `LandscapeGameShell` (the default), items 1–3 & 6 are handled BY THE SHELL; confirm you're using it and passing `aspectRatio` + `belowFieldReserve`. If you opted out (bespoke layout), hand-check them:*
1. Are the pills a fixed-height flex-wrap row (`flexShrink:0`), NOT a ScrollView or a growing container? (Trap #1)
2. Is the field sized by HEIGHT (`fill='height'`) in landscape? (Trap #2)
3. Is there a REAL transparent-margin navy cushion (not `space-between`) between field and controls? (Trap #4)
4. Do pre-call and post-call render as different layouts — call buttons UNMOUNT on reveal, Reset + Next STAY? (Trap #3)
5. Does the full verdict card fit on screen with no scroll after a call?
6. Do the difficulty tiers fit on ONE line via reserved controls-column width (widened, not font-shrunk)? (Trap #5)
7. Is the pre-tap hint UNDER the field with a 👆 arrow, swapping to the count pill top-right on first tap? (Trap #6)
8. Is the redundant verdict chip dropped in landscape (headline kept)? (Trap #7)
9. Is secondary text using `textSecondaryOnDark`, not `theme.textSecondary`? (Trap #8)
10. Did the field NOT visibly shrink after reserving hint height? (dots must stay big — the original point of landscape)

*Orientation mechanism:*
11. Is `app.json` `orientation: "default"` with portrait locked at app root, landscape unlocked only on the field screen? (iOS gotcha)
12. Does the orientation lock live at GameHost gated by the `landscape?` descriptor flag — NOT in the module component?
13. Verified on a REAL device build (not Expo Go): only the field module rotates; everything else stays portrait; back-out restores portrait?
14. Is the tab bar hidden while the landscape piece is open (via GameHost)? (prevents the camouflaged-tab accidental exit — the RESOLVED Gate A-bis cause)

*Process discipline (learned the hard way):*
15. One gate per commit, explicit file paths, no batching — the first port stayed sane because layout, orientation, and instrumentation were kept in separate commits.
16. For a risky/fragile change (orientation especially): recon FIRST (report findings, no code), then build. The iOS gotcha and the shared-GameHost seam were both found in recon before any wasted build.
17. For an intermittent bug: instrument and capture a real trace BEFORE applying a fix — a fix aimed at the wrong suspect *looks* like it worked because the bug is intermittent.

*Interactive / animated (if the module has motion or a draggable/tappable target):*
18. `t`-loop on a single `rafRef`, cancelled on freeze/choose/unmount? Thin transient states gated on `!playing` (not just memoized)?
19. On-field tap targets: two-circle hit pattern, hit radius bumped for the scaled field (~44px on-screen)? On-field coherence anchor present (animate-to-target + colored result + persistent highlight + verdict names the target)?
20. Near-square or reserve-carrying field: does controls-absorb-slack leave NO dead right gutter (verify on a wide device)? Existing wide modules still pixel-identical?
21. Functional difficulty tiers (if any): tier row has a home, fits one line (Trap #5), and the reveal-by-tier logic lives in the module (shell renders the nodes)?

If any answer is no, the port isn't ready.

---

## Process notes for the next port (why the first took 4 hours)

- **The install/dev-build setup itself ate significant time** the first time: the dev build must be installed on the phone via the EAS build's Safari install link (a one-time step, separate from `expo start`), Developer Mode enabled (Settings → Privacy & Security), and an *older* dev build deleted if iOS says "already installed." The `eas build` QR *installs the app*; the `expo start` QR *loads JS into it* — different QRs, different jobs. This is a one-time cost per device, not per port — but budget for it if the device changes.
- **The prototype is the content source of truth, not the landscape layout.** The HTML prototype is portrait-shaped (single column). It locks down what everything should *say* and that everything is *compact* — but it does NOT define the landscape field-left/controls-right structure. Author the landscape structure from THIS document; take content/copy/compactness from the prototype.
- **Most of the 4 hours was re-solving symptoms.** The cushion was fixed 3 times, the pills/field sizing wrestled through several passes, the verdict fit iterated repeatedly. Every one of those is now a rule above. If the next port hits any of them fresh, it means this document wasn't read first.

---

## Code-side port sequence (paste-ready; ordered so tsc stays green at each step)

```
1. Data lib — lib/<module>.ts: pure data + math, zero RN imports. tsc-clean alone.
   Verdict/tactical logic copied VERBATIM from the prototype; prove it (truth table).
2. Field renderer — reuse an existing renderer if the sport exists; else add
   <X>Field/<X>Pitch/<X>Diamond onto FieldCanvas in FieldEngine AND export its ratio.
3. Native deps (if any) — `expo install <dep>`. Native? → a NEW EAS dev build is REQUIRED
   before device testing. JS-only? → hot reload suffices.
   Known native deps already in the build: @react-native-community/slider,
   expo-screen-orientation, react-native-gesture-handler, react-native-reanimated,
   react-native-svg, expo-haptics.
4. Module component — components/academy/<X>Game.tsx: portrait + landscape via
   LandscapeGameShell (aspectRatio + belowFieldReserve). Copy the t-loop harness if animated.
5. Register — lib/coachesCorner.ts (CCPieceId + piecesForSport push) and
   screens/CoachesCornerScreen.tsx (PIECE_GAME landscape:true + PIECE_META).
6. Dev build IF step 3 added native code.
7. Gates: `npx tsc --noEmit` → EXIT 0 (the ONLY automated gate — no tests);
   device-verify LANDSCAPE (orientation lock, no accidental exit, forward-path reachable,
   the new interaction's coherence, animation perf, near-square sizing if applicable);
   device-verify PORTRAIT unchanged; regression-check the OTHER landscape modules
   (shared shell/FieldEngine changes affect all of them).
```

**Git discipline:** one gate per commit, explicit file paths, no batching. Watch the working directory — `git add` paths are relative to where you are (prefix with `sports-explainer-mobile-v2/` from the repo root; drop it from inside the subdir). A shared-shell/FieldEngine change is its own gate and must re-verify every existing landscape module before commit.
