#!/usr/bin/env node
//
// FIXTURE RADAR — finds competitions the app should carry, and ones it already carries that have
// gone dead.
//
// WHY THIS EXISTS: on 2026-08-13 two things were true at once and nobody knew either.
//   • The FIFA World Cup had been over for a month. `fifa.world` was still in SOCCER_LEAGUES, so
//     every soccer refresh spent a network call on a league with zero forward fixtures. It was
//     invisible in the UI, because league chips derive from the board and an empty league draws
//     no chip. A dead league and a healthy one look identical from inside the app.
//   • The European Champions Cup had 48 published fixtures starting in eight weeks, on the exact
//     Core-API pipeline the rugby tile already uses. It had been sitting there for months.
//
// Both are the same blind spot: THE APP ONLY KNOWS ABOUT LEAGUES SOMEONE HAND-ADDED. Season-shaped
// competitions hide this, because a league you added in September is still right in October. The
// ones that bite are the ones that don't follow a season at all — World Cups, Olympic cycles,
// continental cups, one-off tournaments. They appear and vanish on their own schedule, and a
// hand-maintained config silently drifts out of step with them.
//
// So this script does not ask "are my leagues working". It enumerates EVERY league ESPN publishes
// (354 across 17 sports as of 2026-08-14), counts forward fixtures for each, and diffs that against
// what the app actually has configured. Two findings come out:
//
//   🔴 BROKEN    — configured, no forward fixtures AND no past ones either. The league code is
//                  wrong or the competition is retired. Always actionable; exits non-zero.
//   🟡 DORMANT   — configured, no forward fixtures but a real recent history. Between seasons with
//                  next year's schedule not published yet. Informational, NOT a failure.
//
//                  This split exists because the first version of this script didn't have it, and
//                  its first run flagged Six Nations, Super Rugby and MLR as dead. All three are
//                  fine — they start in February and ESPN hadn't loaded 2027 fixtures. A report
//                  that cries wolf on three healthy leagues every week is a report people learn to
//                  ignore, which is worse than no report.
//
//                  Note what this deliberately does NOT try to do: from fixture data alone you
//                  cannot tell "Six Nations returns in 6 months" from "World Cup returns in 4
//                  years" — both are a quiet league with a real past. So DORMANT reports HOW LONG
//                  a league has been quiet and leaves the judgement to a human. A four-year gap is
//                  obvious to a reader and invisible to a threshold.
//   🟢 UNCLAIMED — not configured, but has real forward fixtures. The Champions Cup case. Ranked
//                  by fixture count and how soon it starts, because a big tournament opening in
//                  six weeks matters more than a minor one opening in a year.
//
// USAGE
//   node scripts/fixture-radar.mjs                  # 180-day horizon, human report
//   node scripts/fixture-radar.mjs --days 400       # look further out (catches next-year majors)
//   node scripts/fixture-radar.mjs --min 8          # raise the bar for an UNCLAIMED finding
//   node scripts/fixture-radar.mjs --json           # machine-readable, for a scheduled routine
//
// Exits 1 only if something is BROKEN, so a cron/cloud routine fails loudly on a bad league code
// without nagging about competitions that are merely between seasons.
//
// THE TOURNAMENT SPLIT: unclaimed findings are reported in two groups, because they need different
// reactions. A competition already under way is a coverage choice you can make whenever you like.
// A competition that starts MONTHS FROM NOW is the one that ambushes you — it is invisible until it
// isn't, and by the time anyone notices it in the app it has usually already started. That gap
// between "now" and "first fixture" is the signature of a tournament rather than a league season,
// which is exactly the class of event this whole script was written for.
//
// NO SECRETS: ESPN's core API is keyless, so this runs anywhere — CI, a cloud routine, a laptop —
// with no env vars and nothing to leak.
//
// KNOWN LIMIT, stated rather than hidden: this sees ESPN only. Cricket (Sportmonks) and the Nations
// Cup (Zyla) come from other providers, and ESPN publishes zero cricket leagues, so those are
// invisible here and still need eyes. The report says so at the bottom rather than implying
// coverage it doesn't have.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86400000;

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const HORIZON = Number(arg('--days', 180));
const MIN_FIXTURES = Number(arg('--min', 4));
const JSON_OUT = process.argv.includes('--json');
const CHUNK = 60;          // days per request — 3 requests covers the default horizon
const CONCURRENCY = 10;    // polite; the whole scan is ~1000 tiny requests
const LOOKBACK = 540;      // days of history used to tell "dead" from "between seasons"
const TOURNAMENT_GAP = 90; // first fixture beyond this = tournament-shaped, not an in-season league

