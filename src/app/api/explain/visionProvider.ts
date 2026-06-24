// Vision provider abstraction (premium #2). The ONE place a vision model/provider swaps —
// the route's vision action, the never-fabricate prompt, the capture UI, and the gating all
// stay put; only this adapter + env change. v1 default: OpenAI gpt-4o-mini (GA vision, and its
// chat-completions image_url shape is byte-identical to our Groq text calls — smallest delta).
// Haiku 4.5 is the documented swap-target if gpt-4o-mini over-claims on messy photos.
//
// Both OpenAI and Groq are OpenAI-compatible, so a single fetch adapter covers both via a
// base-URL + key + model swap (no new SDK dep). A non-compatible provider (Anthropic/Gemini)
// would add a branch HERE and nowhere else.
//
// Env:
//   VISION_PROVIDER  'openai' (default) | 'groq'
//   VISION_MODEL     overrides the provider default model
//   OPENAI_API_KEY   required for provider 'openai'
//   GROQ_API_KEY     reused for provider 'groq' (already set for text features)

type VisionProvider = 'openai' | 'groq';

const PROVIDERS: Record<VisionProvider, { url: string; keyEnv: string; defaultModel: string }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', defaultModel: 'gpt-4o-mini' },
  // Groq Llama-4 Scout is Preview + weakest on messy photos — a fallback, not the default.
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY', defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct' },
};

export async function analyzeImage(
  { imageBase64, system, user }: { imageBase64: string; system: string; user: string },
): Promise<string> {
  const provider = (process.env.VISION_PROVIDER as VisionProvider) || 'openai';
  const cfg = PROVIDERS[provider] || PROVIDERS.openai;
  const model = process.env.VISION_MODEL || cfg.defaultModel;
  const apiKey = process.env[cfg.keyEnv];
  if (!apiKey) throw new Error(`Vision provider "${provider}": missing ${cfg.keyEnv}`);

  // Low temperature — this is a grounded "describe what's actually there" task, not creative.
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: user },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vision API ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? '').trim();
}
