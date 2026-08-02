// Serve Target — scenario data (VERBATIM from coaches-corner-spikes/tenniscorner/serve-target.html).
// All serves are DEUCE-COURT points: you serve from just right of your center mark (bottom, y≈218)
// into their top box (net→service line). fan = the returner's comfortable reach (degrees, 0°=+x,
// y-down); every option carries authored END coordinates. The reads (which box beats which stance),
// the LED-board stakes, and the 4-depth COACH'S READ are the owner-reviewed surface — copied exactly.
// Strings keep the spike's <b>…</b> emphasis markers (display emphasis, not internals).
// Coordinates share the tennis-court viewBox (680×420 court group under a 74px LED-board strip).
// Pure data — zero RN imports.

import type { P, Depth, GradeKind } from './approachOrStay';
export type { P, Depth, GradeKind };
export { gradeColor, gradeTag } from './approachOrStay';

export type STOption = 'wide' | 'body' | 't' | 'pace';
export type STLabel = [number, number, string];

export interface STGrade {
  k: GradeKind;
  bmsg: string;                    // LED-board flip message
  npt?: string;                    // "SCORE NOW" sub-line
  t: string;                       // verdict title
  tgt: P;                          // where the serve lands
  fault?: boolean;                 // the serve MISSES (double fault) — red X, no rally
  zone?: [number, number, number, number];  // the +1 ghost zone the serve opens [x,y,w,h]
  end: { ball: P; you: P; opp: P; lab: STLabel };
  b: string;                       // verdict body
}

export interface STScenario {
  tab: string;
  srv0: P; ret0: P;
  fan: { r: number; a1: number; a2: number };   // his comfortable reach before the bounce
  fanLbl: string;
  board: { pt: string; games: string; sets: string; srv: string; note: { cap: string; val: string; warn?: boolean } };
  intro: string;
  grade: Partial<Record<STOption, STGrade>>;    // 'pace' exists only where the scenario offers it
  why: Record<Depth, string>;
}

// The good option's serve target — the reveal ring ("the open door was here").
export const bestOption = (s: STScenario): STOption =>
  (Object.keys(s.grade) as STOption[]).find(k => s.grade[k]!.k === 'good')!;

