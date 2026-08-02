// Press Trigger — scenario data + pure scene math (VERBATIM from coaches-corner-spikes/press-trigger.html).
// 11v11: they build out from the LEFT (attacking right); the ball follows a keyframed pass sequence
// over t=0..100. The PRESS window has TWO green phases — cut the pass in flight (strike..arrive) and
// trap the receiver (arrive..hold) — with early/late punished. Everything on the pitch is a pure
// function of t (setThem / setBlock / ballLive from the prototype), so it animates live AND scrubs
// for VAR-style review after the call. All fan-facing strings are prose only — no coordinates,
// variable names, internal keys, or debug tokens. Zero React Native imports (data + math only).

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type PressKind = 'early' | 'cut' | 'good' | 'late' | 'hold';

export interface ThemPlayer { id: string; p: Pt; gk?: boolean }
export interface PressWindow { strike: number; arrive: number; hold: number; from: string; to: string }
export interface LateOut { to: Pt; carry: Pt | null; label: string }
export interface SeqKey { t: number; h: string }
export interface PressVerdict { t: string; b: string }

export interface PressScenario {
  tab: string;
  window: PressWindow | null;      // null = the bait scenario: no trigger ever appears (hold is correct)
  lateOut?: LateOut;
  them: ThemPlayer[];
  us: Pt[];
  usR: string[];                   // our press roles, parallel to `us`
  overload?: boolean;              // bait scenario: draws the free-six / spare-men callouts
  seq: SeqKey[];                   // ball keyframes: {t, holder id}
  verd: Partial<Record<PressKind, PressVerdict>>;
  why: Record<Depth, string>;
}

// Role labels for their build-out shape (every man identified — the Onside rule).
export const ROLE: Record<string, string> = {
  gk: 'GK', rcb: 'CB', lcb: 'CB', rb: 'RB', lb: 'LB', six: '6', eight: '8', ten: '10', lw: 'W', rw: 'W', nine: 'ST',
};

