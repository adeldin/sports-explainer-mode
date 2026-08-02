// Counter or Keep? — scenario data + pure scene math (VERBATIM from coaches-corner-spikes/counter-or-keep.html).
// FULL 11v11. The scene is ALIVE from the moment the ball is won: their recovery runners track home
// over the transition window (rec targets), the caught players (slow) jog but can't make it, and
// everyone sways. The window bar is REAL: counter after it drains → the lateCounter verdict.
// Coordinates: you attack RIGHT (your goal left). Their handedness: they attack LEFT, so THEIR
// right back is at the TOP of the screen. All fan-facing strings are prose only. Zero RN imports.

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type CoKOption = 'counter' | 'keep' | 'clear';
export type CoKKind = CoKOption | 'lateCounter';
export type GradeKind = 'good' | 'ok' | 'bad';

export interface UsPlayer { r: string; p: Pt }
export interface ThemPlayer { r: string; p: Pt; gk?: boolean; rec?: Pt; slow?: boolean }
export interface Grade { k: GradeKind; t: string; b: string }

export interface CoKScenario {
  tab: string;
  answer: CoKOption;
  winSec: number | null;      // transition-window seconds; null = no window (their shape already set)
  wIdx: number;               // index in `us` of the man who won the ball
  us: UsPlayer[];
  runners: number[];          // indices of our players already running (counter outlets)
  freeMan?: number;           // index of the calm free man (deep-turnover scenario)
  them: ThemPlayer[];
  surgeUs?: Pt[];             // where our runners surge on a good counter
  surgeThem?: Pt[];           // where their CBs backpedal to
  shot?: Pt;                  // the chance-created point
  keepTo: number;             // index in `us` the keep pass goes to
  ghost: { p: Pt; txt: string };
  grade: Partial<Record<CoKKind, Grade>>;
  why: Record<Depth, string>;
}

const P = (x: number, y: number): Pt => ({ x, y });

