// Sportswise Jeopardy — board builder (the Academy's capstone, Gate 6).
// PURE DATA LIB: zero react-native imports (house convention from readTheScore.ts).
//
// THE DESIGN CONSTRAINT (build doc §3, Engine 7): this is a SHELL that routes into
// the six existing engines — NOT a new text quiz. Nothing here authors a question.
// Every tile's clue is built by the engine that owns that column:
//
//   🛡️ Crests     → lib/espnTeams   (live team pool; crest → pick the name)
//   🔢 Scores     → lib/readTheScore (authored scoreboard scenarios)
//   🚩 Signals    → lib/signalDecoder (authored animated-pictogram scenarios)
//   📍 Zones      → lib/zoneTap      (authored tap-the-field scenarios)
//   ⚖️ Standings  → lib/standings    (live tables; two-card higher/lower)
//   🧠 Terms      → lib/glossary     (curated term ↔ meaning; the one text column)
//
// COLUMNS ARE DYNAMIC (the single most important correctness requirement): a column
// exists only when its engine supports the sport — the same scoping the registry's
// supportedSports encodes. Tennis/golf have no crests, signals or standings, so they
// build a narrower 3-column board (Scores · Zones · Terms) rather than a broken 6-wide
// grid. Live columns (Crests / Standings) are additionally dropped — not left dead —
// when ESPN is unreachable and no disk cache exists; the static engines always build,
// so a board can never be empty.
//
// ROWS ARE THE TIER LADDER: 5 rows map onto the 4 content tiers as
//   row 1 = kid (100) · row 2 = beginner (200) · row 3 = intermediate (300)
//   row 4 = expert (400) · row 5 = expert+ (500 — a SECOND, distinct expert clue;
//   engines with algorithmic difficulty simply build another expert round).
// Board values (100–500) are the SESSION score. XP awarded to the lifetime rank
// economy stays on the canonical QUIZ_POINTS scale (5/10/20/40 by tier) in the
// component — banking 9000 board points must not catapult a user to Legend.
//
// NEVER BLANK (§1.9): every picker falls back tier → full bank → allow-repeat before
// it would ever return nothing; a column that still can't seat 5 real clues is dropped
// whole (a narrower board beats a dead tile). NO player/record trivia (§2.4) — every
// clue is either authored evergreen content or composed from the live payload.

import type { Level, Sport } from './api';

import {
  READ_THE_SCORE, scoreSportForKeys, ScoreScenario,
} from './readTheScore';
import {
  SIGNAL_DECODER, signalSportForKeys, SignalScenario,
} from './signalDecoder';
import {
  ZONE_TAP, SURFACE_FOR_SPORT, zoneSportForKeys, ZoneScenario, ZoneSurface,
} from './zoneTap';
import {
  TeamInfo, TeamRound, CrestSport,
  crestSportForKeys, getTeamPool, crestPool,
  subjectPoolForLevel, buildTeamRound, teachingFor, promptFor,
} from './espnTeams';
import {
  HLRound, standingsSportForKeys, getStandingsPool, buildStandingsRound, pairKey,
} from './standings';
import { getGlossary, GlossaryEntry } from './glossary';

// ── Board shape ──────────────────────────────────────────────────────────────

export const JEOPARDY_ROWS = 5;
// Row → tier mapping (see the header comment). Index = row.
export const ROW_TIERS: Level[] = ['kid', 'beginner', 'intermediate', 'expert', 'expert'];
// Row → banked board value. Classic Jeopardy ladder; SESSION score only (not XP).
export const ROW_VALUES = [100, 200, 300, 400, 500];

export type JeopardyColumnId = 'crests' | 'score' | 'signals' | 'zones' | 'table' | 'terms';

// Column chrome (icon/title) is data, not pixels — the board/tile presentation
// module owns how it's drawn; swapping copy or icons is a one-place job here.
export const COLUMN_META: Record<JeopardyColumnId, { icon: string; title: string }> = {
  crests: { icon: '🛡️', title: 'Crests' },
  score: { icon: '🔢', title: 'Scores' },
  signals: { icon: '🚩', title: 'Signals' },
  zones: { icon: '📍', title: 'Zones' },
  table: { icon: '⚖️', title: 'Standings' },
  terms: { icon: '🧠', title: 'Terms' },
};

