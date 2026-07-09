import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProvider } from '@/services/payment';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const provider = getPaymentProvider();

  const result = await provider.handleWebhook(payload);

  console.log('[PAYMENT WEBHOOK]', result);

  return NextResponse.json({ success: true });
}
