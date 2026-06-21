// THROWAWAY local harness for Step A (one-primary-lesson prompt rework).
// Calls the REAL explainPlay() from src/app/api/explain/route.ts (transpiled by tsx)
// for a few hardcoded plays at all four levels, so we can read whether the LESSON
// changes by difficulty (rule -> meaning -> craft -> strategy) and whether each
// teaches ONE clear thing. No ESPN/network for play data — plays are hardcoded.
//
// Run from the repo root:
//   npx tsx scripts/test-lessons.mjs
//
// Needs GROQ_API_KEY in .env.local (loaded below before route.ts is imported, since
// route.ts instantiates its Groq client at module load).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Load .env.local into process.env BEFORE importing route.ts ---
const envPath = path.join(ROOT, '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY in .env.local — cannot call the model.');
  process.exit(1);
}

// Import the REAL explanation logic (tsx transpiles the TS route on the fly).
const { explainPlay } = await import('../src/app/api/explain/route.ts');

const PLAYS = [
  {
    sport: 'mlb',
    label: 'MLB — strikeout looking on a splitter (our running example)',
    gameContext: 'Orioles vs Dodgers — Bottom 9th, 2 outs, tie game 2-2',
    play: 'Kyle Tucker called out on strikes — Yennier Cano freezes him with a 1-2 splitter at the bottom of the zone.',
  },
  {
    sport: 'mlb',
    label: 'MLB — go-ahead home run',
    gameContext: 'Yankees vs Red Sox — Top 7th, 1 out, runner on first, tied 3-3',
    play: 'Aaron Judge homers (24) on a fly ball to deep left-center. Two runs score.',
  },
  {
    sport: 'nfl',
    label: 'NFL — 3rd-and-long conversion',
    gameContext: 'Chiefs vs Bills — 4th Quarter 2:10, Chiefs ball, 3rd & 8 near midfield',
    play: 'Patrick Mahomes pass deep middle to Travis Kelce for 22 yards on 3rd & 8.',
  },
  {
    sport: 'mlb',
    label: 'MLB — routine / boring play (over-teach check)',
    gameContext: 'Reds vs Mets — Top 4th, 1 out, bases empty, Mets lead 1-0',
    play: 'Jose Iglesias grounds out softly to second base.',
  },
];

const LEVELS = ['kid', 'beginner', 'intermediate', 'expert'];
const bar = '='.repeat(80);

for (const p of PLAYS) {
  console.log('\n' + bar);
  console.log(`PLAY: ${p.label}`);
  console.log(`SPORT: ${p.sport.toUpperCase()}   SITUATION: ${p.gameContext}`);
  console.log(`RAW: "${p.play}"`);
  console.log(bar);
  for (const level of LEVELS) {
    try {
      const r = await explainPlay(p.play, p.gameContext, p.sport, level, 'en');
      console.log(`\n--- ${level.toUpperCase()} ---`);
      console.log(`  simple:       ${r.simple || '(empty)'}`);
      console.log(`  whyItMatters: ${r.whyItMatters || '(empty)'}`);
      if (r.showRule && r.ruleDetail) console.log(`  ruleDetail:   ${r.ruleDetail}`);
      console.log(`  [complexity: ${r.complexity ?? '?'} | showRule: ${r.showRule ?? '?'}]`);
    } catch (e) {
      console.log(`\n--- ${level.toUpperCase()} ---  ERROR: ${e?.message || e}`);
    }
  }
}
console.log('\n' + bar + '\nDone.');
