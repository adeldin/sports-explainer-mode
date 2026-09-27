// Exit Strategy — rugby exit-decision data (RugbyReadEngine module, pitch 680×420).
// You are the 9 at a ruck deep in your own 22: box kick, long clearance, or run it?
// Law note baked into every situation line: the OPPONENT kicked the ball in, so a
// clearance to touch gains ground (Law 18.8(d)) — the scenario never becomes a
// hidden law quiz. The read is their backfield shape + your chase. Attack L→R is
// reversed here: YOU are exiting toward the LEFT (their posts are far right; your
// own try line is the left edge). Punishers declared per option.

import type { ReadOption, ReadScenario } from '../components/academy/RugbyReadEngine';

export const HINT_EMOJI = '🥾';
export const OPTIONS: ReadOption[] = [
  { key: 'box', title: 'Box kick', sub: 'high and short — chase it', color: '#F5A623' },
  { key: 'long', title: 'Long clearance', sub: 'boot it to touch', color: '#14B8A6' },
  { key: 'run', title: 'Run it out', sub: 'trust the carries', color: '#e24b4a' },
];

// Scene grammar: your ruck near your own try line (left edge, x≈120). YOU (the 9) at
// its base. Your wing chaser above. THEIR back three are the read: 15 deep or up,
// wings back or pressing. Their 7 camps the run lane when running is wrong.
export const SCENARIOS: ReadScenario[] = [
  {
    key: 'chaseReady',
    name: 'Your chase is set',
    answer: 'box',
    situation: 'Their kick just rolled into your 22. Their 15 is home deep — but your chasers are lined up. Your call, 9?',
    actors: [
      { label: 'ruck', kind: 'def', x: 120, y: 210 },
      { label: 'YOU', kind: 'you', x: 138, y: 228, ball: true },
      { label: '14', kind: 'def', x: 150, y: 66 },
      { label: '11', kind: 'def', x: 155, y: 105 },
      { label: '15', kind: 'att', x: 520, y: 210 },
      { label: '14', kind: 'att', x: 470, y: 80 },
      { label: '7', kind: 'att', x: 200, y: 230 },
    ],
    intentArrow: { from: { x: 156, y: 78 }, to: { x: 300, y: 95 }, label: 'your chase, ready to fly' },
    reveal: {
      box: [
        { from: { x: 138, y: 228 }, to: { x: 320, y: 100 }, color: '#14B8A6', label: 'contestable ball — your 14 arrives with it', at: { x: 390, y: 60 } },
      ],
      long: [
        { from: { x: 138, y: 228 }, to: { x: 500, y: 200 }, color: '#e24b4a', label: '15 fields it in acres — counter is on', at: { x: 480, y: 260 } },
      ],
      run: [
        { from: { x: 200, y: 230 }, to: { x: 150, y: 222 }, color: '#e24b4a', label: 'their 7 is camped in the carry lane', at: { x: 300, y: 290 } },
      ],
    },
    verdictTitle: {
      box: 'Box kick — a contest, not a gift',
      long: 'You cleared long — straight to their best counter-runner',
      run: 'You ran it — into the player waiting for exactly that',
    },
    exp: {
      kid: {
        box: 'Right call! You kicked it high and short so your teammate could chase and try to catch it back.',
        long: 'The big kick went straight to their catcher, who had tons of room to run it back at you.',
        run: 'Their player was standing right there waiting to tackle whoever ran. You got stopped near your own line — dangerous.',
      },
      beginner: {
        box: 'Good read. A box kick with a set chase is a 50/50 you can win — you escape your 22 AND might get the ball back. That beats a guaranteed handover.',
        long: 'With their 15 stationed deep, a long kick is a delivery service. He fields it in space and runs it back — your relief becomes their attack.',
        run: 'Running from your own 22 needs numbers — and their 7 was camped in the lane. One tackle there and you’re defending a metre from your line.',
      },
      intermediate: {
        box: 'The exit menu is priced by their backfield: 15 deep kills the long game, but your organised chase makes the box contestable. Territory plus a regain chance is the best available trade.',
        long: 'A clearance is only as good as what happens when it lands. Deep 15 plus no touch means you traded possession for zero pressure — the worst exit outcome.',
        run: 'Ball-in-hand exits are for broken fields. A set defender over the gainline in your own 22 makes the carry a coin flip where tails is a goal-line stand.',
      },
      expert: {
        box: 'Contestable-kick logic: their 15 deep centre concedes the air over the 10m line. A hang-time box onto your sprinting 14 either regains or forces a mark under pressure — both reset the field on your terms.',
        long: 'Kicking long to a positioned counter-attacking 15 concedes both possession and momentum — the double loss. If the backfield is home, the long exit needs touch, and this angle doesn’t have it.',
        run: 'Running into a set edge defender pins you in the red zone: even a won collision produces a ruck five metres out, and every subsequent exit gets harder. Escape first, ambition later.',
      },
    },
  },
  {
    key: 'backfieldOpen',
    name: 'They left the grass',
    answer: 'long',
    situation: 'Their kick just rolled into your 22 — and their 15 has crept into the front line. The backfield is empty. Your call, 9?',
    actors: [
      { label: 'ruck', kind: 'def', x: 120, y: 210 },
      { label: 'YOU', kind: 'you', x: 138, y: 228, ball: true },
      { label: '14', kind: 'def', x: 150, y: 66 },
      { label: '15', kind: 'att', x: 260, y: 190 },
      { label: '14', kind: 'att', x: 250, y: 80 },
      { label: '7', kind: 'att', x: 200, y: 230 },
    ],
    intentArrow: { from: { x: 268, y: 182 }, to: { x: 230, y: 200 }, label: 'their 15 pressed up — nobody home' },
    reveal: {
      long: [
        { from: { x: 138, y: 228 }, to: { x: 560, y: 30 }, color: '#14B8A6', label: 'into touch 40 metres up — lineout, your throw is theirs but the grass is yours', at: { x: 420, y: 330 } },
      ],
      box: [
        { from: { x: 138, y: 228 }, to: { x: 300, y: 90 }, color: '#e24b4a', label: 'their 14 is set underneath it — no contest', at: { x: 400, y: 56 } },
      ],
      run: [
        { from: { x: 200, y: 230 }, to: { x: 150, y: 222 }, color: '#e24b4a', label: '7 again — the lane is still shut', at: { x: 300, y: 290 } },
      ],
    },
    verdictTitle: {
      long: 'Long clearance — they left the door open',
      box: 'You boxed — into a waiting catcher',
      run: 'You ran — the lane never opened',
    },
    exp: {
      kid: {
        long: 'Right call! Nobody was guarding the back, so your big kick rolled forever. Your team gets to defend way up the field now.',
        box: 'Their catcher was standing right where short kicks land. He caught it easily and your chase never had a chance.',
        run: 'Same trap as before — the tackler was waiting. When the back is empty, kick it long instead.',
      },
      beginner: {
        long: 'Good read. When their 15 steps into the line, the space behind him is the whole read. A long kick finds grass — and from inside your 22 after their kick in, touch is a clean 40-metre win.',
        box: 'The box kick needs airspace their winger wasn’t defending — but he WAS. Right where boxes land. Read where the catchers stand before choosing the kick.',
        run: 'The carry lane didn’t change — their 7 still owns it. The change was BEHIND their line, and only a kick cashes that in.',
      },
      intermediate: {
        long: 'Exit pricing flipped: 15 in the line converts the long kick from a gift into a dagger. Distance-to-touch beats a contest when there’s no one to contest with.',
        box: 'You kicked to their numbers. The box’s value is the contest, and their 14 underneath makes it a fair catch — reading the SHAPE, not the habit, picks the kick.',
        run: 'Still the worst option — the front-line press that opened the backfield also added a defender to the run lane. Their trap was inviting the carry.',
      },
      expert: {
        long: 'Backfield-vacancy is the trigger for maximum-territory exits: with 15 pressed, the 50/22-style boot into the corner trades a lineout throw for 40 metres and their attack reset to a set piece. Elite exits are shape-reads, not habits.',
        box: 'Habitual boxing into a pre-set catcher is how exits die: no contest, no territory, possession gone. The press that emptied the backfield also pre-positioned the box coverage — one read explains both.',
        run: 'A pressing defense WANTS the carry — the extra front-line body is a tackler before it’s a space-leaver. The countermove is over their heads, not through their chests.',
      },
    },
  },
  {
    key: 'kickTrap',
    name: 'They expect the kick',
    answer: 'run',
    situation: 'Their kick just rolled into your 22 — and they’ve dropped THREE deep to catch yours. Look how few are left in the line. Your call, 9?',
    actors: [
      { label: 'ruck', kind: 'def', x: 120, y: 210 },
      { label: 'YOU', kind: 'you', x: 138, y: 228, ball: true },
      { label: '10', kind: 'def', x: 180, y: 160 },
      { label: '12', kind: 'def', x: 210, y: 120 },
      { label: '15', kind: 'att', x: 520, y: 210 },
      { label: '11', kind: 'att', x: 500, y: 330 },
      { label: '14', kind: 'att', x: 490, y: 80 },
      { label: '13', kind: 'att', x: 280, y: 170 },
    ],
    intentArrow: { from: { x: 186, y: 152 }, to: { x: 320, y: 130 }, label: 'one defender guards all this' },
    reveal: {
      run: [
        { from: { x: 138, y: 228 }, to: { x: 205, y: 165 }, color: '#14B8A6', label: 'hands to 10 — numbers on, gainline broken', at: { x: 330, y: 60 } },
      ],
      box: [
        { from: { x: 138, y: 228 }, to: { x: 480, y: 100 }, color: '#e24b4a', label: 'kicked to a three-man backfield — free counter', at: { x: 430, y: 280 } },
      ],
      long: [
        { from: { x: 138, y: 228 }, to: { x: 510, y: 200 }, color: '#e24b4a', label: '15, 14 AND 11 waiting — the return hurts', at: { x: 440, y: 250 } },
      ],
    },
    verdictTitle: {
      run: 'Run it — they emptied the line for you',
      box: 'You kicked to the one place they’re strongest',
      long: 'You fed a three-man counter unit',
    },
    exp: {
      kid: {
        run: 'Right call! They sent three players way back to catch a kick — so almost nobody was left to tackle. Your team ran right through.',
        box: 'They had three catchers waiting back there. Any kick was a present. Running was the surprise move.',
        long: 'Three of their fastest players were waiting for that kick — and they all ran it back together.',
      },
      beginner: {
        run: 'Good read. Count both zones: three of them deep means three MISSING from the tackle line. When the line is short-handed, ball-in-hand beats any kick.',
        box: 'The kick they prepared for is the kick you shouldn’t hit. Three backfielders turn every ball in the air into their possession with a running start.',
        long: 'Same problem, further away: a stacked backfield makes any kick a donation. The weakness was in FRONT of you, not behind them.',
      },
      intermediate: {
        run: 'Defensive resources are a fixed budget: three in the backfield buys them kick coverage and costs them line integrity. The exit read is a simple count — attack whichever zone they underfunded.',
        box: 'Kicking into pre-set coverage inverts the exit: you gift possession, position AND a broken-field return. Their shape declared the kick dead; the discipline is believing it.',
        long: 'A three-man pendulum eats long kicks for breakfast — one fields, two frame the return lanes. This exit was closed the moment they dropped deep.',
      },
      expert: {
        run: 'The rarest and best exit: when the pendulum over-rotates, the front line is 11-v-13 maths — first-phase hands beat the fold before the backfield can re-enter the game. This is how elite 9s punish kick-obsessed shapes.',
        box: 'Contestable kicks need SOMETHING to contest — against a stacked pendulum, hang-time only lets the counter organise. Structure said run; habit said kick; structure is always righter.',
        long: 'Feeding a full pendulum is the exit’s cardinal sin: possession handed to their most dangerous unit with your chase line thinnest. When they buy kick insurance, make them waste the premium.',
      },
    },
  },
];
