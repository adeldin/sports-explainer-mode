import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function redisCmd(cmd: (string | number)[]): Promise<Response | null> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) return null;
  return fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
}

async function sendCodeEmail(toEmail: string, code: string): Promise<void> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY missing');

  const sender = { name: 'SportsWise', email: 'noreply@sportswise.app' };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: toEmail }],
      subject: 'Your SportsWise sign-in code',
      htmlContent:
        `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto">` +
        `<h2 style="color:#0d1b3e">SportsWise sign-in code</h2>` +
        `<p>Enter this code in the extension to sign in:</p>` +
        `<p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#e87722">${code}</p>` +
        `<p style="color:#666;font-size:13px">This code expires in 10 minutes. ` +
        `If you didn't request it, you can ignore this email.</p></div>`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`brevo ${res.status} ${detail}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail((body as { email?: unknown }).email);

    const generic = NextResponse.json(
      { ok: true, message: 'If that email is valid, a code is on its way.' },
      { headers: corsHeaders },
    );

    if (!isValidEmail(email)) return generic;

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

    const setRes = await redisCmd(['SET', `auth:code:${email}`, code, 'EX', 600]);
    if (!setRes || !setRes.ok) {
      console.error('auth request-code: redis SET failed');
      return generic;
    }

    await sendCodeEmail(email, code);
    return generic;
  } catch (err) {
    console.error('auth request-code error', err);
    return NextResponse.json(
      { ok: true, message: 'If that email is valid, a code is on its way.' },
      { headers: corsHeaders },
    );
  }
}
