// How Many In? — scenario data (VERBATIM from rugbycorner/how-many-in.html).
// The owner's framing: THE RUCK IS A MARKET. Every body you send to secure the ball is a body
// deleted from the wide attack — and both pictures (the threat over the ball AND the wide count)
// are on the pitch before you choose, so the spend is visible on both sides of the ledger. Every
// prompt, grade and 4-depth COACH'S READ string is owner-reviewed copy copied exactly. Coordinates
// share the rugby pitch viewBox (680×420), attack L→R. Pure data + geometry — zero RN imports.

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type SendN = 0 | 1 | 2 | 3;
export type GradeKind = 'good' | 'ok' | 'bad';
export type XY = [number, number];

export interface Marked { p: XY; lab: string }
export interface HMIGrade { k: GradeKind; t: string; b: string }
export interface HMIScenario {
  tab: string;
  ruck: XY;
  best: SendN;
  jackals: Marked[];      // defenders ON THE BALL — on their feet, hands on it (amber ring)
  hover: Marked[];        // defenders hanging off the contest, ready to step in
  preWideN: number;       // how many of your wide slots are ALREADY filled before you spend
  wideSlots: XY[];        // every wide attacking position; leftovers fill the next ones after the ruck
  wideLab: string[];
  wideDef: Marked[];      // their line, set from the start
  prompt: string;
  grade: Record<SendN, HMIGrade>;
  why: Record<Depth, string>;
}

export const SEND_OPTIONS: { n: SendN; title: string; sub: string }[] = [
  { n: 0, title: 'Send 0', sub: 'trust the placement' },
  { n: 1, title: 'Send 1', sub: 'seal it' },
  { n: 2, title: 'Send 2', sub: 'clear + seal' },
  { n: 3, title: 'Send 3', sub: 'everything' },
];

// ── Geometry (verbatim from the prototype's render()/choose()) ──
export const POOL_LABELS = ['4', '5', '6'];
// Your forwards, arriving from behind the play. Nobody spawns from nowhere — the men who go into
// the ruck and the men who end up wide are the SAME three bodies.
export const poolPos = (s: HMIScenario): XY[] => [
  [s.ruck[0] - 70, s.ruck[1] - 26],
  [s.ruck[0] - 84, s.ruck[1] + 8],
  [s.ruck[0] - 70, s.ruck[1] + 42],
];
// Where an arriving cleaner ends up over the ball.
export const cleanTargets = (s: HMIScenario): XY[] => [
  [s.ruck[0] - 4, s.ruck[1] - 14],
  [s.ruck[0] + 10, s.ruck[1] - 6],
  [s.ruck[0] - 14, s.ruck[1] + 14],
];
export const ninePos = (s: HMIScenario): XY => [s.ruck[0] - 28, s.ruck[1] - 14];
export const ballPos = (s: HMIScenario): XY => [s.ruck[0] - 10, s.ruck[1] + 2];
export const carrierDown = (s: HMIScenario): XY => [s.ruck[0], s.ruck[1] + 8];
export const tacklerDown = (s: HMIScenario): XY => [s.ruck[0] + 14, s.ruck[1] + 16];
export const R_ACTOR = 11;

// THE LEDGER, computed — never hand-declared. Whatever you didn't spend at the ruck shows up wide
// on the next phase: attackers = the slots already filled + the leftovers who jog out.
export interface WideCount { att: number; def: number; tag: string; color: string }
export function wideCount(s: HMIScenario, n: SendN): WideCount {
  const leftovers = POOL_LABELS.length - n;
  const att = s.preWideN + leftovers;
  const def = s.wideDef.length;
  const tag = att > def ? 'overlap!' : att === def ? 'even numbers' : 'a man short';
  const color = att > def ? '#bfe9da' : att === def ? '#fff' : '#ffe1b3';
  return { att, def, tag, color };
}
// Who takes the ball when the spend was too small: a second jackal cashes in once your first man
// has committed to the first; with no jackal at all, the hovering defender steps through the gate.
export function thiefIndex(s: HMIScenario, n: SendN): { from: 'jackal' | 'hover'; i: number } {
  if (s.jackals.length) return { from: 'jackal', i: s.jackals.length > 1 && n >= 1 ? 1 : 0 };
  return { from: 'hover', i: 0 };
}
export const VERDICT_TAG: Record<GradeKind, string> = {
  good: 'Right spend', ok: 'Kept it — at a price', bad: 'Turnover',
};

