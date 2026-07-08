import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolve';

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.searchParams.get('hostname');

  if (!hostname) {
    return NextResponse.json({ error: 'hostname query param required' }, { status: 400 });
  }

  const tenant = await resolveTenant(hostname);
  return NextResponse.json(tenant);
}
