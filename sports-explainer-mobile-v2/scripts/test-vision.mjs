// Unit cases for the PURE vision request-shaping (lib/vision.ts). No network / React.
//   npx tsx scripts/test-vision.mjs
import { buildVisionBody, normalizeVision, hasVisionContent } from '../lib/vision.ts';

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${name}`); };

const ctx = { sport: 'soccer', homeTeam: 'Uzbekistan', awayTeam: 'Portugal', homeScore: '0', awayScore: '2', state: 'in', status: "70'" };

console.log('=== buildVisionBody: mode gates the question ===');
{
  const explain = buildVisionBody('B64', 'explain', 'ignored?', 'beginner', 'en');
  check('explain mode → question dropped', explain.action === 'vision' && explain.mode === 'explain' && explain.question === '');
  const ask = buildVisionBody('B64', 'ask', '  what formation is this?  ', 'expert', 'es');
  check('ask mode → question trimmed through', ask.mode === 'ask' && ask.question === 'what formation is this?');
  check('carries image + level + language', ask.imageBase64 === 'B64' && ask.level === 'expert' && ask.language === 'es');
}

console.log('=== buildVisionBody: gameContext included only when present ===');
{
  const withCtx = buildVisionBody('B64', 'explain', '', 'kid', 'en', ctx);
  check('present context attached', withCtx.gameContext === ctx);
  const noCtx = buildVisionBody('B64', 'explain', '', 'kid', 'en');
  check('no context → key omitted', !('gameContext' in noCtx));
  const emptyCtx = buildVisionBody('B64', 'explain', '', 'kid', 'en', { sport: 's', homeTeam: '', awayTeam: '', homeScore: '', awayScore: '', state: '', status: '' });
  check('empty teams → context omitted (no useless ctx)', !('gameContext' in emptyCtx));
}

console.log('=== normalizeVision / hasVisionContent ===');
{
  check('string text trimmed', normalizeVision({ text: '  a play  ' }).text === 'a play');
  check('non-string / missing → ""', normalizeVision({ text: 42 }).text === '' && normalizeVision({}).text === '');
  check('hasVisionContent: non-empty → true', hasVisionContent({ text: 'x' }) === true);
  check('hasVisionContent: empty → false', hasVisionContent({ text: '' }) === false);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'SOME FAILED'} — ${pass} passed, ${fail} failed`);
