import { NextRequest, NextResponse } from 'next/server';
// sessionToEmail + checkPro moved to _lib so /api/explain can reuse them for server-side cap
// enforcement. Pure refactor — this endpoint's behavior is unchanged.
import { sessionToEmail, checkPro } from '../_lib/entitlement';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = String((body as { session?: unknown }).session ?? '').trim();
    if (!session) {
      return NextResponse.json({ isPro: false, signedIn: false }, { headers: corsHeaders });
    }

    const email = await sessionToEmail(session);
    if (!email) {
      // Session invalid/expired → not signed in.
      return NextResponse.json({ isPro: false, signedIn: false }, { headers: corsHeaders });
    }

    const { isPro, isTrial } = await checkPro(email);
    return NextResponse.json(
      { isPro, isTrial, signedIn: true, email },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('entitlement error', err);
    // On error, fail closed (isPro:false) but report signedIn unknown so the client can retry.
    return NextResponse.json(
      { isPro: false, signedIn: true, error: 'check_failed' },
      { headers: corsHeaders },
    );
  }
}
