// Swappable LLM provider adapter — Groq PRIMARY → Gemini FALLBACK (paid, no daily cap). Mirrors
// the visionProvider.ts pattern (env-driven, fetch-based, OpenAI-compatible). `createChatCompletion`
// is a DROP-IN for `groq.chat.completions.create` and returns the SAME completion shape, so every
// call site's `.choices[0].message.content` extraction (+ JSON.parse/.trim) is byte-identical and
// the success path is exactly today's behavior.
//
// On ANY Groq invocation failure (429 / 5xx / timeout / network / parse — BROAD trigger), if
// LLM_FALLBACK_PROVIDER=gemini we fall straight through to Gemini's OpenAI-compat endpoint with the
// same messages + json-mode. Disabled by env (unset/`none`) → Groq-only, exactly as before.
//
// Env (Vercel, server-side only): GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY,
//   LLM_FALLBACK_PROVIDER=gemini, GEMINI_MODEL=gemini-2.5-flash.
import Groq from 'groq-sdk';

// LAZY, not module-scope. The Groq SDK constructor THROWS on an empty key, and `next build`
// evaluates this module during its "collecting page data" step — which turned a runtime concern
// into a hard BUILD failure. Every Preview deployment on this repo failed for four days because
// GROQ_API_KEY is scoped to Production only; a markdown-only commit couldn't deploy either, which
// is how you can tell it was never about the code being deployed.
//
// Constructing on first CALL means a missing key fails exactly one request, in the one place that
// needs it, with the route's existing catch — instead of taking down the build for every endpoint
// in the app. A build must never require a secret.
let _groq: Groq | null = null;
// maxRetries: 0 whenever Gemini can take over. The SDK's default (2 retries) HONORS Groq's retry-after
// header in full — on a quota 429 a request could sit for minutes before we tried the other provider
// (observed 2026-09-13, NFL Week 1: 32-57 s explanations while Groq's daily token cap was exhausted).
// With another provider available the right move on any Groq failure is to fail over NOW.
const getGroq = (): Groq =>
  (_groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: process.env.GEMINI_API_KEY ? 0 : 2 }));

const FALLBACK = (process.env.LLM_FALLBACK_PROVIDER || 'none').toLowerCase();
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// The minimal completion shape every caller already consumes. Both the Groq SDK result and the
// Gemini OpenAI-compat JSON satisfy it.
export interface LLMCompletion {
  choices: Array<{ message?: { content?: string | null } }>;
}

// Which provider goes FIRST. Default: Gemini whenever a Gemini key exists, Groq otherwise.
// Decided 2026-09-13 (NFL Week 1 Sunday): Groq's free tier caps at 200K tokens/day PER MODEL and ran
// dry at 2:45 PM with three game windows still to play; the Developer-tier upgrade has been
// "temporarily unavailable" since August. Gemini 2.5 Flash with reasoning off answers in ~1.2-1.8 s
// (Groq: ~1.5-2 s), is on a paid project with no daily cap, and costs ~$0.001 per explanation.
// So: Gemini primary, Groq free tier as the fallback. Set LLM_PRIMARY=groq to flip back without a
// code change.
const PRIMARY = (process.env.LLM_PRIMARY || (GEMINI_KEY ? 'gemini' : 'groq')).toLowerCase();

// Drop-in for groq.chat.completions.create(). Same params in, same shape out. Tries the primary
// provider, then the other one on ANY failure (429 / 5xx / timeout / network / parse — broad trigger).
// A provider that isn't configured (no key) is skipped, so a single-provider setup behaves as before.
export async function createChatCompletion(params: any): Promise<LLMCompletion> {
  const order = PRIMARY === 'gemini' ? ['gemini', 'groq'] : ['groq', 'gemini'];
  let lastErr: unknown = null;
  for (const provider of order) {
    if (provider === 'gemini' && (!GEMINI_KEY || (PRIMARY !== 'gemini' && FALLBACK !== 'gemini'))) continue;
    if (provider === 'groq' && !process.env.GROQ_API_KEY) continue;
    try {
      const c = provider === 'gemini'
        ? await geminiCompletion(params)
        : ((await getGroq().chat.completions.create(params)) as unknown as LLMCompletion);
      console.log(`[llm] provider=${provider}${provider !== order[0] ? '-fallback' : ''}`);
      return c;
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] ${provider} failed: ${(e as Error)?.message || String(e)}`);
    }
  }
  throw lastErr ?? new Error('No LLM provider configured');
}

// Gemini via its OpenAI-compatibility endpoint — same messages/temperature/response_format; only the
// model + base URL + key differ. Returns the OpenAI completion shape verbatim.
async function geminiCompletion(params: any): Promise<LLMCompletion> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GEMINI_KEY}` },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: params.messages,
      ...(params.temperature != null ? { temperature: params.temperature } : {}),
      ...(params.response_format ? { response_format: params.response_format } : {}),
      ...(params.max_tokens ? { max_tokens: params.max_tokens } : {}),
      // No "thinking": gemini-2.5-flash reasons by default, which took ~5-7 s per explanation vs
      // ~1.2-1.8 s with reasoning off (measured 2026-09-13, same prompt). These are short grounded JSON
      // teaching answers — the deliberation buys nothing and costs the user seconds of spinner.
      reasoning_effort: 'none',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini fallback ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as LLMCompletion;
}
