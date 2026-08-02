// The Pinch — tee-shot club selection data (VERBATIM from golfcorner/the-pinch.html). The myth:
// "driver risky, 3-wood smart." The truth: trouble pinches at a YARDAGE, and the smart club is
// whichever one's landing oval misses that yardage — sometimes that's the driver. Six holes: wide
// open, classic pinch, pinch-opens-late (the flip), short hitter, dogleg + OB, crosswind + water
// (the AIM AWAY hole — the neutral fourth button, "same club, different line"). Approach numbers
// in the popups are hole−yards (audited). Fixed scale: 1.4 px per yard, tee ball at [64,240].
// Coordinates share the module's own 680×420 hole-map viewBox. Pure data — zero RN imports.

export type Vec = [number, number];
export type Grade = 'good' | 'ok' | 'bad';
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type PinchOption = 'drv' | 'w3' | 'irn' | 'away';

export const VB = { w: 680, h: 420 };
export const TEE: Vec = [64, 240];
export const S = 1.4;                                                // px per yard
export const pxOf = (yds: number): number => TEE[0] + yds * S;

// Club ovals in px (long axis = distance axis = x). 'away' swings the driver.
export const OVAL: Record<'drv' | 'w3' | 'irn', { rx: number; ry: number }> = {
  drv: { rx: 28, ry: 27 }, w3: { rx: 22, ry: 20 }, irn: { rx: 15, ry: 13 },
};
// Five deterministic "possible finishes" inside the unit oval (the faded ghost balls).
export const GHOSTS: Vec[] = [[-0.62, -0.38], [0.5, 0.6], [0.15, -0.72], [-0.32, 0.5], [0.72, 0.12]];

export interface HudChip { label: string; value: string; warn?: boolean }
export interface PinchResult {
  land: Vec;                                                         // [yds, y-px]
  k: Grade;
  aim: Vec;                                                          // [yds, y-px] — the oval's intended center
  shift?: number;                                                    // wind drift applied to the oval center (y-px)
  ghost?: PinchOption;                                               // the better club, revealed after
  ghostLab?: string;
  sand?: boolean; splash?: boolean; ob?: boolean; tree?: boolean;
  pop: [string, string];                                             // two-line approach-distance popup
  t: string;
  b: string;
}
export interface PinchScenario {
  tab: string;
  hole: number;
  clubs: { drv: number; w3: number; irn: number };
  dogleg?: boolean;
  fw: { x: number; y: number; w: number; h: number }[];
  gy: number;
  bunkers?: { cx: number; cy: number; rx: number; ry: number }[];
  water?: { x1: number; x2: number; y1: number; y2: number };
  wind?: boolean;
  hud: HudChip[];
  prompt: string;
  res: Record<PinchOption, PinchResult>;
  why: Record<Depth, string>;
}

// Button copy: drv/w3/irn subtitles carry the per-scenario club distance; AIM AWAY stays neutral.
export const OPTIONS: { key: PinchOption; title: string; sub?: string; alt?: boolean }[] = [
  { key: 'drv', title: 'HIT DRIVER' },
  { key: 'w3', title: 'HIT 3-WOOD' },
  { key: 'irn', title: 'HIT IRON' },
  { key: 'away', title: 'DRIVER, AIM AWAY', sub: 'same club, different line', alt: true },
];

export const NARR_OVAL = 'That oval is every normal outcome of this swing. <b>Watch a few of them…</b>';
export const NARR_TODAY = '…and this one is <b>today’s.</b>';
export const PROMPT_DONE = 'Safety is a <b>yardage</b>, not a club.';
export const HINT_IDLE = "Find the trouble's yardage, then pick the club that misses it.";
export const HINT_DONE = 'Reset, or play another tee shot.';

