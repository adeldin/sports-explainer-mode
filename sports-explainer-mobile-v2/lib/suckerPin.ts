// Sucker Pin — scenario data (VERBATIM from golfcorner/sucker-pin.html). "Pros aim at every pin"
// is the myth; the flag is often a trap. The module's engine is the AIM MARKER + dispersion OVAL:
// the marker moves FIRST, then the whole oval re-centers on it (wind adds its push) — you don't
// aim a shot, you aim an oval. Green complex at true scale: 6 px per yard → 1 ft = 2 px, so putt
// feet in the copy are COMPUTED from coordinates (feet() below — the audit contract). Coordinates
// share the module's own 680×420 green-complex viewBox. Pure data — zero RN imports.

export type Vec = [number, number];
export type Grade = 'good' | 'ok' | 'bad';
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type SuckerPinOption = 'flag' | 'center' | 'fat' | 'club';

export const VB = { w: 680, h: 420 };

// The putting surface (ellipse) + the ball at the bottom of the frame. Shot direction: straight up.
export const GC: Vec = [350, 185];
export const GRX = 118, GRY = 92;
export const BALL: Vec = [340, 392];
export const STOCK_AIM: Vec = [350, 196];                            // stock aim: middle of the green

export function onGreen(x: number, y: number): boolean {
  return ((x - GC[0]) / GRX) ** 2 + ((y - GC[1]) / GRY) ** 2 <= 1;
}
export function feet(a: Vec, b: Vec): number {
  return Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) / 2);
}

export interface HudChip { label: string; value: string; warn?: boolean }
export interface SuckerPinOpt {
  aim: Vec;
  land: Vec;
  k: Grade;
  splash?: boolean;
  sand?: boolean;
  fan?: boolean;                                                     // short-side wedge fan reveal
  tail?: { lab: string; col: string };                               // short-tail highlight arc on the oval
  ghost?: SuckerPinOption;                                           // the better aim, revealed after
  ghostLab?: string;
  t: string;
  b: string;
}
export interface SuckerPinScenario {
  tab: string;
  dist: number;
  pin: Vec;
  oval: { rx: number; ry: number };
  shift: Vec;                                                        // wind push applied to the oval center
  wind?: boolean;
  water?: boolean;
  bunkers: { cx: number; cy: number; rx: number; ry: number }[];
  opp?: Vec;
  hud: HudChip[];
  prompt: string;
  opts: Record<SuckerPinOption, SuckerPinOpt>;
  why: Record<Depth, string>;
}

export const OPTIONS: { key: SuckerPinOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'flag', title: 'AIM AT FLAG', sub: 'pin seeker' },
  { key: 'center', title: 'AIM CENTER', sub: 'middle of the green' },
  { key: 'fat', title: 'AIM FAT SIDE', sub: 'away from the trouble' },
  { key: 'club', title: 'TAKE MORE CLUB', sub: 'one club longer', alt: true },
];

export const NARR_PICKED = 'Target picked — <b>watch the oval follow it.</b>';
export const NARR_OVAL = 'Your misses live inside that oval. <b>Swing.</b>';
export const NARR_SWING = 'No wind trick, no slice — <b>every swing lands somewhere in the oval.</b> Today:';
export const PROMPT_DONE = 'You never aimed a shot — <b>you aimed an oval</b>: the ball lands somewhere inside it every time. Pick targets where every somewhere is fine.';
export const HINT_IDLE = 'Ask where a NORMAL miss ends up — that’s the whole read.';
export const HINT_DONE = 'Reset, or try another pin.';

// Faded balls: other days from the same swing at the same target (unit-oval fractions ×0.85).
export const OTHER_DAYS: Vec[] = [[-0.55, -0.3], [0.42, -0.45], [-0.25, 0.5], [0.55, 0.33]];

/* Scenarios. All putt lengths in the copy are computed from these coordinates
   (2 px = 1 ft) — the audit script asserts every one. */