const P = (x: number, y: number): Pt => ({ x, y });
const lerp = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const SCENARIOS: PressScenario[] = [
  {
    tab: 'Touchline trap', window: { strike: 25, arrive: 40, hold: 62, from: 'rcb', to: 'lb' },
    lateOut: { to: P(430, 34), carry: P(560, 62), label: 'DOWN THE LINE' },
    them: [
      { id: 'gk', p: P(52, 210), gk: true }, { id: 'rcb', p: P(140, 140) }, { id: 'lcb', p: P(140, 285) },
      { id: 'lb', p: P(218, 26) }, { id: 'rb', p: P(218, 394) }, { id: 'six', p: P(236, 212) },
      { id: 'eight', p: P(300, 255) }, { id: 'ten', p: P(378, 182) },
      { id: 'lw', p: P(552, 68) }, { id: 'nine', p: P(575, 210) }, { id: 'rw', p: P(552, 352) },
    ],
    us: [P(305, 175), P(318, 92), P(318, 320), P(382, 212), P(430, 120), P(430, 300),
      P(595, 75), P(615, 165), P(615, 260), P(595, 350), P(657, 210)],
    usR: ['ST', 'W', 'W', '8', 'CM', 'CM', 'RB', 'CB', 'CB', 'LB', 'GK'],
    seq: [{ t: 0, h: 'gk' }, { t: 14, h: 'rcb' }, { t: 40, h: 'lb' }, { t: 100, h: 'lb' }],
    verd: {
      early: { t: 'Jumped on the wrong man', b: 'You pressed the centre-back while he still had easy outs — one clip inside to their free six and your first line is beaten, the whole press playing catch-up. A comfortable centre-back is bait, not a trigger.' },
      cut: { t: 'Cut out — you jumped the pass', b: "You went while the ball was in the air — the one moment it belongs to nobody. Your nearest presser read the line of the pass and met it before the fullback could. The trap didn't even need the touchline: the travel time WAS the weakness." },
      good: { t: 'Trap sprung — the touchline is your extra defender', b: "You went as the ball travelled to the fullback: he receives pinned against the line, facing his own half, with your winger arriving and the striker cutting the pass back. Half the pitch is walled off by the paint. This is what 'trigger' means." },
      late: { t: 'The moment came and went', b: "The fullback had time to take a touch, turn, and play forward down the line. A press that arrives after the receiver is set isn't pressure — it's jogging." },
    },
    why: {
      rookie: "Don't chase the ball everywhere. Wait for the pass toward the sideline — the sideline traps him for you — then everyone sprints at once.",
      beginner: "The trigger here is the pass into the fullback: while the ball travels he can't do anything, and when it arrives he's got the touchline behind him and his body facing the wrong way. Press the travel, not the man.",
      intermediate: 'A press jumps on cues, together: your winger takes the fullback, the striker curves his run to shadow the pass back inside, and the near midfielder jumps the down-the-line outlet. One presser is a chase; three synchronized is a cage.',
      expert: "Good pressing teams often SHOW the fullback on purpose — the striker's angled stance invites that pass because it's the one reception the shape is built to punish. The trigger was chosen before kickoff; the game just delivers it.",
    },
  },
  {
    tab: 'The back pass', window: { strike: 15, arrive: 36, hold: 58, from: 'rcb', to: 'gk' },
    lateOut: { to: P(150, 280), carry: null, label: 'RESET — comfortable again' },
    them: [
      { id: 'gk', p: P(52, 210), gk: true }, { id: 'rcb', p: P(150, 145) }, { id: 'lcb', p: P(150, 280) },
      { id: 'lb', p: P(224, 30) }, { id: 'rb', p: P(224, 390) }, { id: 'six', p: P(244, 210) },
      { id: 'eight', p: P(305, 250) }, { id: 'ten', p: P(380, 185) },
      { id: 'lw', p: P(552, 68) }, { id: 'nine', p: P(575, 210) }, { id: 'rw', p: P(552, 352) },
    ],
    us: [P(300, 180), P(315, 95), P(315, 325), P(380, 210), P(430, 125), P(430, 295),
      P(595, 75), P(615, 165), P(615, 260), P(595, 350), P(657, 210)],
    usR: ['ST', 'W', 'W', '8', 'CM', 'CM', 'RB', 'CB', 'CB', 'LB', 'GK'],
    seq: [{ t: 0, h: 'rcb' }, { t: 36, h: 'gk' }, { t: 100, h: 'gk' }],
    verd: {
      early: { t: 'Pressed a man with answers', b: 'The centre-back had the keeper behind him, the six inside, and the fullback wide — three exits. You sprinted at the one player on the pitch who was completely comfortable, and he simply used an exit.' },
      cut: { t: 'Cut out — the back pass never arrived', b: "You sprang as the ball rolled backward and your striker beat it to the keeper's foot. A back pass stolen in flight is the most dangerous turnover in football — the net is twelve yards away and empty." },
      good: { t: 'On the back pass — now he has to go long', b: 'The moment the ball rolled backwards you went. The keeper receives facing his own net with your striker closing: no time to set, no short option, so it\'s a hurried clearance — and your midfield is set underneath it to win the second ball.' },
      late: { t: 'He reset the whole picture', b: 'Given two free seconds, the keeper took a touch, opened his body, and started the build-up again like nothing happened. A back pass is only a trigger while the panic is fresh.' },
    },
    why: {
      rookie: 'A pass BACKWARD is your green light: the player receiving it is facing his own goal and can\'t see the field. Sprint at him.',
      beginner: 'The back pass trigger works because it stacks problems: bad body shape, ball moving toward his own net, and every teammate now in front of him. Arrive with the ball and he has one option — hoof it.',
      intermediate: "The prize isn't always the tackle — forcing a rushed long ball IS winning the press, because your midfield outnumbers theirs under the dropping ball. Turnover by clearance counts the same.",
      expert: "Elite pressers curve the run to the keeper's kicking side, taking away the short reset while arriving — one runner removes two options. That's why one striker can press two players: geometry, not speed.",
    },
  },
  {
    tab: 'The bait — hold', window: null,
    them: [
      { id: 'gk', p: P(52, 210), gk: true }, { id: 'rcb', p: P(150, 145) }, { id: 'lcb', p: P(150, 280) },
      { id: 'lb', p: P(224, 30) }, { id: 'rb', p: P(224, 394) }, { id: 'six', p: P(250, 210) },
      { id: 'eight', p: P(320, 260) }, { id: 'ten', p: P(445, 328) },
      { id: 'lw', p: P(548, 70) }, { id: 'nine', p: P(575, 210) }, { id: 'rw', p: P(535, 345) },
    ],
    us: [P(305, 180), P(318, 100), P(330, 300), P(385, 205), P(440, 130), P(430, 255),
      P(595, 75), P(615, 165), P(615, 260), P(595, 350), P(657, 210)],
    usR: ['ST', 'W', 'W', '8', 'CM', 'CM', 'RB', 'CB', 'CB', 'LB', 'GK'],
    overload: true,
    seq: [{ t: 0, h: 'gk' }, { t: 18, h: 'lcb' }, { t: 52, h: 'rcb' }, { t: 84, h: 'lcb' }, { t: 100, h: 'lcb' }],
    verd: {
      early: { t: 'You took the bait', b: "They're holding the ball slowly ON PURPOSE. Their six was free between your lines and the far side is two-on-one — the instant you jumped, one pass beat your first wave and they broke into the space your press left behind. Some possession is a fishing lure." },
      good: { t: '', b: '' },
      hold: { t: "You didn't blink — and they got nothing", b: 'No trigger ever appeared: their pivot stayed free, the weak side stayed loaded, and every receiver was comfortable. So you stayed compact, they passed sideways all day, and the dangerous half of the pitch stayed locked. Not pressing was the aggressive choice.' },
    },
    why: {
      rookie: 'Trick one: sometimes the smart move is to NOT chase at all. If they have a free man in the middle, running at the ball just opens a door for him.',
      beginner: "Before jumping, count what's behind your first wave: their six is unmarked and their far side has a spare man. Press into that and you're not pressing — you're volunteering to be passed around.",
      intermediate: "A press has prerequisites: the free man covered, the far side balanced, the receiver uncomfortable. Miss any one and the correct 'press' is patience — stay compact, protect the middle, wait for a real trigger.",
      expert: 'Good possession teams manufacture this picture deliberately — slow circulation to tempt the jump, then one line-breaking pass into the six the moment you bite. Reading when NOT to press is the difference between a pressing team and a tired one.',
    },
  },
];

