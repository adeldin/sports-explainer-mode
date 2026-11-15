// Checks the RND-30 seasonal FAQ and Did You Know windows (NBA Cup, College Football
// Playoff): before, inside and after each window, and that Cup entries never reach WNBA.
// Run from the mobile app dir (sports-explainer-mobile-v2):
//   npx tsx scripts/test-seasonal.mjs

import { faqsFor, seasonalAnswer, SPORT_FAQS, SEASONAL_FAQS } from '../lib/faqs.ts';
import { factsFor, SEASONAL_FACTS } from '../lib/facts.ts';

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed++; };
const ens = f => f.questions.map(q => q.en);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const noDupes = arr => new Set(arr).size === arr.length;

const cupQs = SEASONAL_FAQS.filter(f => f.sport === 'nba').map(f => f.question);
const cfpQs = SEASONAL_FAQS.filter(f => f.sport === 'cfb').map(f => f.question);
const cfpNew = SEASONAL_FAQS.filter(f => f.sport === 'cfb' && !f.existing).map(f => f.question);
const cupFacts = SEASONAL_FACTS.filter(f => f.sport === 'nba').map(f => f.text);
const cfpFacts = SEASONAL_FACTS.filter(f => f.sport === 'cfb').map(f => f.text);
const twelveQ = 'How does the 12-team College Football Playoff work?';

check('5 NBA Cup questions, 6 CFP entries (1 existing), 4 Cup facts, 5 CFP facts',
  cupQs.length === 5 && cfpQs.length === 6 && cfpNew.length === 5 && cupFacts.length === 4 && cfpFacts.length === 5);

// --- NBA Cup: 2026-10-30 up to but not including 2026-12-12 ---
for (const d of ['2026-10-29', '2026-12-12', '2027-03-01']) {
  check(`NBA ${d} (outside): list equals the normal NBA list`, same(ens(faqsFor('nba', d)), ens(SPORT_FAQS.nba)));
  check(`NBA ${d} (outside): no Cup answers`, cupQs.every(q => seasonalAnswer(q, 'nba', d) === undefined));
  check(`NBA ${d} (outside): no Cup facts, pinned 0`, factsFor(['nba'], d).pinned === 0 && !factsFor(['nba'], d).facts.some(t => cupFacts.includes(t)));
}
for (const d of ['2026-10-30', '2026-11-20', '2026-12-11']) {
  const q = ens(faqsFor('nba', d));
  check(`NBA ${d} (inside): starts with the 5 Cup questions`, same(q.slice(0, 5), cupQs));
  check(`NBA ${d} (inside): then the normal list, no duplicates`, same(q.slice(5), ens(SPORT_FAQS.nba)) && noDupes(q));
  check(`NBA ${d} (inside): every Cup question has its written answer`, SEASONAL_FAQS.filter(f => f.sport === 'nba').every(f => seasonalAnswer(f.question, 'nba', d) === f.answer));
  const ff = factsFor(['nba'], d);
  check(`NBA ${d} (inside): Did You Know opens on Cup facts (pinned 4)`, ff.pinned === 4 && same(ff.facts.slice(0, 4), cupFacts));
}

// --- WNBA never gets Cup entries, on any date ---
for (const d of ['2026-10-29', '2026-10-30', '2026-11-20', '2026-12-11', '2026-12-12']) {
  const q = ens(faqsFor('wnba', d));
  check(`WNBA ${d}: no Cup questions, list unchanged`, !q.some(x => cupQs.includes(x)) && same(q, ens(SPORT_FAQS.wnba)));
  check(`WNBA ${d}: no Cup answers or facts`, cupQs.every(x => seasonalAnswer(x, 'wnba', d) === undefined) && factsFor(['wnba'], d).pinned === 0);
}
check('Shared NBA question list was not changed (no Cup questions in it)', !ens(SPORT_FAQS.nba).some(x => cupQs.includes(x)));

// --- College Football Playoff: 2026-12-06 up to but not including 2027-01-26 ---
for (const d of ['2026-11-20', '2026-12-05', '2027-01-26', '2027-06-01']) {
  check(`CFB ${d} (outside): list equals the normal college football list`, same(ens(faqsFor('cfb', d)), ens(SPORT_FAQS.cfb)));
  check(`CFB ${d} (outside): no new CFP questions`, !ens(faqsFor('cfb', d)).some(x => cfpNew.includes(x)));
  check(`CFB ${d} (outside): no written answers (12-team question goes back to the AI)`, cfpQs.every(q => seasonalAnswer(q, 'cfb', d) === undefined));
  check(`CFB ${d} (outside): no CFP facts, pinned 0`, factsFor(['cfb'], d).pinned === 0 && !factsFor(['cfb'], d).facts.some(t => cfpFacts.includes(t)));
}
for (const d of ['2026-12-06', '2026-12-18', '2027-01-25']) {
  const q = ens(faqsFor('cfb', d));
  check(`CFB ${d} (inside): starts with the 6 CFP questions`, same(q.slice(0, 6), cfpQs));
  check(`CFB ${d} (inside): 12-team question listed once, no duplicates`, q.filter(x => x === twelveQ).length === 1 && noDupes(q) && q.length === SPORT_FAQS.cfb.questions.length + 5);
  check(`CFB ${d} (inside): every CFP question has its written answer`, SEASONAL_FAQS.filter(f => f.sport === 'cfb').every(f => seasonalAnswer(f.question, 'cfb', d) === f.answer));
  const ff = factsFor(['cfb'], d);
  check(`CFB ${d} (inside): Did You Know opens on CFP facts (pinned 5)`, ff.pinned === 5 && same(ff.facts.slice(0, 5), cfpFacts));
}

// --- Cross-sport: CFP entries never show on NBA and Cup entries never on college football ---
check('NBA never shows CFP entries (Dec 18)', !ens(faqsFor('nba', '2026-12-18')).some(x => cfpNew.includes(x)));
check('College football never shows Cup entries (Nov 20)', !ens(faqsFor('cfb', '2026-11-20')).some(x => cupQs.includes(x)));

// --- The removed, out-of-date fact is gone ---
check('Old "conference races now decide seeding" fact removed', !factsFor(['cfb'], '2026-11-20').facts.some(t => t.includes('conference races now decide seeding')));

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
