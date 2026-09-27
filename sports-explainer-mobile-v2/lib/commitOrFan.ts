// Commit or Fan? — rugby breakdown-decision data (RugbyReadEngine module, pitch 680×420).
// A tackle was just made in front of you. The read: go for the steal, or fan into the
// defensive line? The ONE visible variable across scenarios is the attacking cleaner's
// distance — the read the module teaches. Punishers declared per option, per the standard.
// Language note (law-checked): never "dive in" — arriving players stay on their feet.

import type { ReadOption, ReadScenario } from '../components/academy/RugbyReadEngine';

export const HINT_EMOJI = '💥';
export const OPTIONS: ReadOption[] = [
  { key: 'steal', title: 'Go for the steal', sub: 'hands on the ball, stay on your feet', color: '#F5A623' },
  { key: 'fan', title: 'Fan out', sub: 'forget the ball — set the line', color: '#14B8A6' },
];

// Scene grammar: tackle just made at midfield (their carrier DOWN at ~(352,210), your
// tackler beside him). YOU are the arriving defender. Their cleaner (6) approaches from
// the left — his distance is the scenario variable. Their 9 hovers to recycle.
export const SCENARIOS: ReadScenario[] = [
  {
    key: 'ballShowing',
    name: 'The ball is showing',
    answer: 'steal',
    situation: 'Tackle made — their cleaner is still six metres away. Your call?',
    actors: [
      { label: 'down', kind: 'att', x: 352, y: 210, ball: true },
      { label: 'tackler', kind: 'def', x: 352, y: 238 },
      { label: 'YOU', kind: 'you', x: 385, y: 196 },
      { label: '9', kind: 'att', x: 322, y: 178 },
      { label: '6', kind: 'cover', x: 262, y: 262 },
      { label: 'line', kind: 'def', x: 420, y: 120 },
      { label: 'line', kind: 'def', x: 428, y: 300 },
    ],
    intentArrow: { from: { x: 272, y: 254 }, to: { x: 336, y: 220 }, label: 'their 6, six metres out' },
    reveal: {
      steal: [
        { from: { x: 385, y: 196 }, to: { x: 358, y: 206 }, color: '#14B8A6', label: 'hands on before 6 arrives — turnover', at: { x: 452, y: 250 } },
      ],
      fan: [
        { from: { x: 322, y: 178 }, to: { x: 420, y: 160 }, color: '#e24b4a', label: '9 recycles instantly at your unset line', at: { x: 470, y: 122 } },
      ],
    },
    verdictTitle: {
      steal: 'Steal — you beat the support to the ball',
      fan: 'You fanned — and gave a free recycle',
    },
    exp: {
      kid: {
        steal: 'Right call! Nobody was there to protect the ball yet, so you grabbed it before their helper arrived.',
        fan: 'Backing away was polite — but the ball was just sitting there. Their team picked it up and kept going.',
      },
      beginner: {
        steal: "Good read. The steal is a race with their cleaner — six metres away means you win it. Ball's exposed, tackler made, you're on your feet: take it.",
        fan: 'Fanning is right when the contest is lost — this one was winnable. Their 6 was six metres away; you gave up a turnover that was on the table.',
      },
      intermediate: {
        steal: 'The jackal window is the gap between tackle and cleanout. Six metres of cleaner-distance is roughly a full second — enough to win the ball or force the penalty for holding on.',
        fan: 'Every uncontested ruck is a free platform. With the cleaner that far out, contesting was low-risk — instead their 9 got front-foot ball against a line still finding its spacing.',
      },
      expert: {
        steal: 'Textbook jackal maths: tackler rolls, you arrive through the gate on your feet, and support is 1s away — either you lift the ball or you force the 9 to dig slow ball. Both outcomes beat fanning.',
        fan: "Fanning here defends a phase you didn't need to concede. Cleaner at six metres with an isolated carrier is exactly the picture every openside hunts — declining it hands the attack tempo for free.",
      },
    },
  },
  {
    key: 'cleanerClose',
    name: 'Support is flying in',
    answer: 'fan',
    situation: 'Same tackle — but their cleaner is two metres away and arriving hot. Your call?',
    actors: [
      { label: 'down', kind: 'att', x: 352, y: 210, ball: true },
      { label: 'tackler', kind: 'def', x: 352, y: 238 },
      { label: 'YOU', kind: 'you', x: 385, y: 196 },
      { label: '9', kind: 'att', x: 322, y: 178 },
      { label: '6', kind: 'cover', x: 330, y: 248 },
      { label: 'line', kind: 'def', x: 420, y: 120 },
      { label: 'line', kind: 'def', x: 428, y: 300 },
    ],
    intentArrow: { from: { x: 334, y: 240 }, to: { x: 350, y: 220 }, label: 'their 6 — two metres, full speed' },
    reveal: {
      fan: [
        { from: { x: 385, y: 196 }, to: { x: 430, y: 172 }, color: '#14B8A6', label: 'line set — nothing cheap for their 9', at: { x: 470, y: 132 } },
      ],
      steal: [
        { from: { x: 336, y: 244 }, to: { x: 390, y: 200 }, color: '#e24b4a', label: '6 blasts you off the ball — and the ref is watching your hands', at: { x: 430, y: 280 } },
      ],
    },
    verdictTitle: {
      fan: 'Fan — that contest was already lost',
      steal: 'You reached in — and 6 arrived first',
    },
    exp: {
      kid: {
        fan: 'Right call. Their helper was almost there — fighting for the ball would just get you knocked over. You lined up to defend instead.',
        steal: 'Their helper got there first and bumped you away. Now you were on the ground and your team was missing a defender.',
      },
      beginner: {
        fan: "Good read. The steal is a race — and two metres means you lose it. Don't spend a defender on a contest that's gone; get your line set.",
        steal: 'Two metres of cleaner-distance is no window at all. You got cleaned out, and worse: a half-beaten jackal is how holding-on penalties happen.',
      },
      intermediate: {
        fan: "The counting rule: every player you commit to a lost ruck is one missing from the line. Recognising a dead contest and fanning IS the positive play — it's why good defenses look passive at rucks.",
        steal: "You bought the bait. A contest you enter late doesn't just fail — it takes you out of the next phase and risks the penalty. The cleaner's distance was the whole read, and it said no.",
      },
      expert: {
        fan: "Ruck economics: their 6 arriving inside a second makes the steal EV-negative — best case slow hands, worst case pinged or cleaned. Width wins the next phase; the line-set is the professional choice.",
        steal: 'Committing into an arriving cleanout concedes the collision AND the defensive integrity — two losses in one action. Elite opensides are defined by the contests they decline.',
      },
    },
  },
  {
    key: 'lastGuard',
    name: "You're the last guard",
    answer: 'fan',
    situation: "The ball's showing — but you're the only defender on this whole side. Your call?",
    actors: [
      { label: 'down', kind: 'att', x: 352, y: 210, ball: true },
      { label: 'tackler', kind: 'def', x: 352, y: 238 },
      { label: 'YOU', kind: 'you', x: 385, y: 196 },
      { label: '9', kind: 'att', x: 322, y: 178 },
      { label: '12', kind: 'att', x: 300, y: 120 },
      { label: '6', kind: 'cover', x: 268, y: 258 },
    ],
    intentArrow: { from: { x: 316, y: 172 }, to: { x: 420, y: 150 }, label: '9 is eyeing your side' },
    reveal: {
      fan: [
        { from: { x: 385, y: 196 }, to: { x: 425, y: 158 }, color: '#14B8A6', label: 'you hold the edge — 9 has nowhere cheap', at: { x: 480, y: 120 } },
      ],
      steal: [
        { from: { x: 322, y: 178 }, to: { x: 470, y: 150 }, color: '#e24b4a', label: '9 snipes the empty grass you were guarding', at: { x: 500, y: 190 } },
      ],
    },
    verdictTitle: {
      fan: 'Fan — the ball is tempting, your job is the edge',
      steal: 'You went for it — and left your whole side empty',
    },
    exp: {
      kid: {
        fan: "Right call. You were the only one guarding your side — if you fight for the ball and lose, there's nobody left at all.",
        steal: 'The ball looked easy to grab — but you were the only guard. When it didn’t work, their player ran into all the space behind you.',
      },
      beginner: {
        fan: 'Good read. The steal question is never just "can I win it?" — it’s "what does it cost if I don’t?" As the last defender on this side, the cost is a clean break. Too expensive.',
        steal: 'Even a winnable contest can be the wrong one. You were the edge — the moment you leaned in, their 9 had a free lane into everything you were protecting.',
      },
      intermediate: {
        fan: 'Risk-weighted jackaling: the same exposed ball is a "go" mid-line and a "no" when you’re the last guard. Position in the defensive structure changes the answer — that’s the layer under the cleaner-distance read.',
        steal: 'The contest odds were fine; the insurance wasn’t. A failed steal mid-line costs a phase — a failed steal as the last guard costs thirty metres. Same action, different price.',
      },
      expert: {
        fan: 'Two reads stack here: contest-winnable (yes) and failure-tolerable (no). Elite breakdown decisions weight the second — structural exposure trumps turnover EV every time the edge is unmanned.',
        steal: 'You conflated ball-odds with team-odds. Guard-position defenders decline even 70% contests, because the 30% tail is a try. The lesson: WHERE you are changes WHETHER you go.',
      },
    },
  },
];