const compact = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// Best-effort GET. A failed league contributes nothing rather than sinking the scan — a partial
// radar is still useful, and ESPN occasionally 400s on individual leagues.
async function get(url) {
  try {
    const r = await fetch(String(url).replace('http://', 'https://'));
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Run tasks with a fixed worker pool. Order of results is not preserved and does not matter.
async function pool(items, worker, n = CONCURRENCY) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) out.push(await worker(items[i++]));
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------------------------
// What does the app currently claim?
//
// Parsed straight out of the TypeScript source rather than kept as a second list here. A radar that
// needs its own copy of the config is a radar that goes stale the first time someone adds a league,
// which is the exact failure it exists to catch.
// ---------------------------------------------------------------------------------------------
function configuredLeagues() {
  const src = readFileSync(join(ROOT, 'sports-explainer-mobile-v2/lib/scoreboard.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const SPORT_CONFIG'));
  const body = block.slice(0, block.indexOf('\n};'));

  const out = new Map(); // "sport/league" -> {key, learnMode}
  // Matches:  key: { espnSport: 'rugby', league: '271937', core: true },
  const re = /^\s*(\w+):\s*\{([^}]*)\}/gm;
  for (const m of body.matchAll(re)) {
    const [, key, fields] = m;
    const sport = /espnSport:\s*'([^']+)'/.exec(fields)?.[1];
    const league = /league:\s*'([^']+)'/.exec(fields)?.[1];
    if (!sport || !league) continue; // provider:'zyla' / 'cricket' entries have no ESPN league
    out.set(`${sport}/${league}`, { key, learnMode: /learnMode:\s*true/.test(fields) });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// What does ESPN actually publish?
// ---------------------------------------------------------------------------------------------
async function allLeagues() {
  const idx = await get('https://sports.core.api.espn.com/v2/sports?limit=100');
  const sports = [];
  for (const it of idx?.items ?? []) {
    if (it.slug) { sports.push(it.slug); continue; }
    const d = await get(it.$ref);        // the index returns $ref stubs, not inline objects
    if (d?.slug) sports.push(d.slug);
  }

  const leagues = [];
  for (const sport of sports) {
    const L = await get(`https://sports.core.api.espn.com/v2/sports/${sport}/leagues?limit=300`);
    const resolved = await pool(L?.items ?? [], async (it) => {
      const d = await get(it.$ref);
      return d ? { sport, id: String(d.id), slug: d.slug ?? String(d.id), name: d.name ?? d.displayName ?? d.slug } : null;
    });
    leagues.push(...resolved.filter(Boolean));
  }
  return leagues;
}

// Count events in a day-offset range. `count` comes back even with limit=1, so each probe is a few
// hundred bytes regardless of how big the competition is. Negative offsets look backwards.
async function countEvents(league, now, fromDay, toDay) {
  let total = 0;
  let firstWindowStart = null;
  let lastWindowEnd = null;
  for (let d = fromDay; d < toDay; d += CHUNK) {
    const a = new Date(now + d * DAY);
    const b = new Date(now + Math.min(d + CHUNK, toDay) * DAY);
    const url = `https://sports.core.api.espn.com/v2/sports/${league.sport}/leagues/${league.slug}/events`
      + `?dates=${compact(a)}-${compact(b)}&limit=1`;
    const j = await get(url);
    const n = j?.count ?? j?.items?.length ?? 0;
    if (n > 0) {
      total += n;
      if (firstWindowStart == null) firstWindowStart = d;
      lastWindowEnd = Math.min(d + CHUNK, toDay);
    }
  }
  return { total, firstWindowStart, lastWindowEnd };
}