// ── The keyframed ball ANCHOR (over home positions) — drives `deep` and the block shift. ──
export function ballAnchorAt(s: PressScenario, t: number): Pt {
  const home = (id: string) => s.them.find(p => p.id === id)!.p;
  for (let i = 0; i < s.seq.length - 1; i++) {
    const a = s.seq[i], b = s.seq[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const f = (t - a.t) / span;
      const travel = Math.max(0, (f - 0.4) / 0.6);
      return lerp(home(a.h), home(b.h), a.h === b.h ? 0 : travel);
    }
  }
  return home(s.seq[s.seq.length - 1].h);
}

// ── THEY move too: the build-out offers for the keeper. `deep` is 1 with the keeper on the ball,
//    0 by midfield. Pure f(t), so it scrubs. Verbatim from setThem. ──
export function themPosAt(s: PressScenario, id: string, t: number): Pt {
  const i = s.them.findIndex(p => p.id === id);
  const p = s.them[i];
  const b = ballAnchorAt(s, t);
  const deep = clamp01((230 - b.x) / 170);
  let px = p.p.x, py = p.p.y;
  if (p.id === 'rcb' || p.id === 'lcb') { px -= 26 * deep; py += (py < 210 ? -22 : 22) * deep; }
  else if (p.id === 'rb' || p.id === 'lb') { px -= 38 * deep; }
  else if (p.id === 'six') { px -= 16 * deep; }
  px += 2.5 * Math.sin(t * 0.12 + i * 1.9); py += 2.5 * Math.cos(t * 0.10 + i * 2.3);
  return { x: px, y: py };
}

// ── THE BLOCK SHIFTS WITH THE BALL: home + a capped shift toward the ball — front line swings
//    hardest, back line least, keeper barely. ST bends onto the ball→six lane (cover-shadow);
//    the ball-side winger hunts his fullback, the far one tucks in. Verbatim from setBlock. ──
const LINEW = {
  front: { x: 0.22, y: 0.40, cx: 26, cy: 55 },
  mid: { x: 0.15, y: 0.28, cx: 18, cy: 38 },
  back: { x: 0.08, y: 0.14, cx: 10, cy: 20 },
  gk: { x: 0.03, y: 0.05, cx: 6, cy: 8 },
};
const lineOf = (role: string) => role === 'GK' ? 'gk' : (role === 'RB' || role === 'CB' || role === 'LB') ? 'back' : (role === 'ST' || role === 'W') ? 'front' : 'mid';

