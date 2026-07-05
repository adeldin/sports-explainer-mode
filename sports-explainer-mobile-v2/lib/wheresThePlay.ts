// Where's the Play? — scenario data + force logic (VERBATIM from the wheres-the-play.html prototype).
// AUTHORING-CRITICAL: the force chain is the teaching point — baseball's analogue of the offside-line
// anchor. The per-base verdicts (good / ok / bad) and each scenario's `answer` are copied exactly; a
// mis-transcribed verdict teaches the force rule wrong. isForced/nextBaseIfForced are copied verbatim.
// All fan-facing strings (tab, prompt, verdict t/b) are prose only — no coordinates, variable names, or
// internal keys. ("6-4-3" / "6-4" is legitimate scorekeeping notation, not a coordinate leak.)
//
// Coordinates share the BaseballDiamond viewBox (680×560 — home at bottom, outfield at top): these are
// the SAME base positions the renderer paints, so the module's dynamic layer lands on the painted bases
// (the shared-viewBox contract, as with FIELD/Box Count). Pure data + math — zero React Native imports.

export type Pt = [number, number];
export type BaseKey = 'first' | 'second' | 'third' | 'home';
export type Fielder = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
export type VerdictKind = 'good' | 'ok' | 'bad';

export interface Verdict {
  k: VerdictKind;  // grade: good = best play, ok = an out but not the best, bad = no play there
  t: string;       // verdict title (fan-facing prose)
  b: string;       // verdict body (fan-facing prose)
}

export interface Scenario {
  id: string;                         // internal id (not shown)
  tab: string;                        // scenario-pill label (fan-facing prose)
  fielder: Fielder;                   // who fields the grounder (an FIELD_AT key: SS / 2B / 3B)
  runners: BaseKey[];                 // pre-pitch occupied bases (never 'home')
  answer: BaseKey;                    // the correct throw (the lead force, or first when none)
  cover: Record<BaseKey, Fielder>;    // which fielder covers each base (matched to the fielder making the play)
  prompt: string;                     // the situation prompt (fan-facing prose)
  dp?: boolean;                       // classic 6-4-3 double play available (r1 → second)
  holdRunners?: BaseKey[];            // runners that hold (not forced) — informational
  verdicts: Record<BaseKey, Verdict>; // graded response for each base the user can tap
}

// ── locked geometry (prototype-verbatim; BaseballDiamond viewBox 680×560) ──
export const HOME: Pt = [340, 490], FIRST: Pt = [490, 340], SECOND: Pt = [340, 190], THIRD: Pt = [190, 340], MOUND: Pt = [340, 355];
export const BASEPOS: Record<BaseKey, Pt> = { first: FIRST, second: SECOND, third: THIRD, home: HOME };
// fielders' pre-pitch positions
export const START: Record<Fielder, Pt> = {
  P: [340, 360], C: [340, 524], '1B': [478, 300], '3B': [202, 300], '2B': [418, 235],
  SS: [262, 235], LF: [180, 150], CF: [340, 115], RF: [500, 150],
};
// where each fielder fields a grounder hit to him
export const FIELD_AT: Partial<Record<Fielder, Pt>> = { SS: [262, 235], '2B': [418, 235], '3B': [198, 338] };
export const FREEZE_FRAC = 0.38;

export const lerp = (a: Pt, b: Pt, f: number): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
export const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function fldName(f: Fielder): string {
  return f === 'SS' ? 'shortstop' : f === '2B' ? 'second baseman' : f === '3B' ? 'third baseman' : f;
}

// ── force logic (VERBATIM) ──
// A runner is forced to advance only if every base behind him toward home is occupied (the batter always
// occupies "behind first"). These drive the developing-play motion; the graded verdicts below encode the
// same rule as authored copy.
export function isForced(s: Scenario, baseKey: BaseKey): boolean {
  const occ = new Set(s.runners);
  if (baseKey === 'first') return true;                                    // the batter always forces first
  if (baseKey === 'second') return occ.has('first');
  if (baseKey === 'third') return occ.has('first') && occ.has('second');
  if (baseKey === 'home') return occ.has('first') && occ.has('second') && occ.has('third');
  return false;
}
// A runner currently ON baseKey is forced to advance if the base behind him is occupied → returns the
// base he must run to, or null if he isn't forced (he holds).
export function nextBaseIfForced(s: Scenario, baseKey: BaseKey): BaseKey | null {
  const occ = new Set(s.runners);
  if (baseKey === 'first') return occ.has('first') ? 'second' : null;      // forced if a runner's on first (batter behind)
  if (baseKey === 'second') return occ.has('first') ? 'third' : null;
  if (baseKey === 'third') return (occ.has('first') && occ.has('second')) ? 'home' : null;
  return null;
}

