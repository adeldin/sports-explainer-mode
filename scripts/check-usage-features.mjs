#!/usr/bin/env node
// Checks that every feature name the app can send (sports-explainer-mobile-v2/lib/usage.ts,
// FeatureName type) is on the server allow-list (src/app/api/usage/features.ts).
// A name missing on the server is silently refused at runtime, so its count would be lost.
// Run from anywhere: node scripts/check-usage-features.mjs   (exit 1 on mismatch)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const strings = s => [...s.replace(/\/\/.*$/gm, '').matchAll(/["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
const block = (src, re, what) => {
  const m = src.match(re);
  if (!m) { console.error(`check-usage-features: could not find ${what}`); process.exit(2); }
  return strings(m[1]);
};

// --- App side ---
const mobile = 'sports-explainer-mobile-v2/lib/';
const games = block(read(mobile + 'academyGames.ts'), /export type AcademyGameId =([\s\S]*?);/, 'AcademyGameId');
const pieces = block(read(mobile + 'coachesCorner.ts'), /export type CCPieceId =([\s\S]*?);/, 'CCPieceId');
const sports = block(read(mobile + 'api.ts'), /export type Sport =([\s\S]*?);/, 'Sport');
const usageSrc = read(mobile + 'usage.ts');
const fixed = block(usageSrc, /export const FIXED_FEATURES = \[([\s\S]*?)\] as const;/, 'FIXED_FEATURES');
const featureType = usageSrc.match(/export type FeatureName =([\s\S]*?);/)?.[1] ?? '';
for (const part of ['`academy.${AcademyGameId}`', '`cc.${CCPieceId}`', '`sport.${Sport}`', '(typeof FIXED_FEATURES)[number]']) {
  if (!featureType.includes(part)) {
    console.error(`check-usage-features: FeatureName in usage.ts changed shape (missing ${part}); update this script.`);
    process.exit(2);
  }
}
const app = [
  ...games.map(g => `academy.${g}`),
  ...pieces.map(p => `cc.${p}`),
  ...sports.map(s => `sport.${s}`),
  ...fixed,
];

// --- Server side ---
const serverSrc = read('src/app/api/usage/features.ts');
const arr = name => block(serverSrc, new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`), name);
const server = new Set([
  ...arr('ACADEMY_GAMES').map(g => `academy.${g}`),
  ...arr('CC_PIECES').map(p => `cc.${p}`),
  ...arr('SPORTS').map(s => `sport.${s}`),
  ...arr('FIXED'),
]);

// Also check every literal trackFeature('...') call in the app is a known app name.
const appSet = new Set(app);
const walk = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (f === 'node_modules' || f.startsWith('.')) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
});
const literalProblems = [];
for (const file of walk(join(root, 'sports-explainer-mobile-v2'))) {
  for (const m of readFileSync(file, 'utf8').matchAll(/trackFeature\(\s*'([^']+)'\s*\)/g)) {
    if (!appSet.has(m[1])) literalProblems.push(`${file.slice(root.length + 1)}: ${m[1]}`);
  }
}

const missing = app.filter(n => !server.has(n));
const unused = [...server].filter(n => !appSet.has(n));
console.log(`app names: ${app.length}, server names: ${server.size}`);
if (unused.length) console.log(`on the server list but not sent by the app (fine; e.g. retired names): ${unused.join(', ')}`);
if (missing.length || literalProblems.length) {
  if (missing.length) console.error(`MISSING on the server list (counts would be lost): ${missing.join(', ')}`);
  if (literalProblems.length) console.error(`trackFeature calls with unknown names:\n  ${literalProblems.join('\n  ')}`);
  process.exit(1);
}
console.log('OK: every app feature name is on the server allow-list.');
