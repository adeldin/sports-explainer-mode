// One More Phase or Ship It Wide? — rugby attacking-patience data (RugbyReadEngine,
// pitch 680×420). You're the 10 with an apparent overlap wide. The whole read hinges
// on ONE named defender — their 13 — and whether he's free to drift. Rewritten per the
// 2026-09 critique: "an overlap is forming" must never prejudge the answer; the scene
// shows WHY the overlap is or isn't ready. Punishers declared per option.

import type { ReadOption, ReadScenario } from '../components/academy/RugbyReadEngine';

export const HINT_EMOJI = '🎯';
export const OPTIONS: ReadOption[] = [
  { key: 'crash', title: 'One more carry', sub: 'fix a defender first', color: '#e24b4a' },
  { key: 'ship', title: 'Ship it wide', sub: 'two passes, hit the edge', color: '#14B8A6' },
];

// Scene grammar: attack L→R. Your ruck at (250,270); YOU (10) at (290,230) with ball;
// your 12 pod beside you; your 13/14 stacked wide toward the top. THEIR 13 is the hinge;
// their winger and fold defenders complete the picture.
export const SCENARIOS: ReadScenario[] = [
  {
    key: 'thirteenFree',
    name: 'Their 13 is loose',
    answer: 'crash',
    situation: 'Numbers wide — but look at their 13: square, unbitten, free to drift. Your call, 10?',
    actors: [
      { label: 'ruck', kind: 'att', x: 250, y: 270 },
      { label: 'YOU', kind: 'you', x: 290, y: 230, ball: true },
      { label: '12', kind: 'att', x: 300, y: 185 },
      { label: '13', kind: 'att', x: 315, y: 130 },
      { label: '14', kind: 'att', x: 320, y: 62 },
      { label: '13', kind: 'def', x: 390, y: 150 },
      { label: '14', kind: 'def', x: 400, y: 70 },
      { label: '7', kind: 'def', x: 360, y: 240 },
    ],
    intentArrow: { from: { x: 396, y: 142 }, to: { x: 420, y: 95 }, label: 'their 13 can slide' },
    reveal: {
      crash: [
        { from: { x: 290, y: 230 }, to: { x: 310, y: 180 }, color: '#14B8A6', label: '12 crashes — their 13 must bite', at: { x: 430, y: 220 } },
        { from: { x: 390, y: 150 }, to: { x: 360, y: 185 }, color: '#F5A623', label: 'now the edge is REALLY open', at: { x: 490, y: 110 } },
      ],
      ship: [
        { from: { x: 390, y: 150 }, to: { x: 435, y: 78 }, color: '#e24b4a', label: 'their 13 drifts across during your two passes', at: { x: 480, y: 260 } },
        { from: { x: 435, y: 78 }, to: { x: 340, y: 60 }, color: '#e24b4a', label: 'your winger is swallowed at the catch', at: { x: 460, y: 34 } },
      ],
    },
    verdictTitle: {
      crash: 'One more carry — now the overlap is real',
      ship: 'You shipped early — their 13 beat the ball wide',
    },
    exp: {
      kid: {
        crash: 'Right call! One more run made their defender come in to help — NOW your outside friends are truly open.',
        ship: 'The pass looked open, but their defender slid over while the ball was flying and tackled your winger.',
      },
      beginner: {
        crash: 'Good read. An overlap only counts if the defenders can’t reach it. Their 13 was free — one crash forces him to commit, and THEN the wide ball wins.',
        ship: 'Two passes take time — and a free defender uses that time to drift. Their 13 arrived with the ball. Fix him first, then ship.',
      },
      intermediate: {
        crash: 'The hinge-defender read: numbers wide mean nothing while their 13 is unengaged. The carry isn’t wasted patience — it’s the price of pinning him, converting fake space into real space.',
        ship: 'You paid the drift tax: every un-fixed defender translates pass-flight time into lateral recovery. The overlap was arithmetic; his freedom was the missing variable.',
      },
      expert: {
        crash: 'Sequencing beats snapshot maths: 4-v-3 with a floating 13 is functionally 4-v-4. The pod carry converts him from floater to committed tackler — the next ball attacks TRUE numbers. Patience is a weapon.',
        ship: 'Early width against a live drift is how wingers get iso’d: the skip ball gives their 13 two seconds of free slide, arriving square on your 14 with touch as his friend. Fix, then finish.',
      },
    },
  },
  {
    key: 'thirteenBit',
    name: 'Their 13 just bit',
    answer: 'ship',
    situation: 'Your pod sucked their 13 into the ruck fringe. The edge is naked — but their fold is coming. Your call, 10?',
    actors: [
      { label: 'ruck', kind: 'att', x: 250, y: 270 },
      { label: 'YOU', kind: 'you', x: 290, y: 230, ball: true },
      { label: '12', kind: 'att', x: 300, y: 185 },
      { label: '13', kind: 'att', x: 315, y: 130 },
      { label: '14', kind: 'att', x: 320, y: 62 },
      { label: '13', kind: 'def', x: 345, y: 215 },
      { label: '14', kind: 'def', x: 405, y: 95 },
      { label: '6', kind: 'def', x: 300, y: 320 },
    ],
    intentArrow: { from: { x: 306, y: 312 }, to: { x: 360, y: 260 }, label: 'their 6 folding — slowly' },
    reveal: {
      ship: [
        { from: { x: 290, y: 230 }, to: { x: 318, y: 128 }, color: '#14B8A6', label: 'through 13’s hands…', at: { x: 240, y: 100 } },
        { from: { x: 318, y: 128 }, to: { x: 330, y: 58 }, color: '#14B8A6', label: '…14 is away — their winger is alone against two', at: { x: 470, y: 40 } },
      ],
      crash: [
        { from: { x: 300, y: 320 }, to: { x: 355, y: 250 }, color: '#e24b4a', label: 'their 6 folds in while you carry — window closed', at: { x: 470, y: 290 } },
      ],
    },
    verdictTitle: {
      ship: 'Ship it — you earned this edge, cash it',
      crash: 'One carry too many — the fold caught up',
    },
    exp: {
      kid: {
        ship: 'Right call! Their helper got pulled in close, so you passed fast and your winger had all the room.',
        crash: 'You ran one extra time, and while you did, another defender jogged across. The open space filled up.',
      },
      beginner: {
        ship: 'Good read. This is the moment the crash BUYS — their 13 is committed, so two quick passes reach an edge he can’t recover to. Overlaps have expiry dates; this one said NOW.',
        crash: 'Patience has a price too. Their 6 was folding across, and your extra carry gave him the seconds he needed. The window you’d earned closed while you held it.',
      },
      intermediate: {
        ship: 'The release trigger: hinge-defender committed + fold not yet across = the one clean beat to play wide. Recognising EARNED width is the twin skill to building it.',
        crash: 'Over-phasing is real: each extra carry lets the defensive fold re-price the edge. You solved the 13 problem, then donated the solution to their 6.',
      },
      expert: {
        ship: 'Width timing is a two-defender race — their committed 13 can’t recover and their folding 6 hasn’t arrived. That interval is typically one phase long. Elite 10s strike inside it without a second look.',
        crash: 'The fold is the drift’s slower cousin: immune to your pod, cured only by tempo. Carrying into a resetting picture converts your numbers into their set defense — the overlap died of patience.',
      },
    },
  },
  {
    key: 'falseOverlap',
    name: 'Count again',
    answer: 'crash',
    situation: 'Looks like numbers wide… but find their 11, hiding deep behind the line. Your call, 10?',
    actors: [
      { label: 'ruck', kind: 'att', x: 250, y: 270 },
      { label: 'YOU', kind: 'you', x: 290, y: 230, ball: true },
      { label: '12', kind: 'att', x: 300, y: 185 },
      { label: '13', kind: 'att', x: 315, y: 130 },
      { label: '14', kind: 'att', x: 320, y: 62 },
      { label: '13', kind: 'def', x: 390, y: 150 },
      { label: '11', kind: 'def', x: 470, y: 55 },
      { label: '7', kind: 'def', x: 360, y: 240 },
    ],
    intentArrow: { from: { x: 464, y: 62 }, to: { x: 400, y: 60 }, label: 'their 11 — the hidden sweeper' },
    reveal: {
      crash: [
        { from: { x: 290, y: 230 }, to: { x: 310, y: 180 }, color: '#14B8A6', label: 'keep the ball, keep the pressure — no gift today', at: { x: 440, y: 250 } },
      ],
      ship: [
        { from: { x: 470, y: 55 }, to: { x: 345, y: 64 }, color: '#e24b4a', label: 'their 11 jumps the wide pass — intercept, 90 metres the other way', at: { x: 400, y: 30 } },
      ],
    },
    verdictTitle: {
      crash: 'Carry — you saw the trap',
      ship: 'You shipped into the sweeper — intercept',
    },
    exp: {
      kid: {
        crash: 'Right call! One of their players was hiding in the back, waiting to steal a long pass. You kept the ball safe.',
        ship: 'It LOOKED open — but a defender was hiding behind the others. He jumped out, caught your pass, and ran the other way.',
      },
      beginner: {
        crash: 'Good read. Overlap counting includes the players you CAN’T easily see — their 11 was lurking as a sweeper. No real numbers, no wide ball. Keep it and rebuild.',
        ship: 'The most expensive pass in rugby is the one a sweeper reads. Their 11 was hiding in the drift shadow — the “overlap” was bait.',
      },
      intermediate: {
        crash: 'The count is front line PLUS backfield: a sweeping winger erases an apparent +1 and adds intercept risk on top. When the deep picture is murky, the carry is the professional default.',
        ship: 'Fool’s-gold width: a visible 4-v-3 with an invisible sweeper is a 4-v-4 with a trap door. The tell was their winger’s depth — hidden, not absent.',
      },
      expert: {
        crash: 'Elite width decisions price the intercept: a lurking 11 turns the skip pass’s EV violently negative (seven points against, not just a tackle). Declining bait windows is as much a skill as hitting real ones — recycle and force them to defend honestly.',
        ship: 'You threw into a read-and-jump ambush: sweeper aligned outside the pass lane, weight forward — textbook pick-six geometry, rugby edition. The count that matters is theirs, not yours.',
      },
    },
  },
];