export const SCENARIOS: SuckerPinScenario[] = [
  {
    tab: 'Green light', dist: 155, pin: [400, 196], oval: { rx: 66, ry: 48 }, shift: [0, 0],
    bunkers: [{ cx: 212, cy: 118, rx: 34, ry: 18 }],
    hud: [
      { label: 'SHOT', value: '155 · FAIRWAY LIE' },
      { label: 'PIN', value: 'CENTER-RIGHT · OPEN' },
      { label: 'YOUR 150 OVAL', value: '22 YDS WIDE' },
    ],
    prompt: "Center-right pin, no hazard near it, fairway lie. <b>Where's the target?</b>",
    opts: {
      flag: {
        aim: [400, 196], land: [436, 214], k: 'good',
        t: 'Fire away — green lights exist',
        b: "The whole oval sits on the putting surface even centered on the flag — that's the definition of an accessible pin. A normal miss leaves a 20-foot look. Course management isn't 'never at the flag'; it's 'know when the oval says yes.'",
      },
      center: {
        aim: [350, 190], land: [332, 206], k: 'ok', ghost: 'flag', ghostLab: 'the oval fit on the flag',
        t: 'Safe — against a pin that invited you',
        b: 'Nothing wrong ever comes from the middle of the green. But this pin had no teeth: aiming at it risked nothing, and your caution bought a 34-footer instead of a 20-footer. Save the center for pins that earn it.',
      },
      fat: {
        aim: [300, 190], land: [282, 200], k: 'ok', ghost: 'flag', ghostLab: 'the oval fit on the flag',
        t: 'You aimed away from nothing',
        b: 'The fat side is a tool for defended pins — this one was undefended. A 59-foot lag across the whole green is the price, and three-putt range is where blown holes quietly start.',
      },
      club: {
        aim: [400, 136], land: [390, 90], k: 'bad', ghost: 'flag', ghostLab: 'stock club, at the flag',
        t: 'Long through the green',
        b: 'Extra club is for when SHORT is dead — here nothing was. The longer club moved your whole oval deep, and a normal strike sailed the back edge into the rough. Now you’re chipping back down toward a pin you could have putted at.',
      },
    },
    why: {
      rookie: 'Sometimes the flag really is the target! When there’s no bunker or water near the pin and the whole dashed oval fits on the green, aim right at it.',
      beginner: 'The test is the oval, not the flag: center the oval on the pin and look at its edges. All grass? Green light. Here every miss inside the pattern stays on the putting surface, so the aggressive aim is FREE — a 20-foot putt instead of a 34-footer.',
      intermediate: "Aiming center against an accessible pin costs about 14 feet of proximity for zero risk reduction — you're paying an insurance premium on a house that can't burn. Good targeting is symmetric: it takes the safe line when the oval overlaps trouble AND the aggressive line when it doesn't.",
      expert: "Make-rate math: from 20 feet you hole ~15% and three-putt ~5%; from 34 feet those flip toward ~7% and ~10%, and from 59 feet the three-putt rate triples. On an undefended pin the expected-strokes gap between flag-aim and fat-aim is ~0.15 — small per shot, but it's the same 0.15 the sucker pin steals back when you chase a defended flag. The skill is telling the two pins apart, not a fixed policy.",
    },
  },

  {
    tab: 'Tucked behind sand', dist: 162, pin: [266, 232], oval: { rx: 66, ry: 48 }, shift: [0, 0],
    bunkers: [{ cx: 206, cy: 262, rx: 40, ry: 26 }],
    hud: [
      { label: 'SHOT', value: '162 · FAIRWAY LIE' },
      { label: 'PIN', value: '3 PACES FROM THE LEFT EDGE', warn: true },
      { label: 'GUARDING IT', value: 'A DEEP BUNKER' },
    ],
    prompt: 'The pin hangs 3 paces from the left edge, right behind the bunker. <b>Tempting?</b>',
    opts: {
      flag: {
        aim: [266, 232], land: [222, 262], k: 'bad', sand: true, fan: true, ghost: 'center', ghostLab: 'center — a 25-footer',
        t: 'Short-sided — the trap fired',
        b: 'A completely NORMAL miss at that flag is short-left — and short-left is the bunker. Now look at the fan: about five feet of green to land on between the lip and the hole. Up-and-down from short-sided spots runs about 25%. The pin was bait, and the oval knew.',
      },
      center: {
        aim: [360, 200], land: [314, 222], k: 'good',
        t: 'Center — and a real birdie putt anyway',
        b: "Aim at the fat middle and the same swing leaves a 25-footer. That's the secret the sucker pin hides: the boring aim still makes birdies — tour proximity from this range is 23–30 feet, so the 'coward's line' IS the pro line. Short-siding yourself costs about half a stroke; the 25-footer costs nothing.",
      },
      fat: {
        aim: [386, 204], land: [388, 212], k: 'ok',
        t: 'Double-safe — you left some behind',
        b: 'Dry land, guaranteed — but the far-right aim buys margin this pin doesn’t demand. Center was already safe, and this line leaves a 62-foot lag with three-putt very much in play. Fat side is for when the trouble reaches past the middle; today it stopped there.',
      },
      club: {
        aim: [268, 172], land: [252, 150], k: 'ok',
        t: 'Over the trouble — the long way',
        b: 'Flying it past the flag does clear the bunker, and 42 feet from the back tier is dry and putting. But it solves a left-right problem with a long-short tool: center was simpler, closer, and never brought the back fringe into play.',
      },
    },
    why: {
      rookie: 'A pin tucked right behind a bunker is a trap. Aim at the middle of the green instead — your putt will still be close enough, and you can’t end up in the sand.',
      beginner: "Trace the oval centered on the flag: a big slice of it hangs over the bunker, and sand short of a close-cut pin is 'short-sided' — almost no green between you and the hole. Centered on the middle instead, the whole oval is grass and the same swing leaves 25 feet. One aim point, half a stroke of difference.",
      intermediate: "The numbers behind the fan: up-and-down runs ~55% from the long side but ~25% short-sided, so the short-side miss costs roughly 0.34–0.5 strokes every time it happens — and aiming at this flag makes it happen on a third of your shots. Meanwhile the center aim's WORST outcome is a 35-foot putt. You're trading half a stroke of downside for 12 feet of proximity.",
      expert: "Model it: E(flag) = P(green)×putt(~15ft) + P(bunker ~33%)×(sand save 25%) ≈ half a stroke worse than E(center) = ~100%×putt(25ft). The flag only breaks even if your oval is tour-tight AND the lie is perfect. This is the exact calculation behind 'pros aim at the fat side more than fans believe' — DECADE, Broadie, every targeting system lands on the same answer: play to the middle, let the putter be the hero.",
    },
  },

  {
    tab: 'Rough + wind at water', dist: 148, pin: [430, 200], oval: { rx: 92, ry: 56 }, shift: [26, 0], wind: true,
    water: true,
    bunkers: [],
    hud: [
      { label: 'SHOT', value: '148 · LIGHT ROUGH', warn: true },
      { label: 'PIN', value: 'RIGHT EDGE · OVER WATER' },
      { label: 'WIND', value: 'PUSHING TOWARD THE POND', warn: true },
    ],
    prompt: '148 from light rough, pin cut by the pond, wind drifting that way. <b>Notice your oval just got bigger.</b>',
    opts: {
      flag: {
        aim: [430, 200], land: [492, 214], k: 'bad', splash: true, ghost: 'fat', ghostLab: 'fat side — all grass',
        t: 'The lie and the wind cashed you out',
        b: "From rough you can't spin or fully control the ball, so the oval widens — and the wind slides the whole pattern toward the pond before the ball even leaves. Aimed at the flag, half your misses were wet. This one was. Penalty, drop, hitting four.",
      },
      center: {
        aim: [350, 196], land: [408, 238], k: 'ok', ghost: 'fat', ghostLab: "fat side — margin the wind can't erase",
        t: 'Dry — but the edge was still in the pond',
        b: "You stayed dry and you're putting from 22 feet, so it feels fine. But rewind the oval: after the wind push its right edge was flirting with the water line. 'Center' is only center in calm air off a clean lie — today the fat side was the real middle.",
      },
      fat: {
        aim: [318, 192], land: [368, 208], k: 'good',
        t: 'Fat side — you aimed the wind, not against it',
        b: 'Aiming left of center lets the wind blow the pattern back toward the hole: the whole drifted oval sits on grass with six yards to spare, and the normal miss leaves a 31-footer. Lie plus wind plus hazard is the classic fat-side trifecta — you read all three.',
      },
      club: {
        aim: [430, 140], land: [458, 96], k: 'bad', ghost: 'fat', ghostLab: 'fat side — all grass',
        t: 'The flyer flew',
        b: 'More club out of rough is gasoline on a flyer lie — the ball came out hot, long and right, over the back into the rough beside the pond. You added distance when the problem was DIRECTION. The fix was aim, not muscle.',
      },
    },
    why: {
      rookie: 'Two things made this shot harder: the ball is in rough (harder to control) and the wind blows toward the water. When a shot is harder, aim FARTHER from the trouble.',
      beginner: "Your oval isn't fixed — it grows with the lie and slides with the wind. From light rough it's maybe half again wider, and this wind carries everything a few more yards toward the pond. Aim at the flag and the pattern hangs over water; aim at the fat side and the same pattern is all grass, still just 31 feet away.",
      intermediate: 'Stack the adjustments in order: baseline oval (22 yds) → rough widens it (~30 yds) → wind displaces its CENTER toward the hazard (~5 yds). Only then choose the aim that keeps the worst edge on grass. Most amateurs run this pipeline backwards — pick the flag, then hope the adjustments don’t matter. The pond collects that hope all day.',
      expert: 'The penalty asymmetry does the arithmetic: a water ball costs ~1.7 strokes against ~0.3 for a long putt, so with even 25% of the shifted oval wet, flag-aim loses ~0.35 strokes to fat-aim before touching proximity. Fat side from 148 in these conditions is one of the highest-margin decisions in the game precisely because it looks timid — the scorecard disagrees with the eyeball.',
    },
  },

  {
    tab: 'Front pin, deep bunker', dist: 148, pin: [350, 242], oval: { rx: 66, ry: 48 }, shift: [0, 0],
    bunkers: [{ cx: 350, cy: 300, rx: 96, ry: 24 }],
    hud: [
      { label: 'SHOT', value: '148 · FAIRWAY LIE' },
      { label: 'PIN', value: 'FRONT THIRD', warn: true },
      { label: 'SHORT OF IT', value: 'A DEEP FRONT BUNKER · LONG IS OPEN' },
    ],
    prompt: 'Front pin, a deep bunker across the whole front, nothing but green behind. <b>Which mistake do you want?</b>',
    opts: {
      flag: {
        aim: [350, 242], land: [334, 286], k: 'bad', sand: true, ghost: 'club', ghostLab: 'one more club — the short tail clears',
        t: 'Short is dead — and you aimed short',
        b: "A front pin means the flag-distance club puts HALF your oval short of the green — and short here is a deep bunker, not fringe. The normal slightly-thin strike found it. You didn't get unlucky; you aimed your bad miss at the only trouble on the map.",
      },
      center: {
        aim: [350, 218], land: [362, 196], k: 'ok', ghost: 'club', ghostLab: 'more club removes the tail entirely',
        tail: { lab: 'your SHORT TAIL — a thin one still finds this sand', col: '#e24b4a' },
        t: 'Worked — with a tail still in the sand',
        b: "Aiming center-depth with the same club leaves a 24-footer this time. But your oval's short tail was still hanging a couple of paces from the lip — you shrank the bunker risk without removing it. The longer club deletes it for free, because long is all green.",
      },
      fat: {
        aim: [430, 208], land: [446, 224], k: 'ok',
        t: 'Sideways answer to a front-back question',
        b: "The right half of the green is dry, sure — but the bunker guards the FRONT, not the left, and your short tail still had to carry it from over there. You're 49 feet away solving a problem that more club solves at 25. Match the fix to the axis of the trouble.",
      },
      club: {
        aim: [350, 182], land: [370, 196], k: 'good',
        tail: { lab: 'your SHORT TAIL now lands on grass — bunker deleted', col: '#14B8A6' },
        t: 'More club — the mistake behind the flag is free',
        b: 'One extra club centers your oval past the pin: now the SHORT edge of the pattern lands on the front of the green instead of in the sand, and the normal result is a 25-foot putt from behind the hole. Short is dead, long putts — when the trouble is all on one side of the flag, park the whole oval on the other side.',
      },
    },
    why: {
      rookie: 'The bunker is in FRONT of this pin, and behind the pin is just more green. So take one more club — if you hit it perfect you’re a little past the hole, and if you mis-hit it you still carry the sand.',
      beginner: "Every club you can choose paints the oval somewhere: the flag-distance club splits your misses half-short, half-long — and short is a deep bunker. The next club up puts even your WORST strike on grass. You're not choosing a distance, you're choosing which miss you'll accept: sand blast or downhill putt.",
      intermediate: "'Take more club' is the vertical version of the fat side: hazard short/safety long means shift the oval long. Amateurs under-club chronically — pin-high-or-past is the single most repeated tour habit amateurs ignore, partly because ego distance ('I hit 9-iron 150... once') aims the short tail straight into front trouble.",
      expert: 'E(flag club) = P(carry)×putt(~15ft) + P(front bunker ~30%)×(deep-sand save well under 50%) — call it ~0.4 strokes worse than E(club up) ≈ putt(25ft) with a whisper of back-fringe risk. The general rule: center the dispersion so the penalty-weighted miss cost is minimized, not the distance to the hole. When trouble is asymmetric, the optimal aim is NEVER the pin — it’s offset toward the free side, here straight over the flag.',
    },
  },

  {
    tab: 'Match play: must-win', dist: 162, pin: [268, 232], oval: { rx: 66, ry: 48 }, shift: [0, 0],
    bunkers: [{ cx: 206, cy: 262, rx: 40, ry: 26 }], opp: [280, 221],
    hud: [
      { label: 'MATCH', value: '1 DOWN · HOLE 18', warn: true },
      { label: 'OPPONENT', value: 'ON THE GREEN — 8 FT', warn: true },
      { label: 'PIN', value: 'TUCKED BEHIND THE BUNKER' },
    ],
    prompt: "Same tucked pin — but it's 18, you're 1 down, and he's already inside 10 feet. <b>What does the match need?</b>",
    opts: {
      flag: {
        aim: [268, 232], land: [284, 240], k: 'good',
        t: 'At the flag — the only line that can win',
        b: "Stroke play says center. The MATCH says: he's making par or better from 8 feet, so a 31-foot two-putt loses 1-down-with-none-to-play. Over the bunker, at the pin — this one settles 9 feet away, and now your putt is to extend the match. The 'wrong' shot became the only right one.",
      },
      center: {
        aim: [360, 200], land: [330, 224], k: 'bad', ghost: 'flag', ghostLab: 'the flag — the only winning line',
        t: 'The safe play that loses politely',
        b: "A 31-footer against his 8-footer isn't safety — it's a concession with extra steps. You'll two-putt, he'll hole or lag dead, match over. When halving the hole loses the match, protecting your score protects his win.",
      },
      fat: {
        aim: [386, 204], land: [390, 212], k: 'bad', ghost: 'flag', ghostLab: 'the flag — the only winning line',
        t: 'Sixty-two feet from relevance',
        b: 'The fat side is the right answer to a question nobody asked tonight. From 62 feet you’re playing for a five-percent miracle putt; the bunker you avoided was never the thing beating you — his 8-footer is.',
      },
      club: {
        aim: [268, 172], land: [252, 150], k: 'bad', ghost: 'flag', ghostLab: 'the flag — the only winning line',
        t: 'Long, dry, and still losing',
        b: 'Forty-two feet from the back tier is a fine stroke-play miss and a match-play surrender. Every safe line on this green leads to the same handshake. Down one with one to play, the bunker stopped being the risk — the LAG is.',
      },
    },
    why: {
      rookie: "You're losing by one hole with one hole left, and his ball is close. A safe shot to the middle means you probably tie the hole — but tying the hole loses the match! This is the one time to aim right at the flag.",
      beginner: "Match play flips the math: the question isn't 'lowest average score,' it's 'can I win THIS hole?' A 31-footer wins it maybe 1 time in 14; a 9-footer more than 1 in 3. The bunker miss loses — but so does the safe two-putt. When every road but one loses, the risky road is free.",
      intermediate: 'Compute what each aim wins: P(win hole | flag) ≈ P(dry ~2/3)×P(hole ~9ft ~35%) ≈ 23%, plus bunker hole-outs. P(win hole | center) ≈ P(hole 31ft) ≈ 7%. Down one on the last, hole-win probability is the ONLY currency — expected strokes are a stroke-play unit, and using them here is playing the wrong game with the right numbers.',
      expert: "This is the module's deepest cut: risk is not a property of the shot, it's a property of the payoff structure. The identical swing at the identical pin was -EV an hour ago and +EV now, because the downside (bunker, lose) now equals the downside of safety (lag, lose) — when floors are equal, buy the ceiling. Match-play data agrees: trailing players who attack late flags win more matches than their proximity says they should, because the alternative was a guaranteed loss discounted as 'safe.'",
    },
  },
];
