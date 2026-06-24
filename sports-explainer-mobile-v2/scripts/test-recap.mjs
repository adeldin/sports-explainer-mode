// Unit cases for the PURE recap shaping (lib/recap.ts). No network / React.
//   npx tsx scripts/test-recap.mjs
import { normalizeRecap, visibleProSections, hasRecapContent, PRO_SECTIONS } from '../lib/recap.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };

const full = {
  score: 'Away 3 — Home 5', story: 'A back-and-forth game.',
  turningPoint: 'A 7th-inning rally.', keyPerformance: 'Tucker, 3 hits.', whyItMattered: 'Clinches the series.',
};
const thin = { score: 'Away 12 — Home 10', story: 'A tight defensive battle.', turningPoint: '', keyPerformance: '', whyItMattered: '' };

console.log('=== normalize: missing / non-string fields → empty strings, trimmed ===');
{
  const n = normalizeRecap({ score: '  A 1 — B 2  ', story: 42, turningPoint: null });
  check('score trimmed', n.score === 'A 1 — B 2');
  check('non-string story → ""', n.story === '');
  check('missing fields → ""', n.turningPoint === '' && n.keyPerformance === '' && n.whyItMattered === '');
}

console.log('=== free teaser: all three Pro sections shown as LOCKED (title-only) ===');
{
  const v = visibleProSections(full, false);
  check('three locked rows', v.length === 3 && v.every(s => s.locked));
  check('locked rows carry no body', v.every(s => s.text === ''));
  check('covers exactly the Pro section keys', v.map(s => s.key).join(',') === PRO_SECTIONS.join(','));
}

console.log('=== Pro full: only NON-EMPTY sections, unlocked ===');
{
  const v = visibleProSections(full, true);
  check('all three present + unlocked', v.length === 3 && v.every(s => !s.locked));
  check('bodies carried through', v[0].text === 'A 7th-inning rally.');
}

console.log('=== Pro on thin data: empty sections OMITTED (graceful, not fabricated) ===');
{
  const v = visibleProSections(thin, true);
  check('no empty Pro sections rendered', v.length === 0);
}

console.log('=== hasRecapContent: guards the empty card ===');
{
  check('score or story present → true', hasRecapContent(thin) === true);
  check('all empty → false', hasRecapContent({ score: '', story: '', turningPoint: '', keyPerformance: '', whyItMattered: '' }) === false);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
