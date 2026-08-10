// Generate the app's icon artwork: OpenAI draws it, Recraft strips the background, the result
// lands in assets/icons/ as a transparent PNG the app bundles.
//
//   OPENAI_API_KEY=... RECRAFT_API_KEY=... node scripts/icons/generate.mjs [options]
//
//     --only a,b,c   regenerate just these (by file name, e.g. --only brain,target)
//     --force        redo even if the art already exists and the prompt is unchanged
//     --no-strip     keep the white background (useful when debugging a bad cut-out)
//     --list         print what WOULD run, generate nothing
//
// INCREMENTAL BY DEFAULT. Each icon's prompt is hashed into MANIFEST.json; an icon is regenerated
// only when its art is missing or its prompt has changed. So editing one line in spec.mjs and
// re-running costs one image, not thirty-six.
//
// REVERTING: every PNG is committed, so `git checkout <sha> -- assets/icons/<name>.png` restores
// any previous version. See the revert ladder documented in lib/iconAssets.ts.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ICONS, promptFor } from './spec.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const OUT = join(root, 'assets', 'icons');
const MANIFEST = join(OUT, 'MANIFEST.json');
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes('--force');
const noStrip = args.includes('--no-strip');
const listOnly = args.includes('--list');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',').map(s => s.trim()) : null;

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const RECRAFT_KEY = process.env.RECRAFT_API_KEY;

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 12);

async function withRetry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      const msg = String(e);
      if (/401|403|billing|insufficient/i.test(msg)) throw e;  // won't fix itself
      if (i < tries - 1) await new Promise(r => setTimeout(r, /429|rate limit/i.test(msg) ? 65000 : 4000 * (i + 1)));
    }
  }
  throw last;
}

async function draw(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
      prompt, size: '1024x1024', quality: 'medium', output_format: 'png', n: 1,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`openai HTTP ${res.status}: ${text.slice(0, 300)}`);
  const b64 = JSON.parse(text).data?.[0]?.b64_json;
  if (!b64) throw new Error('openai returned no image');
  return Buffer.from(b64, 'base64');
}

async function strip(buf, name) {
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/png' }), `${name}.png`);
  form.append('response_format', 'b64_json');
  const res = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
    method: 'POST', headers: { Authorization: `Bearer ${RECRAFT_KEY}` }, body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`recraft HTTP ${res.status}: ${text.slice(0, 300)}`);
  const j = JSON.parse(text);
  if (j.image?.b64_json) return Buffer.from(j.image.b64_json, 'base64');
  if (j.image?.url) return Buffer.from(await (await fetch(j.image.url)).arrayBuffer());
  throw new Error('recraft returned no image');
}

let queue = ICONS.filter(i => !only || only.includes(i.file));
queue = queue.filter(i => {
  const p = promptFor(i);
  const dst = join(OUT, `${i.file}.png`);
  if (force) return true;
  if (!existsSync(dst)) return true;
  return manifest[i.file]?.promptHash !== hash(p);   // prompt edited → redraw
});

console.log(`${ICONS.length} icons in spec; ${queue.length} to generate${only ? ` (filtered to ${only.join(',')})` : ''}.`);
if (listOnly) { queue.forEach(i => console.log('  would draw:', i.file)); process.exit(0); }
if (!queue.length) process.exit(0);
if (!OPENAI_KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1); }
if (!noStrip && !RECRAFT_KEY) { console.error('RECRAFT_API_KEY not set (or pass --no-strip)'); process.exit(1); }

let ok = 0, failed = 0;
for (const icon of queue) {
  const prompt = promptFor(icon);
  try {
    let buf = await withRetry(() => draw(prompt));
    if (!noStrip) buf = await withRetry(() => strip(buf, icon.file));
    writeFileSync(join(OUT, `${icon.file}.png`), buf);
    manifest[icon.file] = { emoji: icon.emoji, promptHash: hash(prompt), stripped: !noStrip, bytes: buf.length };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    ok++; console.log(`  ok   ${icon.file} (${(buf.length / 1024).toFixed(0)}kb)`);
  } catch (e) {
    failed++; console.log(`  FAIL ${icon.file}: ${String(e).slice(0, 200)}`);
  }
}
// Normalize is NOT optional. Recraft's removeBackground returns WEBP data regardless of the
// requested response_format, so what we just wrote as `.png` is a mislabeled webp — and it is
// 1024px, which is ~25MB of bundle across the set. Running it here means the two defects can never
// reach a commit just because someone forgot the second command.
if (ok) {
  console.log('\nnormalizing (format + size)…');
  try {
    execFileSync('python3', [join(here, 'normalize.py')], { stdio: 'inherit' });
  } catch {
    console.log('  normalize.py failed — run it manually before committing (needs python3 + Pillow)');
  }
}
console.log(`\n${ok} generated, ${failed} failed -> assets/icons/`);
if (failed) process.exitCode = 1;
