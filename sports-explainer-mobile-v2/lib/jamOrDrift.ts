// Jam or Drift? — module data (rugby defensive-read module on the RugbyPitch 680×420 space).
// You are the LAST DEFENDER facing an overlap. The read: rush the carrier (jam), give ground
// sideways (drift), or shoot the outside man. Authored to COACHES_CORNER_AUTHORING_STANDARD:
// every wrong option is punished by a NAMED attacker, declared here in data before render.
// Law-checked in the 2026-09 multi-AI critique round (no law content in this module — pure read).
// Attack plays LEFT→RIGHT. Coordinates are load-bearing; tuned on-canvas, do not eyeball-adjust.

import type { ReadOption, ReadScenario } from '../components/academy/RugbyReadEngine';

export const HINT_EMOJI = '🛡️';
export const OPTIONS: ReadOption[] = [
  { key: 'jam', title: 'Jam the carrier', sub: 'rush 13 now', color: '#e24b4a' },
  { key: 'drift', title: 'Drift', sub: 'give ground, buy time', color: '#14B8A6' },
  { key: 'shoot', title: 'Shoot the spare man', sub: 'attack 14 early', color: '#F5A623' },
];

// Actor geometry notes:
//  • You (the last defender) guard the right edge of the defensive line.
//  • Their 13 carries; their 14 is the spare man OUTSIDE (toward the top touchline, y small).
//  • The cover flanker (when present) sprints across from deep-left — his DISTANCE is the read.
export const SCENARIOS: ReadScenario[] = [
  {
    key: 'coverComing',
    name: 'Cover is coming',
    answer: 'drift',
    situation: "Two on one — but your 7 is scrambling across. What's your move?",
    actors: [
      { label: '13', kind: 'att', x: 330, y: 205, ball: true },
      { label: '14', kind: 'att', x: 322, y: 92 },
      { label: 'YOU', kind: 'you', x: 432, y: 168 },
      { label: '7', kind: 'cover', x: 258, y: 330 },
    ],
    intentArrow: { from: { x: 268, y: 318 }, to: { x: 360, y: 240 }, label: 'sprinting across' },
    reveal: {
      drift: [
        { from: { x: 432, y: 168 }, to: { x: 492, y: 128 }, color: '#14B8A6', label: 'give grass, not the try line', at: { x: 470, y: 96 } },
        { from: { x: 360, y: 240 }, to: { x: 420, y: 214 }, color: '#14B8A6', label: '7 arrives — 2-v-2', at: { x: 420, y: 262 } },
      ],
      jam: [
        { from: { x: 336, y: 196 }, to: { x: 330, y: 104 }, color: '#e24b4a', label: '13 releases 14 the moment you commit', at: { x: 420, y: 60 } },
        { from: { x: 330, y: 92 }, to: { x: 600, y: 60 }, color: '#e24b4a', label: 'clean run down the touchline', at: { x: 520, y: 94 } },
      ],
      shoot: [
        { from: { x: 330, y: 205 }, to: { x: 560, y: 190 }, color: '#e24b4a', label: '13 keeps it — straight through your old spot', at: { x: 490, y: 226 } },
      ],
    },
    verdictTitle: {
      drift: 'Drift — trade grass for time',
      jam: 'You jammed — 13 just needed one pass',
      shoot: 'You shot the spare man — 13 kept it',
    },
    exp: {
      kid: {
        drift: "Right call. You backed up sideways and slowed them down, and your teammate caught up. Now it's a fair fight.",
        jam: 'You ran at the ball carrier, so he just passed it to his open friend — nobody was left to stop him.',
        shoot: 'You ran at the player WITHOUT the ball — so the one WITH the ball ran straight through where you were standing.',
      },
      beginner: {
        drift: 'Good read. Outnumbered defenders buy time: drifting kept both attackers in front of you until your 7 arrived to even it up.',
        jam: "Tempting — but the carrier's easiest beat is a pass. Committing to 13 hands 14 a free touchline run. Punished by the release pass.",
        shoot: 'Shooting the spare man leaves the carrier your channel. 13 never has to pass — he runs through the space you left.',
      },
      intermediate: {
        drift: 'With cover one pass away, your job is delay, not the tackle. Drifting holds the 2-v-1 unplayed until the numbers equalise — the attack loses its window.',
        jam: "Jamming only works when the pass is covered — here it isn't. You gave 13 the trigger he was waiting for: your commitment IS his pass cue.",
        shoot: "Shooting the receiver gambles that the pass is already gone. It wasn't. You turned a 2-v-1 into a 1-v-0 for the carrier.",
      },
      expert: {
        drift: "Classic pendulum defence: outside shoulder on 13, never square, conceding the inside you know 7 is closing. The 2-v-1 dies of old age — that's the win condition.",
        jam: 'Your line-speed read was right for a 2-v-2, but this is a 2-v-1 with cover in transit. Jamming collapses the drift ladder — 14 receives beyond every recovering defender.',
        shoot: 'Pre-shooting the width only pays against a telegraphed early ball. 13 is a runner first — attacking his pass target instead of his run lane concedes the gainline untouched.',
      },
    },
  },
  {
    key: 'coverArrived',
    name: 'Cover has arrived',
    answer: 'jam',
    situation: 'Your 7 is on 14 now. Same picture — different numbers. Your move?',
    actors: [
      { label: '13', kind: 'att', x: 330, y: 205, ball: true },
      { label: '14', kind: 'att', x: 322, y: 92 },
      { label: 'YOU', kind: 'you', x: 432, y: 168 },
      { label: '7', kind: 'cover', x: 380, y: 112 },
    ],
    reveal: {
      jam: [
        { from: { x: 432, y: 168 }, to: { x: 352, y: 200 }, color: '#14B8A6', label: 'tackle behind the gainline', at: { x: 400, y: 250 } },
        { from: { x: 380, y: 112 }, to: { x: 348, y: 98 }, color: '#14B8A6', label: '7 owns the pass', at: { x: 300, y: 66 } },
      ],
      drift: [
        { from: { x: 330, y: 205 }, to: { x: 470, y: 205 }, color: '#e24b4a', label: '13 carries into free grass you gave him', at: { x: 470, y: 246 } },
      ],
      shoot: [
        { from: { x: 330, y: 205 }, to: { x: 560, y: 190 }, color: '#e24b4a', label: '13 runs the channel two of you left', at: { x: 480, y: 230 } },
      ],
    },
    verdictTitle: {
      jam: 'Jam — the pass is covered, so the carrier is yours',
      drift: 'You drifted — and gave away ten free metres',
      shoot: 'You doubled the man your 7 already had',
    },
    exp: {
      kid: {
        jam: 'Right call! Your teammate was guarding the open player, so you could run up and tackle the one with the ball.',
        drift: 'Backing up was safe before — but your teammate arrived. Backing up now just let them walk forward for free.',
        shoot: 'Your teammate was already covering that player. Two of you on one attacker means the other one runs free.',
      },
      beginner: {
        jam: 'Good read. Jam only when the pass is covered — with your 7 on 14, the release valve is shut, so pressure the carrier.',
        drift: 'Drifting is the outnumbered play — you were NOT outnumbered anymore. Giving ground with even numbers is free metres for 13.',
        shoot: "Shooting 14 doubles a covered man. The 2-v-2 you'd won turns back into 1-v-0 for the carrier.",
      },
      intermediate: {
        jam: 'The trigger flipped: cover on the receiver converts your drift assignment into a press assignment. Line speed now takes the carrier behind the gainline with his pass dead.',
        drift: "Yesterday's answer, today's mistake — the read isn't 'always drift', it's 'drift while outnumbered'. Numbers even, hesitation is the error.",
        shoot: 'Duplicate coverage is the quiet killer: two defenders on one threat always frees another. Trust your 7 to own his man.',
      },
      expert: {
        jam: 'With the edge sealed, squeezing space beats guarding it: jamming on the even count denies 13 both the pass (covered) and the carry (gainline pressure). Textbook connection defence.',
        drift: 'Drifting against even numbers surrenders the collision line and invites the offload chain — you defended a picture from two phases ago.',
        shoot: 'Vacating the interior channel to double the width is how wrapped-around blindside tries happen. Defensive spacing is a contract; you broke yours.',
      },
    },
  },
  {
    key: 'touchlineFriend',
    name: 'The touchline helps',
    answer: 'drift',
    situation: "Two on one tight to the touchline — no cover this time. What's your move?",
    actors: [
      { label: '13', kind: 'att', x: 330, y: 120, ball: true },
      { label: '14', kind: 'att', x: 322, y: 48 },
      { label: 'YOU', kind: 'you', x: 432, y: 90 },
    ],
    reveal: {
      drift: [
        { from: { x: 432, y: 90 }, to: { x: 510, y: 52 }, color: '#14B8A6', label: 'shepherd them into the touchline', at: { x: 520, y: 110 } },
        { from: { x: 322, y: 48 }, to: { x: 560, y: 22 }, color: '#F5A623', label: 'the sideline is your extra defender', at: { x: 460, y: 150 } },
      ],
      jam: [
        { from: { x: 336, y: 112 }, to: { x: 330, y: 58 }, color: '#e24b4a', label: '13 flips it to 14 — you never touch him', at: { x: 430, y: 30 } },
      ],
      shoot: [
        { from: { x: 330, y: 120 }, to: { x: 540, y: 170 }, color: '#e24b4a', label: '13 cuts back inside — the whole pitch is open', at: { x: 470, y: 208 } },
      ],
    },
    verdictTitle: {
      drift: 'Drift — let the touchline defend with you',
      jam: 'You jammed — the flip pass beat you again',
      shoot: 'You shot outside — 13 cut back into open country',
    },
    exp: {
      kid: {
        drift: 'Right call! The white line is like an extra teammate — if you push them toward it, they run out of room all by themselves.',
        jam: 'You ran at the ball carrier and he just tossed it over to his friend by the sideline. Nobody left to chase him.',
        shoot: 'You ran to the outside player, so the one with the ball turned back inside — and the whole field was open.',
      },
      beginner: {
        drift: 'Good read. Near touch, drifting does double duty: you delay the pass AND squeeze their space against the sideline until there is none left.',
        jam: 'Even with no cover coming, jamming a 2-v-1 loses to one pass. Punished by the flip to 14 — and out here nobody is left to chase.',
        shoot: "Overplaying the touchline man opens the cutback. 13's counter is inside, where you came from — and it's all grass.",
      },
      intermediate: {
        drift: "No cover means you can't win the ball — so win the geography. Angling your drift toward touch turns the sideline into the second defender this 2-v-1 says you don't have.",
        jam: 'The touchline compresses THEIR space, not your risk: committing early still concedes the release, and the narrow side has no second wave to save you.',
        shoot: 'Shooting the wide man is doubly wrong here — the cutback lane you vacated points back into the open field, the one direction the touchline was helping you close.',
      },
      expert: {
        drift: 'Sideline-as-defender is the oldest scramble principle: refuse the inside shoulder, force the play to the boundary, and let touch make the tackle. A 2-v-1 conceded into touch is a defensive win.',
        jam: "A jam needs either a covered pass or a second tackler. You have neither — the boundary can't punish a ball that's already gone.",
        shoot: 'Attacking width against a boundary-side overlap inverts the leverage: the space you must protect is infield. Concede the touchline run and trust the chase; never open the cutback.',
      },
    },
  },
];
