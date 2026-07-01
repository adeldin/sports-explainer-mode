# Coach's Corner — Visual Modules Roadmap

**Status:** Banked vision doc (post-v1.3). Not yet scoped into build gates.
**Source:** Synthesis of three independent AI idea harvests (Gemini / ChatGPT / Perplexity), run one sport at a time, for baseball, soccer, and football — June 30, 2026.
**Purpose:** Move Coach's Corner beyond text flashcards toward visual-first, low-text interactive learning (SVG diagrams, tap-to-reveal, drag, sliders, Lottie). Preserve the harvest so months of thinking survive and stay actionable.

---

## The core architectural insight (the headline)

**All three sports, across all three AI models, independently converged on the same answer: build ONE reusable visual engine per sport, then every module is just authored content (data) on top.**

This is the same "extract a shared core, author content on top" thesis that drives the whole SportsWise platform plan — applied to Coach's Corner. It turns "40+ ambitious modules" into "1 engine + a content bank," which is what makes it actually shippable.

The three engines:

| Sport | Engine | What it renders |
|---|---|---|
| Baseball | **Diamond Engine** + **Strike-Zone Engine** (two) | Diamond: 9 fielders, runners, ball, base/out state, path overlays. Strike Zone: zone grid, pitch locations, overlays, count. |
| Soccer | **Pitch Engine** | SVG pitch, 22 player nodes, ball, passing lanes, run arrows, shaded zones, offside line, compactness bands, pressure rings. |
| Football | **Field Engine** | SVG field, 22 players, line of scrimmage, first-down line, hashes, route/blocking/coverage overlays, pre/post-snap toggle. |

Each engine accepts a JSON scenario payload and supports the same interaction primitives: tap-to-select, drag, scrub timeline, before/after toggle, reveal-answer. **Build the engine once; author hundreds of scenarios as data.**

---

## The shared authored-content model

Every module across every sport should be authored as structured content, NOT a hand-built screen. The common schema:

- **Scene/situation setup** — positions, ball/puck location, game state (count/down/score/time as relevant).
- **Tactical overlay layer** — lanes, zones, lines, arrows, shaded space, conflict highlights.
- **Interaction type** — tap answer, drag position, scrub timeline, toggle, choose path.
- **Reveal output** — animated result, the correct/alternate choice, one-sentence takeaway.
- **Difficulty variants** — same scene, different visible helpers and decision depth (Rookie sees obvious helpers; Expert sees disguise/leverage/tradeoffs).

**Critical advantage — the data ceiling does NOT apply here.** Unlike live explanations (gated by ESPN/feed data quality — the rugby/tennis ceiling), Coach's Corner modules are *hand-authored static scenarios*. No live feed needed. This is the same pattern as the existing `makeTheCall` scenario bank and `DidYouKnow` component. Author once, reuse forever.