// ---------------------------------------------------------------------------------------------
async function main() {
  const now = Date.now();
  const configured = configuredLeagues();

  if (!JSON_OUT) process.stderr.write(`Scanning ESPN (${HORIZON}-day horizon)…\n`);
  const leagues = await allLeagues();
  if (!JSON_OUT) process.stderr.write(`  ${leagues.length} leagues across ESPN; probing fixtures…\n`);

  const scanned = await pool(leagues, async (lg) => {
    const fwd = await countEvents(lg, now, 0, HORIZON);
    const cfg = configured.get(`${lg.sport}/${lg.slug}`) ?? configured.get(`${lg.sport}/${lg.id}`);
    const rec = { ...lg, fixtures: fwd.total, firstWindowStart: fwd.firstWindowStart,
                  configuredAs: cfg?.key ?? null, learnMode: !!cfg?.learnMode };
    // Only a CONFIGURED league with nothing ahead of it needs the backward look — that's the one
    // case where "dead" and "between seasons" have to be told apart. Skipping it for the other ~340
    // leagues keeps the scan roughly the size it was.
    if (rec.configuredAs && !rec.learnMode && fwd.total === 0) {
      const back = await countEvents(lg, now, -LOOKBACK, 0);
      rec.pastFixtures = back.total;
      rec.quietSinceDays = back.lastWindowEnd == null ? null : -back.lastWindowEnd;
    }
    return rec;
  });

  // A configured league that is deliberately parked (learnMode) is NOT dark — it's switched off on
  // purpose. Reporting it every week would train everyone to ignore the report.
  const quiet = scanned.filter((s) => s.configuredAs && !s.learnMode && s.fixtures === 0);
  const broken = quiet.filter((s) => !s.pastFixtures);
  const dormant = quiet.filter((s) => s.pastFixtures > 0);
  const unclaimed = scanned
    .filter((s) => !s.configuredAs && s.fixtures >= MIN_FIXTURES)
    .sort((a, b) => (a.firstWindowStart - b.firstWindowStart) || (b.fixtures - a.fixtures));
  // Already running (or about to) = a coverage decision, available whenever. Starting well beyond
  // the horizon of a normal season = tournament-shaped, and the thing worth a calendar entry now.
  const running = unclaimed.filter((s) => s.firstWindowStart <= TOURNAMENT_GAP);
  const future = unclaimed
    .filter((s) => s.firstWindowStart > TOURNAMENT_GAP)
    .sort((a, b) => a.firstWindowStart - b.firstWindowStart);
  const healthy = scanned.filter((s) => s.configuredAs && s.fixtures > 0);
  const parked = scanned.filter((s) => s.learnMode);

  if (JSON_OUT) {
    console.log(JSON.stringify({ scannedAt: new Date(now).toISOString(), horizonDays: HORIZON,
      broken, dormant, future, running, healthy, parked }, null, 2));
  } else {
    const when = (d) => (d == null ? '—' : `~${new Date(now + d * DAY).toISOString().slice(0, 10)}`);
    const row = (s) => `  ${String(s.name).slice(0, 34).padEnd(36)} ${s.sport}/${s.slug}`.padEnd(70)
      + `${String(s.fixtures).padStart(5)} fixtures   first ${when(s.firstWindowStart)}`;

    console.log(`\n# Fixture radar — ${new Date(now).toISOString().slice(0, 10)} (${HORIZON}-day horizon)\n`);

    console.log(`## 🔴 BROKEN — configured, no fixtures forward OR back (${broken.length})`);
    console.log(broken.length
      ? broken.map((s) => `  ${s.configuredAs.padEnd(16)} ${s.sport}/${s.slug}  (${s.name})  — bad league code, or retired`).join('\n')
      : '  none — every configured league resolves to real data');

    console.log(`\n## 🟡 DORMANT — configured, between seasons (${dormant.length})`);
    console.log(dormant.length
      ? dormant.map((s) => `  ${s.configuredAs.padEnd(16)} ${String(s.name).slice(0,26).padEnd(28)}`
          + `${String(s.pastFixtures).padStart(4)} past   quiet ${s.quietSinceDays ?? '?'}d`
          + (s.quietSinceDays > 400 ? '   ⚠️  over a year — verify this still returns' : '')).join('\n')
      : '  none');

    console.log(`\n## 🔭 FUTURE EVENTS — unclaimed, first fixture >${TOURNAMENT_GAP}d out (${future.length})`);
    console.log('   Tournament-shaped: not running now, so nothing in the app hints they exist.');
    console.log(future.length ? future.map(row).join('\n') : '   none');

    console.log(`\n## 🟢 ALREADY RUNNING — unclaimed, in season now (${running.length})`);
    console.log(running.length ? running.slice(0, 20).map(row).join('\n') : '   none above the threshold');
    if (running.length > 20) console.log(`   … and ${running.length - 20} more (--json for the full list)`);

    console.log(`\n## ⚪ Parked on purpose (${parked.length}) — learnMode, not reported as dark`);
    console.log(parked.map((s) => `  ${s.configuredAs ?? s.slug}`).join(', ') || '  none');

    console.log(`\n## ✅ Healthy configured leagues: ${healthy.length}`);
    console.log(`\n---
NOT COVERED: ESPN only. Cricket runs on Sportmonks and the Nations Cup on Zyla; ESPN publishes zero
cricket leagues, so neither appears above and both still need a human. Threshold for UNCLAIMED is
${MIN_FIXTURES}+ fixtures — lower it with --min to see marginal competitions.`);
  }

  if (broken.length) process.exit(1); // only a genuinely broken league fails the run
}

main();
