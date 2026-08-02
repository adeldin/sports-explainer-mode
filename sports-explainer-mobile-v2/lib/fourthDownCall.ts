// Fourth Down Call — scenario data + field geometry (VERBATIM from fourth-down-call.html).
// The grades (go/fg/punt per scenario) and the 4-depth COACH'S READ texts are the tactical content
// and Anthony's review surface — copied exactly, never re-derived. All fan-facing strings are prose
// only; the numbers in them (conversion rates, kick distances, punt nets) are the spike's published-
// reference figures, not internals. Pure data + math — zero RN imports.
//
// Coordinate system: the module renders INSIDE the FootballField canvas (680×380). The spike's own
// viewBox was 680×332; all X geometry (yardX, end zones, goal line, the NOSE math) is verbatim, and
// the vertical band is re-seated in the taller canvas (FY 92 as in the spike; FH 220→260 so the
// field fills the 380-high canvas; MIDY recentred). The scoreboard band ABOVE the field (y 6..70,
// legs to FY) is verbatim — it is core content and lives inside the module's SVG area.
//
// The measurement rule, drawn: the ball's NOSE (center + NOSE when level) decides it — converted
// means the nose finishes 3px PAST the amber line; stopped means it dies 5px SHORT. Inches, either way.

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type CallOption = 'go' | 'fg' | 'punt';
export type GradeKind = 'good' | 'ok' | 'bad';

export interface Grade { k: GradeKind; t: string; b: string }
export interface Board {
  dd: string;      // DOWN & DISTANCE — the amber headline cell
  spot: string;    // BALL ON
  you: number; them: number;
  clock: string;
  note?: string;   // extra clock caption (e.g. "2 TIMEOUTS")
}
export interface FourthDownScenario {
  tab: string;
  yards: number;   // ball spot in yards from YOUR goal line
  toGo: number;    // yards to the first down
  board: Board;
  goWorks: boolean; fgGood: boolean; answer: CallOption;
  grade: Record<CallOption, Grade>;
  why: Record<Depth, string>;
}

// ── field geometry ──
// X (verbatim): your end zone 20..66, their end zone 614..660, 100 yds = 548px → 5.48 px/yd.
// Y (re-seated in the 680×380 canvas): scoreboard 6..70, legs 70..FY, field band FY..FY+FH.
export const NOSE = 8;                       // ellipse rx — nose = center + 8 when level
export const FDC = {
  FY: 92, FH: 260, MIDY: 222,
  boardX: 20, boardY: 6, boardW: 640, boardH: 64,
};
export const yardX = (y: number): number => 66 + y * 5.48;

// The measurement: where the surge dies. Converted → nose 3px PAST the amber line; stopped → 5px SHORT.
export const goEndX = (works: boolean, fdX: number): number => (works ? fdX - NOSE + 3 : fdX - NOSE - 5);
// Kick end points (verbatim): a make finishes at their goal line (the posts); a miss dies short-right.
export const fgEnd = (makes: boolean, losX: number): Pt =>
  makes ? { x: 614, y: FDC.MIDY } : { x: Math.min(losX + 150, 590), y: FDC.MIDY + 6 };
export const puntEnd = (losX: number): Pt => {
  const net = Math.min(614 - 20, losX + 215);
  return { x: Math.min(net, 596), y: FDC.MIDY };
};
export const isTouchdownTry = (s: FourthDownScenario): boolean => s.yards + s.toGo >= 100;

