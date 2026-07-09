import type { IPaymentProvider, InitializePaymentParams, PaymentVerificationResult } from '../types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_API = 'https://api.paystack.co';

export class PaystackProvider implements IPaymentProvider {
  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async initializePayment(params: InitializePaymentParams) {
    try {
      const response = await this.request('POST', '/transaction/initialize', {
        amount: Math.round(params.amount * 100),
        email: params.email,
        reference: params.reference,
        metadata: params.metadata,
        callback_url: params.callbackUrl,
      });

      if (!response.status) {
        return { success: false, error: response.message || 'Payment initialization failed' };
      }

      return {
        success: true,
        reference: response.data.reference,
        authorizationUrl: response.data.authorization_url,
      };
    } catch {
      return { success: false, error: 'Payment service unavailable' };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const response = await this.request('GET', `/transaction/verify/${reference}`);

    return {
      status: response.data?.status === 'success' ? 'success' : response.data?.status === 'failed' ? 'failed' : 'pending',
      reference,
      amount: (response.data?.amount || 0) / 100,
      paidAt: response.data?.paid_at,
      metadata: response.data?.metadata,
    };
  }

  async handleWebhook(payload: any) {
    const event = payload?.event || '';
    const reference = payload?.data?.reference || '';
    const status = payload?.data?.status || '';

    return { event, reference, status };
  }
}
