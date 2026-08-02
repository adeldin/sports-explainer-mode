// Where's the Line? — scenario data + the COMPUTED offside-line truth (VERBATIM from
// rugbycorner/wheres-the-line.html). The law being taught inline: the instant a ruck forms, each
// team gets an offside line through the HINDMOST FOOT of its own last player bound in the ruck —
// and a tackle alone builds no fence at all (the "no ruck, no line" trick scenario). Every prompt,
// verdict and 4-depth COACH'S READ string is owner-reviewed copy copied exactly. Coordinates share
// the rugby pitch viewBox (680×420), attack L→R. Pure data + geometry — zero RN imports.

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Team = 'a' | 'd';              // a = attack (orange) · d = defense (blue)
export type WTLAction = 'lock' | 'no-line';
export type GradeKind = 'good' | 'bad';

export interface WTLPlayer { x: number; y: number; t: Team }
export interface WTLStand { x: number; y: number; lab?: string }
export interface WTLScenario {
  tab: string;
  noLine?: boolean;        // no player bound on his feet → a tackle, not a ruck → no line exists
  bound: WTLPlayer[];      // bodies bound over the ball, ON THEIR FEET (circles)
  lying: WTLPlayer[];      // on the ground, out of the contest (ellipses) — they bind nothing
  ball: { x: number; y: number };
  trueX?: number;          // the spike's authored line — kept ONLY as a cross-check against trueLineX()
  cushion?: boolean;       // annotate the nine's protected pocket (the caterpillar scenario)
  standD: WTLStand[];
  standA: WTLStand[];
  prompt: string;
  why: Record<Depth, string>;
}

export const R = 12;                       // player radius — a dot's trailing edge IS his back foot
export const TOL = 14;                     // how close the drag has to be to count as correct
export const GUESS_MIN = 90, GUESS_MAX = 590, GUESS_START = 300;
export const LINE_COL = '#ffd23f';

// ── THE COMPUTED TRUTH ──────────────────────────────────────────────────────
// Never hand-declared: the defense's line is the back foot of the hindmost DEFENDER bound in the
// ruck — hindmost meaning furthest from the try line he's defending, i.e. the largest x (attack runs
// L→R). His back foot is the trailing edge of his body: x + R. No bound defender ⇒ no ruck ⇒ no line.
export function hindmostBoundDefender(s: WTLScenario): WTLPlayer | null {
  let hind: WTLPlayer | null = null;
  for (const p of s.bound) if (p.t === 'd' && (!hind || p.x > hind.x)) hind = p;
  return hind;
}
export function trueLineX(s: WTLScenario): number | null {
  const hind = hindmostBoundDefender(s);
  return hind ? hind.x + R : null;
}
// Truth table — computed vs. the spike's authored trueX (they agree exactly, which is the point):
//   Clean ruck   bound d @ 348,360 → hindmost 360 → 360+12 = 372  (authored 372)  ✓
//   Messy ruck   bound d @ 350,384 → hindmost 384 → 384+12 = 396  (authored 396)  ✓
//   Tackle only  bound d: none     → null                          (authored none) ✓
//   Caterpillar  bound d @ 352,342 → hindmost 352 → 352+12 = 364  (authored 364)  ✓

export interface WTLVerdict { k: GradeKind; tag: string; title: string; body: string }

// The whole judgment, as one pure function of (scenario, what the user pressed, where they dragged).
export function judge(s: WTLScenario, action: WTLAction, guessX: number): WTLVerdict {
  const truth = trueLineX(s);
  if (action === 'no-line') {
    return truth == null
      ? {
        k: 'good', tag: 'Correct', title: 'Sharp eye — no ruck, no line',
        body: 'Nobody is bound over the ball on their feet, so no ruck exists and no offside line has formed. Arriving players just have to come through the gate.',
      }
      : {
        k: 'bad', tag: 'Not quite', title: 'There IS a line here',
        body: "Players from both teams are bound over the ball on their feet — that's a ruck, and the fence sits on the last defender's back foot. It's marked in yellow.",
      };
  }
  if (truth == null) {
    return {
      k: 'bad', tag: 'Not quite', title: 'No fence yet',
      body: 'Nobody is bound over the ball on their feet, so no ruck has formed — and without a ruck there is no offside line at all. This is still open play around a tackle.',
    };
  }
  const d = guessX - truth;
  if (Math.abs(d) <= TOL) {
    return {
      k: 'good', tag: 'Correct', title: 'Locked on the back foot',
      body: "That's the fence — the hindmost foot of the last defender bound in the ruck. Every defender must start behind it until the ball is out.",
    };
  }
  if (d < 0) {
    return {
      k: 'bad', tag: 'Not quite', title: "Too far forward — that's a penalty line",
      body: "A defender standing on your line would be in front of his last teammate's back foot. The referee pings 'offside at the ruck' and marches the defense back ten meters.",
    };
  }
  return {
    k: 'bad', tag: 'Not quite', title: 'Too deep — free meters gifted',
    body: 'Defenders are entitled to stand right on the back foot. Parking them where you drew it hands the attack free space and time on every single phase.',
  };
}

