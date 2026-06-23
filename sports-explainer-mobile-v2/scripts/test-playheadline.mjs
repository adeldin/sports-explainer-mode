// Unit cases for derivePlayHeadline (Step D Phase 1). No network.
//   npx tsx scripts/test-playheadline.mjs
import { derivePlayHeadline } from '../lib/playHeadline.ts';

const FB = 'A key play just happened'; // localized fallback the caller passes
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = got === want; (ok ? pass++ : fail++);
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

console.log('=== ESPN play description preferred ===');
eq('real play text wins over the lesson',
  derivePlayHeadline('Kyle Tucker strikes out swinging.', 'He sequenced him — fastballs up, then the splitter.', FB),
  'Kyle Tucker strikes out swinging.');
eq('play text returned in full (no helper-side truncation)',
  derivePlayHeadline('Patrick Mahomes pass deep middle to Travis Kelce for 22 yards on 3rd & 8.', 'A big conversion.', FB),
  'Patrick Mahomes pass deep middle to Travis Kelce for 22 yards on 3rd & 8.');

console.log('=== generic play text → fall through to the lesson ===');
eq('"A key play just happened" is generic → first sentence of lesson',
  derivePlayHeadline('A key play just happened', 'A strikeout looking. The pitcher won the duel.', FB),
  'A strikeout looking.');
eq('generic is case-insensitive ("Latest Play")',
  derivePlayHeadline('Latest Play', 'A home run to deep center. Two runs score.', FB),
  'A home run to deep center.');
eq('"Live game in progress" is generic → lesson',
  derivePlayHeadline('Live game in progress', 'Tucker grounds out softly to second.', FB),
  'Tucker grounds out softly to second.');

console.log('=== first-sentence extraction ===');
eq('takes only the first sentence',
  derivePlayHeadline(undefined, 'He froze on a splitter. Then walked back to the dugout. Tough at-bat.', FB),
  'He froze on a splitter.');
eq('no terminator → whole (trimmed) lesson',
  derivePlayHeadline(undefined, '  A clean double play  ', FB),
  'A clean double play');
eq('does not split on a decimal mid-number',
  derivePlayHeadline(undefined, 'He threw it 95.4 mph past the hitter. Filthy.', FB),
  'He threw it 95.4 mph past the hitter.');

console.log('=== never empty / undefined → fallback ===');
eq('no play text + no lesson → fallback', derivePlayHeadline(undefined, undefined, FB), FB);
eq('empty strings → fallback', derivePlayHeadline('', '   ', FB), FB);
eq('generic play text + empty lesson → fallback', derivePlayHeadline('A key play just happened', '', FB), FB);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
