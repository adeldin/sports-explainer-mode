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

// Instantiate the Groq client LAZILY, on first use — not at module load. The SDK
// constructor throws when GROQ_API_KEY is empty, and Next collects page data at BUILD
// time by evaluating every route module. Eager instantiation therefore failed the whole
// build on any deploy whose BUILD env lacked the key (e.g. preview/branch deployments —
// the key is only needed at RUNTIME). Deferring to first request keeps the build clean
// and changes nothing at runtime.
let _groq: Groq | null = null;
function groq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const FALLBACK = (process.env.LLM_FALLBACK_PROVIDER || 'none').toLowerCase();
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// The minimal completion shape every caller already consumes. Both the Groq SDK result and the
// Gemini OpenAI-compat JSON satisfy it.
export interface LLMCompletion {
  choices: Array<{ message?: { content?: string | null } }>;
}

// Drop-in for groq.chat.completions.create(). Same params in, same shape out.
export async function createChatCompletion(params: any): Promise<LLMCompletion> {
  try {
    const c = await groq().chat.completions.create(params);
    console.log('[llm] provider=groq');
    return c as unknown as LLMCompletion;
  } catch (e) {
    const reason = (e as Error)?.message || String(e);
    // No fallback configured → behave exactly as today (Groq-only): rethrow to the route's catch.
    if (FALLBACK !== 'gemini' || !GEMINI_KEY) throw e;
    console.warn(`[llm] Groq failed: ${reason} → provider=gemini-fallback`);
    return geminiCompletion(params);
  }
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
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini fallback ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as LLMCompletion;
}