export const SCENARIOS: WTLScenario[] = [
  {
    tab: 'Clean ruck',
    bound: [{ x: 318, y: 214, t: 'a' }, { x: 326, y: 198, t: 'a' }, { x: 348, y: 204, t: 'd' }, { x: 360, y: 212, t: 'd' }],
    lying: [{ x: 334, y: 222, t: 'a' }], ball: { x: 306, y: 220 }, trueX: 372,
    standD: [{ x: 392, y: 110 }, { x: 388, y: 165 }, { x: 390, y: 262 }, { x: 394, y: 322 }, { x: 410, y: 60 }, { x: 412, y: 378 }],
    standA: [{ x: 262, y: 120 }, { x: 255, y: 170 }, { x: 258, y: 260 }, { x: 264, y: 320 }, { x: 246, y: 70 }],
    prompt: 'Tackle made, bodies bound over the ball — a ruck. <b>Where must the defense stand?</b> Drag the line.',
    why: {
      rookie: "The fence sits at the last defender's back foot — not at the ball. Every defender on his feet must start behind it.",
      beginner: 'A ruck forms when players from both teams bind over the ball on their feet. The instant it forms, each team gets an offside line through the hindmost foot of its own last player in the ruck.',
      intermediate: "The line belongs to bodies, not the ball — the ball can sit forward of the back foot and the line doesn't move. Defenders creep right up onto it and launch the instant the ball is out.",
      expert: "Watch the pillar defenders either side of the ruck: they set up with toes exactly on the back foot. A half-step early from a pillar is the 'offside at the ruck' penalty you hear every match — breakdown offenses are the biggest single slice of the pro game's penalty count.",
    },
  },
  {
    tab: 'Messy ruck',
    bound: [{ x: 322, y: 205, t: 'a' }, { x: 332, y: 216, t: 'a' }, { x: 350, y: 200, t: 'd' }, { x: 384, y: 222, t: 'd' }],
    lying: [{ x: 338, y: 228, t: 'a' }], ball: { x: 310, y: 212 }, trueX: 396,
    standD: [{ x: 416, y: 105 }, { x: 412, y: 160 }, { x: 414, y: 268 }, { x: 418, y: 330 }, { x: 432, y: 55 }],
    standA: [{ x: 266, y: 120 }, { x: 258, y: 175 }, { x: 262, y: 265 }, { x: 268, y: 325 }],
    prompt: "Ugly pile — and one defender got driven deep in the cleanout. <b>Where's the line now?</b>",
    why: {
      rookie: "Messy pile, same rule: find the very last defender still bound in, and the line is his back foot — even if he's behind the main clump.",
      beginner: "One defender got dragged in deep, so the defense's line is further back than the pile suggests. His back foot — not the biggest cluster of bodies — sets it.",
      intermediate: 'This is a win for the attack: a cleanout that drives a defender backward drags the whole defensive line back with him, buying extra meters to play in on the next phase.',
      expert: "Good cleanout targets exactly this — drive the last defender one meter deeper and all fourteen teammates must retreat that meter with him. It's why attackers keep 'finishing' a ruck that already looks won.",
    },
  },
  {
    tab: 'Tackle only', noLine: true,
    bound: [], lying: [{ x: 334, y: 212, t: 'a' }, { x: 352, y: 218, t: 'd' }], ball: { x: 322, y: 216 },
    standD: [{ x: 378, y: 178 }, { x: 372, y: 252 }, { x: 400, y: 120 }, { x: 404, y: 310 }, { x: 430, y: 60 }],
    standA: [{ x: 288, y: 170 }, { x: 284, y: 255 }, { x: 262, y: 120 }, { x: 258, y: 310 }],
    prompt: "A tackle — but look closely: <b>nobody is bound over the ball on their feet.</b> Where's the line?",
    why: {
      rookie: "Trick one: no one is bound over the ball on their feet, so there's no ruck — and no ruck means no offside line yet.",
      beginner: "A tackle alone doesn't create offside lines. Only a ruck (or maul) builds the fence. Until then, arriving players just have to enter through 'the gate' — from behind the tackle, not the side.",
      intermediate: "This is the scramble window: defenders can attack the ball from positions a ruck would forbid. The first attacking support player's job is to force the ruck and slam the fence shut.",
      expert: 'Elite jackals live in this window — arriving before the ruck exists, through the gate, staying on their feet. The moment one attacker binds over them, the ruck forms, the lines snap into place, and the exact same position becomes a penalty.',
    },
  },
  {
    tab: 'Caterpillar',
    bound: [{ x: 352, y: 204, t: 'd' }, { x: 342, y: 216, t: 'd' }, { x: 330, y: 208, t: 'a' }, { x: 314, y: 214, t: 'a' }, { x: 296, y: 208, t: 'a' }, { x: 278, y: 214, t: 'a' }, { x: 260, y: 210, t: 'a' }],
    lying: [], ball: { x: 246, y: 212 }, trueX: 364, cushion: true,
    standD: [{ x: 384, y: 120 }, { x: 380, y: 168 }, { x: 382, y: 258 }, { x: 386, y: 315 }, { x: 402, y: 64 }, { x: 404, y: 372 }],
    standA: [{ x: 210, y: 130 }, { x: 205, y: 290 }, { x: 190, y: 212, lab: '9' }],
    prompt: "The attack strings a long 'caterpillar' backward and the ball rides at the tail. <b>Where's the defense's line?</b>",
    why: {
      rookie: "The defenders' fence is still their own back foot at the front of the pile — while the ball rides way back at the tail of that snake of attackers.",
      beginner: "The attack binds bodies backward to carry the ball away from the contest — but the defense's line is set by the defense's hindmost player, so it can't chase the ball back.",
      intermediate: 'That gap is the whole point: the scrum-half gets a protected pocket to box kick from, because the nearest legal defender starts the full length of the caterpillar away from his boot.',
      expert: "That cushion is the charge-down math. Defenses answer by refusing to commit bodies — no defender bound means the pile can end and the protection with it — or by timing the sprint off the back foot the instant the nine's hands lift.",
    },
  },
];
