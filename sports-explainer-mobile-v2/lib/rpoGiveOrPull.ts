// Give or Pull? — RPO mesh-point data (VERBATIM from rpo-give-or-pull.html). The reads — what the
// ringed backer's first two steps mean, the box-count fallback, the JUMPED/BATTED failure modes —
// are the tactical content and Anthony's review surface; copied exactly, never re-derived. Each
// scenario carries verdicts for both calls plus 4-depth COACH'S READ texts. All fan-facing strings
// are prose only. Coordinates share the FootballField viewBox (680×380, LOS at x=235). Pure data —
// zero RN imports.

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type RpoCall = 'give' | 'pull';

export interface RpoVerdict { k: 'good' | 'bad'; t: string; b: string }
export interface RpoScenario {
  tab: string;
  key0: Pt;                 // the read defender pre-snap
  keyMesh: Pt;              // where his reaction takes him by the mesh (the freeze frame)
  safety: { p0: Pt; pResolve: Pt };
  answer: RpoCall;
  lightBox?: boolean;       // scenario 3: the box-count fallback annotation
  others: Pt[];             // the other labeled defenders
  othersR: string[];        // their position labels (LB / NB / S / CB)
  oline: Pt[]; dline: Pt[]; // the lines — small dots, identified via the legend
  led: { give: string; pull: string };   // LED scoreboard outcome text per call
  // On a WRONG pull, how the read defender kills it: he JUMPS the throw (pick) or BATS it down.
  pullFail?: 'jumped' | 'batted';
  verd: Record<RpoCall, RpoVerdict>;
  why: Record<Depth, string>;
}

// ── the play's fixed geometry (verbatim) ──
export const MESH = 100;                                  // t-units to the mesh freeze
export const QB: Pt = { x: 205, y: 190 };
export const RB0: Pt = { x: 168, y: 214 };
export const MESHPT: Pt = { x: 206, y: 196 };
export const SLANT0: Pt = { x: 235, y: 90 };              // slant receiver start
export const SLANTC: Pt = { x: 330, y: 152 };             // slant catch point
export const RUNLANE: Pt = { x: 300, y: 214 };            // B-gap aiming point
export const GIVE_END: Pt = { x: RUNLANE.x + 70, y: RUNLANE.y };  // where a successful give finishes
export const GIVE_STUFF: Pt = { x: 252, y: 206 };         // where a wrong give dies in the hole