// ── SCENARIOS (data). fielder = who gets the grounder; runners = pre-pitch occupied bases;
//    answer = correct throw; cover = who covers each base (matched to the fielder). VERBATIM. ──
export const SCENARIOS: Scenario[] = [
  {
    id: 'r1', tab: 'Runner on 1st', fielder: 'SS', runners: ['first'], answer: 'second',
    cover: { first: '1B', second: '2B', third: '3B', home: 'C' },
    prompt: 'Runner on first, one out. Ground ball to the shortstop. Where’s the play?',
    dp: true,
    verdicts: {
      second: { k: 'good', t: 'Double play — 6-4-3', b: 'You threw to second for the force on the lead runner, then the relay to first got the batter. Two outs. Going to the lead runner first is what makes the double play — the force means no tag, just beat him to the bag.' },
      first: { k: 'ok', t: 'One out — the lesser one', b: 'You got the batter at first, but the lead runner cruised into second. You took the trailing runner and let the lead runner advance. The force at second was the better play — the lead out, and it sets up two.' },
      third: { k: 'bad', t: 'No play there', b: 'The third baseman’s covering, but nobody’s forced to third — no runner was heading there. No out to make. The force was at second: the runner from first had to go.' },
      home: { k: 'bad', t: 'No play there', b: 'The catcher’s at home, but nobody’s forced to score — the runner on first only had to reach second. No play at the plate. The force was at second.' },
    },
  },
  {
    id: 'r3', tab: 'Runner on 3rd', fielder: 'SS', runners: ['third'], answer: 'first',
    cover: { first: '1B', second: '2B', third: '3B', home: 'C' },
    prompt: 'Runner on third, one out. Ground ball to the shortstop. Where’s the play?',
    holdRunners: ['third'],
    verdicts: {
      first: { k: 'good', t: 'Right play — take the out', b: 'With a runner on third and nobody on first or second, nobody’s forced. The runner on third can’t be forced home. Take the sure out at first. (The runner holds — if he’d broken for home you’d deal with that, but he can’t be forced.)' },
      home: { k: 'bad', t: 'No force at home', b: 'The runner on third isn’t forced — there’s no one behind him pushing him off the bag, so you can’t just touch home for the out. You’d have to tag him, and he’s not committed. Throwing home lets the batter reach first for free. Take the out at first.' },
      second: { k: 'bad', t: 'Nobody there', b: 'No runner is going to second — the only runner was on third, and he’s not forced anywhere. The play is the batter at first.' },
      third: { k: 'bad', t: 'He’s already there', b: 'The runner’s standing on third and isn’t forced off it. There’s no play on him without a tag. Take the batter at first.' },
    },
  },
  {
    id: 'loaded', tab: 'Bases loaded', fielder: '2B', runners: ['first', 'second', 'third'], answer: 'home',
    cover: { first: '1B', second: 'SS', third: '3B', home: 'C' },
    prompt: 'Bases loaded, one out. Ground ball to the second baseman. Where’s the play?',
    verdicts: {
      home: { k: 'good', t: 'Force at home — cut the run', b: 'Bases loaded means every runner is forced, including the runner on third — he has to go home. So you can force him at the plate with just a touch of the bag, no tag. That stops the run. (From here you might even go home-to-first for two.) With everyone forced, the lead force is at home.' },
      first: { k: 'ok', t: 'An out — but the run scores', b: 'You got the batter at first, but the runner from third crossed the plate — the run scores. With the bases loaded and everyone forced, home was the play: force the lead runner and keep the run off the board.' },
      second: { k: 'ok', t: 'A force — but not the lead one', b: 'Second is a force here (bases loaded), so it’s an out — but the runner from third still scores. When every base is a force, the highest-value one is home: it stops the run.' },
      third: { k: 'ok', t: 'A force — but the run still scores', b: 'Third is a force with the bases loaded, so it’s an out, but the runner heading home isn’t stopped — the run scores. Home was the lead force: cut the run at the plate.' },
    },
  },
  {
    id: 'r2', tab: 'Runner on 2nd', fielder: '3B', runners: ['second'], answer: 'first',
    cover: { first: '1B', second: '2B', third: '3B', home: 'C' },
    prompt: 'Runner on second, one out. Ground ball to the third baseman. Where’s the play?',
    holdRunners: ['second'],
    verdicts: {
      first: { k: 'good', t: 'Right play — across to first', b: 'Runner on second, first base open — so he’s not forced. A lead runner isn’t automatically the play; without a force behind him, you can’t get him at third by touching the bag. Take the sure out at first. (The runner holds at second.)' },
      third: { k: 'bad', t: 'No force at third', b: 'The runner on second isn’t forced to third — first base is open behind him, so he doesn’t have to run. Touching third gets nothing; you’d have to tag him. And he’s not committed. Go across to first.' },
      second: { k: 'bad', t: 'He’s holding there', b: 'The runner’s on second and isn’t forced off it. No play without a tag. The out is the batter at first.' },
      home: { k: 'bad', t: 'Nobody’s going home', b: 'No runner is forced toward home — the only runner was on second, not third, and he’s not forced anywhere. Take the batter at first.' },
    },
  },
  {
    id: 'r12', tab: '1st & 2nd', fielder: 'SS', runners: ['first', 'second'], answer: 'third',
    cover: { first: '1B', second: '2B', third: '3B', home: 'C' },
    prompt: 'Runners on first and second, one out. Ground ball to the shortstop. Where’s the play?',
    verdicts: {
      third: { k: 'good', t: 'Force at third — the lead runner', b: 'With runners on first and second, both lead runners are forced: the man on second must go to third, the man on first to second. The lead force is at third. Get the lead runner there — it’s a touch of the bag, no tag needed.' },
      second: { k: 'ok', t: 'A force — but not the lead one', b: 'Second is a force here (runner coming from first), so it’s an out — but you passed up the lead runner at third. Third was the higher-value force: it gets the runner closest to scoring.' },
      first: { k: 'ok', t: 'An out — but the trailing one', b: 'You got the batter at first, but both lead runners advanced safely. With a force chain in front of you, third was the play — get the lead runner.' },
      home: { k: 'bad', t: 'No force at home', b: 'Nobody’s forced home — the bases weren’t loaded, so the runner from second only had to reach third. No play at the plate. The lead force was at third.' },
    },
  },
];
