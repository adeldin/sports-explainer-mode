// Golf season schedule — past tournaments, the current one, and what's coming.
//
// WHY: the Golf tab could only ever show ONE board, whichever tournament was live or most recently
// finished. There was no way to look back at last month's major or forward past the next event, so
// the tab answered "what's on right now" and nothing else. Golf is the sport where that hurts most:
// a tournament is a week-long event with a name people remember, not an anonymous fixture.
//
// WHAT MADE THIS CHEAP: ESPN's ranged scoreboard returns the WHOLE season in one call — 49 events
// for 2026, with state per event (35 post / 1 in / 13 pre when measured 2026-08-15). And a finished
// tournament's full final leaderboard is sitting right there in that same week's scoreboard: 147
// competitors with to-par scores and per-round linescores for the Wyndham. No separate archive
// endpoint, no summary call — `summary?event=` actually 404s for golf, which is the trap here.
//
// So the whole feature is two shapes of the same request: a wide range for the schedule, a narrow
// one for a board.

import { Leaderboard, LeaderboardRow, LeaderboardRound } from './api';

export interface GolfEvent {
  id: string;
  name: string;
  start: number;          // epoch ms
  end?: number;
  state: 'pre' | 'in' | 'post';
}

const DAY = 86400000;
const B = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga';
const compact = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const j = async (url: string): Promise<any> => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
};

function toEvent(e: any): GolfEvent | null {
  const start = e?.date ? Date.parse(e.date) : NaN;
  if (!e?.id || !Number.isFinite(start)) return null;
  const st = e?.status?.type?.state;
  return {
    id: String(e.id),
    name: String(e.shortName || e.name || 'Tournament'),
    start,
    end: e?.endDate ? Date.parse(e.endDate) : undefined,
    state: st === 'in' || st === 'post' ? st : 'pre',
  };
}

// The season either side of today. Chunked at 120 days on principle — ESPN silently truncates long
// ranges for busy leagues, and although golf is sparse enough that a full year came back intact,
// relying on that is exactly the assumption that breaks quietly later.
export async function fetchGolfSeason(now: number = Date.now()): Promise<GolfEvent[]> {
  const FROM = -300, TO = 200, CHUNK = 120;
  const spans: [number, number][] = [];
  for (let d = FROM; d < TO; d += CHUNK) spans.push([d, Math.min(d + CHUNK, TO)]);
  const parts = await Promise.all(spans.map(async ([a, b]) => {
    const q = `?dates=${compact(new Date(now + a * DAY))}-${compact(new Date(now + b * DAY))}`;
    const data = await j(`${B}/scoreboard${q}`);
    return (data?.events || []).map(toEvent).filter(Boolean) as GolfEvent[];
  }));
  const seen = new Set<string>();
  return parts.flat()
    .filter(e => !seen.has(e.id) && (seen.add(e.id), true))
    .sort((a, b) => a.start - b.start);
}

// One tournament's leaderboard, from its own week. Works for finished AND in-progress events; a
// `pre` event has no competitors yet and returns null, which the caller renders as a preview card.
export async function fetchGolfEventBoard(ev: GolfEvent): Promise<Leaderboard | null> {
  const from = new Date(ev.start - DAY);
  const to = new Date((ev.end ?? ev.start + 4 * DAY) + DAY);
  const data = await j(`${B}/scoreboard?dates=${compact(from)}-${compact(to)}`);
  const e = (data?.events || []).find((x: any) => String(x?.id) === ev.id);
  const comps: any[] = e?.competitions?.[0]?.competitors || [];
  if (!comps.length) return null;

  // POSITION TIES. ESPN gives `order` but no "T" prefix, so a four-way tie for third renders as
  // 3/4/5/6 — wrong, and wrong in a way golf viewers notice immediately. Ties are derived from
  // equal to-par scores: everyone sharing a score shares the best rank among them, prefixed T.
  const ranked = [...comps].sort((a, b) => (a?.order ?? 999) - (b?.order ?? 999));
  const firstRankForScore = new Map<string, number>();
  const countForScore = new Map<string, number>();
  ranked.forEach((c, i) => {
    const s = String(c?.score ?? '');
    if (!firstRankForScore.has(s)) firstRankForScore.set(s, i + 1);
    countForScore.set(s, (countForScore.get(s) ?? 0) + 1);
  });

  const rows: LeaderboardRow[] = ranked.map((c) => {
    const score = String(c?.score ?? '');
    const rank = firstRankForScore.get(score) ?? 0;
    const tied = (countForScore.get(score) ?? 0) > 1;
    const rounds: LeaderboardRound[] = (c?.linescores || []).map((ls: any, idx: number) => ({
      roundId: typeof ls?.period === 'number' ? ls.period : idx + 1,
      scoreToPar: String(ls?.displayValue ?? ''),
      strokes: typeof ls?.value === 'number' ? ls.value : 0,
      courseName: '',
    }));
    return {
      playerId: String(c?.id ?? c?.athlete?.id ?? ''),
      name: String(c?.athlete?.displayName ?? c?.athlete?.shortName ?? '—'),
      position: score ? `${tied ? 'T' : ''}${rank}` : '—',
      total: score,
      today: rounds.length ? rounds[rounds.length - 1].scoreToPar : '',
      thru: ev.state === 'post' ? 'F' : String(c?.status?.thru ?? ''),
      roundComplete: ev.state === 'post',
      isAmateur: !!c?.amateur,
      status: ev.state === 'post' ? 'complete' : 'active',
      rounds,
    };
  });

  return {
    tournId: ev.id,
    name: ev.name,
    status: ev.state === 'post' ? 'Final' : 'In progress',
    isLive: ev.state === 'in',
    endDate: ev.end,
    rows,
  };
}

// Course / location / purse for one event. Golf's site API carries none of it (verified: both the
// scoreboard and the summary return null venue), so this is a core-API read — the same two-step
// golfNext.ts uses for the Up Next card, exposed here for any event id.
export async function fetchGolfEventDetails(
  id: string,
): Promise<{ courseName?: string; location?: string; purse?: string }> {
  const core = await j(`https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${id}`);
  const course = Array.isArray(core?.courses) ? core.courses[0] : undefined;
  const addr = course?.address;
  return {
    courseName: course?.name ? String(course.name) : undefined,
    location: addr?.city ? (addr.state ? `${addr.city}, ${addr.state}` : String(addr.city)) : undefined,
    purse: core?.displayPurse ? String(core.displayPurse) : undefined,
  };
}