export const SCEN: RpoScenario[] = [
  {
    tab: 'Backer crashes',
    key0: { x: 300, y: 165 }, keyMesh: { x: 258, y: 190 },
    safety: { p0: { x: 430, y: 128 }, pResolve: { x: 352, y: 150 } },
    answer: 'pull',
    others: [{ x: 300, y: 238 }, { x: 290, y: 300 }, { x: 430, y: 252 }, { x: 280, y: 80 }],
    othersR: ['LB', 'NB', 'S', 'CB'],
    oline: [{ x: 228, y: 150 }, { x: 228, y: 170 }, { x: 228, y: 190 }, { x: 228, y: 210 }, { x: 228, y: 230 }],
    dline: [{ x: 248, y: 152 }, { x: 248, y: 182 }, { x: 248, y: 212 }, { x: 248, y: 240 }],
    led: { give: 'STUFFED', pull: 'CAUGHT' },
    verd: {
      pull: {
        k: 'good', t: 'Pulled it — into the grass he left',
        b: "The backer sold out on the run, so the hook zone behind him is empty. The slant arrives right where he was standing. It's not free — the safety is driving downhill, so the throw has to be out on time — but the read defender can't be in two places.",
      },
      give: {
        k: 'bad', t: 'Handed it into the crash',
        b: 'That backer was coming downhill the whole way — he meets the back in the hole for a loss. When the read defender attacks the run, giving is handing the ball to exactly the man the play was built to punish.',
      },
    },
    why: {
      rookie: 'One defender is wrong no matter what he does. If he runs at the running back, throw it behind him.',
      beginner: "The quarterback isn't guessing — he's reading the ringed backer. Backer attacks the run: pull and throw the slant into the spot he abandoned. That's the whole play.",
      intermediate: 'The RPO puts one defender in run-pass conflict on purpose: the slant is thrown into his zone, so defending the run means un-defending the pass. His first two steps decide the play.',
      expert: 'Timing is the tax: the ball must be out before linemen drift downfield blocking, and before the driving safety closes the slant window. Elite RPO quarterbacks decide at the mesh, not after it.',
    },
  },
  {
    tab: 'Backer sits on the slant',
    key0: { x: 300, y: 165 }, keyMesh: { x: 318, y: 142 },
    safety: { p0: { x: 430, y: 128 }, pResolve: { x: 356, y: 196 } },
    answer: 'give',
    others: [{ x: 300, y: 238 }, { x: 290, y: 300 }, { x: 430, y: 252 }, { x: 280, y: 80 }],
    othersR: ['LB', 'NB', 'S', 'CB'],
    oline: [{ x: 228, y: 150 }, { x: 228, y: 170 }, { x: 228, y: 190 }, { x: 228, y: 210 }, { x: 228, y: 230 }],
    dline: [{ x: 248, y: 152 }, { x: 248, y: 182 }, { x: 248, y: 212 }, { x: 248, y: 240 }],
    led: { give: 'RUN +5', pull: 'JUMPED' },
    pullFail: 'jumped',
    verd: {
      give: {
        k: 'good', t: 'Gave it — through the gap he abandoned',
        b: "The backer widened under the slant, so the run lane he was responsible for is open. The back hits it for a solid gain — not a touchdown, because the safety fills late, but the defense's own choice created the crease.",
      },
      pull: {
        k: 'bad', t: 'Thrown to the man waiting for it',
        b: "He never bit on the run — he floated straight into the slant window and undercuts the throw. That's the pick-six waiting to happen. When the read defender stays in the passing lane, the ball goes in the back's belly.",
      },
    },
    why: {
      rookie: 'Same play, opposite answer: if the defender backs up to guard the pass, hand the ball off and run where he used to be.',
      beginner: 'The read flips with the defender: backer drops under the slant, so the run gap he owns is empty. Give it. The RPO never argues with the defense — it takes what\'s conceded.',
      intermediate: 'Watch his shoulders at the mesh: opening toward the receiver means pass-first. The give punishes it because a zone defender guarding a route can\'t also fill his run gap.',
      expert: "Defenses counter by 'splitting the difference' — a slow shuffle that threatens both. The answer is patience at the mesh and a back who presses the line to force the defender to declare late.",
    },
  },
  {
    tab: 'Disciplined — count the box',
    key0: { x: 300, y: 165 }, keyMesh: { x: 302, y: 168 },
    safety: { p0: { x: 430, y: 128 }, pResolve: { x: 380, y: 170 } },
    answer: 'give', lightBox: true,
    others: [{ x: 300, y: 238 }, { x: 430, y: 252 }, { x: 280, y: 80 }, { x: 292, y: 66 }],
    othersR: ['LB', 'S', 'CB', 'NB'],
    oline: [{ x: 228, y: 150 }, { x: 228, y: 170 }, { x: 228, y: 190 }, { x: 228, y: 210 }, { x: 228, y: 230 }],
    dline: [{ x: 248, y: 162 }, { x: 248, y: 192 }, { x: 248, y: 222 }],
    led: { give: 'RUN +5', pull: 'BATTED' },
    pullFail: 'batted',
    verd: {
      give: {
        k: 'good', t: 'Gave it — the numbers said run',
        b: 'The backer slow-played it and never declared, so the tiebreaker is arithmetic: five blockers against a light box. The give grinds out four or five — no fireworks, just the math cashing in.',
      },
      pull: {
        k: 'bad', t: 'Thrown through a body',
        b: 'He never left the throwing lane — the slant goes right past his ear and he gets a hand on it. Against a defender who refuses to commit, forcing the pass is the one answer that lets him win both jobs at once.',
      },
    },
    why: {
      rookie: 'Sometimes the defender just... waits. When he won\'t pick, count helmets: fewer defenders near the line than blockers means run it.',
      beginner: 'A disciplined defender who slow-plays the mesh muddies the read. The fallback is the box count — this front is light, so the run has the numbers even with him unblocked.',
      intermediate: "'When in doubt, give' is coached for a reason: the run is the safe half of the option, and a muddy defender still can't tackle from the throwing lane and the gap simultaneously — the back's cut punishes him post-snap.",
      expert: 'This is the counter to the counter: defenses teach slow-playing to kill the read, offenses answer with pre-snap box math and tags that change the route. The chess match is why the ringed man changes week to week.',
    },
  },
];
