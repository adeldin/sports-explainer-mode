// ESPN team-pool fetcher + round builder for the live-data Academy games
// (Crest Rush + Kit Clash). PURE DATA LIB: zero react-native UI imports (the
// house convention from readTheScore.ts); AsyncStorage is used only as a
// last-good disk cache so the games degrade gracefully offline.
//
// DATA PROVENANCE (build doc §2.4): everything displayed is class (B) —
// live-fetched from ESPN's keyless /teams route (names, abbreviations, crests,
// brand colors), the same host lib/scoreboard.ts already calls straight from
// the phone. The only authored data in this file is EVERGREEN: the 12 cricket
// Test nations (ESPN has no cricket /teams route — CDN ids confirmed live:
// England=1, Australia=2, India=6, …), national-team secondary jersey colors
// for the Rugby World Cup field (ESPN's rugby payload carries no
// alternateColor), well-known national nicknames ("the All Blacks"), and the
// famous-franchise lists that seed the kid tier. NO player/record trivia, NO
// standings-dependent claims — ever.
//
// FAILURE STORY (the biggest risk of a live-data game):
//   network OK        → pool cached in-memory for the session + written to disk
//   network fails     → last-good disk pool (any age) is served silently
//   no disk pool      → getTeamPool rejects → the game shows a friendly
//                       retry state (components never crash, never render blank)
//   cricket           → static, resolves instantly, can never fail
//   team missing logo → dropped from the crest pool (kit pool unaffected)
//   team missing color→ dropped from the kit pool (crest pool unaffected)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Level, Sport } from './api';

// One pool per Academy CATEGORY that has crests. Tennis and golf are individual
// sports with no team crests/kits — they are deliberately absent (8, not 10).
export type CrestSport = 'mlb' | 'nfl' | 'nba' | 'wnba' | 'nhl' | 'soccer' | 'rugby' | 'cricket';

export interface TeamInfo {
  id: string;
  displayName: string;   // "Arizona Diamondbacks" / "New Zealand"
  shortName: string;     // "Diamondbacks" (shortDisplayName)
  abbr: string;          // "ARI" — scoreboard literacy for the teaching beat
  location?: string;     // "Arizona" (absent for national sides)
  nickname?: string;     // team.name, or an authored national nickname ("the All Blacks")
  logo?: string;         // crest URL (ESPN CDN)
  color?: string;        // '#rrggbb' (normalized)
  altColor?: string;     // '#rrggbb' (normalized)
  league: string;        // human league label for the teaching beat ("the Premier League")
}

// ── League sources (paths verified live via curl on 2026-07-14) ─────────────
// Soccer pools EPL + La Liga (the Academy's Soccer category pools leagues the
// same way). Rugby uses the Rugby World Cup field (164205) — 20 recognizable
// nations, all with logos. ⚠️ NOT 270559 (Top 14): it returns teams w/o logos.
const LEAGUE_SOURCES: Record<Exclude<CrestSport, 'cricket'>, { path: string; label: string }[]> = {
  mlb: [{ path: 'baseball/mlb', label: 'MLB' }],
  nfl: [{ path: 'football/nfl', label: 'the NFL' }],
  nba: [{ path: 'basketball/nba', label: 'the NBA' }],
  wnba: [{ path: 'basketball/wnba', label: 'the WNBA' }],
  nhl: [{ path: 'hockey/nhl', label: 'the NHL' }],
  soccer: [
    { path: 'soccer/eng.1', label: 'the Premier League' },
    { path: 'soccer/esp.1', label: 'La Liga' },
  ],
  rugby: [{ path: 'rugby/164205', label: 'international rugby' }],
};

// League key → crest pool. Mirrors readTheScore's KEY_TO_SCORE_SPORT, minus
// tennis/golf (no crests) — their categories simply never surface these games.
const KEY_TO_CREST_SPORT: Partial<Record<Sport, CrestSport>> = {
  mlb: 'mlb', nfl: 'nfl', nba: 'nba', wnba: 'wnba', nhl: 'nhl',
  soccer: 'soccer', epl: 'soccer', laliga: 'soccer', worldcup: 'soccer',
  rugby: 'rugby', mlr: 'rugby', nationscup: 'rugby', sixnations: 'rugby', nationschamp: 'rugby',
  cricket: 'cricket',
};

