#!/usr/bin/env node
// Cricsheet → committed data module. Run BY HAND (or cron) — Cricsheet is post-match archival
// (1-5 day lag), so ingest is a refresh step, NOT a live poller. The app/route never touches
// Cricsheet ZIPs; this script is the only thing that does.
//
//   node scripts/ingest-cricsheet.mjs --dir <extracted-json-dir> --ids 1496578,1496577
//   node scripts/ingest-cricsheet.mjs --zip <t20s_json.zip>      --teams India,England --since 2026-07-01
//   node scripts/ingest-cricsheet.mjs --download                 --teams India,England --since 2026-07-01
//
// Output: src/app/api/cricket/matches.generated.ts — raw Cricsheet payloads + a light index.
// The ROUTE normalizes via cricsheetProvider at request time (single source of truth for
// normalization); this script pre-validates the same runs invariant and REFUSES to write on
// violation — bad data never reaches the repo.

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/app/api/cricket/matches.generated.ts');
const DOWNLOAD_URL = 'https://cricsheet.org/downloads/t20s_json.zip';

// --- args ---
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] ?? '') : undefined; };
const has = (name) => args.includes(`--${name}`);
const idsArg = flag('ids')?.split(',').map((s) => s.trim()).filter(Boolean);
const teamsArg = flag('teams')?.split(',').map((s) => s.trim()).filter(Boolean);
const since = flag('since');
const dirArg = flag('dir');
const zipArg = flag('zip');

let dir = dirArg;
let tmp;
try {
  if (!dir) {
    tmp = mkdtempSync(join(tmpdir(), 'cricsheet-'));
    let zipPath = zipArg;
    if (!zipPath && has('download')) {
      zipPath = join(tmp, 't20s_json.zip');
      console.log(`downloading ${DOWNLOAD_URL} ...`);
      execFileSync('curl', ['-sfL', '-o', zipPath, DOWNLOAD_URL]);
    }
    if (!zipPath) {
      console.error('need one of: --dir <dir> | --zip <path> | --download');
      process.exit(1);
    }
    execFileSync('unzip', ['-oq', zipPath, '-d', tmp]);
    dir = tmp;
  }

  // --- select matches ---
  const files = readdirSync(dir).filter((f) => /^\d+\.json$/.test(f));
  const picked = [];
  for (const f of files) {
    const id = f.replace('.json', '');
    if (idsArg && !idsArg.includes(id)) continue;
    const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const info = raw.info ?? {};
    const date = String(info.dates?.[0] ?? '');
    const teams = info.teams ?? [];
    if (!idsArg) {
      if (since && date < since) continue;
      if (teamsArg && !teamsArg.some((t) => teams.includes(t))) continue;
    }
    picked.push({ id, raw });
  }
  if (!picked.length) {
    console.error('no matches selected — check --ids/--teams/--since against the archive contents');
    process.exit(1);
  }
  picked.sort((a, b) => String(a.raw.info?.dates?.[0] ?? '').localeCompare(String(b.raw.info?.dates?.[0] ?? '')));

  // --- validate (same runs invariant the provider throws on) + build index ---
  const index = [];
  for (const { id, raw } of picked) {
    const info = raw.info ?? {};
    const scores = {};
    for (const inn of raw.innings ?? []) {
      let runs = 0, wkts = 0, legal = 0;
      for (const ov of inn.overs ?? []) {
        for (const dd of ov.deliveries ?? []) {
          const r = dd.runs ?? {};
          const total = Number(r.total ?? 0), batter = Number(r.batter ?? 0), extras = Number(r.extras ?? 0);
          if (total !== batter + extras) {
            console.error(`INVARIANT VIOLATED in ${id} at ${dd.actual_delivery}: total=${total} !== ${batter}+${extras} — refusing to write`);
            process.exit(1);
          }
          runs += total;
          if (dd.wickets) wkts += dd.wickets.length;
          const e = dd.extras ?? {};
          if (!e.wides && !e.noballs) legal += 1;
        }
      }
      scores[inn.team ?? '?'] = `${runs}/${wkts} (${Math.floor(legal / 6)}.${legal % 6})`;
    }
    const o = info.outcome ?? {};
    const note = o.winner
      ? `${o.winner} won by ${o.by?.runs != null ? `${o.by.runs} runs` : o.by?.wickets != null ? `${o.by.wickets} wickets` : ''}`.trim()
      : (o.result ?? '');
    index.push({
      id,
      date: String(info.dates?.[0] ?? ''),
      teams: [String(info.teams?.[0] ?? ''), String(info.teams?.[1] ?? '')],
      venue: String(info.venue ?? ''),
      city: String(info.city ?? ''),
      format: String(info.match_type ?? 'T20'),
      note,
      scores,
    });
    console.log(`ok ${id}  ${index.at(-1).date}  ${index.at(-1).teams.join(' v ')}  — ${note || 'no result'}`);
  }

  // --- emit generated module ---
  const rawMap = Object.fromEntries(picked.map(({ id, raw }) => [id, raw]));
  const body = `// GENERATED by scripts/ingest-cricsheet.mjs — DO NOT EDIT BY HAND.
// Raw Cricsheet payloads (ODC-BY 1.0, https://cricsheet.org) + a light board index.
// Normalization happens in the route via cricsheetProvider (single source of truth);
// every payload here passed the runs invariant at ingest time.

export interface CricketIndexEntry {
  id: string;
  date: string;              // "YYYY-MM-DD" (match local date per Cricsheet)
  teams: [string, string];
  venue: string;
  city: string;
  format: string;
  note: string;              // outcome, e.g. "England won by 56 runs"
  scores: Record<string, string>; // team -> "257/3 (20.0)"
}

export const CRICKET_INDEX: CricketIndexEntry[] = ${JSON.stringify(index, null, 1)};

export const CRICKET_RAW: Record<string, unknown> = ${JSON.stringify(rawMap)};
`;
  writeFileSync(OUT, body);
  console.log(`\nwrote ${OUT} — ${index.length} matches, ${(body.length / 1024).toFixed(0)} KB`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