export const SCENARIOS: CoKScenario[] = [
  {
    tab: 'Won at midfield', answer: 'counter', winSec: 6, wIdx: 6,
    us: [
      { r: 'GK', p: P(44, 210) }, { r: 'LB', p: P(170, 80) }, { r: 'CB', p: P(140, 160) }, { r: 'CB', p: P(140, 260) }, { r: 'RB', p: P(170, 340) },
      { r: '6', p: P(250, 214) }, { r: '8', p: P(330, 214) }, { r: '8', p: P(290, 170) },
      { r: 'W', p: P(392, 120) }, { r: 'ST', p: P(430, 206) }, { r: 'W', p: P(402, 290) },
    ],
    runners: [8, 9, 10],
    them: [
      { r: 'GK', p: P(640, 210), gk: true },
      { r: 'CB', p: P(470, 150), rec: P(498, 158) }, { r: 'CB', p: P(470, 272), rec: P(498, 265) },
      { r: 'RB', p: P(210, 110), rec: P(330, 112), slow: true }, { r: 'LB', p: P(196, 318), rec: P(320, 316), slow: true },
      { r: '6', p: P(300, 190), rec: P(455, 215) }, { r: '8', p: P(282, 258), rec: P(430, 265) },
      { r: 'W', p: P(262, 150), rec: P(445, 125) }, { r: 'W', p: P(318, 300), rec: P(448, 295) },
      { r: 'ST', p: P(258, 240), rec: P(390, 228) }, { r: '10', p: P(345, 235), rec: P(410, 242) },
    ],
    surgeUs: [P(560, 150), P(590, 200), P(560, 265)], surgeThem: [P(520, 180), P(520, 250)], shot: P(600, 205),
    keepTo: 5, ghost: { p: P(500, 206), txt: 'the break was on' },
    grade: {
      counter: {
        k: 'good', t: "Go — it's three on two",
        b: 'Their fullbacks are stranded in your half and only two defenders are goal-side, back-pedaling and facing their own net. First pass forward, runners flying — the three-on-two turns into a shot before their midfield can get home. Windows like this close in seconds; you went through it.',
      },
      keep: {
        k: 'bad', t: 'You let them off the hook',
        b: 'Watch the reveal: four recovery runners sprint back and the picture goes from three-v-two to three-v-six before your second pass. Keeping the ball is fine — keeping it INSTEAD of a numbers-up break is declining a gift. The window closed while you were being tidy.',
      },
      clear: {
        k: 'bad', t: 'Gave the gift straight back',
        b: 'Numbers ahead, momentum yours — and the ball sails out of play or to their keeper. You defended a situation that wanted attacking. Clearing is for emergencies; this was an invitation.',
      },
      lateCounter: {
        k: 'bad', t: 'You counted right — five seconds too slow',
        b: 'The pass you finally played was the right idea against a picture that no longer existed. Their midfield is home, the three-v-two is a three-v-six, and the interception was waiting. Transition maths has an expiry time — the count was correct when you started thinking and wrong when you finished.',
      },
    },
    why: {
      rookie: 'You won the ball and MORE of your players are ahead of it than theirs. Attack right now, before they run back.',
      beginner: 'Count both ways at the turnover: three of yours already running, two of theirs behind the ball. That math has a shelf life of a few seconds — the first pass forward is what cashes it.',
      intermediate: 'The first pass makes or breaks the counter: forward into feet or space, skipping the safe sideways ball. Every backward touch invites two recovery runners into the frame.',
      expert: 'Transitions produce chances at a far higher rate than settled possession — a defense in mid-retreat has no lines, no marking, and defenders facing the wrong way. Elite counter teams rehearse the first three passes precisely because the window is this short.',
    },
  },
  {
    tab: 'Won deep — one striker up', answer: 'keep', winSec: null, wIdx: 1,
    us: [
      { r: 'GK', p: P(44, 210) }, { r: 'CB', p: P(104, 246) }, { r: 'CB', p: P(120, 160) }, { r: 'LB', p: P(150, 80) }, { r: 'RB', p: P(150, 340) },
      { r: '6', p: P(188, 196) }, { r: '8', p: P(240, 230) }, { r: '8', p: P(260, 150) },
      { r: 'W', p: P(330, 120) }, { r: 'ST', p: P(398, 204) }, { r: 'W', p: P(340, 300) },
    ],
    runners: [9], freeMan: 5,
    them: [
      { r: 'GK', p: P(640, 210), gk: true },
      { r: 'CB', p: P(452, 150) }, { r: 'CB', p: P(452, 258) }, { r: '6', p: P(430, 206) },
      { r: 'RB', p: P(390, 100) }, { r: 'LB', p: P(390, 320) },
      { r: '8', p: P(330, 180) }, { r: '8', p: P(344, 252) },
      { r: 'W', p: P(280, 120) }, { r: 'ST', p: P(228, 258) }, { r: 'W', p: P(300, 300) },
    ],
    keepTo: 5, ghost: { p: P(188, 196), txt: 'the free man' },
    grade: {
      keep: {
        k: 'good', t: 'Take the sting out',
        b: "There's no counter here — one striker against three set defenders isn't a break, it's a donation. But they've dropped off rather than pressed, so the calm pass to your free man keeps the ball, and the team climbs the pitch together. Winning possession deep is only a win if you still have it ten seconds later.",
      },
      counter: {
        k: 'bad', t: 'One against three',
        b: "The long ball goes up to your striker and their two centre-backs sandwich him before the second touch. Possession sixty yards away with no support isn't an attack — you traded a won ball for a fifty-fifty you mostly lose, and their attack restarts.",
      },
      clear: {
        k: 'ok', t: 'Safe — and cheap',
        b: "No disaster: the danger is gone. But nobody was pressing you, and the clearance just hands the ball back — you'll be defending again in thirty seconds. Clearing under no pressure is paying for insurance you didn't need.",
      },
    },
    why: {
      rookie: "Only one teammate is up the field, and three defenders are waiting near him. Don't hoof it to him — keep the ball and move up together.",
      beginner: "A counter needs numbers or space, and this has neither: their back line is set and balanced. The right 'attack' is a calm first pass that keeps possession and lets your team travel up the pitch as a unit.",
      intermediate: 'Check the pressure before choosing: nobody is closing you down, which removes the case for clearing. Under no pressure, the deep turnover is just the start of your possession — treat it like a goal kick, not a fire.',
      expert: "The 'rest attack' concept in reverse: good teams decide transition behavior by the picture, not by identity. Even the most vertical counter sides play out calmly when outnumbered ahead — verticality is a weapon, not a religion.",
    },
  },
  {
    tab: 'Won it back HIGH', answer: 'counter', winSec: 5, wIdx: 6,
    us: [
      { r: 'GK', p: P(44, 210) }, { r: 'LB', p: P(150, 80) }, { r: 'CB', p: P(120, 160) }, { r: 'CB', p: P(120, 260) }, { r: 'RB', p: P(150, 340) },
      { r: '6', p: P(300, 210) }, { r: '8', p: P(452, 196) }, { r: '10', p: P(400, 150) },
      { r: 'ST', p: P(520, 150) }, { r: 'W', p: P(510, 258) }, { r: 'W', p: P(380, 290) },
    ],
    runners: [8, 9],
    them: [
      { r: 'GK', p: P(636, 210), gk: true, rec: P(658, 210) },
      { r: 'CB', p: P(540, 120), rec: P(580, 155) }, { r: 'CB', p: P(540, 300), rec: P(580, 262) },
      { r: 'RB', p: P(300, 80), rec: P(380, 85), slow: true }, { r: 'LB', p: P(300, 340), rec: P(385, 335), slow: true },
      { r: '6', p: P(480, 210), rec: P(565, 208) }, { r: '8', p: P(420, 110), rec: P(540, 130) }, { r: '10', p: P(400, 300), rec: P(520, 285) },
      { r: 'W', p: P(200, 120), rec: P(300, 125), slow: true }, { r: 'ST', p: P(180, 210), rec: P(272, 228), slow: true }, { r: 'W', p: P(220, 300), rec: P(310, 300), slow: true },
    ],
    surgeUs: [P(595, 175), P(580, 250)], surgeThem: [P(585, 160), P(585, 265)], shot: P(615, 185),
    keepTo: 5, ghost: { p: P(600, 195), txt: 'strike now' },
    grade: {
      counter: {
        k: 'good', t: "Strike — they're still dressed for attack",
        b: "You won it seconds after losing it, right where they build: centre-backs split to the corners of the box, keeper off his line, everyone facing the wrong way. One vertical pass — or the early ball in behind — arrives before any of that gets fixed. This is the most dangerous moment in football, and it's yours.",
      },
      keep: {
        k: 'bad', t: 'You gave them their shape back',
        b: 'Watch them reorganize in the reveal: the split centre-backs pinch in, the keeper backs up, the midfield collapses home. Five seconds of patience bought them everything they needed. High turnovers are strike-now money — recycling one is leaving it on the table.',
      },
      clear: {
        k: 'bad', t: 'Cleared it... from their half?',
        b: "You're forty yards from goal with the ball and they're in chaos — and the answer was to boot it away? That's not safety, that's a fire alarm pulled in an empty building.",
      },
      lateCounter: {
        k: 'bad', t: 'The golden moment expired',
        b: "By the time you played it, the centre-backs had pinched, the keeper was back on his line, and the six had the lane covered. A high turnover is only 'the most dangerous moment in football' for about five seconds — after that it's just possession against a set block.",
      },
    },
    why: {
      rookie: "You stole the ball right next to their goal while they were spread out to pass. Attack instantly — they're not standing where defenders stand.",
      beginner: 'A team building out is shaped to attack, not defend: defenders split wide, keeper high, midfield facing forward. Win it there and every one of those choices becomes a weakness for a few seconds.',
      intermediate: 'The counterpress logic: teams hunt the ball immediately after losing it precisely because the re-steal lands in this golden picture. Won high, the first look is always the most direct one — shot, or the pass that creates a shot.',
      expert: "Turnovers in the attacking third convert to shots at a dramatically higher rate than any buildup pattern — it's why elite pressing sides treat the counterpress as their best playmaker. The five-second rule cuts both ways: they use it to win the ball back; you use it to score before it expires.",
    },
  },
];

