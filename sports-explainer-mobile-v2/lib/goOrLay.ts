// Go or Lay? — scenario data (VERBATIM from golfcorner/go-or-lay.html). The par-5 second-shot
// call: the E-values (expected strokes to hole out), the water/neck geometry, and every verdict +
// four-depth COACH'S READ are the tactical content — copied exactly, never re-derived. The core
// primitive is the dispersion ZONE (an oval of misses) with an E bubble over it; the whole module
// is "where do the misses go?". Coordinates share the module's own 680×420 hole-map viewBox
// (ball at [BX,CY], pin at [GX,GY]; yards → px via the per-scenario scale). Pure data — zero RN
// imports. Fan-facing strings are prose only (E 2.92 is a stat the legend defines, not a leak).

export type Vec = [number, number];
export type Grade = 'good' | 'ok' | 'bad';
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type GoLayOption = 'go' | 'close' | 'hundred';

// The hole-map viewBox (this module paints its own scene — golf has no shared renderer).
export const VB = { w: 680, h: 420 };

// Geometry: ball at [BX,CY], pin at [GX,GY]. Yards → px via scale = (GX−BX)/dist.
export const BX = 86, CY = 240, GX = 600, GY = 228, GR = 26;
export const scaleFor = (dist: number): number => (GX - BX) / dist;
export const pxOf = (dist: number, yds: number): number => BX + yds * scaleFor(dist);

export interface HudChip { label: string; value: string; warn?: boolean }
export interface ZoneDef { c: number; rx: number; ry: number; E: string; cap: string }
export interface GoLayResult {
  land: Vec;                       // [yardsFromBall, dyPx]
  k: Grade;
  splash?: boolean;
  drop?: Vec;                      // penalty drop spot [yards, dyPx] (splash outcomes)
  lab: string;                     // on-map result popup line
  ghost?: GoLayOption;             // the better zone, revealed after the outcome
  ghostLab?: string;
  t: string;                       // verdict title
  b: string;                       // verdict body
}
export interface GoLayScenario {
  tab: string;
  dist: number;
  water: { from: number; to: number } | null;
  neck?: boolean;                  // bunkers both sides of the close-layup zone
  opp?: boolean;                   // match play: opponent's ball in the water
  hud: HudChip[];
  zones: Record<GoLayOption, ZoneDef>;
  prompt: string;                  // <b>…</b> spans render amber-bold
  res: Record<GoLayOption, GoLayResult>;
  why: Record<Depth, string>;
}

// The three calls (button copy, verbatim).
export const OPTIONS: { key: GoLayOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'go', title: 'GO FOR THE GREEN', sub: '3-wood, all carry' },
  { key: 'close', title: 'LAY UP CLOSE', sub: 'mid-iron, get near the green' },
  { key: 'hundred', title: 'LAY UP TO 100', sub: 'the "full wedge" number', alt: true },
];

// In-flight narration per option (prompt swaps to this on choose).
export const NARRATION: Record<GoLayOption, string> = {
  go: 'Committed. The 3-wood is out…',
  close: 'Smart club out — hugging the trouble line…',
  hundred: 'Wedge-number layup…',
};

export const HINT_IDLE = 'The E bubbles are expected strokes to hole out from each zone.';
export const HINT_DONE = 'Reset, or try another second shot.';
export const PROMPT_DONE = 'The lesson lives in the ovals: <b>where do the misses go?</b>';

/* Scenarios. Landing spots: [yardsFromBall, dyPx]. E-values from the verified anchors:
   ~2.65 from short-range grass, ~2.7-2.8 from 40-55 yds, ~2.85-2.98 from 100y fairway. */