// One clue = one engine's round/scenario, plus anything the tile view needs that
// the engine computes at build time (prompts, teaching, display-shuffled options).
export type JeopardyClue =
  // Read the Score: the scenario carries board art data, options, answer, exp.
  | { kind: 'score'; scenario: ScoreScenario }
  // Signal Decoder: options are DISPLAY-shuffled at build time (the banks author
  // the correct answer at index 0 far more often than not — same fix the source
  // game applies at render time). `answer` indexes the shuffled options.
  | { kind: 'signal'; scenario: SignalScenario; options: string[]; answer: number }
  // Zone Tap: tap-the-region; `surface` picks the FieldEngine renderer.
  | { kind: 'zone'; scenario: ZoneScenario; surface: ZoneSurface }
  // Crest Rush: always crest → pick-the-name inside a tile (round.options are
  // TeamInfo). Teaching is composed from the live payload (espnTeams.teachingFor).
  | { kind: 'crest'; round: TeamRound; prompt: string; title: string; exp: Record<Level, string> }
  // Higher or Lower: the two-card table read; HLRound carries everything.
  | { kind: 'table'; round: HLRound }
  // Terms: term shown big → pick its meaning among curated `match` labels.
  | { kind: 'term'; entry: GlossaryEntry; prompt: string; options: string[]; answer: number; title: string; exp: Record<Level, string> };

export interface JeopardyTile {
  key: string;            // `${columnId}-${row}` — stable identity for answer state
  column: JeopardyColumnId;
  row: number;            // 0..JEOPARDY_ROWS-1
  tier: Level;            // the ROW's tier (row 5 shows as expert)
  value: number;          // board points banked on a correct answer
  // The tier of what was ACTUALLY dealt (a never-blank fallback may serve an
  // off-tier scenario) — this drives the canonical XP award, same rule as every
  // other game ("base by the SCENARIO's tier, what was actually answered").
  xpLevel: Level;
  clue: JeopardyClue;
}

export interface JeopardyColumn {
  id: JeopardyColumnId;
  icon: string;
  title: string;
  tiles: JeopardyTile[];  // exactly JEOPARDY_ROWS tiles
}

export interface JeopardyBoard {
  columns: JeopardyColumn[];             // ≥1 always (static engines cover all 10 sports)
  dropped: JeopardyColumnId[];           // live columns dropped this build (offline story)
  maxBank: number;                       // sum of every tile's value (columns × 1500)
}

// ── Small shared helpers ─────────────────────────────────────────────────────

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Deal one scenario from an authored bank at a tier, without repeating a clue on
// this board. Never-blank ladder: unused-at-tier → unused-anywhere → repeat-at-tier
// → whole bank. Returns null only for an empty bank (that column is then dropped).
function pickBanked<T extends { id: string; level: Level }>(
  bank: T[], tier: Level, used: Set<string>,
): T | null {
  if (!bank.length) return null;
  const unusedTier = bank.filter(s => s.level === tier && !used.has(s.id));
  const unusedAny = bank.filter(s => !used.has(s.id));
  const tierAny = bank.filter(s => s.level === tier);
  const pool = unusedTier.length ? unusedTier
    : unusedAny.length ? unusedAny
    : tierAny.length ? tierAny
    : bank;
  const s = randOf(pool);
  used.add(s.id);
  return s;
}

function makeTile(
  column: JeopardyColumnId, row: number, xpLevel: Level, clue: JeopardyClue,
): JeopardyTile {
  return {
    key: `${column}-${row}`,
    column,
    row,
    tier: ROW_TIERS[row],
    value: ROW_VALUES[row],
    xpLevel,
    clue,
  };
}

// ── Column builders (one per engine) ─────────────────────────────────────────
// Each returns exactly JEOPARDY_ROWS tiles, or null when the engine can't seat a
// full column for this sport — the board then simply doesn't have that column.

function buildScoreColumn(sportKeys: Sport[]): JeopardyTile[] | null {
  const sport = scoreSportForKeys(sportKeys);
  if (!sport) return null;
  const bank = READ_THE_SCORE[sport];
  const used = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    const s = pickBanked(bank, ROW_TIERS[row], used);
    if (!s) return null;
    tiles.push(makeTile('score', row, s.level, { kind: 'score', scenario: s }));
  }
  return tiles;
}

function buildSignalColumn(sportKeys: Sport[]): JeopardyTile[] | null {
  const sport = signalSportForKeys(sportKeys);
  if (!sport) return null;
  const bank = SIGNAL_DECODER[sport];
  const used = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    const s = pickBanked(bank, ROW_TIERS[row], used);
    if (!s) return null;
    // Display-shuffle the options NOW (build time) so the tile view stays dumb —
    // same top-button-bias fix SignalDecoderGame applies (see its `view` memo).
    const perm = shuffleInPlace(s.options.map((_, i) => i));
    tiles.push(makeTile('signals', row, s.level, {
      kind: 'signal',
      scenario: s,
      options: perm.map(o => s.options[o]),
      answer: perm.indexOf(s.answer),
    }));
  }
  return tiles;
}

