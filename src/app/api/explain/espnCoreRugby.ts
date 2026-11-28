// Real match facts for ESPN Core-API rugby (URC, MLR, Six Nations, Nations Championship, Super
// Rugby, Champions Cup, Challenge Cup).
//
// WHY THIS FILE EXISTS. The Core API answers with pointers, not values: a competitor's team, its
// score, the match status and the scoring log each sit behind their own $ref. The explain route
// used to read those fields straight off the event as though they were filled in, so for every
// ESPN rugby match it got blank team names, no status and no play. It then handed the model the
// placeholder "A key play just happened", and the model did what a model does with a blank: it
// wrote one. Asked about Japan at Wales ten minutes BEFORE kickoff on 2026-11-28, production
// answered "A try was scored!". Nothing here guesses. Every word of `play` comes from ESPN's own
// scoring log, and when the log has nothing to say, `play` says exactly that.

const https = (u: unknown) => String(u).replace(/^http:\/\//i, 'https://'); // refs arrive as http://

async function getJson(url: string, ms = 4000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(https(url), { cache: 'no-store', signal: ctrl.signal });
    if (!r.ok) throw new Error(`espn core ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// One missing ref must cost one field, never the match.
const soft = async (url?: string): Promise<any> => {
  if (!url) return undefined;
  try { return await getJson(url); } catch { return undefined; }
};

const withLimit = (url?: string) => (url ? `${url}${url.includes('?') ? '&' : '?'}limit=200` : undefined);

export interface CoreRugbyMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  state: string;        // 'pre' | 'in' | 'post' | '' when ESPN's status could not be read
  statusDetail: string;
  // The latest real event, or an honest "nothing yet" line. Undefined ONLY when the status itself
  // could not be read, in which case the caller keeps whatever it had.
  play?: string;
}

// Substitutions fill the log (about two thirds of it) and are never "the play" a fan asks about.
const NOT_THE_PLAY = /substitut/i;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function getCoreRugbyMatch(league: string, gameId: string): Promise<CoreRugbyMatch | null> {
  const ev = await soft(
    `https://sports.core.api.espn.com/v2/sports/rugby/leagues/${league}/events/${encodeURIComponent(gameId)}`,
  );
  const comp = ev?.competitions?.[0];
  if (!comp) return null;

  const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
  const home = competitors.find(c => c?.homeAway === 'home');
  const away = competitors.find(c => c?.homeAway === 'away');

  const [homeT, awayT, homeS, awayS, status, log] = await Promise.all([
    soft(home?.team?.$ref), soft(away?.team?.$ref),
    soft(home?.score?.$ref), soft(away?.score?.$ref),
    soft(comp.status?.$ref),
    soft(withLimit(comp.details?.$ref)),
  ]);

  const nameOf = (t: any) => String(t?.displayName || t?.shortDisplayName || t?.name || '');
  const homeTeam = nameOf(homeT), awayTeam = nameOf(awayT);
  const state = String(status?.type?.state || '');
  const statusDetail = String(status?.type?.shortDetail || status?.type?.detail || '');

  const events: any[] = (Array.isArray(log?.items) ? log.items : [])
    .filter((p: any) => p?.type?.text && !NOT_THE_PLAY.test(String(p.type.text)))
    .sort((a: any, b: any) => (Number(a?.clock?.value) || 0) - (Number(b?.clock?.value) || 0));
  const last = events[events.length - 1];

  const num = (v: any) => (v == null || v === '' ? '' : String(v));
  const homeScore = num(homeS?.displayValue ?? homeS?.value ?? last?.homeScore);
  const awayScore = num(awayS?.displayValue ?? awayS?.value ?? last?.awayScore);
  const scoreLine = (h: string, a: string) =>
    homeTeam && awayTeam && h !== '' && a !== '' ? ` Score: ${awayTeam} ${a}, ${homeTeam} ${h}.` : '';

  let play: string | undefined;
  if (state === 'pre') {
    play = 'This match has not started yet.';
  } else if (last) {
    const teamId = String(last?.team?.$ref || '').match(/\/teams\/(\d+)/)?.[1];
    const team = teamId && String(home?.id) === teamId ? homeTeam
      : teamId && String(away?.id) === teamId ? awayTeam : '';
    const who = nameOf(await soft(last?.participants?.[0]?.athlete?.$ref));
    const bits = [team, who, String(last?.clock?.displayValue || '')].filter(Boolean).join(', ');
    // The score AT that event, taken from the event itself, so the line stays true on a replay.
    play = `${cap(String(last.type.text))}${bits ? `: ${bits}` : ''}.${scoreLine(num(last.homeScore), num(last.awayScore))}`;
  } else if (state === 'in' || state === 'post') {
    // Deliberately carries no clock: this line doubles as the play key, and a ticking minute would
    // make every refresh of a scoreless spell look like a new play.
    play = `No try, kick at goal or card ${state === 'in' ? 'yet' : 'was recorded'}.${scoreLine(homeScore, awayScore)}`;
  }

  return { id: String(ev.id ?? gameId), homeTeam, awayTeam, homeScore, awayScore, state, statusDetail, play };
}

// No game id given: today's fixtures for the league, a live one first.
export async function findCoreRugbyMatch(league: string): Promise<CoreRugbyMatch | null> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const list = await soft(
    `https://sports.core.api.espn.com/v2/sports/rugby/leagues/${league}/events?dates=${today}`,
  );
  const ids: string[] = (Array.isArray(list?.items) ? list.items : [])
    .map((it: any) => String(it?.$ref || '').match(/\/events\/(\d+)/)?.[1])
    .filter(Boolean)
    .slice(0, 6) as string[];
  const matches = (await Promise.all(ids.map(id => getCoreRugbyMatch(league, id)))).filter(Boolean) as CoreRugbyMatch[];
  return matches.find(m => m.state === 'in') || matches[0] || null;
}
