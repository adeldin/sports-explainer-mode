// Next golf tournament — what, when, and where.
//
// The trigger: with the Wyndham finished, the Golf tab showed a FINAL leaderboard and nothing
// else — no answer to "so when's the next one?", which is the first question a finished board
// raises. This resolves it from ESPN in two small calls:
//
//   1. site scoreboard, ranged  → the next event's id, name and dates (verified: the bare
//      scoreboard shows only the FINISHED event, so the range is required)
//   2. CORE event by id         → the details the site API simply does not carry for golf
//      (probed: site scoreboard AND site summary both return null venue/courses; the core
//      event has courses[] with name + city/state INLINE, plus displayPurse)
//
// Client-side on purpose, like every other direct-ESPN read in the app. Best-effort: any miss
// returns null and the leaderboard simply renders without an Up Next card.
export interface NextGolfEvent {
  name: string;
  startTime: number;      // epoch ms
  endTime?: number;
  courseName?: string;    // "TPC Southwind"
  location?: string;      // "Memphis, TN"
  purse?: string;         // ESPN's displayPurse, e.g. "$20,000,000"
}

const DAY_MS = 24 * 60 * 60 * 1000;
const compact = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export async function fetchNextGolfEvent(now: number = Date.now()): Promise<NextGolfEvent | null> {
  try {
    const q = `?dates=${compact(new Date(now))}-${compact(new Date(now + 30 * DAY_MS))}`;
    const sb = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard${q}`)).json();
    const next = (sb?.events || []).find((e: any) =>
      e?.status?.type?.state !== 'post' && Date.parse(e?.endDate || e?.date) > now);
    if (!next?.id) return null;

    const out: NextGolfEvent = {
      name: String(next.shortName || next.name || 'Next tournament'),
      startTime: Date.parse(next.date),
      endTime: next.endDate ? Date.parse(next.endDate) : undefined,
    };
    if (!Number.isFinite(out.startTime)) return null;

    // Enrich from the core event — the ONLY place golf venue/course/purse live. Failure here
    // still yields a useful card (name + dates), so it's a nested best-effort.
    try {
      const core = await (await fetch(
        `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${next.id}`,
      )).json();
      const course = Array.isArray(core?.courses) ? core.courses[0] : undefined;
      if (course?.name) out.courseName = String(course.name);
      const addr = course?.address;
      if (addr?.city) out.location = addr.state ? `${addr.city}, ${addr.state}` : String(addr.city);
      if (core?.displayPurse) out.purse = String(core.displayPurse);
    } catch { /* name + dates alone still render */ }

    return out;
  } catch {
    return null;
  }
}