function buildZoneColumn(sportKeys: Sport[]): JeopardyTile[] | null {
  const sport = zoneSportForKeys(sportKeys);
  if (!sport) return null;
  const bank = ZONE_TAP[sport];
  const surface = SURFACE_FOR_SPORT[sport];
  const used = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    const s = pickBanked(bank, ROW_TIERS[row], used);
    if (!s) return null;
    tiles.push(makeTile('zones', row, s.level, { kind: 'zone', scenario: s, surface }));
  }
  return tiles;
}

// Crests: subjects never repeat on one board; kid row seeds from the famous
// franchises (espnTeams.subjectPoolForLevel); distractor difficulty per row is
// the engine's own algorithmic ladder inside buildTeamRound. Direction is fixed
// crest → name (flip=false) so one option renderer serves the whole board; the
// expert rows still get the engine's zoomed-crop treatment.
function buildCrestColumn(teams: TeamInfo[], sport: CrestSport): JeopardyTile[] | null {
  const pool = crestPool(teams);
  if (pool.length < 4) return null;
  const usedIds = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    const tier = ROW_TIERS[row];
    const seeded = subjectPoolForLevel(pool, sport, tier).filter(t => !usedIds.has(t.id));
    const unused = pool.filter(t => !usedIds.has(t.id));
    const from = seeded.length ? seeded : unused.length ? unused : pool;
    const subject = randOf(from);
    usedIds.add(subject.id);
    const round = buildTeamRound(pool, subject, tier, 'crest-rush', false);
    if (!round) return null;
    tiles.push(makeTile('crests', row, round.level, {
      kind: 'crest',
      round,
      prompt: promptFor(round),
      title: subject.displayName,
      exp: teachingFor(subject, pool.length),
    }));
  }
  return tiles;
}

// Standings: one HLRound per row via the engine's own tier dials (which stat +
// how close the pair is). The avoid-set keeps pairings unique on this board;
// a few re-deals guard against the engine's play-on-anyway freshness fallback.
async function buildTableColumn(sportKeys: Sport[]): Promise<JeopardyTile[] | null> {
  const sport = standingsSportForKeys(sportKeys);
  if (!sport) return null;
  const pool = await getStandingsPool(sport); // throws offline-with-no-cache → caller drops column
  const avoid = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    let round: HLRound | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = buildStandingsRound(pool, ROW_TIERS[row], avoid);
      if (r && !avoid.has(pairKey(r.a, r.b, r.statKey))) { round = r; break; }
      if (r && !round) round = r; // fallback: accept a repeat over a dead tile
    }
    if (!round) return null; // degenerate table (season not started, no cache of a played one)
    avoid.add(pairKey(round.a, round.b, round.statKey));
    tiles.push(makeTile('table', row, round.level, { kind: 'table', round }));
  }
  return tiles;
}

// ── Terms (glossary) ─────────────────────────────────────────────────────────
// The one legitimately-text column. A tile shows the TERM big; the options are
// curated 2–5 word `match` labels (the same labels Match Up pairs). Difficulty
// is algorithmic, exactly like espnTeams' distractor ladder: kid rounds offer
// wildly-different meanings, expert rounds offer the most confusable ones.

const MIN_TERM_POOL = 8;

function defTokens(def: string): Set<string> {
  return new Set(
    def.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3),
  );
}

// Confusability of two glossary entries: same-first-letter terms + overlapping
// definition vocabulary read as "close" (offside/onside, birdie/bogey…).
function termSimilarity(a: GlossaryEntry, b: GlossaryEntry): number {
  let s = 0;
  if (a.term[0]?.toLowerCase() === b.term[0]?.toLowerCase()) s += 1.5;
  const at = defTokens(a.def);
  let overlap = 0;
  for (const w of defTokens(b.def)) if (at.has(w)) overlap++;
  s += Math.min(2.5, overlap * 0.5);
  return s;
}

