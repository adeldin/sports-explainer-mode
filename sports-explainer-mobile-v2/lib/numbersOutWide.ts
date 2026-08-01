// Numbers Out Wide — scenario data (VERBATIM from rugbycorner/numbers-out-wide.html).
// The lesson: stop watching the ball, COUNT SHIRTS on each side of the ruck — then send the nine
// that way and watch the defensive line SLIDE with the ball, so the overlap visibly expires. Every
// prompt, verdict and 4-depth COACH'S READ string below is owner-reviewed copy copied exactly,
// never re-derived. Fan-facing prose only; inline <b>…</b> emphasis from the prototype is preserved
// for the renderer to style. Coordinates share the rugby pitch viewBox (680×420), attack L→R.
// Pure data + geometry helpers — zero RN imports.

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Side = 'open' | 'short';
export type NOWOption = Side | 'kick';
export type GradeKind = 'good' | 'bad';
export type XY = [number, number];

export interface SideSetup {
  label: string;      // the judge button's text for this side
  att: XY[];          // your runners on this side, in PASSING ORDER (the chain the ball follows)
  alab: string[];     // shirt numbers — every actor is identified (spike standard rule 1)
  def: XY[];          // their defenders on this side
  dlab: string[];
  punish: number;     // index of the defender who closes: DRAWN on a right call, the killer on a wrong one
  blitz?: boolean;    // this side's line charges instead of drifting
}
export interface NOWVerdict { k: GradeKind; t: string; b: string }
export interface NOWScenario {
  tab: string;
  ruck: XY;
  open: SideSetup;
  short: SideSetup;
  fullback: XY;
  fbInLine?: boolean; // the fullback is UP in the rushing line — the read that unlocks the kick
  answer: NOWOption;
  prompt: string;
  verd: Record<NOWOption, NOWVerdict>;
  why: Record<Depth, string>;
}

// ── Geometry / timing constants (verbatim from the prototype) ──
export const HOP = 340;                     // ms per pass in the chain; also paces the defensive slide
export const R_ACTOR = 11;                  // player dot radius
export const clampY = (y: number): number => Math.max(24, Math.min(396, y));
// The ball starts in the nine's hands, just behind and above the ruck.
export const ninePos = (s: NOWScenario): XY => [s.ruck[0] - 24, s.ruck[1] - 16];
export const ballStart = (s: NOWScenario): XY => [s.ruck[0] - 24, s.ruck[1] - 28];
// The chain the ball travels on a given side: nine → each runner in order.
export const passChainPts = (s: NOWScenario, side: Side): XY[] => [ballStart(s), ...s[side].att];
// Which touchline the ball is heading for (drives the direction the defense slides).
export const slideDir = (s: NOWScenario, side: Side): number => {
  const atts = s[side].att;
  return Math.sign(atts[atts.length - 1][1] - s.ruck[1]);
};

// The count readouts: "N v M" per side, parked out to the right of the ruck at the vertical centre
// of that side's bodies. THE COUNT IS THE WHOLE READ — it is drawn the moment a call is made.
export interface CountReadout { x: number; y: number; text: string }
export function countReadouts(s: NOWScenario): CountReadout[] {
  return (['open', 'short'] as Side[]).map(side => {
    const pts = s[side].att.concat(s[side].def);
    const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return { x: s.ruck[0] + 150, y: my, text: `${s[side].att.length} v ${s[side].def.length}` };
  });
}