export function crestSportForKeys(sportKeys: Sport[]): CrestSport | null {
  for (const k of sportKeys) {
    const s = KEY_TO_CREST_SPORT[k];
    if (s) return s;
  }
  return null;
}

// ── Cricket: the static 12 Test nations (no /teams route on ESPN) ────────────
// CDN ids verified live (the classic Cricinfo id scheme — England=1 St George's
// cross, Pakistan=7, Afghanistan=40 all render). Crests are national flags.
// Colors are the nations' evergreen cricket colors (Men in Blue, green-and-gold,
// Windies maroon…) — authored because ESPN carries none; flagged for review.
const CRICKET_CDN = (id: number) => `https://a.espncdn.com/i/teamlogos/cricket/500/${id}.png`;
const CRICKET_NATIONS: TeamInfo[] = [
  { id: '1', displayName: 'England', shortName: 'England', abbr: 'ENG', color: '#012169', altColor: '#c8102e', league: 'Test cricket' },
  { id: '2', displayName: 'Australia', shortName: 'Australia', abbr: 'AUS', color: '#ffcd00', altColor: '#00843d', league: 'Test cricket' },
  { id: '3', displayName: 'South Africa', shortName: 'South Africa', abbr: 'RSA', nickname: 'the Proteas', color: '#007a4d', altColor: '#ffb612', league: 'Test cricket' },
  { id: '4', displayName: 'West Indies', shortName: 'West Indies', abbr: 'WI', nickname: 'the Windies', color: '#7b0041', altColor: '#ffc72c', league: 'Test cricket' },
  { id: '5', displayName: 'New Zealand', shortName: 'New Zealand', abbr: 'NZ', nickname: 'the Black Caps', color: '#000000', altColor: '#ffffff', league: 'Test cricket' },
  { id: '6', displayName: 'India', shortName: 'India', abbr: 'IND', nickname: 'the Men in Blue', color: '#0033a0', altColor: '#ff9933', league: 'Test cricket' },
  { id: '7', displayName: 'Pakistan', shortName: 'Pakistan', abbr: 'PAK', color: '#01411c', altColor: '#ffffff', league: 'Test cricket' },
  { id: '8', displayName: 'Sri Lanka', shortName: 'Sri Lanka', abbr: 'SL', color: '#003da5', altColor: '#ffc72c', league: 'Test cricket' },
  { id: '9', displayName: 'Zimbabwe', shortName: 'Zimbabwe', abbr: 'ZIM', color: '#da291c', altColor: '#fce300', league: 'Test cricket' },
  { id: '25', displayName: 'Bangladesh', shortName: 'Bangladesh', abbr: 'BAN', nickname: 'the Tigers', color: '#006a4e', altColor: '#f42a41', league: 'Test cricket' },
  { id: '29', displayName: 'Ireland', shortName: 'Ireland', abbr: 'IRE', color: '#169b62', altColor: '#ffffff', league: 'Test cricket' },
  { id: '40', displayName: 'Afghanistan', shortName: 'Afghanistan', abbr: 'AFG', color: '#0066b3', altColor: '#d32011', league: 'Test cricket' },
].map(t => ({ ...t, logo: CRICKET_CDN(Number(t.id)) }));

// ── Rugby fixups (probed live: ESPN's RWC payload has NO alternateColor at all,
// and Chile has no color). Secondary jersey colors of national sides are
// century-stable brand facts — evergreen, authored here, keyed by ESPN abbr.
const RUGBY_ALT_COLOR: Record<string, string> = {
  ARG: '#ffffff', AUS: '#006644', CHI: '#0033a0', ENG: '#ffffff', FIJ: '#ffffff',
  FRA: '#ffffff', GEO: '#da291c', IRE: '#ffffff', ITA: '#ffffff', JAP: '#ffffff',
  NAM: '#da291c', NZL: '#ffffff', POR: '#046a38', ROM: '#fcd116', SAM: '#ffffff',
  SCO: '#ffffff', SOU: '#ffb612', TON: '#ffffff', URU: '#000000', WAL: '#ffffff',
};
const RUGBY_PRIMARY_COLOR: Record<string, string> = { CHI: '#d52b1e' };
// Well-known national nicknames only (evergreen; omitted where none is universal).
const RUGBY_NICKNAME: Record<string, string> = {
  NZL: 'the All Blacks', SOU: 'the Springboks', AUS: 'the Wallabies', ARG: 'Los Pumas',
  FRA: 'Les Bleus', ITA: 'the Azzurri', JAP: 'the Brave Blossoms', FIJ: 'the Flying Fijians',
  SAM: 'Manu Samoa', GEO: 'the Lelos', ROM: 'the Oaks', POR: 'Os Lobos',
  URU: 'Los Teros', NAM: 'the Welwitschias', CHI: 'Los Cóndores', TON: 'ʻIkale Tahi',
};