export function usPosAt(s: PressScenario, i: number, t: number): Pt {
  const home = s.us[i];
  const role = s.usR[i];
  const b = ballAnchorAt(s, t);
  const six = s.them.some(p => p.id === 'six') ? themPosAt(s, 'six', t) : { x: 240, y: 210 };
  const w = LINEW[lineOf(role)];
  let px = home.x + Math.max(-w.cx, Math.min(w.cx, (b.x - 160) * w.x));
  let py = home.y + Math.max(-w.cy, Math.min(w.cy, (b.y - 210) * w.y));
  if (role === 'ST') {
    const lane = lerp(b, six, 0.45);
    px += (lane.x - px) * 0.55; py += (lane.y - py) * 0.55;
  } else if (role === 'W') {
    const fb = home.y < 210 ? s.them.find(p => p.id === 'lb') : s.them.find(p => p.id === 'rb');
    if (fb) {
      const sameSide = (home.y < 210) === (b.y < 210);
      const k = sameSide ? 0.38 : 0.10;
      px += (fb.p.x - px) * k * 0.6; py += (fb.p.y - py) * k;
    }
  }
  px += 3.2 * Math.sin(t * 0.13 + i * 2.1); py += 3.2 * Math.cos(t * 0.11 + i * 1.7);
  return { x: px, y: py };
}

// ── Ball drawn between CURRENT player positions — passes travel to where the receiver IS. ──
export function ballLiveAt(s: PressScenario, t: number): Pt {
  for (let i = 0; i < s.seq.length - 1; i++) {
    const a = s.seq[i], b2 = s.seq[i + 1];
    if (t >= a.t && t <= b2.t) {
      const pa = themPosAt(s, a.h, t), pb = themPosAt(s, b2.h, t);
      const f = (t - a.t) / ((b2.t - a.t) || 1);
      const travel = Math.max(0, (f - 0.4) / 0.6);
      return lerp(pa, pb, a.h === b2.h ? 0 : travel);
    }
  }
  return themPosAt(s, s.seq[s.seq.length - 1].h, t);
}

// ── Which segment of the pass sequence, and is the ball airborne? Verbatim from segAt. ──
export function segAt(s: PressScenario, t: number): { holder: string; receiver: string; inFlight: boolean } {
  for (let i = 0; i < s.seq.length - 1; i++) {
    const a = s.seq[i], b = s.seq[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / ((b.t - a.t) || 1);
      return { holder: a.h, receiver: b.h, inFlight: a.h !== b.h && f > 0.4 };
    }
  }
  const last = s.seq[s.seq.length - 1].h;
  return { holder: last, receiver: last, inFlight: false };
}

// ── The press call, classified against the window at time t. Verbatim from pressNow. ──
export function classifyPress(s: PressScenario, t: number): { kind: PressKind; targetId: string } {
  const w = s.window;
  const seg = segAt(s, t);
  if (!w) return { kind: 'early', targetId: seg.inFlight ? seg.receiver : seg.holder };
  if (t < w.strike) return { kind: 'early', targetId: seg.inFlight ? seg.receiver : seg.holder };
  if (t < w.arrive) return { kind: 'cut', targetId: w.to };
  if (t <= w.hold) return { kind: 'good', targetId: w.to };
  return { kind: 'late', targetId: w.to };
}

// ── VAR-review state line for a scrub position (prose verbatim; emph = the green trigger bands). ──
export function scrubMessage(s: PressScenario, t: number): { text: string; emph: boolean } {
  const w = s.window;
  if (!w) return { text: 'No trigger — their six stays free', emph: false };
  if (t < w.strike) return { text: 'Too early — he still has outs', emph: false };
  if (t < w.arrive) return { text: 'Ball in flight — it belongs to nobody. Go NOW and it\'s cut out', emph: true };
  if (t <= w.hold) return { text: 'Reception — the receiver is pinned. The trap is live', emph: true };
  return { text: 'Too late — he\'s set', emph: false };
}

// Post-resolve state line, by outcome. Verbatim from resolve().
export function resolvedStateLine(kind: PressKind): string {
  return kind === 'good' ? 'Sprung on the reception'
    : kind === 'cut' ? 'Cut it out in flight — perfect'
      : kind === 'hold' ? 'Held all the way — correct'
        : kind === 'early' ? 'Jumped early' : 'Never sprung it';
}

// Timeline bands (left%, width%, color) for the review bar. Verbatim colors from resolve().
export function timelineBands(s: PressScenario): { left: number; width: number; color: string }[] {
  const w = s.window;
  if (!w) return [{ left: 0, width: 100, color: '#8990a3' }];
  return [
    { left: 0, width: w.strike, color: '#F5A623' },
    { left: w.strike, width: w.arrive - w.strike, color: '#7be0bf' },   // light green: cut the pass in flight
    { left: w.arrive, width: w.hold - w.arrive, color: '#14B8A6' },     // deep green: trap the receiver
    { left: w.hold, width: 100 - w.hold, color: '#e24b4a' },
  ];
}
