// Box Count — module data/constants (layered ON TOP of the topic-agnostic FieldEngine).
// These coordinates are LOAD-BEARING and were verified programmatically against every scenario.
// COPIED VERBATIM from the box-count.html spike — do NOT adjust by eye, round, or "clean up".
// Box membership is COMPUTED from these constants via inBox(), never hand-declared — that is the
// whole correctness guarantee (a scenario's boxCount is checked against inBox, not trusted).

import type { Level } from './api';

export interface Pt { x: number; y: number }

// THE BOX — fixed constants. A defender is "in the box" IFF inside this rect:
// line of scrimmage (x=235) back to just past the linebacker row (x=360), tackle-to-tackle (y 120–250).
export const BOX = { xMin: 235, xMax: 360, yTop: 120, yBot: 250 } as const;

export const inBox = (p: Pt): boolean =>
  p.x >= BOX.xMin && p.x <= BOX.xMax && p.y >= BOX.yTop && p.y <= BOX.yBot;

// Shared 11-personnel offense (5 OL, QB, RB, attached TE, 3 WR) — SAME across all four scenarios.
// The attached TE is the 6th run blocker, which is why BLOCKERS = 6. Coordinates verbatim.
export const OFFENSE = {
  ol: [[232, 145], [232, 165], [232, 185], [232, 205], [232, 225]] as [number, number][],
  qb: [205, 185] as [number, number],
  rb: [188, 205] as [number, number],
  te: [232, 247] as [number, number],
  wr: [[232, 60], [232, 300], [232, 338]] as [number, number][],
};

export const BLOCKERS = 6;

// ── Scenario data (verbatim from the spike's PLAYS object) ──────────────────────────────────
// KEY RECONCILIATION: the HTML keyed explanations by `rookie | beginner | intermediate | expert`.
// The app contract is `kid | beginner | intermediate | expert` (kid DISPLAYS as "Rookie"). So the
// HTML's exp.rookie block is ported under the app key `kid`. No `rookie` key exists here — the
// exp type (Record<Level, …>) enforces exactly the four app keys, so a stray `rookie` won't compile.

export type Call = 'run' | 'pass';
export interface Defender { role: string; x: number; y: number }
export interface Scenario {
  key: string;
  name: string;
  blockers: number;
  answer: Call;
  boxCount: number;
  defense: Defender[];
  verdict: { runTitle: string; passTitle: string };
  exp: Record<Level, { run: string; pass: string }>;
}