// ── Kid-tier seeds: the storied, instantly-recognizable franchises per pool.
// A recognition heuristic (which crests a brand-new fan has plausibly seen),
// NOT a claim about quality/standings. Kid rounds draw subjects from here;
// if the intersection with the live pool is ever thin, kid falls back to the
// full pool (never blank). Abbreviations verified against the live payloads.
const FAMOUS: Record<CrestSport, string[]> = {
  mlb: ['NYY', 'BOS', 'LAD', 'CHC', 'ATL', 'HOU', 'NYM', 'SF', 'STL', 'PHI'],
  nfl: ['DAL', 'GB', 'NE', 'PIT', 'SF', 'KC', 'CHI', 'NYG', 'PHI', 'DEN'],
  nba: ['LAL', 'BOS', 'GS', 'CHI', 'NY', 'MIA', 'SA', 'PHI', 'DAL', 'CLE'],
  wnba: ['LV', 'NY', 'SEA', 'PHX', 'CHI', 'IND', 'MIN', 'ATL'],
  nhl: ['NYR', 'BOS', 'CHI', 'DET', 'MTL', 'TOR', 'PIT', 'EDM', 'WSH', 'COL'],
  soccer: ['ARS', 'CHE', 'LIV', 'MNC', 'MAN', 'TOT', 'NEW', 'BAR', 'RMA', 'ATM', 'SEV', 'VAL'],
  rugby: ['NZL', 'SOU', 'ENG', 'AUS', 'FRA', 'WAL', 'IRE', 'SCO', 'ARG', 'JAP'],
  cricket: ['IND', 'AUS', 'ENG', 'PAK', 'NZ', 'RSA', 'SL', 'WI'],
};

// ── Fetch + cache ────────────────────────────────────────────────────────────

const memCache = new Map<CrestSport, TeamInfo[]>();
const inflight = new Map<CrestSport, Promise<TeamInfo[]>>();
const DISK_KEY = (s: CrestSport) => `espnTeams:v1:${s}`;
const FETCH_TIMEOUT_MS = 8000;

// '#rrggbb' or undefined — never trust the payload's shape.
function normHex(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const h = v.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
  if (/^[0-9a-f]{3}$/.test(h)) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return undefined;
}

// Time out WITHOUT an AbortController. Passing `signal` to fetch on RN's New
// Architecture (newArchEnabled) fails the FIRST request of a session while every
// identical retry succeeds — which shipped as "every live game opens on its error
// card until you tap Try again." Race a timer instead: the request isn't cancelled,
// it's abandoned, which costs us nothing here (small GET, no side effects).
function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms),
  );
}

async function getJson(url: string): Promise<any> {
  const res = await Promise.race([fetch(url), timeoutAfter(FETCH_TIMEOUT_MS)]);
  if (!res.ok) throw new Error(`teams ${res.status}`);
  return res.json();
}

// One retry before we give up. A cold first call must never cost the user the game.
async function getJsonRetrying(url: string): Promise<any> {
  try {
    return await getJson(url);
  } catch {
    await new Promise(r => setTimeout(r, 400));
    return getJson(url);
  }
}