export const SCENARIOS: GoLayScenario[] = [
  {
    tab: 'Open front', dist: 245, water: null,
    hud: [
      { label: 'YOUR BALL', value: '245 OUT · FAIRWAY' },
      { label: 'CONDITIONS', value: 'FLAT · CALM' },
      { label: '3-WOOD CARRY', value: '232' },
      { label: 'GREEN FRONT', value: 'OPEN — NO HAZARD' },
    ],
    zones: {
      go: { c: 230, rx: 15, ry: 24, E: 'E 2.65', cap: 'greenside grass' },
      close: { c: 200, rx: 8, ry: 15, E: 'E 2.78', cap: 'leaves ~45' },
      hundred: { c: 145, rx: 6, ry: 12, E: 'E 2.92', cap: 'leaves 100' },
    },
    prompt: '245 to the flag, nothing but grass in front of the green. <b>Your call.</b>',
    res: {
      go: {
        land: [224, 24], k: 'good',
        lab: '27 YDS OUT — CHIPPING',
        t: 'Go — the miss is the point',
        b: "The average strike leaves you beside the green in ordinary grass, 27 yards from the flag — expected strokes about 2.65. Even the MISS here beats a perfect layup: there's no hazard to turn a miss into a disaster, so distance is free.",
      },
      close: {
        land: [200, -8], k: 'ok',
        lab: '45 TO THE PIN', ghost: 'go',
        t: 'Closer — but you stopped early',
        b: '45 yards out is a fine spot, and clearly better than 100. But look at the ghost oval: with no water and no deep trouble, the free 30 extra yards of the 3-wood were on the table. You paid a small tax for caution nothing was charging for.',
      },
      hundred: {
        land: [145, 6], k: 'bad',
        lab: '100 TO THE PIN', ghost: 'close', ghostLab: '55 yds closer — E 2.78',
        t: 'The full-wedge myth, on camera',
        b: 'You laid up to your comfortable number — and left yourself expected strokes near 2.92. The ghost zone 55 yards closer costs about 0.14 strokes LESS, and the greenside zone less still. From 100 the pros average about 20 feet from the pin; nobody wedges it stiff often enough to pay for the yards you just gave back.',
      },
    },
    why: {
      rookie: "When there's no water or deep trouble in front, hit it as close to the green as you can. Even a miss into plain grass near the green beats a perfect shot from 100 yards.",
      beginner: "Compare the bubbles on the map: about 2.65 strokes to finish from the grass beside the green, 2.92 from 100 yards back in the fairway. Closer wins even from a slightly worse lie — that's the single most useful fact in amateur golf.",
      intermediate: "The lay-up-to-100 habit assumes a full wedge beats a 30-yard pitch. Tour data says the opposite: expected strokes fall roughly 0.03 for every 10 yards closer you get, and the chance of bogey-or-worse falls about 3 points per 10 yards too. The only reason to stop short is a hazard — and there isn't one.",
      expert: "Strokes-gained logic: E(go) ≈ 0.9×(2.65 greenside) + 0.1×(short-side chip ~2.9) ≈ 2.68 versus E(100y fairway) ≈ 2.92. A quarter of a stroke, every time this situation appears, for the price of a swing you already own. Laying to a 'favorite number' is paying a real quarter-stroke for an imaginary comfort — the data says wedge proximity from 100 barely differs from 80.",
    },
  },

  {
    tab: 'Forced carry 238', dist: 250, water: { from: 213, to: 238 },
    hud: [
      { label: 'YOUR BALL', value: '250 OUT · FAIRWAY' },
      { label: 'CONDITIONS', value: 'FLAT · CALM' },
      { label: 'WATER CLEARS AT', value: '238' },
      { label: 'YOUR 3-WOOD CARRY', value: '232', warn: true },
    ],
    zones: {
      go: { c: 232, rx: 15, ry: 24, E: 'E 3.9', cap: 'mostly wet' },
      close: { c: 204, rx: 7, ry: 14, E: 'E 2.74', cap: 'leaves ~46' },
      hundred: { c: 150, rx: 6, ry: 12, E: 'E 2.92', cap: 'leaves 100' },
    },
    prompt: 'The pond guards the green: <b>238 to clear</b>, and your best 3-wood carries <b>232</b>. Where do you aim?',
    res: {
      go: {
        land: [231, -6], k: 'bad', splash: true, drop: [205, 52],
        lab: 'SPLASH — DROP, HITTING 4',
        t: "You asked the club for six yards it doesn't have",
        b: "Carry needed 238, reliable carry 232 — so most of your dispersion oval is in the pond. The splash costs about 1.7 strokes; you're dropping and hitting four from 45 yards. An ordinary missed green costs 0.3. That 1.4-stroke gap is why the carry line, not courage, makes this call.",
      },
      close: {
        land: [204, 4], k: 'good',
        lab: '46 TO THE PIN',
        t: 'Lay up close — 46, not 100',
        b: "The right layup hugs the water line: whole oval short of the hazard, ball 46 yards out, expected strokes about 2.74. Laying up doesn't mean retreating to a round number — it means stopping exactly one safe oval short of the trouble.",
      },
      hundred: {
        land: [150, -6], k: 'ok',
        lab: '100 TO THE PIN', ghost: 'close', ghostLab: '54 yds closer — E 2.74',
        t: 'Safe — but 54 yards too safe',
        b: 'Nothing bad happens from 100. But the ghost zone shows a spot 54 yards closer that was just as dry — the water starts at 213, and a mid-iron stops at 204 all day. Same risk, about 0.18 fewer expected strokes. The full-wedge number cost you real margin for imaginary comfort.',
      },
    },
    why: {
      rookie: 'The water needs a 238-yard carry and your 3-wood flies 232. Six yards short means splash — so lay up. But lay up CLOSE to the water, not way back at 100.',
      beginner: 'Two separate decisions hide in this shot. One: go or lay? The carry line answers it — 238 needed, 232 in the bag, most of your oval is wet, lay up. Two: lay up WHERE? As close as your oval safely fits — 46 out beats 100 out by about 0.18 expected strokes.',
      intermediate: "Grade the punishment, not the fear: a penalty costs about 1.7 strokes, an ordinary miss about 0.3. When the oval overlaps water, that 1.7 dominates everything — but once you've decided to stay short, the SAME logic flips: there's no hazard between 213 and you, so every yard closer is free equity. Most amateurs get decision one right and throw decision two away.",
      expert: "E(go) ≈ P(carry)×2.65 + P(splash)×(drop-and-hit-4 ≈ 4.4 from 45yds incl. penalty) — with maybe 30% of the oval dry, that's ≈ 3.9. E(lay 46) ≈ 2.74. Not close. But note E(lay 100) = 2.92: the gap between the two layups (0.18) is bigger than the gap between many go/lay debates. The scratch player's skill isn't courage — it's putting the oval one yard short of the line, every time.",
    },
  },

  {
    tab: 'The pinched neck', dist: 255, water: { from: 215, to: 243 }, neck: true,
    hud: [
      { label: 'YOUR BALL', value: '255 OUT · FAIRWAY' },
      { label: 'CONDITIONS', value: 'FLAT · CALM' },
      { label: 'WATER CLEARS AT', value: '243', warn: true },
      { label: 'NECK AT 40–60 OUT', value: 'BUNKERS BOTH SIDES' },
    ],
    zones: {
      go: { c: 233, rx: 15, ry: 24, E: 'E 4.0', cap: 'mostly wet' },
      close: { c: 204, rx: 7, ry: 14, E: 'E 3.2', cap: '' },
      hundred: { c: 155, rx: 6, ry: 12, E: 'E 2.88', cap: 'leaves 100 — wide fairway' },
    },
    prompt: 'Water short of the green AND the close-layup zone is a pinched neck of rough and bunkers. <b>Now where?</b>',
    res: {
      go: {
        land: [233, 0], k: 'bad', splash: true, drop: [190, 0],
        lab: 'SPLASH — DROP, HITTING 4',
        t: "The carry still isn't there",
        b: "243 to clear, 232 in the bag. The pond doesn't care that the layup zone is ugly — going long here just converts one bad option into the worst one. Dropping, hitting four.",
      },
      close: {
        land: [204, 40], k: 'bad',
        lab: 'IN THE NECK SAND', ghost: 'hundred', ghostLab: 'the wide zone — E 2.88',
        t: 'You laid up into the trouble',
        b: "'Close' is only better when close is SAFE. Here the 40-to-60 zone is a neck squeezed by bunkers — your layup oval barely fits between them, and this one drifted into the right-hand sand. Expected strokes from a greenside-ish bunker at 50 yards: about 3.2. The wide zone at 100 was the play.",
      },
      hundred: {
        land: [155, 4], k: 'good',
        lab: '100 TO THE PIN — WIDE FAIRWAY',
        t: 'The rare day the full wedge wins',
        b: "This is the exception that proves the rule: lay up to 100 because the GEOMETRY says so — the neck is sand both sides and the 100 zone is forty yards of open fairway — not because 100 is your comfortable number. Same club, opposite reason, and this time it's right.",
      },
    },
    why: {
      rookie: 'Look where each landing zone actually is. The close zone is squeezed between two bunkers; the 100-yard zone is wide-open fairway. Today the far zone is the safe one — so take it.',
      beginner: "Rule one was 'closer is better.' Rule zero is 'grass is better than sand and water.' When the close zone is a pinched neck, its real expected strokes aren't 2.74 anymore — the bunker risk drags it past 3 — while the wide zone at 100 sits at about 2.88. The map, not the number, makes the call.",
      intermediate: "This is why pros talk about landing ZONES, not landing numbers: each zone's value = fairway E weighted by what the misses hit. A neck with sand both sides might put a third of your layup oval in a bunker — that costs ~0.5 strokes against a wedge from sand at that range, the single worst short shot in the amateur bag. The wide zone gives all of its oval to grass.",
      expert: "Formally: E(close) = P(grass)×2.74 + P(sand)×~3.5 ≈ 3.2 when the neck eats a third of the oval; E(100) = 2.92 with essentially zero variance. The full-wedge layup finally wins — and note WHY it wins: the geometry moved, not the principle. If a student takes one thing from this module, it's that 'lay up to 100' is sometimes right but never a default.",
    },
  },

  {
    tab: "Match play: he's wet", dist: 242, water: { from: 210, to: 236 }, opp: true,
    hud: [
      { label: 'MATCH', value: 'ALL SQUARE · HOLE 16' },
      { label: 'OPPONENT', value: 'IN THE WATER — HITTING 4', warn: true },
      { label: 'WATER CLEARS AT', value: '236 · YOUR CARRY 232' },
    ],
    zones: {
      go: { c: 230, rx: 15, ry: 24, E: 'E 3.8', cap: '' },
      close: { c: 200, rx: 7, ry: 14, E: 'E 2.74', cap: 'leaves ~42' },
      hundred: { c: 142, rx: 6, ry: 12, E: 'E 2.92', cap: 'leaves 100' },
    },
    prompt: "Match play, all square — and your opponent just found the pond. He's dropping, hitting <b>four</b>. What do you need?",
    res: {
      go: {
        land: [230, 10], k: 'bad', splash: true, drop: [204, 52],
        lab: 'SPLASH — GIFT RETURNED',
        t: 'You gave the hole back',
        b: "He was hitting four; a dry layup almost certainly wins the hole. Instead you took the same six-yards-short carry he did, and now you're BOTH dropping, both hitting four — the hole he'd already lost is level again. In match play, risk only pays when you need it.",
      },
      close: {
        land: [200, -6], k: 'good',
        lab: '42 TO THE PIN — HOLE IN HAND',
        t: 'Take the gift',
        b: 'His penalty means a stress-free five wins this hole almost every time. The close layup keeps the whole oval dry, leaves 42 yards, and makes your likely score a five with a real look at four. When the opponent hands you the hole, the only mistake is refusing it.',
      },
      hundred: {
        land: [142, 8], k: 'ok',
        lab: '100 TO THE PIN', ghost: 'close', ghostLab: '58 yds closer — same dryness',
        t: 'Safe enough to win — just less of it',
        b: "From 100 you'll still probably win the hole, so no disaster. But the zone 58 yards closer was exactly as dry, and match play rewards pressure: a 42-yard third shot threatens birdie-four, which closes the door on his scrambling five completely.",
      },
    },
    why: {
      rookie: "Your opponent hit into the water, so he's already losing this hole. Don't copy him! Lay up short of the pond, hit your wedge on, and let his mistake win it for you.",
      beginner: "Match play changes the target: you're not chasing the lowest number, you're beating ONE person on ONE hole. He lies three in the drop zone — your dry five wins the hole most of the time. The carry that was six yards too long a moment ago is still six yards too long.",
      intermediate: 'State-based golf: the value of aggression depends on what the hole needs. All square with his penalty banked, the safe play maximizes P(win hole) — going flips a near-certain win into a coin flip, because your splash resets both of you to hitting four. Note the mirror scenario: if YOU were the one down a shot late, the same pond might be worth challenging.',
      expert: "P(win | lay close) ≈ P(your 5 or better) × P(his 6 or worse from a 45-yard drop lie) — comfortably over 80%. P(win | go) ≈ P(carry, ~30% of oval dry)×~95% + P(splash)×~50%. The expected-strokes table that governs stroke play is the wrong objective function here; matches are Markov chains over hole states, and the transition you want is the certain one. This flip — same pond, different objective — is the deepest idea in the module.",
    },
  },
];
