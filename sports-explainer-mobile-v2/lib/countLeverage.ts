// Own the Count — scenario data + geometry (VERBATIM from the count-leverage.html prototype).
// AUTHORING-CRITICAL: the count-leverage reads (whose zone is it at 0-2 / 3-1 / 3-0) are the teaching
// point. The per-target grades (good / ok / bad + on-field result) and all fan-facing strings (tab,
// hud, verdict t/b, 4-depth why) are copied exactly; prototype HTML markup (<b>, entities) stripped.
//
// This module does NOT use the diamond: it's the catcher's-eye scene, viewBox 680×460 (the scene
// renderer + its exported ratio live beside the component in CountLeverageGame.tsx). Coordinates
// here share that 680×460 viewBox. Pure data + math — zero React Native imports.

export type Pt = [number, number];
export type TargetKey = 'middle' | 'edge' | 'chase' | 'ladder';
export type GradeKind = 'good' | 'ok' | 'bad';
export type PitchResult = 'whiff' | 'called' | 'barrel' | 'ball' | 'take';
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';

export interface PitchGrade {
  k: GradeKind;     // good = right pitch, ok = defensible, bad = wrong pitch
  res: PitchResult; // what happens on-field when the pitch lands
  t: string;        // verdict title (fan-facing prose)
  b: string;        // verdict body (fan-facing prose)
}

export interface CountScenario {
  tab: string;                          // scenario-pill label
  hud: string[];                        // situation chips (markup stripped, text verbatim)
  grade: Record<TargetKey, PitchGrade>; // graded response for each target ring
  why: Record<Depth, string>;           // COACH'S READ, four depths
}

// ── locked geometry (prototype-verbatim; catcher's-eye viewBox 680×460) ──
// Scaled to a REAL batter: zone = knees→letters ≈ 37% of the standing batter (see the prototype's
// geometry note). Batter head top y=72 → feet y=402 (330 tall); zone y=189 → y=310 (121 tall).
export const B = { cx: 185, headTop: 72, feet: 402, h: 330 };
export const Z = { x: 292, y: 189, w: 96, h: 121 };
export const MOUND_FAR = { cx: 340, cy: 78 };            // distant mound, dead ahead
export const RELEASE: Pt = [319, 40];                    // the silhouette pitcher's raised hand (measured from the art)

// Art boxes (the prototype's ART SWAP SEAM, now filled by the extracted Character Roster PNGs):
// batter 129×372 at (146,42), pitcher 60×84 at (310,30), both preserveAspectRatio xMidYMax meet.
export const BATTER_BOX = { x: 146, y: 42, w: 129, h: 372 };
export const PITCHER_BOX = { x: 310, y: 30, w: 60, h: 84 };

export const TGT: Record<TargetKey, { p: Pt; name: string }> = {
  middle: { p: [340, 250], name: 'Middle — challenge him' },
  edge:   { p: [368, 300], name: 'Paint the low-away corner' },
  chase:  { p: [415, 348], name: 'Chase pitch — off the plate' },
  ladder: { p: [340, 158], name: 'Climb the ladder — above the letters' },
};

export const lerp = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Quadratic-bezier ball flight RELEASE → target (verbatim: control x bows away from center line).
export function pitchCtrl(to: Pt): Pt {
  return [(RELEASE[0] + to[0]) / 2 + (to[0] > 340 ? 26 : -26), (RELEASE[1] + to[1]) / 2];
}
export function bez(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const mt = 1 - t;
  return [mt * mt * a[0] + 2 * mt * t * c[0] + t * t * b[0], mt * mt * a[1] + 2 * mt * t * c[1] + t * t * b[1]];
}

// On-field result label for a landed pitch (verbatim logic: a taken ball is "BALL FOUR" only in the
// three-ball counts — which both 'ball'-result scenarios are).
export function resultLabel(s: CountScenario, res: PitchResult): string {
  if (res === 'barrel') return 'BARRELED';
  if (res === 'whiff') return 'SWING AND A MISS — K';
  if (res === 'called') return 'STRIKE, TAKEN';
  if (res === 'take') return 'TAKEN — FREE STRIKE';
  return s.tab.indexOf('3–0') === 0 || s.tab.indexOf('3–1') === 0 ? 'BALL FOUR' : 'BALL';
}

