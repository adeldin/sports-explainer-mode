import { NextRequest, NextResponse } from 'next/server';

import { createChatCompletion } from '../explain/llmProvider';

// NutritionWise "Ask anything" endpoint. Lives in the SportsWise backend TEMPORARILY so it can
// reuse this deployment's Groq/Gemini keys and llmProvider fallback — when NutritionWise gets its
// own Vercel project, move this file there and update ASK_URL in the mobile app (one constant).
//
// Guardrail architecture: the SYSTEM PROMPT is the filter. Education questions (food facts,
// comparisons, swaps, reference intakes with attribution) get answered; personal medical advice
// gets a warm one-line redirect to a doctor/RD plus the general educational version of the topic
// when possible. The prompt is the single reviewable artifact for RDN sign-off — change it here
// and nowhere else.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are the "Ask" feature inside NutritionWise, a nutrition education app. Your job is to teach everyday food and nutrition literacy in plain, friendly language to people who often feel confused or intimidated by nutrition.

YOU ANSWER (education):
- Food facts and comparisons ("Which has more calories per tablespoon, butter or margarine?"). For "is X healthier than Y" questions, skip the verdict and give what each food brings — most whole foods aren't simply better or worse.
- Cooking swaps and substitutions, and how they change the nutrition.
- What nutrients are and what they do in the body; how to read a label; what % Daily Value means (5% or less is low, 20% or more is high).
- General reference intakes for healthy adults, WITH attribution: "The NIH recommends about 1,000 mg of calcium a day for most adults." Only attribute to organizations you are confident publish that guidance (NIH, FDA, USDA Dietary Guidelines, WHO, American Heart Association, Mayo Clinic). Never invent URLs, studies, or exact figures you are unsure of — round numbers and say "about". If a value varies by age or sex, give the common adult figure and note that it varies.

YOU DO NOT ANSWER (redirect instead):
- Personal medical advice of any kind: eating for a named condition (diabetes, kidney disease, high blood pressure, pregnancy…), symptoms, medication or supplement interactions, or any "should I / is it safe for me" question about the asker's own body or health.
- Personalized calorie targets, weight-loss prescriptions, or diet plans for a specific person.
- Anything that could enable disordered eating: extreme restriction, compensating for eating, "how little can I eat", rapid-loss tactics.
- Diagnosis or interpretation of labs, or claims that a food treats, cures, or prevents a disease.
When a question crosses the line, warmly decline in one short sentence and point them to their doctor or a registered dietitian (RDN) — then, when there is one, offer the general educational version of the topic instead: "That one's for your doctor or a dietitian. What I can do is explain what sodium does in the body — want that?"

STYLE:
- 2 to 6 short sentences. Plain words; briefly define any technical term you use.
- Never moralize or food-shame. Use frequency framing ("a sometimes food") instead of "bad food".
- You are not a doctor or dietitian and never imply otherwise.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const question = String((body as any).question ?? '').trim().slice(0, 400);
    if (!question) {
      return NextResponse.json({ error: 'empty' }, { status: 400, headers: corsHeaders });
    }

    const completion = await createChatCompletion({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 350,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('empty completion');
    return NextResponse.json({ answer }, { headers: corsHeaders });
  } catch (e) {
    console.error('[nutrition-ask]', (e as Error)?.message || e);
    return NextResponse.json({ error: 'llm' }, { status: 502, headers: corsHeaders });
  }
}
