// NHL play context, from the league's OWN public feed (api-web.nhle.com — free, no key, no auth).
//
// WHY THIS EXISTS. ESPN's hockey play-by-play gives a sentence and almost nothing else. For a
// faceoff it hands us exactly this:
//     text: "Sidney Crosby faceoff won against Ryan McLeod"   strength: "Even Strength"
// No zone, no location, nothing about how the play was executed. Asked to teach from that, the model
// filled the vacuum: a live build told a reader it was a "defensive zone faceoff" and described
// Crosby tying up McLeod's stick and pivoting on his skates. In that game Crosby beat McLeod twice,
// once in the defensive zone and once in the neutral zone — so the app had a coin flip and stated the
// result as fact. The technique was invented outright; no feed records how a faceoff was won.
//
// The NHL's own feed carries the zone, the exact coordinates and the real strength for every event.
// Handing those over as DATA is a better fix than forbidding the model to guess, because it removes
// the vacuum instead of policing it.
//
// Everything here is best-effort: any failure returns '' and the caller behaves exactly as before.

type Ctx = { date: string; home: string; away: string };

const NHL = 'https://api-web.nhle.com/v1';
const TIMEOUT_MS = 2500;

async function getJson(url: string): Promise<any | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ESPN game id -> NHL game id. Resolved once per game and kept for the life of the lambda: the
// mapping cannot change, and it saves a schedule fetch on every subsequent play of the same game.
const idMap = new Map<string, string | null>();

async function resolveNhlGameId(espnGameId: string, ctx: Ctx): Promise<string | null> {
  if (idMap.has(espnGameId)) return idMap.get(espnGameId)!;
  const day = String(ctx.date || '').slice(0, 10); // ESPN dates are ISO; NHL wants YYYY-MM-DD
  let found: string | null = null;
  const sched = day ? await getJson(`${NHL}/schedule/${day}`) : null;
  const games = (sched?.gameWeek || []).flatMap((w: any) => w?.games || []);
  const want = new Set([ctx.home.toUpperCase(), ctx.away.toUpperCase()]);
  for (const g of games) {
    const pair = new Set([
      String(g?.awayTeam?.abbrev || '').toUpperCase(),
      String(g?.homeTeam?.abbrev || '').toUpperCase(),
    ]);
    if (pair.size === 2 && want.size === 2 && [...want].every(a => pair.has(a))) { found = String(g.id); break; }
  }
  idMap.set(espnGameId, found);
  return found;
}

const ZONE: Record<string, string> = { O: 'offensive zone', D: 'defensive zone', N: 'neutral zone' };

// "1551" = away skaters/away goalie/home goalie/home skaters. 5v5, 5v4 power play, etc.
function strengthFrom(situationCode?: string): string {
  const s = String(situationCode || '');
  if (s.length !== 4) return '';
  const awaySk = Number(s[1]), homeSk = Number(s[2]);
  if (!awaySk || !homeSk) return '';
  if (awaySk === homeSk) return `${awaySk}-on-${homeSk} (even strength)`;
  const hi = Math.max(awaySk, homeSk), lo = Math.min(awaySk, homeSk);
  return `${hi}-on-${lo} (power play)`;
}

// ESPN's sentence -> the NHL's event type. REQUIRED for a match: surname agreement alone is far too
// loose, and proved it. Asked about "Sidney Crosby faceoff won against Ryan McLeod", surname-only
// matching happily returned a *shot* by Crosby from the offensive zone, and the app then told the
// reader the faceoff happened in the offensive zone. There were only ever two Crosby-vs-McLeod
// faceoffs in that game, defensive and neutral. An unrecognised sentence returns null and we enrich
// nothing — a missing fact is recoverable, a confidently wrong one is not.
function expectedType(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('faceoff')) return 'faceoff';
  if (t.includes('blocked')) return 'blocked-shot';
  if (t.includes('saved by') || t.includes(' save')) return 'shot-on-goal';
  if (t.includes('goal')) return 'goal';
  if (t.includes('penalty')) return 'penalty';
  if (t.includes('giveaway')) return 'giveaway';
  if (t.includes('takeaway')) return 'takeaway';
  if (/\bhit\b/.test(t)) return 'hit';
  if (t.includes('wide') || t.includes('missed') || t.includes('high') || t.includes('post') || t.includes('crossbar')) return 'missed-shot';
  return null;
}

// Match ESPN's play sentence to an NHL event, newest first. Requires BOTH the event type to agree
// and every player the NHL names to appear in the sentence. Surnames (not full names) because the
// two feeds disagree on first names and punctuation.
function matchPlay(plays: any[], roster: Map<number, string>, playText: string): any | null {
  const text = String(playText || '').toLowerCase();
  const want = expectedType(text);
  if (!text || !want) return null;
  for (let i = plays.length - 1; i >= 0; i--) {
    if (plays[i]?.typeDescKey !== want) continue;
    const d = plays[i]?.details || {};
    const ids = [d.winningPlayerId, d.losingPlayerId, d.shootingPlayerId, d.scoringPlayerId,
                 d.hittingPlayerId, d.blockingPlayerId, d.playerId]
      .filter((n: any) => typeof n === 'number');
    if (!ids.length) continue;
    const surnames = ids
      .map((id: number) => (roster.get(id) || '').split(' ').pop()!.toLowerCase())
      .filter(Boolean);
    if (surnames.length && surnames.every(sn => text.includes(sn))) return plays[i];
  }
  return null;
}

/**
 * One line of REAL hockey context for the play, or '' when anything is missing or slow.
 * Shape mirrors the MLB "Last pitch:" line the prompt already knows how to handle.
 */
export async function getNhlContextLine(espnGameId: string, ctx: Ctx, playText: string): Promise<string> {
  try {
    if (!espnGameId || !playText || !ctx?.home || !ctx?.away) return '';
    const nhlId = await resolveNhlGameId(espnGameId, ctx);
    if (!nhlId) return '';
    const pbp = await getJson(`${NHL}/gamecenter/${nhlId}/play-by-play`);
    const plays: any[] = pbp?.plays || [];
    if (!plays.length) return '';
    const roster = new Map<number, string>();
    for (const r of (pbp?.rosterSpots || [])) {
      const nm = `${r?.firstName?.default ?? ''} ${r?.lastName?.default ?? ''}`.trim();
      if (r?.playerId && nm) roster.set(Number(r.playerId), nm);
    }
    const p = matchPlay(plays, roster, playText);
    if (!p) return '';
    const d = p.details || {};
    const bits: string[] = [];
    const zone = ZONE[String(d.zoneCode || '')];
    if (zone) bits.push(`in the ${zone}`);
    const st = strengthFrom(p.situationCode);
    if (st) bits.push(st);
    if (d.shotType) bits.push(`shot type ${String(d.shotType)}`);
    if (typeof d.xCoord === 'number' && typeof d.yCoord === 'number') bits.push(`rink coordinates ${d.xCoord},${d.yCoord}`);
    return bits.length ? `Play context (NHL official data): ${bits.join(' · ')}.` : '';
  } catch { return ''; }
}