// ── the LIVING transition: recovery runners track home, everyone breathes. Verbatim setScene. ──
export function themPosAt(s: CoKScenario, i: number, sec: number): Pt {
  const p = s.them[i];
  const win = s.winSec || 6;
  let px = p.p.x, py = p.p.y;
  if (p.rec) {
    let k = Math.min(1, sec / win);
    if (p.slow) k *= 0.55;                       // the caught men jog — they can't make it
    px = p.p.x + (p.rec.x - p.p.x) * k; py = p.p.y + (p.rec.y - p.p.y) * k;
  }
  px += 2.6 * Math.sin(sec * 1.3 + i * 1.9); py += 2.6 * Math.cos(sec * 1.1 + i * 2.3);
  return { x: px, y: py };
}

export function usPosAt(s: CoKScenario, i: number, sec: number): Pt {
  const p = s.us[i];
  let px = p.p.x, py = p.p.y;
  if (s.runners.includes(i)) px += 5 * Math.sin(sec * 1.6 + i);   // runners make little checking darts
  px += 2.6 * Math.sin(sec * 1.2 + i * 2.1); py += 2.6 * Math.cos(sec * 1.0 + i * 1.7);
  return { x: px, y: py };
}

// Window-bar state at `sec`: fraction remaining + the bar color. Verbatim thresholds.
export function windowState(s: CoKScenario, sec: number): { frac: number; color: string; gone: boolean } {
  if (!s.winSec) return { frac: 1, color: '#8990a3', gone: false };
  const frac = Math.max(0, 1 - sec / s.winSec);
  if (frac <= 0) return { frac: 1, color: '#e24b4a', gone: true };   // GONE: bar re-fills solid red
  return { frac, color: frac < 0.4 ? '#F5A623' : '#14B8A6', gone: false };
}
