import { NextRequest, NextResponse } from 'next/server';

// PlateFluent "request a dietitian screening" endpoint (Dr. Pietro's feature):
// after a WELL Check, a user can opt in to being contacted by the RDN team.
// Sends via Resend. Lives in the SportsWise backend alongside nutrition-ask —
// move both when PlateFluent gets its own deployment.
//
// Env (Vercel): RESEND_API_KEY, RDN_EMAIL (destination — Kevin/designated RDN),
// RDN_FROM (verified sender, e.g. "PlateFluent <results@platefluent.app>").
// Unconfigured → 503 and the app shows a friendly "try again later".
//
// PRIVACY: the user explicitly submits their email to request contact — the
// app shows a consent line. Only what's needed is sent: email, optional
// anonymous participant id, and the score summary.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.RDN_EMAIL;
  if (!key || !to) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = String((body as any).email ?? '').trim().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'bad-email' }, { status: 400, headers: corsHeaders });
    }
    const participantId = String((body as any).participantId ?? 'guest').slice(0, 20);
    const total = Number((body as any).total ?? NaN);
    const lang = String((body as any).lang ?? 'en').slice(0, 5);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RDN_FROM || 'PlateFluent <onboarding@resend.dev>',
        to: [to],
        reply_to: email,
        subject: `PlateFluent screening request — ${participantId}`,
        html: `<p>A PlateFluent user requested a dietitian screening.</p>
<ul>
<li><b>Contact email:</b> ${email}</li>
<li><b>Participant:</b> ${participantId}</li>
<li><b>WELL Diet Score:</b> ${Number.isFinite(total) ? `${total} / 120` : 'not shared'}</li>
<li><b>App language:</b> ${lang}</li>
</ul>
<p>Reply directly to this email to reach them.</p>`,
      }),
    });
    if (!res.ok) {
      console.error('[rdn-request] resend', res.status, (await res.text()).slice(0, 200));
      return NextResponse.json({ error: 'send-failed' }, { status: 502, headers: corsHeaders });
    }
    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    console.error('[rdn-request]', (e as Error)?.message || e);
    return NextResponse.json({ error: 'server' }, { status: 500, headers: corsHeaders });
  }
}