// Order the scenario pills render in (numberless names).
export const SCENARIOS: Scenario[] = [
  {
    key: 'lightBox',
    name: 'Light Box', blockers: BLOCKERS, answer: 'run', boxCount: 6,
    defense: [
      { role: 'DE', x: 262, y: 150 }, { role: 'DT', x: 262, y: 180 }, { role: 'DT', x: 262, y: 210 }, { role: 'DE', x: 262, y: 240 },
      { role: 'LB', x: 312, y: 175 }, { role: 'LB', x: 312, y: 215 },
      { role: 'NB', x: 300, y: 330 },
      { role: 'CB', x: 270, y: 62 }, { role: 'CB', x: 270, y: 320 },
      { role: 'FS', x: 440, y: 150 }, { role: 'SS', x: 440, y: 240 },
    ],
    verdict: {
      runTitle: '6 in the box, 6 blockers → run it',
      passTitle: '6 in the box, 6 blockers → you left a run on the table',
    },
    exp: {
      kid: {
        run: "Right call. You have just as many blockers as they have defenders near the line — the runner has a lane. And both safeties are far back, so nobody's crashing in.",
        pass: 'You can pass, but this was a good run look: your blockers matched the box and both safeties were deep. The run was the easier yards.',
      },
      beginner: {
        run: "6 in the box, 6 blockers. You can block everyone and both safeties are deep — that's a clean run look.",
        pass: "Passing isn't wrong, but 6-on-6 with two deep safeties is a favorable run. You had the numbers on the ground.",
      },
      intermediate: {
        run: 'Even numbers in the box and a two-high shell: the offense can account for every box defender, and the deep safeties are too far to fit the run quickly. Hand it off.',
        pass: "The box is even (6 v 6) and both safeties are deep — that's the defense inviting the run. Passing walks away from your best matchup.",
      },
      expert: {
        run: "Two-high, light box: 6 defenders the 6-man surface can all block, with no extra fitter. The safeties are the run force but they're 12+ yards off — the crease is there before they arrive.",
        pass: '6-man box under a two-high shell is a run-favorable structure. Nothing wrong with a throw, but the defense conceded the box — the on-schedule play is to run into the light front.',
      },
    },
  },
  {
    key: 'even',
    name: 'Even', blockers: BLOCKERS, answer: 'pass', boxCount: 7,
    defense: [
      { role: 'DE', x: 262, y: 150 }, { role: 'DT', x: 262, y: 180 }, { role: 'DT', x: 262, y: 210 }, { role: 'DE', x: 262, y: 240 },
      { role: 'LB', x: 308, y: 160 }, { role: 'LB', x: 308, y: 190 }, { role: 'LB', x: 308, y: 222 },
      { role: 'CB', x: 270, y: 62 }, { role: 'CB', x: 270, y: 320 },
      { role: 'FS', x: 440, y: 160 }, { role: 'SS', x: 430, y: 230 },
    ],
    verdict: {
      passTitle: '7 in the box, 6 blockers → lean pass',
      runTitle: '7 in the box, 6 blockers → one free defender',
    },
    exp: {
      kid: {
        pass: "Good read. There's one more defender near the line than you have blockers — so one comes free. The pass is the safer call.",
        run: "It's close, but there was one extra defender near the line. He's the one nobody blocks — he can make the tackle.",
      },
      beginner: {
        pass: "7 in the box, 6 blockers. That's one unblocked defender against the run — a slight edge to the pass. When it's within one, the deep look breaks the tie.",
        run: '7 vs 6 means one free hitter. The run can work, but the numbers lean pass by one — this is the close call to learn.',
      },
      intermediate: {
        pass: "One more in the box than the protection can handle. It's a one-defender edge, not a blowout — with the safeties only medium-deep, the throw is the cleaner answer.",
        run: '7 v 6 is a one-man box advantage for the defense. A well-blocked run can still gain, but by the count alone, this leans pass.',
      },
      expert: {
        pass: 'Plus-one box (7 v 6). The tie-breaker is the shell: neither safety is a true deep-middle player here, so intermediate throws are open before a robber can drive. Take the one-man numbers edge.',
        run: 'A one-defender box surplus. On the right blocking scheme the run is viable, but count-first this is a throw — the extra hat has a free run to the ball.',
      },
    },
  },
  {
    key: 'loaded',
    name: 'Loaded', blockers: BLOCKERS, answer: 'pass', boxCount: 8,
    defense: [
      { role: 'DE', x: 262, y: 150 }, { role: 'DT', x: 262, y: 180 }, { role: 'DT', x: 262, y: 210 }, { role: 'DE', x: 262, y: 240 },
      { role: 'LB', x: 308, y: 158 }, { role: 'LB', x: 308, y: 190 }, { role: 'LB', x: 308, y: 222 },
      { role: 'SS', x: 350, y: 200 },
      { role: 'CB', x: 270, y: 62 }, { role: 'CB', x: 270, y: 320 },
      { role: 'FS', x: 445, y: 190 },
    ],
    verdict: {
      passTitle: '8 in the box, 6 blockers → throw it',
      runTitle: '8 in the box, 6 blockers → the run gets stuffed',
    },
    exp: {
      kid: {
        pass: 'Right call. There were more defenders near the line than you have blockers, so someone comes free. Throw it.',
        run: 'Careful — there were more defenders near the line than blockers. Two had nobody to block them, so the runner gets hit early.',
      },
      beginner: {
        pass: '8 in the box, 6 blockers. That leaves 2 defenders unblocked — a run gets stuffed. With only one deep safety, the pass is the more open call.',
        run: '8 in the box vs 6 blockers means 2 free defenders. The run walks into them. This is a throw — only one safety is deep.',
      },
      intermediate: {
        pass: "The extra linebacker and the crept-down strong safety are the two extra hats — the protection can't account for both. Passing avoids the free hitters, and single-high means the deep field is lightly manned.",
        run: 'Box count says pass: the offense blocks 6, but 8 are in the box. The strong safety walked down as the 8th — unblocked at the point of attack.',
      },
      expert: {
        pass: '8-man box, single-high shell: the SS rotated down, so the front is +2 to the protection. Any interior run meets an unblocked second-level defender; the light single-high look invites the throw behind the loaded front.',
        run: 'With the SS as the added box defender and 6-man protection, the run is a math loss at the point of attack. The tell is single-high — the defense sold out vs the run and left the deep field with one player.',
      },
    },
  },
  {
    key: 'stacked',
    name: 'Stacked · blitz', blockers: BLOCKERS, answer: 'pass', boxCount: 9,
    defense: [
      { role: 'DE', x: 262, y: 150 }, { role: 'DT', x: 262, y: 178 }, { role: 'DT', x: 262, y: 206 }, { role: 'DE', x: 262, y: 234 },
      { role: 'LB', x: 306, y: 150 }, { role: 'LB', x: 306, y: 182 }, { role: 'LB', x: 306, y: 214 },
      { role: 'SS', x: 348, y: 168 }, { role: 'SS', x: 348, y: 230 },
      { role: 'CB', x: 270, y: 62 }, { role: 'CB', x: 270, y: 320 },
    ],
    verdict: {
      passTitle: '9 in the box, nobody deep → throw behind it',
      runTitle: '9 in the box → the run has no chance',
    },
    exp: {
      kid: {
        pass: 'Right call. The defense sent almost everyone at the line and left nobody deep. Throw the ball over them.',
        run: 'There are way more defenders near the line than blockers — the run gets swallowed. This is a throw.',
      },
      beginner: {
        pass: "9 in the box, 6 blockers — three free rushers. And with no safety deep, there's grass behind the defense. Throw it.",
        run: '9 vs 6 means three unblocked defenders. The run has no chance here. The empty deep field is the tell to pass.',
      },
      intermediate: {
        pass: "This is a pressure look — both safeties crept down for an all-out blitz. Three more rushers than you can block, but nobody's home deep. The answer is a quick throw into the vacated space.",
        run: "Everyone's in the box; three come free. Don't run into it. The flip side of an all-out blitz is wide-open grass behind it — throw.",
      },
      expert: {
        pass: "Cover-0 pressure: no deep safety, box +3 to the protection. You can't block it up, so the answer is the hot throw — beat the blitz into the area the safeties vacated before the free rusher arrives.",
        run: 'A 9-man box with zero deep help is a max-pressure sellout. Running is a loss; the blitz-beater is a quick game throw behind the vacated safeties.',
      },
    },
  },
];