function buildTermClue(
  entries: GlossaryEntry[], tier: Level, usedTerms: Set<string>,
): JeopardyClue | null {
  const unused = entries.filter(e => !usedTerms.has(e.term));
  const from = unused.length ? unused : entries;
  const subject = randOf(from);
  usedTerms.add(subject.term);

  // Candidates: distinct meaning labels only — a duplicate/identical label would
  // make the tile unanswerable.
  const seen = new Set<string>([subject.match!.toLowerCase()]);
  const cands = entries.filter(e => {
    if (e.term === subject.term || !e.match) return false;
    const key = e.match.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (cands.length < 3) return null;

  // Similarity band per tier (the espnTeams pickDistractors ladder, in miniature).
  const scored = cands.map(e => ({ e, sim: termSimilarity(subject, e) + Math.random() * 0.4 }));
  let picked: GlossaryEntry[];
  if (tier === 'kid') {
    scored.sort((a, b) => a.sim - b.sim);
    picked = shuffleInPlace(scored.slice(0, Math.max(3, Math.ceil(scored.length / 3)))).slice(0, 3).map(x => x.e);
  } else if (tier === 'beginner') {
    picked = shuffleInPlace([...scored]).slice(0, 3).map(x => x.e);
  } else if (tier === 'intermediate') {
    scored.sort((a, b) => b.sim - a.sim);
    picked = shuffleInPlace(scored.slice(0, Math.min(8, scored.length))).slice(0, 3).map(x => x.e);
  } else {
    scored.sort((a, b) => b.sim - a.sim);
    picked = scored.slice(0, 3).map(x => x.e);
  }

  const options = shuffleInPlace([subject.match!, ...picked.map(e => e.match!)]);
  // The teaching beat: the curated definition, verbatim at every depth — glossary
  // defs are authored single-depth content and are never rewritten (house rule).
  const exp: Record<Level, string> = {
    kid: subject.def, beginner: subject.def, intermediate: subject.def, expert: subject.def,
  };
  return {
    kind: 'term',
    entry: subject,
    prompt: `What does “${subject.term}” mean?`,
    options,
    answer: options.indexOf(subject.match!),
    title: subject.term,
    exp,
  };
}

function buildTermsColumn(sportKeys: Sport[]): JeopardyTile[] | null {
  // First key with a curated glossary (pooled soccer/rugby keys share one list).
  let entries: GlossaryEntry[] = [];
  for (const k of sportKeys) {
    const g = getGlossary(k).filter(e => !!e.match);
    if (g.length) { entries = g; break; }
  }
  if (entries.length < MIN_TERM_POOL) return null;
  const usedTerms = new Set<string>();
  const tiles: JeopardyTile[] = [];
  for (let row = 0; row < JEOPARDY_ROWS; row++) {
    const clue = buildTermClue(entries, ROW_TIERS[row], usedTerms);
    if (!clue) return null;
    tiles.push(makeTile('terms', row, ROW_TIERS[row], clue));
  }
  return tiles;
}

// ── The board build ──────────────────────────────────────────────────────────
// Column order is fixed (crests → score → signals → zones → table → terms); a
// sport only gets the columns its engines support, and the two LIVE columns are
// dropped — never rendered dead — when their fetch fails with no usable cache.
//
// ★ PRO SEAM (open, nothing gated): tier gating later happens at the CALLER of
// buildJeopardyBoard by capping ROW_TIERS' effective level — this builder and
// every engine's poolForLevel stay untouched (same seam as every other game).

export async function buildJeopardyBoard(sportKeys: Sport[]): Promise<JeopardyBoard> {
  const columns: JeopardyColumn[] = [];
  const dropped: JeopardyColumnId[] = [];

  const push = (id: JeopardyColumnId, tiles: JeopardyTile[] | null) => {
    if (tiles) columns.push({ id, icon: COLUMN_META[id].icon, title: COLUMN_META[id].title, tiles });
  };

  // Live fetches in parallel (each already has session+disk caching inside its
  // lib). A rejection means "offline with no last-good pool" → drop the column.
  const crestSport = crestSportForKeys(sportKeys);
  const wantsTable = standingsSportForKeys(sportKeys) !== null;
  const [teamsSettled, tableSettled] = await Promise.allSettled([
    crestSport ? getTeamPool(crestSport) : Promise.resolve(null),
    wantsTable ? buildTableColumn(sportKeys) : Promise.resolve(null),
  ]);

  // 🛡️ Crests
  if (crestSport) {
    const teams = teamsSettled.status === 'fulfilled' ? teamsSettled.value : null;
    const tiles = teams ? buildCrestColumn(teams, crestSport) : null;
    if (tiles) push('crests', tiles);
    else dropped.push('crests');
  }
  // 🔢 Scores · 🚩 Signals · 📍 Zones (static — can only be absent, never dropped)
  push('score', buildScoreColumn(sportKeys));
  push('signals', buildSignalColumn(sportKeys));
  push('zones', buildZoneColumn(sportKeys));
  // ⚖️ Standings
  if (wantsTable) {
    const tiles = tableSettled.status === 'fulfilled' ? tableSettled.value : null;
    if (tiles) push('table', tiles);
    else dropped.push('table');
  }
  // 🧠 Terms
  push('terms', buildTermsColumn(sportKeys));

  return {
    columns,
    dropped,
    maxBank: columns.length * ROW_VALUES.reduce((a, b) => a + b, 0),
  };
}
