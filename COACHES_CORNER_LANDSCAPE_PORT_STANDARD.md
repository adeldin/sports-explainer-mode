# Coach's Corner — Landscape Port Standard

**Purpose:** The bar a Coach's Corner visual module must clear when it's ported from the HTML prototype into the React Native / Expo app **as a landscape field module**. This is the porting/layout companion to `COACHES_CORNER_AUTHORING_STANDARD.md` (which governs whether a scenario is *tactically sound*). This document governs whether the *ported artifact is laid out correctly and its orientation mechanism is sound*.

**Why this exists:** The first field module ported to landscape (Box Count, NFL) took **over four hours** — and almost none of that time was spent on things that were genuinely hard. It was spent re-solving the *same layout problems in sequence*, discovering iOS orientation gotchas the hard way, and changing the same three or four things multiple times because the first (and second) fix addressed the symptom instead of the cause. This document exists so the **next** port is authored *to* these rules from the first commit, and the expert review time is spent on the module's tactical content — not on giant pills, clipped buttons, and cards touching the field for the fourth time.

**How to use this:** Paste this into the build chat as an upfront constraint *before* writing any landscape layout code. Read it end to end. The "Traps" section is not optional background — each trap cost real time on the first port and will cost it again if not pre-empted.

**Read this first, mentally:** Most of the *engine-level* wins from the first port already live in shared code (`FieldEngine.tsx`, `lib/theme.tsx`, `GameHost.tsx`) and a new field module inherits them. But the *layout skeleton and the judgment* live in the module's own component file and in nobody's memory. Claude Code has **no memory of the previous port.** If you start cold, you will rediscover every problem below from scratch. Don't.

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

## The iOS orientation mechanism (Gate A) — get this right BEFORE any layout

This is the part most likely to pass in Expo Go / dev and then **fail on a TestFlight build**, so it must be proven on a real device build first.

1. **Do NOT test orientation in Expo Go.** `expo-screen-orientation` is a native module; Expo Go lacks it and manages its own orientation. You need a **dev build** (EAS `--profile development`), installed on the phone, connected via `expo start --dev-client`.
2. **The iOS gotcha:** if `app.json` sets `orientation: "portrait"`, the generated `UISupportedInterfaceOrientations` is portrait-only, and iOS can **refuse** a runtime `lockAsync(LANDSCAPE)` to an orientation the app doesn't declare. **The robust setup:** set `app.json` `orientation: "default"` (allow all), lock PORTRAIT globally at the app root (`App.tsx`, on mount), and only unlock/landscape on the field screen. This guarantees iOS honors the per-screen exception.
3. **Mechanism lives at GameHost, gated by a descriptor flag.** GameHost owns the lock/unlock (lock LANDSCAPE on focus, restore PORTRAIT on blur), gated by an optional `landscape?: boolean` on the AcademyGame descriptor. Field modules set the flag; quiz/portrait modules don't. One place, opt-in, inherited by every future field module — do NOT put orientation code in the module component.
4. **Verify on a real device build** (not Expo Go): every other screen stays portrait on rotation; the field module rotates to landscape; backing out restores portrait; switching tabs from within restores portrait.

### KNOWN-OPEN BUG (Gate A-bis) — carry this forward
There is an **intermittent bug**: while in the landscape field module, the screen sometimes spontaneously rotates back to portrait AND drops the user out to the Coach's Corner list. **It was diagnosed but not fixed** on the first port (couldn't be reproduced on demand; instrumentation was added, a clean baseline captured, but no "bad" trace caught; instrumentation later removed).