export const SCENARIOS: STScenario[] = [
  {
    tab: 'Deep, shading the T', srv0: [56, 220], ret0: [612, 172], fan: { r: 110, a1: 145, a2: 185 },
    fanLbl: 'his reach — parked over the T',
    board: { pt: '30–30', games: '3–2 YOU', sets: '', srv: '1ST SERVE', note: { cap: 'SURFACE', val: 'HARD' } },
    intro: "Look at his feet: deep, and <b>shaded toward the T</b> — he's guarding the middle door. Which box do you hit?",
    grade: {
      wide: {
        k: 'good', bmsg: 'POINT YOU', npt: '40–30', t: 'Wide — off the map he goes',
        tgt: [452, 128], end: { ball: [472, 272], you: [180, 208], opp: [544, 116], lab: [472, 246, '+1 into the open court'] },
        zone: [336, 214, 236, 82],
        b: 'The wide slider lands away from his parked feet and keeps running. He lunges, throws back a floater — and the serve has already written your next shot: the whole crosscourt is empty. Serve, stretch, +1, done.',
      },
      t: {
        k: 'bad', bmsg: 'ATTACKED', npt: '30–40', t: 'You served into his cover',
        tgt: [452, 204], end: { ball: [86, 282], you: [110, 244], opp: [548, 196], lab: [112, 260, 'return at your feet'] },
        b: 'His feet were already at the T — that fan you saw was him TELLING you. He barely stepped, took it early, and drove the return deep behind your serve. The door he guards is the one door you chose.',
      },
      body: {
        k: 'ok', bmsg: 'NEUTRAL', t: 'Jammed — nothing lost, nothing made',
        tgt: [446, 168], end: { ball: [250, 200], you: [100, 214], opp: [622, 176], lab: [250, 176, 'cramped chip back'] },
        b: "Into the chest — he backs up, chips it off his hip, and you're in a neutral rally. Fine. But his T-shade left the wide door wide open, and the body serve declined the free stretch.",
      },
    },
    why: {
      rookie: "His feet are near the middle. Serve to the side he's NOT guarding — the wide one — and he has to run.",
      beginner: 'The reach fan is the whole read: it shows what his feet can cover before the bounce. Serve inside the fan and he swings in balance; serve outside it and he\'s lunging. Shaded T = the wide serve lives outside the fan.',
      intermediate: "The serve's real product is the SECOND shot: a stretch return comes back short and floaty, and the court he vacated is your +1 target. Servers win ~80% of service games because they keep choosing the first question — make it one he can only half-answer.",
      expert: "First-serve points run ~70–75% for top servers, and placement against the returner's set-up is a bigger lever than raw pace. The wide serve against a T-shade is the cleanest 'serve +1' pattern in the book: stretch, open court, forehand into it. You're not serving for an ace — you're serving for the geometry.",
    },
  },
  {
    tab: 'Cheating wide', srv0: [56, 216], ret0: [610, 132], fan: { r: 110, a1: 168, a2: 208 },
    fanLbl: 'his reach — camped on the wide ball',
    board: { pt: '30–15', games: '1–1', sets: '', srv: '1ST SERVE', note: { cap: 'SURFACE', val: 'HARD' } },
    intro: "He's been burned wide twice and now he's <b>cheating toward the sideline</b> to protect the slice. He just opened a door himself.",
    grade: {
      t: {
        k: 'good', bmsg: 'ACE', npt: '40–15', t: 'The T — he opened it himself',
        tgt: [452, 204], end: { ball: [560, 201], you: [60, 214], opp: [572, 168], lab: [560, 236, 'ACE — down the T'] },
        zone: [336, 124, 236, 80],
        b: "The T is the shortest serve in tennis — least air time, least reaction time — and his wide camp moved his feet a full step away from it. He lunges back across and waves; the ball is past him. His protection WAS the opening.",
      },
      wide: {
        k: 'bad', bmsg: 'PUNISHED', npt: '30–30', t: 'You fed his camp',
        tgt: [452, 128], end: { ball: [86, 142], you: [56, 216], opp: [500, 120], lab: [116, 122, 'return winner, up the line'] },
        b: 'He was standing on the wide serve before you tossed it. He stepped IN, took it on the rise, and drove it up the line while you were still finishing your motion. Serving to a returner\'s camp is a donation.',
      },
      body: {
        k: 'ok', bmsg: 'NEUTRAL', t: 'Safe — but the T was free',
        tgt: [446, 140], end: { ball: [255, 190], you: [100, 210], opp: [600, 142], lab: [255, 166, 'chipped back — even'] },
        b: 'The body serve into a wide-cheater still half-jams him, and you get a makeable ball back. No harm. But when a returner hands you the middle of the court, the percentage play is to take it.',
      },
    },
    why: {
      rookie: 'He moved over to guard the wide serve — so the middle is empty. Serve down the middle (the T).',
      beginner: "Returners protect what hurt them. When his feet drift toward the sideline, the T-serve's path is now the one his reach fan doesn't cover — and it's also the shortest flight, so he has the least time to fix his mistake.",
      intermediate: 'Watch feet at the bounce of the toss, not before: good returners disguise the cheat late. The tell here is that his fan edge no longer touches the center line — a serve there is functionally unreturnable even at modest pace.',
      expert: "Serving is a pricing game: every camp lowers the price of the opposite corner. Elite servers track return positions per point (the ATP's placement data shows T-serve win rates spike against wide-cheaters) and 'sell' to the door left open. He is defending the LAST point; serve into the NEXT one.",
    },
  },
  {
    tab: 'Crowding a 2nd serve', srv0: [56, 220], ret0: [588, 168], fan: { r: 85, a1: 150, a2: 200 },
    fanLbl: 'his reach — up on the baseline',
    board: { pt: '30–30', games: '2–2', sets: '', srv: '2ND SERVE', note: { cap: 'RETURNER', val: 'CROWDING', warn: true } },
    intro: "Second serve — and he's <b>walked up to the baseline</b> to punish it. A crowder has no room to swing. Jam him.",
    grade: {
      body: {
        k: 'good', bmsg: 'JAMMED', npt: '40–30', t: 'Into the body — no swing room',
        tgt: [438, 170], end: { ball: [466, 266], you: [180, 206], opp: [582, 172], lab: [466, 240, '+1 — he popped it up'] },
        zone: [336, 214, 236, 82],
        b: "A crowder is betting you'll give him a ball he can swing at. The body kick takes the swing away: it climbs into his hip, he cramps the return off his shirt, and the pop-up hands you the +1. Body serves are only ~10% of serves — that's exactly why he never saw it coming.",
      },
      wide: {
        k: 'ok', bmsg: 'EVEN', t: 'He rode it on the rise',
        tgt: [452, 128], end: { ball: [110, 190], you: [90, 200], opp: [524, 130], lab: [136, 168, 'taken early — deep back'] },
        b: "Standing that close, he takes the wide serve early on the rise before the angle can develop, and suddenly you're the one pushed back. You survived — but you played into the crowd-him plan.",
      },
      t: {
        k: 'ok', bmsg: 'EVEN', t: 'Cut off before it worked',
        tgt: [452, 204], end: { ball: [150, 214], you: [96, 218], opp: [544, 192], lab: [176, 240, 'blocked back at your feet'] },
        b: "Same crowding logic: the closer he stands, the earlier he meets the T-serve, and his block return arrives at your feet before you've recovered. In play, even — but the jam was the surprise.",
      },
      pace: {
        k: 'ok', bmsg: 'EVEN', t: 'Kick — safe, but he was ready',
        tgt: [440, 150], end: { ball: [140, 200], you: [92, 212], opp: [556, 140], lab: [166, 178, 'leaned on it — deep'] },
        b: 'The kick buys net clearance, but a crowder standing on the baseline is there precisely to catch kicks before they climb. He leaned in and pushed you deep. Safe call; the body was the answer to THIS stance.',
      },
    },
    why: {
      rookie: "He's standing right on the line to attack your softer second serve. Serve straight AT him — with no room to swing, he can't hurt you.",
      beginner: 'Wide and T both give a crowder something to lean into. The body serve gives him a decision instead: forehand or backhand, in half the usual time, with the ball climbing at his hip. Most returns off the body come back as blocks and pop-ups.',
      intermediate: 'Body serves are ~10% of all serves, which keeps them unscouted: returners groove on corner serves. Against aggressive court position the jam converts his aggression into cramped contact — his proximity is what makes the serve work.',
      expert: "Second-serve points hover near ~51% for servers — the closest thing to a coin flip in tennis — and crowding is designed to tilt that coin. The counter isn't more pace (more risk), it's target selection that makes his position a liability. Jam rate should scale with his crowding: that's the equilibrium that pushes him back off your second serve for the rest of the match.",
    },
  },
  {
    tab: 'Break point — he knows', srv0: [56, 218], ret0: [612, 138], fan: { r: 110, a1: 165, a2: 205 },
    fanLbl: 'his reach — sitting on YOUR serve',
    board: { pt: '30–40', games: '4–4', sets: '', srv: '1ST SERVE', note: { cap: 'BREAK POINT', val: '75% WIDE TODAY', warn: true } },
    intro: 'Break point. Your wide slider has won <b>75% today</b> — and look at his feet: he has FINALLY shifted wide to sit on it. Your favorite serve just became the predictable one.',
    grade: {
      t: {
        k: 'good', bmsg: 'BP SAVED', npt: 'DEUCE', t: 'The pattern flip — your 75% was the bait',
        tgt: [452, 204], end: { ball: [556, 200], you: [60, 216], opp: [570, 168], lab: [556, 236, 'unreturned — T'] },
        zone: [336, 124, 236, 80],
        b: "The stat says wide; his FEET say he's finally bought the stat. A 75% pattern is only worth 75% against a returner who hasn't moved — this one has. The T behind his shift goes untouched. You didn't abandon your pattern; you cashed it.",
      },
      wide: {
        k: 'bad', bmsg: 'BROKEN', npt: 'GAME THEM', t: 'He was sitting on it',
        tgt: [452, 128], end: { ball: [86, 278], you: [56, 218], opp: [508, 124], lab: [116, 256, 'he ran around it — crushed'] },
        b: "The one returner adjustment all day, and it was aimed at exactly this serve on exactly this point. He met your slider a step early and buried the return crosscourt. The serve wasn't bad — it was expected, which on break point is the same thing.",
      },
      body: {
        k: 'ok', bmsg: 'NO FREE POINT', npt: 'STILL 30–40', t: 'Escaped the read — earned nothing',
        tgt: [446, 160], end: { ball: [200, 190], you: [96, 214], opp: [576, 150], lab: [226, 168, 'chipped deep — play on'] },
        b: 'The body dodges his wide-sit and you live — but a returner leaning wide half-blocks a body serve with the backhand, and this one came back deep. Even ball on break point. The T was the full reward for the same read.',
      },
    },
    why: {
      rookie: 'You keep winning with the wide serve — but he finally moved over to wait for it. When he guards your favorite, use the other door: the T.',
      beginner: "A pattern is only strong while the returner ignores it. His shift wide is him spending his one guess on your slider — which un-guards the T. Serve the pattern's OPPOSITE at the moment the pattern is most famous.",
      intermediate: "On break points servers historically over-play their favorite (wide-serve bias runs ~20% above the T on break points) and elite returners know that bias table too. The read isn't the stat — it's his feet, updated for the stakes: fan edge off the center line means T.",
      expert: "This is a mixed-strategy equilibrium in one point: a 75% wide-serve win rate is an off-path number; against a returner who reallocates his stance, the EV of wide collapses and the EV of T spikes. Great servers aren't loyal to patterns, they're loyal to the LIVE read — the pattern's job was to buy this exact cheap T.",
    },
  },
  {
    tab: '15–40, second serve', srv0: [56, 220], ret0: [566, 178], fan: { r: 80, a1: 150, a2: 205 },
    fanLbl: 'his reach — INSIDE the baseline',
    board: { pt: '15–40', games: '3–5', sets: '', srv: '2ND SERVE', note: { cap: 'BREAK POINTS', val: 'TWO', warn: true } },
    intro: "15–40, second serve, and he's <b>inside the baseline</b> licking his lips. Every flat serve here is a coin flip on your whole set. Buy margin.",
    grade: {
      pace: {
        k: 'good', bmsg: 'STILL ALIVE', npt: '30–40', t: 'Kick it — margin is the play',
        tgt: [434, 148], end: { ball: [230, 190], you: [150, 210], opp: [548, 140], lab: [256, 168, 'chipped off his shoulder'] },
        b: 'The heavy kick clears the net by a meter and jumps up out of his strike zone. He can crowd all he wants — the ball climbs above his shoulder and the best he gets is a chip. One break point erased, zero double-fault risk spent.',
      },
      wide: {
        k: 'bad', bmsg: 'BROKEN', npt: 'GAME THEM', t: 'Flat, tight — and long',
        tgt: [492, 124], fault: true, end: { ball: [492, 124], you: [56, 220], opp: [566, 178], lab: [492, 100, 'LONG — double fault'] },
        b: "A flat wide serve on 15–40 needs a perfect line to beat a returner standing inside the court — so you aimed tight, and it sailed long. Double fault, game over. The break wasn't taken; it was donated.",
      },
      t: {
        k: 'bad', bmsg: 'BROKEN', npt: 'GAME THEM', t: 'Flat, low — into the tape',
        tgt: [326, 208], fault: true, end: { ball: [322, 212], you: [56, 220], opp: [566, 178], lab: [322, 240, 'NET — double fault'] },
        b: "The flat T is the lowest-clearance serve you own, and under break-point arms it caught the tape. Same lesson as the wide miss: on second serve the enemy isn't his return — it's the net and the line you left yourself no margin against.",
      },
      body: {
        k: 'ok', bmsg: 'IN PLAY', npt: 'STILL 15–40', t: 'Spin into the body — survivable',
        tgt: [442, 166], end: { ball: [120, 196], you: [100, 206], opp: [570, 176], lab: [146, 174, 'returned firm — scramble'] },
        b: "Spin at the body beats hitting flat, and you're alive — but without the full kick's shape he found room to lean on it, and you're digging off your shoelaces at 15–40. The heavy kick was the same idea with more insurance.",
      },
    },
    why: {
      rookie: "On a second serve you can't afford to miss. Hit the slower, spinnier serve that arcs high over the net — it almost never misses, and the bounce jumps up where it's hard to attack.",
      beginner: 'Second-serve math: a flat serve might win the point 60% WHEN it lands, but it lands far less often — and a miss here is a lost game, not a lost point. The kick trades a little point-equity for near-certainty of making the returner play. At 15–40 that trade is everything.',
      intermediate: "Kick serves clear the net 3–4x higher than flat serves and dive back into the box — that's why tour double-fault rates stay low even under crowding pressure. Against an inside-the-baseline returner, height is the specific antidote: the ball is above his shoulders exactly where he wanted it at his hip.",
      expert: "Servers win only ~51% of second-serve points, and the elite gap is mostly unforced errors avoided, not aces added. Model it as risk-of-ruin: at 15–40 the downside of a miss (game, maybe set) dwarfs the marginal win-rate of the brave serve. Percentage tennis isn't passive — it's correctly pricing catastrophe. The kicker who lands 99% here beats the flat server who lands 60% every single time.",
    },
  },
];
