import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function redisGet(key: string): Promise<string | null> {
  const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REST_URL || !REST_TOKEN) return null;
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result?: unknown };
  return typeof json?.result === 'string' ? json.result : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = String((body as { session?: unknown }).session ?? '').trim();
    if (!session) return NextResponse.json({ ok: false }, { headers: corsHeaders });

    const email = await redisGet(`auth:session:${session}`);
    if (!email) return NextResponse.json({ ok: false }, { headers: corsHeaders });

    return NextResponse.json({ ok: true, email }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ ok: false }, { headers: corsHeaders });
  }
}