export const SCENARIOS: HMIScenario[] = [
  {
    tab: 'Jackal on the ball', ruck: [340, 220], best: 2,
    jackals: [{ p: [342, 213], lab: '7' }], hover: [{ p: [372, 246], lab: '6' }],
    preWideN: 3, wideSlots: [[300, 120], [318, 74], [276, 300], [296, 352], [318, 40]],
    wideLab: ['12', '11', '13', '14', '15'],
    wideDef: [{ p: [398, 120], lab: '12' }, { p: [402, 70], lab: '11' }, { p: [396, 300], lab: '13' }, { p: [400, 352], lab: '14' }],
    prompt: 'Tackle made — and their <b>7</b> is over the ball, hands ready, their 6 hovering. <b>How many do you send?</b>',
    grade: {
      0: {
        k: 'bad', t: 'Ripped — turnover',
        b: 'Nobody arrived. Their 7 stayed on his feet, got both hands on it, and stood up with your ball. A jackal over the ball is a fire — someone has to put it out.',
      },
      1: {
        k: 'bad', t: "One wasn't enough",
        b: 'Your first man hit the jackal, but their 7 had position and his mate joined behind him — one cleaner bounced off and the ball was slowed to a crawl, then stolen. A set jackal usually takes two.',
      },
      2: {
        k: 'good', t: 'Cleared and sealed — quick ball',
        b: 'First man blasted their 7 off the ball, second man sealed over the top. Ball out in a blink — and look wide: four on four with the defense still folding. Quick ball makes even numbers a winning picture.',
      },
      3: {
        k: 'ok', t: 'Safe — but you overpaid',
        b: "The ball's secure, but the third man added nothing the second hadn't finished. Look wide: three against four, a man short against a set line. Safe ball, blunt attack.",
      },
    },
    why: {
      rookie: 'Someone from the other team is trying to grab your ball. Send enough teammates to knock him off it — but only enough.',
      beginner: "The player bent over the ball is 'jackaling' — if he holds his feet and gets hands on, the referee awards him the ball. Two arrivals is the standard answer: one to blast him off, one to seal.",
      intermediate: 'Ruck resourcing is a market: every cleaner you spend is an attacker missing from the line. The best attacks average fewer than two arriving players per ruck — the skill is paying the exact price and not a body more.',
      expert: "Watch who the cleaners are: if their 7 drags two of your forwards in every tackle, he's winning even without a steal — the defense is trading one man for two, and your wide shape starves phase by phase.",
    },
  },
  {
    tab: 'No threat', ruck: [340, 220], best: 1,
    jackals: [], hover: [{ p: [380, 238], lab: '6' }],
    preWideN: 3, wideSlots: [[302, 124], [322, 76], [278, 300], [298, 352], [344, 44]],
    wideLab: ['12', '11', '13', '14', '15'],
    wideDef: [{ p: [398, 124], lab: '12' }, { p: [402, 74], lab: '11' }, { p: [396, 300], lab: '13' }, { p: [400, 352], lab: '14' }],
    prompt: 'Clean tackle, ball placed back, nobody contesting — their 6 hovers but stays out. <b>How many?</b>',
    grade: {
      0: {
        k: 'bad', t: 'An open invitation',
        b: 'You left the ball unattended, and their 6 stepped through the gate and jackaled it for free. Even a quiet ruck needs one guard.',
      },
      1: {
        k: 'good', t: 'One and done — everyone else stays alive',
        b: "One man sealed over the ball; that's a ruck, and the fence goes up. Lightning-quick ball, and look wide — five attackers against four in the line. That's where the try comes from.",
      },
      2: {
        k: 'ok', t: 'One body wasted',
        b: 'Secure, but your second man cleaned out thin air. Wide count: four on four instead of five on four. Nobody was contesting — the spend bought nothing.',
      },
      3: {
        k: 'bad', t: 'Three men buried for no reason',
        b: 'You sent the cavalry at an empty contest. The wide picture says it all — three against four on the very next phase. Over-rucking is how overlaps die.',
      },
    },
    why: {
      rookie: "Nobody's fighting for this ball — so don't send the whole team to guard it. One is plenty; the rest stay out wide to attack.",
      beginner: "When the tackler rolls away and no one contests, one arriving player over the ball secures it. Pro teams keep roughly 95% of their own rucks — the real risk isn't losing this ball, it's wasting bodies guarding it.",
      intermediate: 'Quick, uncontested ball is gold: out in under three seconds, the defense is still folding while you already have the spare man wide. Minimal rucks are how teams string phases together without running out of runners.',
      expert: "Top attacks ruck with the fewest bodies in world rugby by design — placement skill and support angles do the securing, so the shape is standing ready when the nine's hands touch the ball.",
    },
  },
  {
    tab: 'Isolated in your half', ruck: [240, 230], best: 3,
    jackals: [{ p: [246, 220], lab: '7' }, { p: [240, 244], lab: '8' }], hover: [],
    preWideN: 2, wideSlots: [[196, 120], [178, 320], [206, 64], [160, 260], [186, 180]],
    wideLab: ['12', '13', '11', '14', '15'],
    wideDef: [{ p: [300, 110], lab: '12' }, { p: [306, 180], lab: '10' }, { p: [302, 280], lab: '13' }, { p: [308, 350], lab: '14' }],
    prompt: "Your winger made a break but he's alone in your own half — <b>two</b> jackals converging. How many?",
    grade: {
      0: {
        k: 'bad', t: 'Gift-wrapped, in the worst spot',
        b: 'Both of their back-rowers got over the ball uncontested. Turnover deep in your own half — their fly-half is already lining up the attacking platform you just handed him.',
      },
      1: {
        k: 'bad', t: 'One man against two thieves',
        b: 'Your first cleaner moved their 7; their 8 won the ball anyway. Half-measures against a double threat are the same as none — and this is the wrong end of the pitch to donate possession.',
      },
      2: {
        k: 'ok', t: 'Survived — barely',
        b: 'Two cleaners against two set jackals is a coin flip, and this one took an age: the ball came back slow and the defense is fully set. You kept it, but the emergency wanted everything you had.',
      },
      3: {
        k: 'good', t: 'Everything — because the ball is everything here',
        b: "Three men buried both jackals and sealed it shut. Yes, the wide attack is gone this phase — that's fine. Deep in your own half, losing the ball costs points; losing one phase of shape costs nothing.",
      },
    },
    why: {
      rookie: 'Your teammate is alone with two enemies trying to grab the ball near your own goal. Forget attacking — send everyone and save it.',
      beginner: 'An isolated carrier is the most dangerous picture in rugby: support is far away and jackals arrive first. Teams keep about 95% of normal rucks — isolation is what flips those odds, so over-commit on purpose.',
      intermediate: 'Ruck math is situational: the same three-man spend that kills an attack at midfield is the correct emergency price here, because a turnover in your own half converts straight into their points.',
      expert: "Turnover ball is rugby's most dangerous attacking platform — the defense is never set for it, which is why tries flow from steals at several times the set-piece rate. That asymmetry is the whole case for paying the full emergency price.",
    },
  },
];