export const SCEN: FourthDownScenario[] = [
  {
    tab: 'Short at midfield', yards: 55, toGo: 1,
    board: { dd: '4TH & 1', spot: 'THEIR 45', you: 17, them: 17, clock: 'Q3 · 8:12' },
    goWorks: true, fgGood: false, answer: 'go',
    grade: {
      go: {
        k: 'good', t: 'Go — the math is lopsided',
        b: "One yard at midfield: offenses convert this well over half the time, and the prize is a live drive in their territory. Even the failure case just hands them the ball far from your goal. This is the clearest 'go' on the chart.",
      },
      fg: {
        k: 'bad', t: "That kick doesn't exist",
        b: 'From their 45 this is a 62-yard attempt — a distance kickers hit well under half the time even in perfect conditions. A miss gives them the ball right at the spot, the worst of every world. The field goal isn\'t one of the real options on this snap.',
      },
      punt: {
        k: 'ok', t: 'The old-school call',
        b: "Defensible in 1995: pin them deep, trust your defense. But you're trading a better-than-coin-flip shot at a scoring drive for maybe thirty net yards of field position. The punt isn't wrong — it's just worth less than the yard.",
      },
    },
    why: {
      rookie: 'Fourth-and-one means you need one more yard to keep the ball. One yard is short — NFL teams make it about 7 times out of 10, so going for it is usually right.',
      beginner: 'Weigh what each door is worth: fourth-and-one converts about 70% of the time (closer to 80% on a QB sneak), and the prize is a live drive in their territory. Fail, and they still start far from your end zone. When the downside is mild and the upside is big, go.',
      intermediate: 'The break-even is what matters: at midfield the models say going is right if you\'d convert about 45% of the time — and fourth-and-one actually converts around 70%. The punt only wins if field position beats possession, and a punt from here nets maybe 35–40 yards. That trade loses.',
      expert: 'League-wide go rates on fourth-and-one climbed from about half in 2018 to roughly 80% today — the analytics argument won. And the threat compounds: teams that go on fourth-and-short force defenses to defend all four downs, which loosens third down all game. The aggression pays rent even on the drives where it fails.',
    },
  },
  {
    tab: 'Long and backed up', yards: 25, toGo: 8,
    board: { dd: '4TH & 8', spot: 'OWN 25', you: 13, them: 10, clock: 'Q2 · 4:40' },
    goWorks: false, fgGood: false, answer: 'punt',
    grade: {
      punt: {
        k: 'good', t: 'Punt — this is what punts are for',
        b: "Eight yards is a low-percentage ask, and you're standing on your own 25 with a lead. The punt flips the field sixty yards and makes their offense earn every blade of grass. Boring and correct.",
      },
      go: {
        k: 'bad', t: 'A gift wrapped at your own doorstep',
        b: "Fail here — and fourth-and-eight fails most of the time — and they take over already in field-goal range. You'd be donating three points to protect a lead. The risk is all on your side of this one.",
      },
      fg: {
        k: 'bad', t: 'Wrong direction entirely',
        b: "You're seventy-plus yards from their posts — there is no kick here. The only kick that exists on your own 25 is the punt.",
      },
    },
    why: {
      rookie: 'Fourth down with a LOT to go, deep in your own end: kick it away. Tries this long fail about three times out of four — make the other team walk the whole field.',
      beginner: 'Two things vote punt: the distance (fourth-and-eight converts only about 25–30% of the time) and the address (a failure hands them the ball at your 25 — field-goal range before they run a single play). When both vote the same way, the call is easy.',
      intermediate: "Field position is the quiet currency: an NFL punt nets about 40 yards, so instead of starting at your 25 their drive starts back near their own 35, needing three first downs just to threaten. With a lead, you're happy to play that long game and let your defense hold it.",
      expert: "'Analytics says always go' is a myth — from Romer's original fourth-down paper to the modern win-probability bots, the models punt here overwhelmingly. The aggressive calls live in short yardage and plus territory; deep in your own end on fourth-and-long, expected value and the old scouts finally agree.",
    },
  },
  {
    tab: 'Down 4, clock shrinking', yards: 67, toGo: 3,
    board: { dd: '4TH & 3', spot: 'THEIR 33', you: 17, them: 21, clock: 'Q4 · 3:05' },
    goWorks: true, fgGood: true, answer: 'go',
    grade: {
      go: {
        k: 'good', t: "Go — three points don't fix four",
        b: 'Down four, a field goal still leaves you needing a touchdown later — with less clock and no guarantee you ever touch the ball again. Converting keeps the one drive you know you have alive and marching toward the score that actually wins it.',
      },
      fg: {
        k: 'ok', t: 'Makeable — but it buys a prayer',
        b: "A 51-yarder — NFL kickers make about three of four from there — and down one sounds better than down four. But you've spent your possession on points that still require a stop, a drive, and another kick. Defensible on the sideline; second-best on the spreadsheet.",
      },
      punt: {
        k: 'bad', t: 'Punting away the game',
        b: "From their 33 a punt nets maybe twenty yards, and the clock is your enemy, not theirs. You'd be handing back the ball and the time in the same motion. This is the one call with no story where it works.",
      },
    },
    why: {
      rookie: "Losing by four means a field goal isn't enough — you need a touchdown eventually. Teams make fourth-and-three about half the time, so keep the ball and keep driving.",
      beginner: 'Do the scoreboard math before the yardage math: fourth-and-three converts about half the time, and the 51-yard kick (about a 75% make) still leaves you needing a touchdown. When the points on offer don\'t change what you need, possession is worth more than the kick.',
      intermediate: 'Time is a resource like yards: taking the field goal spends your drive AND forces your defense to win the ball back with the clock draining. The win-probability models grade going for it several points of win probability ahead of the kick here — trailing late, possessions are nearly priceless.',
      expert: "The numbers behind the gut call: a roughly 50/50 conversion keeps the winning drive alive, while the 75% kick buys points that still require a stop, a drive, and another score. That's why fourth-down go rates for trailing teams in the final five minutes have roughly doubled in the analytics era.",
    },
  },
  {
    tab: 'Goal to go, down 7', yards: 98, toGo: 2,
    board: { dd: '4TH & GOAL', spot: 'THE 2', you: 10, them: 17, clock: 'Q4 · 6:00', note: '2 TIMEOUTS' },
    goWorks: true, fgGood: true, answer: 'go',
    grade: {
      go: {
        k: 'good', t: 'Go — this is the touchdown you need anyway',
        b: "Down seven, you need a touchdown at some point no matter what. You're two yards away from it right now. Even the miss pins them at their own two — your defense gets the ball back in great shape. Take the shot while it's this close.",
      },
      fg: {
        k: 'ok', t: "Points — that still don't solve it",
        b: 'Down four instead of seven feels like progress, but the assignment is unchanged: you still need a touchdown, and now you need it from farther away than the two-yard line you just left. Coaches make this kick every week; the math winces every time.',
      },
      punt: {
        k: 'bad', t: 'Punting from the two-yard line',
        b: "Into the end zone, for a touchback, netting almost nothing. There's no version of this that isn't surrender two yards from the goal line.",
      },
    },
    why: {
      rookie: "You're losing by seven and you're two yards from a touchdown. Teams punch it in from the two about half the time — a touchdown is exactly what you need, so go get it.",
      beginner: "Ask 'does this score change what I need?' A field goal here doesn't: down four still requires a touchdown. From the two the try succeeds about 45–50% of the time — the same play as a two-point conversion, which the league makes at nearly half. Take the shot at the score that can change the game.",
      intermediate: "The hidden bonus of the miss: they take over backed up at their own two, where drives produce points barely one time in ten — and a stop hands you the ball back near midfield. 'Go' isn't just chasing the touchdown; its failure case is quietly fine.",
      expert: 'Late-game trees are about matching scores to possessions: down seven with two possessions of clock, touchdown-now plus a stop beats field-goal-now in nearly every branch. The win-probability models put going ahead by three to four points of win probability — the biggest fourth-down edges on the whole chart live right here at the goal line.',
    },
  },
];