**Accuracy note:** Prefer QUALITATIVE over precise quantitative claims early (a bar gets "bigger," not "0.85 → 1.2 expected runs"). If a real number is shown (run expectancy, 4th-down threshold), it must be correct — hardcode from a published reference table (facts aren't copyrightable). Lean conceptual first; the teaching lands without the exact figure.

---

## Two signature patterns that recurred in EVERY sport

These showed up independently across all three harvests and are worth treating as cross-cutting patterns, not single modules:

### 1. "One [Play/Snap/Phase], Four Levels"
The exact same frozen moment, explained at Rookie → Beginner → Intermediate → Expert. Each level reveals another overlay (who has the ball → the line/zone → the coverage/shape → the leverage/disguise). **This is not a module — it's a wrapper pattern** that could apply to most modules. It directly visualizes the app's difficulty system and its whole "expertise = noticing more at once" thesis.

### 2. "Ball View vs Coach View" toggle (soccer's framing, generalizes to all)
Flip between what a casual fan watches (just the ball) and what a coach sees (off-ball movement, space, lanes, leverage all lit up). **This is literally SportsWise's mission — "watch and ask why" — rendered as a single interaction.** Hero-piece candidate.

---

## Per-sport consensus first bundles

For each sport, the ~5 modules where all three AI models converged — the "build these first" set. These are the quick wins: mostly static SVG + tap-to-reveal + simple toggle, highest newcomer "oh, NOW I get it" payoff per unit of build effort.

### ⚾ Baseball — first bundle
Powered by the Diamond + Strike-Zone engines.

1. **Count Leverage / Count Compass** — interactive count (0-0 → 3-2); a leverage meter swings pitcher↔batter advantage; the target zone expands (0-2 chase) or shrinks (3-0). *Unanimous #1. Most baseball-essential concept, scales across all four levels.* (Strike-Zone engine)
2. **Set the Defense / Shift Happens** — drag or toggle fielders into alignments (standard, DP depth, no-doubles, pull shift); see the geometry change. (Diamond engine)
3. **Where's the Play?** — tap the base the defense should throw to on a batted ball; reveal animates the smart play. *Flagged as a potential signature format — fast, replayable.* (Diamond engine)
4. **Force Out Finder** — tap where the defense can get the out; teaches the force/tag distinction (a top newcomer confusion). (Diamond engine)
5. **Pitch Tunnel** — two pitch paths overlap early, diverge late; teaches deception. *Highest "aha," slightly more animation (medium).* (Strike-Zone engine)

Baseball's organizing families: Read the Count · Read the Diamond · Read the Defense · Read the Race · Read the Manager.

### ⚽ Soccer — first bundle
Powered by the Pitch Engine.

1. **Offside (Draw the Line / Who's Offside? / Offside Line Slider)** — freeze the pass moment, reveal the offside line anchored to the 2nd-last defender. *Unanimous top-3. The single best Coach's Corner module across ANY sport — offside is THE canonical newcomer "I don't get it" moment, and it's trivially visual.*
2. **Spot the Pass / Passing Lane Reveal** — tap teammates to reveal open/blocked/risky/progressive passing lanes. Trains the eye off the ball.
3. **Team Shape Toggle (The Accordion)** — in-possession vs out-of-possession morph; the team "breathes" wide/compact. Kills the "formations are static" misconception.
4. **Pressing Trigger** — tap the moment the press should start (bad touch, back pass, sideline trap); reveal the swarm. Teaches pressing = coordinated cues, not chasing.
5. **Overload Finder** — tap the zone with the numerical advantage (3v2, 2v1). Overloads as visual math.

Soccer's organizing families: See the Space · See the Pass · See the Shape · See the Press · See the Run · See the Set Piece.

### 🏈 Football — first bundle
Powered by the Field Engine.

1. **Read the Coverage / Coverage Shell Reveal** — tap the safeties; one-high vs two-high; middle-of-field open/closed lights up. *Unanimous top-2. Football's offside-equivalent — the one pre-snap habit that unlocks watching.*
2. **Find the Open Man / Find the Soft Spot** — tap the receiver/window that beats the shown coverage; reveal the defender conflict.
3. **Box Count / Numbers in the Box** — tap/count defenders in the box; run-or-pass math (8 in the box vs 5 blockers = throw).
4. **Down & Distance / 4th-Down Decision** — tap punt/FG/go across field position + distance; a gauge shows the tipping points. *Extremely on-brand — the most-debated live coaching call every week.*
5. **Play-Action Freeze** — toggle/step the fake; watch linebackers get sucked forward and the window open behind them.

Football's organizing families: Read the Situation · Read the Formation · Read the Coverage · Read the Route · Read the Run · Read the Pressure · Read the Game.

---

## Ambition tiers (cross-sport)

**Quick wins (next-release candidates)** — static SVG + tap-to-reveal + toggle/slider, minimal bespoke logic. The first bundles above live here. Build the engine, then these are mostly authoring.

**Medium builds** — short authored timeline animations, drag-and-drop with validation, before/after reveals with motion. (e.g. pitch sequencing, third-man runs, route-combo stress tests, blitz pickup.)

**Ambitious future vision** — multi-phase animated walkthroughs, branching scenario engines, "build the X" systems (build the press / coverage / protection / drive), timeline scrubbers with pause-and-predict. (e.g. Animated Tactics Board, Coordinator Duel, Full Drive Simulator, At-Bat Chess.) These make Coach's Corner feel premium; they're tentpoles, not starters.

---

## Recommended build sequence

1. **Pick the lead sport.** Soccer or football are strongest first candidates: soccer because offside alone is a killer module and soccer already has the most CC scaffolding; football because it's the most diagram-native (already taught on whiteboards) and the consensus was tightest.
2. **Build that sport's engine** (Pitch or Field) as a reusable SVG component with the JSON scenario schema + the five interaction primitives.
3. **Author the 5-module first bundle** as content on the engine. Ship it.
4. **Wrap with the "Four Levels" pattern** so each module scales Rookie→Expert via overlay depth.
5. **Repeat per sport.** Each new sport = one engine + a 5-module bundle. Baseball needs two engines (Diamond + Strike Zone) — slightly more upfront, but they unlock the most modules.
6. **Later:** layer in medium/ambitious modules per sport as content; consider the "Ball View vs Coach View" hero piece.

---

## Cross-references / related existing work

- `makeTheCall.ts` — the existing judgment-quiz content bank + `sportsWithContent(level)` selector. The authored-content model here is the same pattern, extended with a visual engine. (NOTE: also the source of the Rookie/Expert grey-out gap — Make-the-Call scenarios exist only at beginner/intermediate; authoring Rookie/Expert scenarios is the cleaner long-term fix vs. the grey-out stopgap.)
- `coachesCorner.ts` — the tab's data-driven sport list + `piecesForSport()`. New pieces register here.
- `DidYouKnow.tsx` — existing component + bank pattern; precedent for authored visual content.
- Formations (soccer) + Read-the-Play (soccer) — the existing CC pieces; the formation diagram is the embryo of the Pitch Engine.

---

## Honest caveats (carried from the harvest review)

- This is **all post-v1.3.** None of it ships in the current build.
- The AIs don't know the data constraints — every idea was filtered for "authored static content (buildable) vs. live-data-dependent (defer)." The first bundles are all authored-content. A few tempting ideas (real spray charts, xG, live play walkthroughs) need data/feeds that may not exist — those are v3/v4, tied to the commentary-ingestion frontier.
- "Formations" is genuinely soccer-shaped and does NOT map to baseball (use positioning/shifts instead) or cleanly to football (use fronts/coverage). Don't force one template across sports — each sport's pieces should reflect how THAT sport actually works. The shared layer is the *engine + interaction primitives*, not the concepts.