export const SCENARIOS: PinchScenario[] = [
  {
    tab: 'Wide open', hole: 415, clubs: { drv: 275, w3: 245, irn: 210 },
    fw: [{ x: 78, y: 208, w: 560, h: 64 }], gy: 240,
    hud: [
      { label: 'HOLE', value: 'PAR 4 · 415' },
      { label: 'FAIRWAY', value: 'WIDE ALL THE WAY' },
      { label: 'TROUBLE', value: 'NONE IN RANGE' },
    ],
    prompt: "415 yards, fairway like a runway, nothing to hit. <b>What's the play?</b>",
    res: {
      drv: {
        land: [289, 242], k: 'good', aim: [275, 240],
        pop: ['DRIVER: 126 IN', 'vs 3-WOOD: 162 IN'],
        t: 'Send it — distance is king when misses are free',
        b: 'With no penalty anywhere in range, every extra yard off the tee is pure profit: 126 in instead of 162. The amateur numbers say driver costs almost nothing — 46% fairways versus 48% with 3-wood — and here even the rough is a fine place to be.',
      },
      w3: {
        land: [253, 251], k: 'ok', aim: [245, 240], ghost: 'drv', ghostLab: 'the driver oval — all safe too',
        pop: ['3-WOOD: 162 IN', 'DRIVER would be: ~126 IN'],
        t: "The 'smart club' that wasn't smarter",
        b: "The 3-wood found grass — and so would the driver, because there was nothing to find. You paid 30-plus yards for accuracy you didn't need: a needless club-down runs about 0.2–0.3 strokes. Safe is only smart when there's something to be safe FROM.",
      },
      irn: {
        land: [212, 231], k: 'bad', aim: [210, 240], ghost: 'drv', ghostLab: 'the driver oval — same safety, 77 yds closer',
        pop: ['IRON: 203 IN', 'vs DRIVER: ~126 IN'],
        t: 'Surrendered 77 yards to nobody',
        b: "An iron for 'position' on a hole with no trouble is position for nothing. You'll hit a long approach club into the green instead of a wedge — the iron didn't reduce risk, it relocated it to a harder second shot.",
      },
      away: {
        land: [267, 196], k: 'ok', aim: [275, 190],
        pop: ['DRIVER (aimed away): 148 IN', '— from the rough'],
        t: "Insurance against a hazard that doesn't exist",
        b: 'You aimed at the rough line to dodge... nothing, and the normal pull put you IN the rough. Aim-away is a real tool — later holes prove it — but pointed at empty grass it just converts fairway into rough for free.',
      },
    },
    why: {
      rookie: 'Look for trouble your ball can actually reach. None? Then hit the club that goes farthest. A shorter second shot is easier for everyone, every time.',
      beginner: 'The driver-is-risky myth dies on the stats: amateurs hit about 46% of fairways with driver and 48% with 3-wood — two points, for 20–30 yards. And a wedge from 126 beats a mid-iron from 162 by a lot more than two points of anything.',
      intermediate: "Strokes-gained off the tee is mostly a distance stat: on penalty-free holes, longer tee shots gain roughly 0.2–0.3 strokes over a laid-up position. 'Position golf' only pays when position dodges a REAL cost — sand, water, OB, a blocked angle. An open hole has no such cost, so laying back is a pure donation.",
      expert: "E(hole) ≈ E(approach | distance in) + tee-shot risk. Here risk(driver) ≈ risk(3W) ≈ 0, so the comparison collapses to approach equity: 126 vs 162 vs 203 is worth ~0.25 strokes per step. The deeper habit this hole teaches: club selection is a function of the TROUBLE MAP, not a fixed hierarchy of 'safe clubs' — on the next tee the same driver becomes wrong for reasons you can point at.",
    },
  },

  {
    tab: 'Classic pinch', hole: 415, clubs: { drv: 275, w3: 245, irn: 210 },
    fw: [{ x: 78, y: 218, w: 560, h: 44 }], gy: 240,
    bunkers: [{ cx: 457, cy: 216, rx: 22, ry: 12 }, { cx: 457, cy: 264, rx: 22, ry: 12 }],
    hud: [
      { label: 'HOLE', value: 'PAR 4 · 415' },
      { label: 'BUNKERS', value: '265–296 OUT · BOTH SIDES', warn: true },
      { label: 'YOUR DRIVER', value: 'LANDS 255–295' },
    ],
    prompt: 'Sand pinches the fairway right at driver distance — 265 to 296 out. <b>Your driver lands 255–295.</b>',
    res: {
      drv: {
        land: [283, 260], k: 'bad', aim: [275, 240], ghost: 'w3', ghostLab: 'the 3-wood oval — short of all of it', sand: true,
        pop: ['DRIVER: 132 IN — FROM SAND', '3-WOOD: 168 IN — FROM GRASS'],
        t: 'You aimed your oval at the sand',
        b: "The pinch lives at 265–296 and your driver's landing oval is 255–295 — nearly the whole pattern inside the jaws. From a fairway bunker at 132 you're mostly just getting out. A ball in the fairway at 245 beats a ball in sand at 283 by about 0.3 strokes.",
      },
      w3: {
        land: [247, 234], k: 'good', aim: [245, 240],
        pop: ['3-WOOD: 168 IN', '— from the short grass'],
        t: 'The layup with a reason',
        b: "THIS is when the 3-wood is the smart club: its whole oval finishes short of 265, where the fairway is still fairway. You gave up 30 yards to take sand completely off the card — that's a trade with something on both sides of it.",
      },
      irn: {
        land: [208, 248], k: 'ok', aim: [210, 240], ghost: 'w3', ghostLab: 'the 3-wood — same safety, 39 yds closer',
        pop: ['IRON: 207 IN', 'vs 3-WOOD: 168 IN'],
        t: 'Double-safe, double-priced',
        b: "The iron dodges the pinch by 55 yards when 20 would have done it. The 3-wood's entire oval was already short of the sand — beyond that point, every extra yard of club-down is the 0.2–0.3-stroke donation from the wide-open hole again.",
      },
      away: {
        land: [277, 216], k: 'bad', aim: [275, 214], ghost: 'w3', ghostLab: 'the 3-wood oval — the real answer', sand: true,
        pop: ['DRIVER AIM AWAY: 138 IN — SAND', 'the pinch has TWO jaws'],
        t: "There is no 'away' — it's a pinch",
        b: "Aim-away works when the trouble is on ONE side. This trouble is a pair of jaws: sliding your oval toward the top rough just centered it on the top bunker instead. When both sides pinch at the same yardage, the escape isn't sideways — it's SHORTER.",
      },
    },
    why: {
      rookie: 'The bunkers sit exactly where your driver lands — 265 to 296 out. So use the club that can’t reach them: the 3-wood stops short, and short grass beats sand.',
      beginner: 'Match the two number pairs: trouble at 265–296, driver oval 255–295. That’s almost total overlap — most driver swings finish in a jaw. The 3-wood oval, 225–265, barely touches it. The 30 yards you give up cost ~0.15 strokes of approach equity; the sand you dodge costs ~0.3 every time you’d have found it.',
      intermediate: 'This is the pinch in its classic form, and the reasoning is symmetric with the open hole: same clubs, same swing, opposite answer, because the trouble map moved. Note the aim-away trap too — lateral adjustment does nothing against bilateral trouble at a fixed yardage. Distance trouble needs a distance answer.',
      expert: 'E(driver) ≈ P(sand ~60%)×(bunker approach 132: ~3.4 to hole out) + P(grass)×(~3.0) ≈ 3.25. E(3W) ≈ ~3.05 from 168 fairway. A quarter stroke per tee ball, compounding over a season of this hole. The design lesson underneath: architects place pinch bunkers at the AVERAGE driver distance on purpose — the tee box is asking you a yardage question, and the scorecard grades the answer.',
    },
  },

  {
    tab: 'Pinch opens late', hole: 400, clubs: { drv: 275, w3: 245, irn: 210 },
    fw: [{ x: 78, y: 218, w: 385, h: 44 }, { x: 463, y: 208, w: 175, h: 64 }], gy: 240,
    bunkers: [{ cx: 418, cy: 216, rx: 13, ry: 12 }, { cx: 418, cy: 264, rx: 13, ry: 12 }],
    hud: [
      { label: 'HOLE', value: 'PAR 4 · 400' },
      { label: 'BUNKERS', value: '244–262 OUT', warn: true },
      { label: 'DRIVER CARRY', value: '268 — CLEARS THEM' },
    ],
    prompt: 'The sand squeezes at 244–262... and past 285 the fairway opens wide again. <b>Now which club is the safe one?</b>',
    res: {
      drv: {
        land: [284, 250], k: 'good', aim: [275, 240],
        pop: ['DRIVER: 116 IN', 'carried the trouble entirely'],
        t: 'The FLIP — driver is the safe club here',
        b: "Your driver CARRIES 268, and the sand ends at 262: the big club flies the trouble and lands where the hole opens back up. The 'smart' 3-wood is the one that finishes exactly in the jaws. Safety is a yardage, not a club.",
      },
      w3: {
        land: [251, 258], k: 'bad', aim: [245, 240], ghost: 'drv', ghostLab: 'the driver oval — past all of it', sand: true,
        pop: ['3-WOOD: 149 IN — FROM SAND', 'DRIVER: 116 IN — FROM GRASS'],
        t: "The 'smart club' found the sand",
        b: "You clubbed down out of habit, and the habit landed at 251 — inside the 244–262 pinch. This is the myth's blind spot: the 3-wood isn't safe BY NATURE, it's safe when its landing zone is safe. Today its landing zone was the trouble.",
      },
      irn: {
        land: [214, 232], k: 'ok', aim: [210, 240], ghost: 'drv', ghostLab: 'the driver — over everything, 70 yds closer',
        pop: ['IRON: 186 IN', 'vs DRIVER: ~116 IN'],
        t: 'Short of the sand — and short of the point',
        b: 'Laying back to 214 does miss the bunkers, so nothing terrible happens. But the driver missed them too, by AIR, and left a wedge. When two clubs are equally safe, take the one 70 yards closer.',
      },
      away: {
        land: [271, 210], k: 'ok', aim: [275, 214],
        pop: ['DRIVER AIM AWAY: 129 IN', '— from the rough, needlessly'],
        t: 'You dodged sand the ball was going to fly anyway',
        b: 'The aim-away landed past the bunkers — because your driver carry was always clearing them. The sideways insurance bought a rough lie against trouble that was never in your landing zone. Read the CARRY number before paying for cover.',
      },
    },
    why: {
      rookie: 'Check where the sand STOPS: 262 out. Your driver flies 268 in the air — it goes right over the trouble. The shorter club is the one that lands in it!',
      beginner: 'Every club has a landing zone, and the pinch only eats the zones that overlap 244–262. Driver (255–295, carry 268): clears. 3-wood (225–265): lands square in it. The exact same logic that benched the driver on the last hole benches the 3-wood on this one.',
      intermediate: "Course architects love this trap: bunkers at the AMATEUR 3-wood distance with a reopened landing area past them, so the 'prudent' play is the punished one. The pros' pre-round routine — mark every hazard's start AND end yardage, compare against each club's carry and total — exists precisely because safe-club instinct fails on holes like this.",
      expert: "The pinch generalizes to an interval-overlap problem: minimize P(finish ∈ [244,262]) subject to maximizing distance. Driver: overlap ≈ the short tail below carry-268 — a few percent. 3-wood: mode of the distribution sits inside the interval — overlap ~50%+. The instinct 'shorter = safer' implicitly assumes trouble is monotone with distance; real holes violate that assumption on purpose, and exploiting the violation is free strokes.",
    },
  },

  {
    tab: 'Short hitter', hole: 390, clubs: { drv: 235, w3: 215, irn: 185 },
    fw: [{ x: 78, y: 218, w: 545, h: 44 }], gy: 240,
    bunkers: [{ cx: 459, cy: 216, rx: 14, ry: 12 }, { cx: 459, cy: 264, rx: 14, ry: 12 }],
    hud: [
      { label: 'HOLE', value: 'PAR 4 · 390' },
      { label: 'BUNKERS', value: '272–292 OUT' },
      { label: 'YOUR DRIVER', value: '235 TOTAL', warn: true },
    ],
    prompt: 'Same scary bunkers at 272–292… but <b>your</b> driver goes 235. Whose trouble is it?',
    res: {
      drv: {
        land: [241, 252], k: 'good', aim: [235, 240],
        pop: ['DRIVER: 149 IN', 'the sand starts 31 yds past this ball'],
        t: 'Send it — that sand belongs to longer hitters',
        b: "The pinch is at 272–292 and your longest possible driver finishes at 255. For your distances the hazard doesn't exist — it's scenery. Club down from a driver that can't reach trouble and you're paying an insurance premium on someone else's house.",
      },
      w3: {
        land: [219, 234], k: 'ok', aim: [215, 240], ghost: 'drv', ghostLab: 'your driver oval — still 17 yds short of the sand',
        pop: ['3-WOOD: 171 IN', 'vs DRIVER: 149 IN'],
        t: 'Cautious against nothing you can reach',
        b: "The 3-wood is fine — but what was it protecting you from? Your driver's LONGEST finish is 255, and the sand starts at 272. You handed back 22 yards to a bunker that was never in the conversation.",
      },
      irn: {
        land: [188, 246], k: 'bad', aim: [185, 240], ghost: 'drv', ghostLab: 'your driver — same safety, 53 yds closer',
        pop: ['IRON: 202 IN', 'vs DRIVER: ~149 IN'],
        t: 'Maximum caution, zero threat',
        b: 'An iron off the tee to dodge bunkers 87 yards beyond its landing spot. The scary yardage on the card was never YOUR yardage — every trouble map has to be re-drawn for your own distances before it means anything.',
      },
      away: {
        land: [233, 214], k: 'ok', aim: [235, 214],
        pop: ['DRIVER (aimed away): 157 IN', '— from the rough'],
        t: 'Aimed away from out-of-reach sand',
        b: "Same misread as clubbing down, sideways: the bunkers can't touch you, so the aim-away only moved your finish from fairway to rough. The map said 'scary'; YOUR yardage book said 'irrelevant.' Trust the second one.",
      },
    },
    why: {
      rookie: 'Those bunkers are 272 yards away and your driver goes 235. You literally cannot reach the trouble — so it isn’t trouble for you. Hit the driver.',
      beginner: 'Hazard yardages only mean something compared to YOUR distances. The 272–292 pinch punishes a 280-yard hitter; for a 235 driver the entire dispersion oval — even the very best strike at 255 — finishes 17+ yards short of the first grain of sand. Different bags play different holes.',
      intermediate: 'This is the flip that exposes copied strategy: shorter hitters watch long players lay up here and copy the layup, importing a solution to a problem they don’t have. Meanwhile the short hitter NEEDS the yards more — from 149 versus 202, the approach-equity gap is wider at amateur skill levels than tour ones.',
      expert: 'Formally the overlap term P(finish ∈ pinch) is zero for every club in this bag, so the decision reduces to pure distance maximization — the open-hole case in disguise. The meta-skill: the pinch module’s four holes are ONE equation, P(trouble)×cost(trouble) vs yards surrendered, evaluated against your own distributions. Nothing about the club in your hand is inherently brave or smart — the map and your carry table decide together.',
    },
  },

  {
    tab: 'Dogleg + OB', hole: 403, clubs: { drv: 275, w3: 245, irn: 210 }, dogleg: true,
    fw: [{ x: 78, y: 218, w: 347, h: 44 }], gy: 240,
    hud: [
      { label: 'HOLE', value: 'DOGLEG · CORNER AT 258', warn: true },
      { label: 'THROUGH THE CORNER', value: 'OUT OF BOUNDS', warn: true },
      { label: 'FROM THE CORNER', value: '145 TO THE GREEN' },
    ],
    prompt: 'The fairway turns at 258 — straight through it is <b>OB stakes</b>. Distance past the corner is worth nothing. <b>Club?</b>',
    res: {
      irn: {
        land: [212, 236], k: 'good', aim: [210, 240],
        pop: ['IRON: 191 IN', 'full look up the second fairway'],
        t: 'The corner is the finish line — stop before it',
        b: "The hole stops going forward at 258; after that, yards turn into stakes. The iron's whole oval (199–221) finishes with room to spare and the corner opens the green up at 191. On a dogleg, the tee shot's job is the ANGLE, not the distance.",
      },
      w3: {
        land: [256, 246], k: 'ok', aim: [245, 240], ghost: 'irn', ghostLab: 'the iron — same look, no OB tail',
        pop: ['3-WOOD: 147 IN', 'longest finish: 261 — stakes at 258'],
        t: 'You got away with the long tail',
        b: "This one stopped two paces short of the stakes — but your 3-wood's longest finishes run to 261, and the boundary is at 258. You brought a stroke-and-distance penalty into your oval to gain 44 approach yards you didn't need. Winning the bet doesn't make it a good bet.",
      },
      drv: {
        land: [274, 240], k: 'bad', aim: [275, 240], ghost: 'irn', ghostLab: "the iron — the hole's actual finish line", ob: true,
        pop: ['DRIVER: OB — HITTING 3', 'IRON: 191 IN, SAFE'],
        t: 'Through the corner, over the line',
        b: "274 yards of pure strike, 16 of them past the boundary. OB is stroke AND distance: you're re-teeing, hitting three, the worst single outcome golf sells. Distance past a dogleg's corner isn't just worthless — here it's negative.",
      },
      away: {
        land: [261, 168], k: 'bad', aim: [252, 178], ghost: 'irn', ghostLab: 'the iron — short of every problem', tree: true,
        pop: ['CORNER TREES — PUNCHING OUT', 'IRON: 191 IN, SAFE'],
        t: 'Away from the stakes, into the copse',
        b: "You aimed away from the OB — but a dogleg's inside corner is where the trees live, and the driver's distance carried you straight into them. When the hole turns, the answer is almost never a re-aimed driver; it's the club that stops before the turn.",
      },
    },
    why: {
      rookie: 'This hole bends like an elbow at 258 yards, and hitting straight past the bend is out of bounds. Use the club that stops before the bend — then you get a clear shot around the corner.',
      beginner: 'Count what extra yards buy on a dogleg: nothing — the green is around the turn, so a ball at 212 and a ball at 256 have nearly the same second shot (191 vs 147, both mid-irons), but the longer one carries an OB tail. OB costs stroke AND distance: the two-shot swing turns a par hole into a double-bogey machine.',
      intermediate: 'The corner converts the hole into a hard ceiling problem: value(distance) flatlines at 258 and cliff-drops after. The iron puts the WHOLE oval under the ceiling; the 3-wood’s tail (up to ~261) pokes through it. Risking a two-shot penalty to move from a 191 approach to 147 is wagering ~2.0 strokes to win ~0.15 — no table in golf pays worse.',
      expert: "OB's stroke-and-distance is the game's only ~2.0-stroke outcome, which is why every serious model treats boundary tails differently from hazard tails: a 3% OB tail costs more than a 15% bunker tail. Corollary drawn on this map: the aim-away instinct fails on doglegs because the inside corner is architecturally guaranteed to be defended (trees here) — the designer knows exactly which shortcut you're eyeing. Stop-before-the-turn is the only line with a clean tail.",
    },
  },

  {
    tab: 'Crosswind + water', hole: 405, clubs: { drv: 275, w3: 245, irn: 210 }, wind: true,
    fw: [{ x: 78, y: 218, w: 565, h: 44 }], gy: 240,
    water: { x1: 316, x2: 560, y1: 262, y2: 300 },
    hud: [
      { label: 'HOLE', value: 'PAR 4 · 405' },
      { label: 'WATER', value: 'RIGHT SIDE, 180–354 OUT', warn: true },
      { label: 'WIND', value: 'LEFT TO RIGHT — TOWARD IT', warn: true },
    ],
    prompt: 'Water all down the right, wind shoving everything toward it. <b>The hazard is one-sided — remember your fourth button.</b>',
    res: {
      drv: {
        land: [268, 278], k: 'bad', aim: [275, 240], shift: 14, ghost: 'away', ghostLab: 'same driver, aimed at the left rough', splash: true,
        pop: ['DRIVER AT THE MIDDLE: SPLASH', 'penalty — hitting 3 from the drop'],
        t: 'You aimed at the middle; the wind aimed at the water',
        b: 'Your aim point was the center stripe, but the wind slides the whole pattern right before the ball ever lands — the oval you actually hit from was half over the pond. The middle of the fairway is NOT the middle of your possibilities in a crosswind.',
      },
      away: {
        land: [279, 246], k: 'good', aim: [275, 214], shift: 14,
        pop: ['DRIVER, AIMED AWAY: 126 IN', 'the wind carried it back to the middle'],
        t: 'Aim the wind, keep the club',
        b: "Aim at the left rough line and let the crosswind do the work: the drifted oval settles over the fairway, every tail on dry grass, full driver distance banked — 126 in. Safety was never about a shorter club here; it was about a smarter starting line. That's why AIM AWAY is its own button.",
      },
      w3: {
        land: [242, 258], k: 'ok', aim: [245, 240], shift: 10, ghost: 'away', ghostLab: 'the aimed-away driver — dry AND 37 yds longer',
        pop: ['3-WOOD: 163 IN', 'dry by a step — tail was at the bank'],
        t: 'Shorter flight, less drift — but the aim still owed',
        b: "Clubbing down shrinks the wind's push, and this ball stayed dry by a couple of yards. But the oval's right tail was still licking the bank, and you paid 30+ yards for a fix the aim point gives away free. Right idea about the wind, wrong lever.",
      },
      irn: {
        land: [206, 250], k: 'bad', aim: [210, 240], shift: 6, ghost: 'away', ghostLab: 'the aimed-away driver — the full fix',
        pop: ['IRON: 199 IN', 'two clubs of retreat, same wind'],
        t: 'Paying double for half an answer',
        b: "Two clubs down to duck a hazard that a target ten yards left erases completely. And the iron doesn't even fully solve it — the wind still moves its pattern, just less. 199 in on a 405-yard hole means the water you feared off the tee is now in play on your APPROACH instead.",
      },
    },
    why: {
      rookie: 'The wind pushes every shot toward the water — so point your shot AWAY from the water and let the wind blow it back to the middle. You keep the big club and stay dry.',
      beginner: "A crosswind doesn't make shots random — it slides your whole landing oval sideways by a knowable amount (about 10 yards here). So slide your AIM the same amount the other way. Aiming the middle means landing right-of-middle, and right-of-middle is wet. The club was never the problem.",
      intermediate: 'Sort trouble by shape: the pinch was BILATERAL at a yardage (answer: change distance). This hazard is UNILATERAL along the whole landing range (answer: change line). Clubbing down against one-sided trouble is the classic category error — it shrinks the oval a little while leaving its center pointed at the problem, and surrenders the 0.2–0.3 strokes of distance on top.',
      expert: "Wind displaces the dispersion's MEAN; lie and club length scale its VARIANCE. Fixes must match: mean problems take aim adjustments, variance problems take club adjustments. Here: pure mean-shift (10y right) → pure aim-shift (10y left), full driver retained, E ≈ 3.0. The 3-wood 'fix' leaves mean error uncorrected (tail on the bank) AND pays the distance tax: E ≈ 3.2 plus residual water risk. One decision, ~0.25 strokes, forever — this is the highest-frequency edge in the module.",
    },
  },
];
