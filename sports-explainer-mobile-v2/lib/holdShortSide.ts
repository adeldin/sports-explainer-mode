// Hold the Short Side? — rugby guard-duty data (RugbyReadEngine module, pitch 680×420).
// A ruck sits tight to the touchline; you are the lone short-side guard. The read:
// stay home, fold to the crowded open side, or shoot the 9? Teaches WHY a defender
// "just stands there" on a tiny strip of grass — the #1 newcomer question at a match.
// Punishers declared per option, per the standard. Attack L→R; touchline = top edge.

import type { ReadOption, ReadScenario } from '../components/academy/RugbyReadEngine';

export const HINT_EMOJI = '🚧';
export const OPTIONS: ReadOption[] = [
  { key: 'stay', title: 'Stay home', sub: 'guard the short side', color: '#14B8A6' },
  { key: 'fold', title: 'Fold to the open side', sub: 'go where the crowd is', color: '#F5A623' },
  { key: 'shoot9', title: 'Shoot the 9', sub: 'kill it at the source', color: '#e24b4a' },
];

// Scene grammar: their ruck near the TOP touchline (y small), x≈300. YOU guard the
// narrow strip between ruck and touch. Their 9 at the base; their 11 hides short-side
// when the trap is on. The open side (below) carries the visible crowd.
export const SCENARIOS: ReadScenario[] = [
  {
    key: 'classicTrap',
    name: 'The quiet side',
    answer: 'stay',
    situation: 'Everyone’s wide — but their 9 keeps glancing your way, and their 11 is tucked behind him. Your call?',
    actors: [
      { label: 'ruck', kind: 'att', x: 300, y: 60 },
      { label: '9', kind: 'att', x: 322, y: 84, ball: true },
      { label: '11', kind: 'att', x: 350, y: 34 },
      { label: 'YOU', kind: 'you', x: 392, y: 52 },
      { label: 'line', kind: 'def', x: 360, y: 180 },
      { label: 'line', kind: 'def', x: 380, y: 250 },
      { label: 'line', kind: 'def', x: 395, y: 320 },
      { label: '12', kind: 'att', x: 300, y: 200 },
      { label: '13', kind: 'att', x: 295, y: 280 },
      { label: '14', kind: 'att', x: 290, y: 360 },
    ],
    intentArrow: { from: { x: 328, y: 78 }, to: { x: 370, y: 48 }, label: '9 keeps looking short' },
    reveal: {
      stay: [
        { from: { x: 392, y: 52 }, to: { x: 356, y: 60 }, color: '#14B8A6', label: 'you close the snipe — nothing on, they go wide instead', at: { x: 490, y: 100 } },
      ],
      fold: [
        { from: { x: 322, y: 84 }, to: { x: 380, y: 40 }, color: '#e24b4a', label: '9 darts the second you leave…', at: { x: 470, y: 26 } },
        { from: { x: 380, y: 40 }, to: { x: 600, y: 30 }, color: '#e24b4a', label: '…and feeds 11 — two on nobody', at: { x: 520, y: 72 } },
      ],
      shoot9: [
        { from: { x: 322, y: 84 }, to: { x: 355, y: 38 }, color: '#e24b4a', label: 'one flip to 11 beats your rush — same empty grass', at: { x: 490, y: 120 } },
      ],
    },
    verdictTitle: {
      stay: 'Stay — you just made the short side worthless',
      fold: 'You folded — and the quiet side exploded',
      shoot9: 'You shot — and the flip pass beat you',
    },
    exp: {
      kid: {
        stay: 'Right call! Your job was guarding the small side. Because you stayed, they couldn’t sneak through — so they had to go the long way around.',
        fold: 'The crowd was on the other side, but YOUR side was the sneaky one. When you left, two of them ran through the empty space.',
        shoot9: 'You charged at the passer — he just flicked it to his friend hiding behind him, into the space you left.',
      },
      beginner: {
        stay: 'Good read. Short-side guards win by existing: with you home, the snipe is dead and their 11 is wasted. Boring, invisible — and exactly why nothing happened.',
        fold: 'The open side LOOKED urgent — but it had defenders. Your strip had ONE: you. Leaving turned a guarded alley into a two-on-none.',
        shoot9: 'Rushing the 9 gambles everything on arriving before his hands move. They don’t lose that race often — the hidden 11 is there for exactly this.',
      },
      intermediate: {
        stay: 'Guard duty is subtraction: your presence deletes the snipe AND the short ball to 11, so their 9’s glance finds nothing. The attack must play into your set line — mission accomplished by standing still.',
        fold: 'Defensive gravity pulls toward crowds; discipline resists it. The open side was three-on-three; your side was one-on-two held together only by you. You reinforced strength and abandoned the weakness.',
        shoot9: 'Shooting the 9 without inside cover is a one-card bluff — his release beats your rush, and now the alley has neither guard nor gambler in it.',
      },
      expert: {
        stay: 'Blind-side integrity is the quiet spine of ruck defense: the guard’s value is the OPTIONS he deletes, not the tackles he makes. 9’s repeated look-off is the confession — hold, and their script loses a page.',
        fold: 'You got manipulated by shape: the wide stack was the decoy, the tucked 11 the payload. Folding on visual weight instead of threat-count is precisely what their 9 was fishing for.',
        shoot9: 'Pressing the base needs either a slow ball or a second guard — with neither, the 9’s flip converts your aggression into their numbers. Guards deny; they don’t gamble.',
      },
    },
  },
  {
    key: 'emptyBlind',
    name: 'Nobody home',
    answer: 'fold',
    situation: 'Same ruck, same strip — but look: their 11 has swung wide with everyone else. Zero threats on your side. Your call?',
    actors: [
      { label: 'ruck', kind: 'att', x: 300, y: 60 },
      { label: '9', kind: 'att', x: 322, y: 84, ball: true },
      { label: 'YOU', kind: 'you', x: 392, y: 52 },
      { label: 'line', kind: 'def', x: 360, y: 180 },
      { label: 'line', kind: 'def', x: 380, y: 250 },
      { label: '12', kind: 'att', x: 300, y: 200 },
      { label: '13', kind: 'att', x: 295, y: 280 },
      { label: '11', kind: 'att', x: 285, y: 330 },
      { label: '14', kind: 'att', x: 290, y: 385 },
    ],
    intentArrow: { from: { x: 296, y: 322 }, to: { x: 340, y: 350 }, label: 'their 11 went wide too — count your side: zero' },
    reveal: {
      fold: [
        { from: { x: 392, y: 52 }, to: { x: 400, y: 200 }, color: '#14B8A6', label: 'you swing across — four-on-four, line holds', at: { x: 500, y: 160 } },
      ],
      stay: [
        { from: { x: 295, y: 280 }, to: { x: 560, y: 380 }, color: '#e24b4a', label: 'their 14 walks in on the far edge — you guarded nobody', at: { x: 440, y: 330 } },
      ],
      shoot9: [
        { from: { x: 322, y: 84 }, to: { x: 310, y: 190 }, color: '#e24b4a', label: '9 clears wide untouched — you pressed thin air', at: { x: 470, y: 120 } },
      ],
    },
    verdictTitle: {
      fold: 'Fold — the strip is empty, the fight is wide',
      stay: 'You guarded grass while the edge broke',
      shoot9: 'You pressed a 9 with nothing to snipe at',
    },
    exp: {
      kid: {
        fold: 'Right call! Nobody was left on your side to sneak through, so you ran to help where all their runners actually were.',
        stay: 'You kept guarding your little side — but no one was attacking it. Meanwhile they had too many runners on the far side and scored there.',
        shoot9: 'You charged the passer, but he just passed it wide like he always planned. Your charge didn’t change anything.',
      },
      beginner: {
        fold: 'Good read. The guard rule has a second half: stay while there’s a threat, GO when there isn’t. Their 11 leaving emptied your side — count zero, fold across.',
        stay: 'Guarding is only valuable when something needs guarding. With no short-side runner, you were defending a memory while the real attack was a defender short.',
        shoot9: 'Same gamble, worse odds — with no snipe threat, the 9’s only plan was the wide ball, and your press never touches that.',
      },
      intermediate: {
        fold: 'The threat-count IS the assignment: guard duty follows the runners, not the geography. Zero short-side attackers converts your post into a wasted defender — swinging restores parity where the game actually is.',
        stay: 'Static roles are how overlaps happen: you obeyed the position, not the count. Their emptying of the blind was information — you filed it instead of acting on it.',
        shoot9: 'A press needs a payoff: no snipe, no trapped ball, just a 9 who wanted one second — which your rush gave him for free while removing you from the fold.',
      },
      expert: {
        fold: 'Elite guards re-count every ruck: threats-short vs threats-wide is a live number, not a role. Zero-and-overload reads as an immediate swing — arriving as the +1 that keeps the far edge honest. Same player, opposite answer, same principle.',
        stay: 'This is the guard trap inverted: discipline become dogma. The short side’s value evaporated with their 11’s exit; holding it anyway made you the overlap’s co-author.',
        shoot9: 'Pressing a base with no blind threat spends your body on their easiest read — the wide clearance was pre-decided, your lane empty by design. Fold pressure beats false pressure.',
      },
    },
  },
  {
    key: 'slowBallSnipe',
    name: 'Slow ball, lone 9',
    answer: 'shoot9',
    situation: 'Their ruck is a mess — slow ball, 9 waiting, no 11 behind him, and your 6 has your strip covered. Your call?',
    actors: [
      { label: 'ruck', kind: 'att', x: 300, y: 60 },
      { label: '9', kind: 'att', x: 322, y: 84, ball: true },
      { label: 'YOU', kind: 'you', x: 392, y: 52 },
      { label: '6', kind: 'cover', x: 420, y: 90 },
      { label: 'line', kind: 'def', x: 360, y: 180 },
      { label: 'line', kind: 'def', x: 380, y: 250 },
      { label: '12', kind: 'att', x: 300, y: 200 },
      { label: '13', kind: 'att', x: 295, y: 280 },
    ],
    intentArrow: { from: { x: 414, y: 84 }, to: { x: 398, y: 60 }, label: 'your 6 has the strip — you’re free' },
    reveal: {
      shoot9: [
        { from: { x: 392, y: 52 }, to: { x: 330, y: 80 }, color: '#14B8A6', label: 'you arrive with the ball — 9 swallowed behind the ruck', at: { x: 480, y: 120 } },
      ],
      stay: [
        { from: { x: 322, y: 84 }, to: { x: 310, y: 190 }, color: '#e24b4a', label: 'slow ball becomes clean exit — pressure wasted', at: { x: 470, y: 150 } },
      ],
      fold: [
        { from: { x: 322, y: 84 }, to: { x: 380, y: 44 }, color: '#e24b4a', label: 'you left before 6 settled — 9 darts the seam you both vacated', at: { x: 480, y: 26 } },
      ],
    },
    verdictTitle: {
      shoot9: 'Shoot — slow ball plus cover equals green light',
      stay: 'You held — and let a struggling 9 off the hook',
      fold: 'You folded early — the seam opened behind you',
    },
    exp: {
      kid: {
        shoot9: 'Right call! Their passer was stuck waiting for a messy pile, and your teammate was guarding your spot — so you charged and caught him with the ball!',
        stay: 'Their passer was in trouble, but you gave him all the time he needed. He escaped easily.',
        fold: 'You ran to the other side a moment too soon. The sneaky passer slipped right through the spot you and your teammate mixed up.',
      },
      beginner: {
        shoot9: 'Good read. The press finally pays when BOTH lights are green: slow ball (he can’t release quickly) and cover behind you (failure isn’t fatal). Hit it.',
        stay: 'Passivity has a price too — a struggling ruck is the one moment pressure creates chaos, and you let it pass.',
        fold: 'Right instinct, wrong beat: fold AFTER your cover settles. The half-second overlap in your handoff was exactly the seam a sniping 9 lives on.',
      },
      intermediate: {
        shoot9: 'This is the guard’s earned gamble: slow ball extends your arrival window, and your 6 underwrites the downside. The same shoot that was reckless alone is correct insured — conditions, not courage.',
        stay: 'Risk-free is not cost-free: unpressured slow ball becomes ordinary ball. When the downside is covered and the ruck is dying, holding is the timid error.',
        fold: 'Sequencing failure: the fold itself was fine, but defensive handoffs need an overlap of coverage, not a gap. You created the one seam the situation didn’t have.',
      },
      expert: {
        shoot9: 'Pressing calculus in full: ball-speed (slow) sets the success odds, cover (present) caps the loss. Both favorable is rare — elite guards convert it into turnovers at the base, the highest-value tackle in the sport.',
        stay: 'You priced the press like the uncovered case — but insurance changes the bet. Reading ruck-speed without reading your own support is half a decision.',
        fold: 'The seam-snipe off a botched handoff is a classic: two defenders, one strip, zero coverage for a beat. Guards move on confirmation, not intention — 6 settled is the trigger, not 6 arriving.',
      },
    },
  },
];
