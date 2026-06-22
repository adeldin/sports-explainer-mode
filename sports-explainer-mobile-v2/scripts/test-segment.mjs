// THROWAWAY harness for the Step B glossary segmenter. Imports the REAL segmentText
// and prints how each sample string segments, plus the reconstruction invariant.
//
// Run from the mobile app dir (sports-explainer-mobile-v2):
//   npx tsx scripts/test-segment.mjs

import { segmentText, MAX_TERMS } from '../lib/glossary/segment.ts';

const CASES = [
  // --- MLB ---
  { sport: 'mlb', text: 'He struck out looking on a nasty splitter for the third out.' },
  { sport: 'mlb', text: 'Aaron Judge crushed a home run; the fastball caught too much plate.' },
  { sport: 'mlb', text: 'A routine ground ball turned into a double play.' },
  { sport: 'mlb', text: 'The count was full with runners in scoring position.' },
  // demotion-ordering proof: high-value "home run"/"slider" should win slots over
  // the demoted "out"/"hit" even though "grounded out" appears earlier.
  { sport: 'mlb', text: 'The batter grounded out, then the next hitter smashed a home run off a hanging slider.' },
  // demoted-only block: the only glossary match is the stoplisted "out" → mark NOTHING.
  { sport: 'mlb', text: "And just like that, it's the third out." },
  // --- NFL ---
  { sport: 'nfl', text: 'Mahomes threw a touchdown on third down after the play-action fake.' },
  { sport: 'nfl', text: 'The running back broke through for a big gain.' },
  { sport: 'nfl', text: 'A holding penalty wiped out the first down.' },
];

const bar = '='.repeat(80);
let allPass = true;
console.log(`MAX_TERMS = ${MAX_TERMS}`);

for (const c of CASES) {
  const segs = segmentText(c.text, c.sport);
  const recon = segs.map((s) => s.value).join('');
  const ok = recon === c.text;
  if (!ok) allPass = false;

  // « » brackets show exactly which spans became tappable terms.
  const marked = segs.map((s) => (s.type === 'term' ? `«${s.value}»` : s.value)).join('');
  const terms = segs.filter((s) => s.type === 'term');

  console.log('\n' + bar);
  console.log(`[${c.sport.toUpperCase()}] ${c.text}`);
  console.log(`marked: ${marked}`);
  console.log(`terms (${terms.length}/${MAX_TERMS}):`);
  if (terms.length === 0) console.log('   (none)');
  for (const t of terms) {
    const def = t.def.length > 64 ? t.def.slice(0, 61) + '...' : t.def;
    console.log(`   • "${t.value}"  ->  [${t.term}]  —  ${def}`);
  }
  console.log(`reconstruction: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) {
    console.log(`   expected: ${JSON.stringify(c.text)}`);
    console.log(`   got:      ${JSON.stringify(recon)}`);
  }
}

console.log('\n' + bar);
console.log(allPass ? 'ALL RECONSTRUCTION CHECKS PASS' : 'SOME RECONSTRUCTION CHECKS FAILED');