export const SCENARIOS: NOWScenario[] = [
  {
    tab: 'Ruck near touch', ruck: [300, 320],
    open: {
      label: 'Go open (top)', att: [[280, 268], [300, 214], [326, 158], [352, 102]], alab: ['10', '12', '13', '11'],
      def: [[382, 248], [392, 166]], dlab: ['12', '13'], punish: 1,
    },
    short: {
      label: 'Go short (bottom)', att: [[280, 368]], alab: ['14'],
      def: [[372, 352], [366, 394]], dlab: ['guard', 'wing'], punish: 0,
    },
    fullback: [560, 210], answer: 'open',
    prompt: 'Ruck close to the bottom touchline, quick ball. <b>Which way does the nine send it?</b>',
    verd: {
      open: {
        k: 'good', t: 'Overlap taken — four on two',
        b: 'Four attackers against two defenders up top. It still has to be earned: the fullback is scrambling across, so the last pass must beat his cover — but the extra men mean someone runs free.',
      },
      short: {
        k: 'bad', t: 'Into the traffic',
        b: 'One runner against two down there — the blindside guard holds him up and their wing finishes the tackle against the touchline. You attacked the side where the defense had the numbers.',
      },
      kick: {
        k: 'bad', t: 'Kicked away a gift',
        b: 'The fullback is sitting deep in midfield and fields it comfortably. You had four against two in hand and gave the ball back instead of using it.',
      },
    },
    why: {
      rookie: "Count shirts on each side of the ruck. More of yours than theirs on one side? That's where the ball goes. Here it's four on two up top.",
      beginner: 'Four against two up top is an overlap: if the ball reaches the edge before the defense slides across, the spare man runs untouched. One against two on the short side is a dead end.',
      intermediate: "Overlaps expire — you just watched the drift chase the ball across. The race is ruck speed: ball out inside about three seconds and the slide can't cover four-on-two; slow ball and the count evens itself before the wing ever touches it.",
      expert: "Scan the far edge before the ruck even finishes: the nine's first look is numbers, the second is the fullback. Elite attacks obsess over sub-three-second ruck ball precisely because a set defense erases overlaps — most line breaks arrive one pass after quick ball, not five.",
    },
  },
  {
    tab: 'Short-side door', ruck: [320, 120],
    open: {
      label: 'Go open (bottom)', att: [[300, 172], [322, 228], [346, 284]], alab: ['10', '12', '13'],
      def: [[382, 180], [390, 242], [384, 304], [378, 358]], dlab: ['guard', '12', '13', 'wing'], punish: 2,
    },
    short: {
      label: 'Go short (top)', att: [[292, 82], [318, 48]], alab: ['15', '11'],
      def: [[376, 84]], dlab: ['guard'], punish: 0,
    },
    fullback: [556, 240], answer: 'short',
    prompt: "Ruck near the top touchline. Everyone's watching the open side. <b>Where's the space?</b>",
    verd: {
      short: {
        k: 'good', t: 'Through the side door — two on one',
        b: "Two attackers against one lonely guard on the short side — your fullback snuck up to make the extra man. It's not free: the carrier still has to draw the guard and time the pass — but win that duel and the touchline corridor is open.",
      },
      open: {
        k: 'bad', t: 'They were waiting for it',
        b: 'Four defenders drifted to the open side expecting exactly this. Their outside centre slides onto your last man and the touchline does the rest. Even numbers plus drift equals no space.',
      },
      kick: {
        k: 'bad', t: 'Kicked away a two-on-one',
        b: "The fullback is deep and covers it easily. A two-on-one is one of the best pictures in rugby — you don't kick it away.",
      },
    },
    why: {
      rookie: "Every ruck has two sides. The crowded famous side isn't always the right one — sometimes the narrow 'short side' has the spare man. Here it's two on one.",
      beginner: "Defenses stack the open side because that's where attacks usually go. That habit leaves the short side thin — two of yours against one of theirs, because your fullback (15) crept into the line to make the extra man.",
      intermediate: 'A short-side strike lives and dies on the two-on-one: run AT the guard, make him commit, then release. Float the pass early and he slides off onto the receiver — the same draw-and-pass duel every overlap comes down to.',
      expert: "Elite nines check the short side every single ruck — the blindside wing creeping into that corridor is one of rugby's classic sucker punches, and it works BECAUSE the drift habit you just watched pulls defenders open-side. Habits are exploitable; counting isn't.",
    },
  },
  {
    tab: 'Blitz — kick it', ruck: [330, 220],
    open: {
      label: 'Go open (top)', att: [[310, 170], [332, 118], [356, 66]], alab: ['10', '12', '11'],
      def: [[378, 162], [386, 110], [382, 58]], dlab: ['12', '13', 'wing'], punish: 2, blitz: true,
    },
    short: {
      label: 'Go short (bottom)', att: [[308, 270], [330, 322]], alab: ['13', '14'],
      def: [[378, 262], [384, 318]], dlab: ['13', 'wing'], punish: 1, blitz: true,
    },
    fullback: [392, 212], fbInLine: true, answer: 'kick',
    prompt: 'Even numbers both sides — and the whole line is flying up, <b>fullback included.</b> What now?',
    verd: {
      kick: {
        k: 'good', t: 'In behind — the space they left',
        b: "A rushing line with the fullback up in it leaves an empty backfield. The chip in behind turns their aggression against them — your wing still has to win the race to the bounce, but he's racing nobody.",
      },
      open: {
        k: 'bad', t: 'Swallowed by the blitz',
        b: 'Three on three with defenders sprinting up — their edge defender arrives the same moment as the ball and buries your outside man behind the gainline. No spare attacker, no time.',
      },
      short: {
        k: 'bad', t: 'No door on that side either',
        b: 'Two on two down there, and their short-side pair are up just as fast. Even numbers against a blitz is a collision, not a chance.',
      },
    },
    why: {
      rookie: "When the defense sprints up fast, the space isn't in front of them anymore — it's behind them. A little kick can go where runners can't.",
      beginner: "A blitz defense trades the backfield for pressure. If nobody covers behind — look where the fullback is standing, up in the line — the kick in behind is the answer the blitz can't defend.",
      intermediate: 'The read is the fullback: deep, and the kick dies in his arms; up in the line, and the grass behind is free. Numbers even plus line speed plus empty backfield equals kick — three checks, one answer.',
      expert: "This is why fly-halves kick on the run against a rush — pro teams kick 20-plus times a game, and it's space management, not surrender. One chip that costs a try and the line speed drops all afternoon; the kick buys space for every later phase.",
    },
  },
];