Diagnosis on record (so it isn't re-derived):
- The rotation and the drop-to-list are **one event, not two.** PORTRAIT can only come from GameHost's `useFocusEffect` cleanup; GameHost only renders while `activePiece` is set. So the portrait snap is a *consequence* of losing the piece. The real question is what unmounts GameHost / clears `activePiece` mid-session.
- **Suspect #1 (most likely):** the `useFocusEffect` cleanup is too eager — its PORTRAIT restore fires on *any* blur, and during the orientation/dimension transition react-navigation focus can transiently toggle → thrash. (Trace signature: `BLUR` with no matching `UNMOUNT`, no `activePiece = null`.)
- **Suspect #2:** the reanimated `entering={SlideInRight}` on the piece wrapper can re-fire/remount on a dimension change (a forced rotation is one) → unmount GameHost → cleanup → portrait + drop. (Trace signature: `UNMOUNT` → `MOUNT` GameHost with no `activePiece` change.)
- **Proposed fix (not yet applied):** make the lock **deliberate + idempotent** — lock LANDSCAPE on mount; restore PORTRAIT only on a *confirmed* exit (the onBack path / real unmount), and guard every `lockAsync` to no-op when the current orientation already matches, so a transient blur can't thrash. If a trace confirms Suspect #2, also stabilize the `Animated.View` (drop/guard `entering` for the landscape piece) — because the idempotent lock alone stops the rotation thrash but may NOT stop the drop-to-list if the wrapper genuinely remounts.
- **To resume:** re-add mount/focus/blur/orient/activePiece instrumentation, reproduce on a device (rotate in/out, re-enter, rotate *during* the slide-in animation — the transition window is the fragile moment), capture the trace around a drop, match it to the suspect signatures above, then apply the matching fix. Filter logs with `| grep "BC-TRACE"` (or your module's tag) — the RevenueCat SDK output will otherwise bury the trace.

---

## Reusable constants / seams (already in code — REUSE, don't rebuild)

- `FieldEngine` `fill: 'width' | 'height'` — the landscape sizing axis. Landscape passes `'height'`.
- `theme.textSecondaryOnDark` — secondary text on dark chrome. Reuse for every field module.
- The AcademyGame descriptor `landscape?: boolean` flag — set it on field modules; GameHost reads it. This is the opt-in seam.
- GameHost owns the orientation lock/unlock — do not duplicate it per module.
- Layout constants (per module, but copy the pattern & values): `LS_CUSHION = 24` (navy band, real margin), `LS_HINT_RESERVE = 34` (reserved height for the under-field hint), `controlW = clamp(bodyW × 0.42, 300, 380)` (guaranteed controls-column width so tiers fit one line), `fieldW = min(bodyH × ratio, bodyW − controlW − gap)`.

---

## Pre-flight checklist (run before rendering a landscape port)

*Layout skeleton:*
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
14. Is the Gate A-bis known-open bug noted / watched for (spontaneous rotate-back + drop-to-list)?

*Process discipline (learned the hard way):*
15. One gate per commit, explicit file paths, no batching — the first port stayed sane because layout, orientation, and instrumentation were kept in separate commits.
16. For a risky/fragile change (orientation especially): recon FIRST (report findings, no code), then build. The iOS gotcha and the shared-GameHost seam were both found in recon before any wasted build.
17. For an intermittent bug: instrument and capture a real trace BEFORE applying a fix — a fix aimed at the wrong suspect *looks* like it worked because the bug is intermittent.

If any answer is no, the port isn't ready.

---

## Process notes for the next port (why the first took 4 hours)

- **The install/dev-build setup itself ate significant time** the first time: the dev build must be installed on the phone via the EAS build's Safari install link (a one-time step, separate from `expo start`), Developer Mode enabled (Settings → Privacy & Security), and an *older* dev build deleted if iOS says "already installed." The `eas build` QR *installs the app*; the `expo start` QR *loads JS into it* — different QRs, different jobs. This is a one-time cost per device, not per port — but budget for it if the device changes.
- **The prototype is the content source of truth, not the landscape layout.** The HTML prototype is portrait-shaped (single column). It locks down what everything should *say* and that everything is *compact* — but it does NOT define the landscape field-left/controls-right structure. Author the landscape structure from THIS document; take content/copy/compactness from the prototype.
- **Most of the 4 hours was re-solving symptoms.** The cushion was fixed 3 times, the pills/field sizing wrestled through several passes, the verdict fit iterated repeatedly. Every one of those is now a rule above. If the next port hits any of them fresh, it means this document wasn't read first.