async function fetchLeague(path: string, label: string): Promise<TeamInfo[]> {
  {
    const data = await getJsonRetrying(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/teams`,
    );
    const raw: any[] = data?.sports?.[0]?.leagues?.[0]?.teams || [];
    const out: TeamInfo[] = [];
    for (const entry of raw) {
      const tm = entry?.team;
      if (!tm?.displayName) continue;
      const displayName = String(tm.displayName);
      out.push({
        id: String(tm.id ?? displayName),
        displayName,
        shortName: String(tm.shortDisplayName || tm.name || displayName),
        abbr: String(tm.abbreviation || '').toUpperCase(),
        location: tm.location ? String(tm.location) : undefined,
        nickname: tm.name && tm.name !== displayName ? String(tm.name) : undefined,
        logo: tm.logos?.[0]?.href ? String(tm.logos[0].href) : undefined,
        color: normHex(tm.color),
        altColor: normHex(tm.alternateColor),
        league: label,
      });
    }
    return out;
  }
}

function applyRugbyFixups(teams: TeamInfo[]): TeamInfo[] {
  return teams.map(t => ({
    ...t,
    color: t.color ?? normHex(RUGBY_PRIMARY_COLOR[t.abbr]),
    altColor: t.altColor ?? normHex(RUGBY_ALT_COLOR[t.abbr]),
    nickname: t.nickname ?? RUGBY_NICKNAME[t.abbr],
  }));
}

// The one fetch both games share. Network-first; falls back to the last-good
// disk pool on ANY failure; rejects only when there has never been a good pool
// (the component then shows its friendly retry state). Cached in-memory for the
// rest of the session on success either way.
export async function getTeamPool(sport: CrestSport): Promise<TeamInfo[]> {
  const cached = memCache.get(sport);
  if (cached) return cached;
  if (sport === 'cricket') {
    memCache.set(sport, CRICKET_NATIONS);
    return CRICKET_NATIONS;
  }
  const pending = inflight.get(sport);
  if (pending) return pending;

  const job = (async () => {
    try {
      const sources = LEAGUE_SOURCES[sport];
      const lists = await Promise.all(sources.map(s => fetchLeague(s.path, s.label)));
      let teams = lists.flat();
      if (sport === 'rugby') teams = applyRugbyFixups(teams);
      if (teams.length < 4) throw new Error('pool too small');
      memCache.set(sport, teams);
      AsyncStorage.setItem(DISK_KEY(sport), JSON.stringify({ v: 1, at: Date.now(), teams }))
        .catch(() => {});
      return teams;
    } catch (err) {
      // Offline / ESPN down / 404 → serve the last-good pool from disk, any age.
      const raw = await AsyncStorage.getItem(DISK_KEY(sport)).catch(() => null);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const teams: TeamInfo[] = Array.isArray(parsed?.teams) ? parsed.teams : [];
          if (teams.length >= 4) {
            memCache.set(sport, teams);
            return teams;
          }
        } catch { /* fall through to reject */ }
      }
      throw err;
    } finally {
      inflight.delete(sport);
    }
  })();
  inflight.set(sport, job);
  return job;
}

// Per-game eligibility. A team missing its crest can still play Kit Clash and
// vice versa — each game filters independently, so one bad field never sinks both.
export function crestPool(teams: TeamInfo[]): TeamInfo[] {
  return teams.filter(t => !!t.logo);
}
export function kitPool(teams: TeamInfo[]): TeamInfo[] {
  return teams.filter(t => t.color && t.altColor && t.color !== t.altColor);
}

// ── Round building (this is where the difficulty tiers are DERIVED) ─────────
//
// Tiers are algorithmic, not authored, so every tier always has content for
// every pool — the never-blank rule (§1.9) is satisfied structurally:
//   kid          → subject drawn from the FAMOUS list; distractors chosen to be
//                  maximally DIFFERENT (far colors, different initials/cities).
//                  Crest Rush stays in crest→name (recognition, not recall).
//   beginner     → any subject, random distractors, both directions.
//   intermediate → distractors drawn from the subject's most SIMILAR teams
//                  (same city, shared initials, near colors).
//   expert       → the 3 nearest lookalikes + Crest Rush shows a ZOOMED CROP
//                  of the crest (a detail, not the whole mark); Kit Clash picks
//                  the 3 nearest color pairs above the ambiguity floor.

export type PickVariant = 'crest-rush' | 'kit-clash';
// What the round shows → what the user picks.
export type PickMode =
  | 'crest'  // crest shown → pick the team name
  | 'name'   // team name shown → pick the crest (4 crest tiles)
  | 'kit';   // two color swatches (zero text) → pick the team name

export interface TeamRound {
  mode: PickMode;
  subject: TeamInfo;
  options: TeamInfo[]; // includes the subject, shuffled
  answer: number;      // index of the subject within options
  zoom: boolean;       // expert Crest Rush: render a cropped/zoomed crest
  level: Level;        // the tier this round was built for (drives scoring)
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function colorDist(a?: string, b?: string): number {
  if (!a || !b) return 442; // max RGB distance ≈ "unknown = assume far"
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Distance between two teams' color PAIRS: best alignment of the two swatches
// (primary↔primary + alt↔alt, or crossed), so navy/white vs white/navy reads close.
function pairDist(a: TeamInfo, b: TeamInfo): number {
  const straight = colorDist(a.color, b.color) + colorDist(a.altColor, b.altColor);
  const crossed = colorDist(a.color, b.altColor) + colorDist(a.altColor, b.color);
  return Math.min(straight, crossed);
}

// Crest-game lookalike score: same market beats everything (LAL/LAC, NYY/NYM),
// then shared initial (Padres/Pirates), then brand-color proximity.
function crestSimilarity(subject: TeamInfo, cand: TeamInfo): number {
  let s = 0;
  if (subject.location && cand.location && subject.location === cand.location) s += 4;
  const an = (subject.nickname || subject.shortName)[0];
  const bn = (cand.nickname || cand.shortName)[0];
  if (an && an === bn) s += 1.5;
  s += Math.max(0, 2 - pairDist(subject, cand) / 300);
  return s;
}

// Below this pair-distance two kits are effectively the SAME palette (e.g. the
// red/white national kits) — never offered as distractors for each other, at
// any tier, or the round would be unanswerable.
const KIT_AMBIGUITY_FLOOR = 90;

function pickDistractors(
  pool: TeamInfo[],
  subject: TeamInfo,
  level: Level,
  variant: PickVariant,
  n: number,
): TeamInfo[] {
  let cands = pool.filter(t => t.id !== subject.id && t.displayName !== subject.displayName);
  if (variant === 'kit-clash') {
    // Enforce the ambiguity floor; if the pool is too clustered to honor it,
    // top back up with the most-distinguishable of the rest (never blank).
    const clear = cands.filter(t => pairDist(subject, t) >= KIT_AMBIGUITY_FLOOR);
    if (clear.length >= n) {
      cands = clear;
    } else {
      const rest = cands
        .filter(t => !clear.includes(t))
        .sort((a, b) => pairDist(subject, b) - pairDist(subject, a));
      cands = [...clear, ...rest];
    }
  }

  // Similarity: higher = more confusable with the subject. Jitter varies rounds.
  const scored = cands.map(t => ({
    t,
    sim:
      (variant === 'kit-clash' ? -pairDist(subject, t) / 100 : crestSimilarity(subject, t)) +
      Math.random() * 0.4,
  }));

  if (level === 'kid') {
    // Wildly different: take from the LEAST similar third, randomized.
    scored.sort((a, b) => a.sim - b.sim);
    const band = scored.slice(0, Math.max(n, Math.ceil(scored.length / 3)));
    return shuffleInPlace(band).slice(0, n).map(x => x.t);
  }
  if (level === 'beginner') {
    return shuffleInPlace(scored).slice(0, n).map(x => x.t);
  }
  scored.sort((a, b) => b.sim - a.sim);
  if (level === 'intermediate') {
    // Confusable, with variety: sample from the most-similar 8.
    const band = scored.slice(0, Math.max(n, Math.min(8, scored.length)));
    return shuffleInPlace(band).slice(0, n).map(x => x.t);
  }
  // expert: the nearest lookalikes, full stop.
  return scored.slice(0, n).map(x => x.t);
}

// Build one round. `subject` is chosen by the caller's no-repeat deck; `flip`
// asks Crest Rush for the inverse direction (name → pick the crest).
// Returns null only when the pool can't seat 2 distractors — the component
// treats that as its friendly empty state (it cannot happen for any of the 8
// pools today; the smallest, cricket, has 12 teams).
export function buildTeamRound(
  pool: TeamInfo[],
  subject: TeamInfo,
  level: Level,
  variant: PickVariant,
  flip: boolean,
): TeamRound | null {
  const want = Math.min(3, pool.length - 1);
  if (want < 2) return null;
  const distractors = pickDistractors(pool, subject, level, variant, want);
  const options = shuffleInPlace([subject, ...distractors]);
  const mode: PickMode =
    variant === 'kit-clash' ? 'kit'
    : level !== 'kid' && flip ? 'name'   // kid stays crest→name (recognition first)
    : 'crest';
  return {
    mode,
    subject,
    options,
    answer: options.indexOf(subject),
    zoom: variant === 'crest-rush' && mode === 'crest' && level === 'expert',
    level,
  };
}

// Kid-tier subject seeding: prefer the famous franchises so a brand-new fan
// sees crests they might actually know. Falls back to the full pool.
export function subjectPoolForLevel(pool: TeamInfo[], sport: CrestSport, level: Level): TeamInfo[] {
  if (level !== 'kid') return pool;
  const famous = new Set(FAMOUS[sport]);
  const seeded = pool.filter(t => famous.has(t.abbr));
  return seeded.length >= 4 ? seeded : pool; // never-blank fallback (§1.9)
}

// ── The teaching beat (generated from the LIVE payload — nothing to go stale) ─

// A rough hex → plain-English color word, for talking about kits like a human.
export function colorWord(hex?: string): string {
  if (!hex) return 'their color';
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.15 || d < 0.06) {
    if (l > 0.85) return 'white';
    if (l < 0.16) return 'black';
    return 'silver';
  }
  let h = 0;
  const rf = r / 255, gf = g / 255, bf = b / 255;
  if (max === rf) h = ((gf - bf) / d) % 6;
  else if (max === gf) h = (bf - rf) / d + 2;
  else h = (rf - gf) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return l < 0.25 ? 'maroon' : 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'gold';
  if (h < 165) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return l < 0.28 ? 'navy' : 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

function colorPhrase(t: TeamInfo): string {
  const a = colorWord(t.color);
  const b = colorWord(t.altColor);
  if (!t.color && !t.altColor) return 'their team colors';
  if (!t.altColor || a === b) return a;
  return `${a} and ${b}`;
}

// The 4-depth explanation for the VerdictCard tabs. Composed ONLY from the
// fetched payload (name, market, abbreviation, colors, league, pool size) plus
// the evergreen nickname where one exists — the same ruling re-explained at
// four depths, exactly like exp: Record<Level, string> in lib/boxCount.ts.
export function teachingFor(t: TeamInfo, poolSize: number): Record<Level, string> {
  const colors = colorPhrase(t);
  const who = t.nickname || t.shortName;
  const fromWhere =
    t.location && t.location !== t.displayName
      ? `They represent ${t.location}. `
      : '';
  const nick = t.nickname ? `Fans call them ${t.nickname}. ` : '';
  const abbr = t.abbr || t.shortName.slice(0, 3).toUpperCase();
  return {
    kid: `That's the crest of the ${t.displayName}! ${nick}Their colors are ${colors}.`,
    beginner:
      `The ${who} are one of ${poolSize} teams in ${t.league}. ${fromWhere}` +
      `When you scan a page of scores, ${colors} is the fastest way to spot them.`,
    intermediate:
      `Scoreboards and tickers shorten ${t.displayName} to ${abbr}. ` +
      `Broadcasts pack a whole league onto one screen with just abbreviations, crests and colors — ` +
      `see ${abbr} in ${colorWord(t.color)}, think ${who}.`,
    expert:
      `Full identity kit: ${abbr} · ${colors} · ${t.league}. ` +
      `Team branding is deliberately stable season over season — the crest and palette barely move even when rosters turn over completely. ` +
      `Locking in all ${poolSize} identities of ${t.league} is what lets you read standings, brackets and live tickers at a glance.`,
  };
}

// Per-round prompt copy (kept here so the components stay dumb renderers).
export function promptFor(round: TeamRound): string {
  switch (round.mode) {
    case 'crest':
      return round.zoom ? 'Zoomed way in — whose crest is this?' : 'Whose crest is this?';
    case 'name':
      return `Which crest belongs to the ${round.subject.displayName}?`;
    case 'kit':
      return 'Which team wears these colors?';
  }
}
