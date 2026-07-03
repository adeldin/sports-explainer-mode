// Onside or Off? — scenario data (VERBATIM from the soccer-onside-or-off.html prototype).
// The module's animation + scrubber drive posAt(t, strikeT); the verdict and the offside line are
// COMPUTED, never declared. AUTHORING-CRITICAL: the offside line anchors to the SECOND-LAST
// opponent's LEADING EDGE (x + R, attacking L→R) at the PASS frame (strikeT), deepest-first sort —
// copied exactly; a wrong anchor teaches the offside rule wrong. All fan-facing strings are prose
// only — no coordinates, variable names, internal keys, or debug tokens.

export interface Pt { x: number; y: number }
export interface Mover { p0: Pt; pStrike: Pt; pEnd?: Pt }   // passer / runner / defender path
export interface Defender extends Mover { gk: boolean }
export type Call = 'onside' | 'offside';

// Player radius. Leading edge (attacking → RIGHT) = x + R. Copied verbatim.
export const R = 12;

export interface Scenario {
  name: string;      // internal label (not shown)
  tab: string;       // scenario-pill label (fan-facing, prose)
  strikeT: number;   // timeline frame 0..100 where the pass is STRUCK — the frame offside is judged on
  passer: Mover;
  runner: Mover;
  defs: Defender[];
  why: string;       // verdict explanation (fan-facing, prose only)
  iran?: boolean;    // informational marker (the keeper-off-his-line case); unused by logic
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Position of a mover at timeline t. Before the strike: p0 → pStrike over [0, strikeT]; after:
// pStrike → pEnd over [strikeT, 100]. Copied VERBATIM from the prototype's posAt.
export function posAt(pl: Mover, t: number, strikeT: number): Pt {
  if (t <= strikeT) {
    const k = strikeT <= 0 ? 1 : t / strikeT;
    return { x: lerp(pl.p0.x, pl.pStrike.x, k), y: lerp(pl.p0.y, pl.pStrike.y, k) };
  }
  const end = pl.pEnd || pl.pStrike;
  const k = (t - strikeT) / (100 - strikeT);
  return { x: lerp(pl.pStrike.x, end.x, k), y: lerp(pl.pStrike.y, end.y, k) };
}

export interface Verdict { off: boolean; lineX: number; rEdge: number }

// The verdict, frozen at the STRIKE frame: runner leading edge vs the 2nd-last opponent's leading
// edge. Offside iff the runner is CLEARLY beyond the line (level/behind = onside). VERBATIM.
export function computeVerdict(s: Scenario): Verdict {
  const rEdge = posAt(s.runner, s.strikeT, s.strikeT).x + R;
  const edges = s.defs.map(d => posAt(d, s.strikeT, s.strikeT).x + R).sort((a, b) => b - a);
  const lineX = edges[1]; // second-last opponent's leading edge (deepest-first sort)
  return { off: rEdge > lineX + 0.5, lineX, rEdge };
}

// The offside line as it should be DRAWN at any t (live while scrubbing): the 2nd-last opponent's
// leading edge + the runner's leading edge. Same math as computeVerdict but at an arbitrary t — the
// module snaps t to strikeT on reveal so the frozen frame and the drawn line agree. From drawLines.
export function offsideLineAt(s: Scenario, t: number): { lineX: number; rEdge: number } {
  const edges = s.defs.map(d => posAt(d, t, s.strikeT).x + R).sort((a, b) => b - a);
  return { lineX: edges[1], rEdge: posAt(s.runner, t, s.strikeT).x + R };
}

// Order matches the prototype: a CLEARLY onside then a CLEARLY offside variant first (the teaching
// baseline), then the fans-get-it-wrong cases — per the authoring standard's binary-judgment addendum.
export const SCENARIOS: Scenario[] = [
  {
    name: 'Clear onside', tab: 'VAR Review 1', strikeT: 40,
    passer: { p0: { x: 250, y: 250 }, pStrike: { x: 300, y: 248 }, pEnd: { x: 300, y: 248 } },
    runner: { p0: { x: 360, y: 165 }, pStrike: { x: 438, y: 165 }, pEnd: { x: 560, y: 168 } },
    defs: [
      { gk: false, p0: { x: 468, y: 150 }, pStrike: { x: 470, y: 150 }, pEnd: { x: 470, y: 150 } },
      { gk: false, p0: { x: 430, y: 280 }, pStrike: { x: 434, y: 280 }, pEnd: { x: 434, y: 280 } },
      { gk: true, p0: { x: 655, y: 210 }, pStrike: { x: 655, y: 210 }, pEnd: { x: 655, y: 210 } },
    ],
    why: "Onside. A straight run up the pitch onto the through ball — at the strike his leading edge is behind the last defender's line. He timed it a step behind. Where he ends up receiving it doesn't matter; only where he was when the ball was played.",
  },
  {
    name: 'Clear offside', tab: 'VAR Review 2', strikeT: 40,
    passer: { p0: { x: 250, y: 250 }, pStrike: { x: 300, y: 248 }, pEnd: { x: 300, y: 248 } },
    runner: { p0: { x: 445, y: 95 }, pStrike: { x: 508, y: 150 }, pEnd: { x: 585, y: 205 } },
    defs: [
      { gk: false, p0: { x: 468, y: 150 }, pStrike: { x: 470, y: 150 }, pEnd: { x: 470, y: 150 } },
      { gk: false, p0: { x: 436, y: 285 }, pStrike: { x: 440, y: 285 }, pEnd: { x: 440, y: 285 } },
      { gk: true, p0: { x: 655, y: 210 }, pStrike: { x: 655, y: 210 }, pEnd: { x: 655, y: 210 } },
    ],
    why: "Offside. A diagonal run in behind — but he's gone too early. At the moment the ball is played his leading edge is clearly beyond the last defender, ahead of the ball, in the attacking half. Flag's up.",
  },
  {
    name: 'Dead level', tab: 'VAR Review 3', strikeT: 45,
    passer: { p0: { x: 250, y: 252 }, pStrike: { x: 308, y: 250 }, pEnd: { x: 308, y: 250 } },
    runner: { p0: { x: 470, y: 120 }, pStrike: { x: 470, y: 165 }, pEnd: { x: 570, y: 165 } },
    defs: [
      { gk: false, p0: { x: 468, y: 200 }, pStrike: { x: 470, y: 200 }, pEnd: { x: 470, y: 200 } },
      { gk: false, p0: { x: 432, y: 290 }, pStrike: { x: 436, y: 290 }, pEnd: { x: 436, y: 290 } },
      { gk: true, p0: { x: 655, y: 210 }, pStrike: { x: 655, y: 210 }, pEnd: { x: 655, y: 210 } },
    ],
    why: "Onside — the one fans get wrong. The runner is dead LEVEL with the LAST defender (the deepest outfielder — same leading edge). Level is onside; he has to be CLEARLY beyond the line to be off. Even and he stays on. Note it's the last defender that matters — a shallower defender behind the play is irrelevant.",
  },
  {
    name: 'Looked offside', tab: 'VAR Review 4', strikeT: 32,
    passer: { p0: { x: 230, y: 250 }, pStrike: { x: 300, y: 248 }, pEnd: { x: 300, y: 248 } },
    runner: { p0: { x: 430, y: 120 }, pStrike: { x: 458, y: 150 }, pEnd: { x: 620, y: 225 } },
    defs: [
      { gk: false, p0: { x: 466, y: 150 }, pStrike: { x: 470, y: 150 }, pEnd: { x: 470, y: 150 } },
      { gk: false, p0: { x: 430, y: 285 }, pStrike: { x: 434, y: 285 }, pEnd: { x: 434, y: 285 } },
      { gk: true, p0: { x: 655, y: 210 }, pStrike: { x: 655, y: 210 }, pEnd: { x: 655, y: 210 } },
    ],
    why: "Onside — and THIS is the one everyone screams about. When he receives it he's miles beyond the defense. But rewind to the strike: he was behind the last defender when the ball was played, then broke on the diagonal. He timed it from onside. Legal — the shot of him receiving is a red herring. Scrub back to the ⚽ mark and see it.",
  },
  {
    name: 'Keeper off his line', tab: 'VAR Review 5', strikeT: 42, iran: true,
    passer: { p0: { x: 250, y: 250 }, pStrike: { x: 300, y: 250 }, pEnd: { x: 300, y: 250 } },
    runner: { p0: { x: 500, y: 172 }, pStrike: { x: 562, y: 172 }, pEnd: { x: 625, y: 174 } },
    defs: [
      { gk: true, p0: { x: 588, y: 210 }, pStrike: { x: 590, y: 210 }, pEnd: { x: 590, y: 210 } },  // keeper advanced (2nd-last opponent = the line)
      { gk: false, p0: { x: 662, y: 205 }, pStrike: { x: 664, y: 205 }, pEnd: { x: 664, y: 205 } }, // defender back on the goal line (LAST opponent)
      { gk: false, p0: { x: 455, y: 290 }, pStrike: { x: 458, y: 290 }, pEnd: { x: 458, y: 290 } }, // upfield defender, irrelevant
    ],
    why: "Onside — the Iran-vs case that confused everyone. The keeper rushed off his line, but a defender stayed back on the goal line. That deep defender is the LAST opponent, so the KEEPER is the second-to-last — the line sits at the keeper. The runner is behind the keeper, so he's played onside. Two opponents between you and the goal keeps you on — even when one of them is the keeper and he's in front of the other.",
  },
  {
    name: 'Looked onside but off', tab: 'VAR Review 6', strikeT: 38,
    passer: { p0: { x: 230, y: 250 }, pStrike: { x: 300, y: 248 }, pEnd: { x: 300, y: 248 } },
    runner: { p0: { x: 355, y: 95 }, pStrike: { x: 500, y: 150 }, pEnd: { x: 625, y: 220 } },
    defs: [
      { gk: false, p0: { x: 466, y: 150 }, pStrike: { x: 470, y: 150 }, pEnd: { x: 470, y: 150 } },
      { gk: false, p0: { x: 432, y: 285 }, pStrike: { x: 436, y: 285 }, pEnd: { x: 436, y: 285 } },
      { gk: true, p0: { x: 655, y: 210 }, pStrike: { x: 655, y: 210 }, pEnd: { x: 655, y: 210 } },
    ],
    why: "Offside — the mirror of the last one. Live it looks fine and his run is well-timed, but rewind to the strike: his leading edge is a clear step beyond the last defender's line when the ball is played. Not a millimetre call — he simply went a beat early. Behind or level would have been fine; beyond is off.",
  },
];
