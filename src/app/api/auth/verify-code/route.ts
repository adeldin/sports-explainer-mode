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

async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) throw new Error('upstash env missing');
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json?.result ?? null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail((body as { email?: unknown }).email);
    const code = String((body as { code?: unknown }).code ?? '').trim();

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }

    const stored = await redisCmd(['GET', `auth:code:${email}`]);
    if (stored === null || typeof stored !== 'string') {
      return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }

    if (!safeEqual(stored, code)) {
      return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }

    const session = crypto.randomBytes(32).toString('hex');
    await redisCmd(['SET', `auth:session:${session}`, email, 'EX', 2592000]);
    await redisCmd(['DEL', `auth:code:${email}`]);

    return NextResponse.json(
      { ok: true, session, email },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('auth verify-code error', err);
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
}