// ── SCENARIOS (VERBATIM) ──
export const SCEN: CountScenario[] = [
  {
    tab: "0–2: you're ahead", hud: ['Count: 0–2', 'Nobody on, 1 out', 'Hitter: aggressive'],
    grade: {
      chase: { k: 'good', res: 'whiff', t: 'Strike three, chasing',
        b: "At 0-2 the hitter is defending, not hunting — he'll swing at anything close to protect. The breaking ball starting on the corner and finishing off the plate is exactly the pitch he can't lay off and can't hit. You made him get himself out. And if he lays off it? Ball one — you're 1-2, still ahead, and the same pitch is still available. A putaway pitch doesn't have to produce the out to be the right call." },
      ladder: { k: 'good', res: 'whiff', t: 'Strike three, climbing the ladder',
        b: 'The other 0-2 putaway, at the opposite end of the zone. A hitter geared to protect the bottom half is late deciding on a fastball above the letters — his eyes read strike and the barrel arrives underneath it. Same idea as the chase pitch: a ball he has to respect, thrown where he can\'t do damage. Take it and you\'re 1-2 with everything still in front of you — the pitch is right whether or not he chases.' },
      edge: { k: 'ok', res: 'called', t: "A strike — you didn't need to buy",
        b: "It's a quality pitch and it might freeze him. But at 0-2 you can win without throwing a strike at all — the corner risks the barrel that a chase pitch doesn't. You paid retail with a coupon in your pocket." },
      middle: { k: 'bad', res: 'barrel', t: "Barreled — the free strike you didn't owe",
        b: "Ahead 0-2 you had every inch of wiggle room, and you spent none of it. Even a defensive swing punishes middle-middle. The heart of the plate is the hitter's zone in every count — the count just decides whether you ever need to visit it." },
    },
    why: {
      rookie: "With no balls and two strikes, the hitter is scared of striking out — he'll swing at bad pitches. So throw a bad pitch on purpose: just off the plate, or just above it.",
      beginner: '0-2 flips the zone: the hitter must protect anything close, so pitches that LOOK like strikes and finish OUT of the zone earn free swings — down-and-away or up above the letters both work. Never give him the middle when he\'s this desperate.',
      intermediate: "Both 0-2 putaways win the same way — tunneling. The pitch rides the fastball's flight path until it's too late to stop the swing; down-and-away then breaks under the barrel, up-and-above climbs over it. The count buys you the luxury of throwing a ball that behaves like a strike.",
      expert: "Two-strike batting performance collapses league-wide, and the expansion of the swing zone is why. Note that both chase lanes exploit the same surrender — a hitter who has given up the take. The pitcher's discipline is the whole game here: 0-2 damage pitches are the most unforced error in pitching, which is why 'don't lose the at-bat you've already won' gets preached in every organization.",
    },
  },
  {
    tab: "3–1: he's sitting dead-red", hud: ['Count: 3–1', 'Runner on 1st, 1 out', 'Hitter: sitting fastball'],
    grade: {
      edge: { k: 'good', res: 'called', t: "A strike — but not the one he's hunting",
        b: "You must throw a strike, and he knows it — so he's sitting on the middle. The answer is your best pitch at the zone's edge: still a strike if he takes, but not the grooved fastball he's already swinging at in his head. Full count beats free damage." },
      middle: { k: 'bad', res: 'barrel', t: 'Exactly what he ordered',
        b: "3-1 is the hitter's count precisely because everyone in the park knows a strike is coming. He guessed middle fastball, you threw middle fastball, and the ball is in the gap. Being forced to throw a strike never means being forced to throw THAT one." },
      chase: { k: 'bad', res: 'ball', t: 'Ball four, one pitch early',
        b: "He's not chasing at 3-1 — he doesn't have to. Anything off the plate is a take and a walk, and now the runner you already had moves into scoring position with a free man aboard. Fishing only works when the fish is hungry." },
      ladder: { k: 'bad', res: 'ball', t: 'Ball four with better posture',
        b: "Elevating only works when the hitter is obliged to protect. At 3-1 he isn't — he lets it go by, and the free base is the same free base whether the pitch was clever or careless." },
    },
    why: {
      rookie: "Three balls, one strike: you HAVE to throw a strike or he walks. But he knows that — so don't throw it down the middle where he's waiting.",
      beginner: "3-1 is called a hitter's count because the pitcher's hand is forced. The escape is precision: a strike on the edge of the zone gets you to 3-2 without feeding the swing he's already loaded.",
      intermediate: "Watch what he's sitting on: at 3-1 most hitters pick one pitch in one zone and sell out for it. The edge strike beats the guess — he either takes it (strike two) or swings at something he wasn't hunting.",
      expert: "Hitters do the most damage in 3-1 counts league-wide — it's the count where selective aggression peaks. Pitchers who survive it own a secondary pitch they trust for strikes; if the fastball is your only strike-thrower, 3-1 is where that bill comes due.",
    },
  },
  {
    tab: '3–0: steal one', hud: ['Count: 3–0', 'Bases empty, 2 outs', 'Hitter: taking all the way'],
    grade: {
      middle: { k: 'good', res: 'take', t: 'Strike one, on the house',
        b: "At 3-0 almost every hitter has the take sign — he's not swinging no matter what you throw. So take the free strike: a get-me-over right down the pipe, no risk, and suddenly it's 3-1 instead of a walk. The one count where the middle is safe." },
      edge: { k: 'ok', res: 'ball', t: 'Needless degree of difficulty',
        b: "Painting corners is for hitters who might swing. This one won't — so the only thing the edge adds is the risk of missing by an inch and walking him. Aim small when you must; aim easy when you can." },
      chase: { k: 'bad', res: 'ball', t: 'Ball four — he never moved',
        b: "A chase pitch to a statue. He was taking everything, you threw a ball, and the walk is complete. 3-0 off the plate isn't crafty, it's a concession speech." },
      ladder: { k: 'bad', res: 'ball', t: 'Elevated… into a walk',
        b: "There's nothing to set up at 3-0 — every ball IS the walk. A fastball above the letters to a hitter who isn't swinging is just first base, delivered with conviction." },
    },
    why: {
      rookie: "Three balls, no strikes: the hitter is almost always ordered NOT to swing. So throw it right down the middle — it's a free strike.",
      beginner: "The 3-0 flip: at 3-1 the middle was poison because he was swinging; at 3-0 it's free because he isn't. Same location, opposite answer — the count is the only thing that changed.",
      intermediate: "The 'get-me-over': a de-weaponized strike, thrown at reduced effort for maximum accuracy. The scouting report tells you who has the green light 3-0 — against the rare hitter who does, this whole answer flips back.",
      expert: '3-0 green lights go to a team\'s best damage hitters in leverage spots, which is exactly why the take is near-universal otherwise: a 3-0 swing at anything but a perfect pitch trades a likely walk for one outcome. Pitchers exploit the discipline; hitters ration the exceptions.',
    },
  },
];
