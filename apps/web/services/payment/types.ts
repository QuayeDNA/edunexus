export interface InitializePaymentParams {
  amount: number;
  email: string;
  reference?: string;
  metadata?: Record<string, string>;
  callbackUrl?: string;
}

export interface PaymentVerificationResult {
  status: "success" | "failed" | "pending";
  reference: string;
  amount: number;
  paidAt?: string;
  metadata?: Record<string, string>;
}

export interface IPaymentProvider {
  initializePayment(params: InitializePaymentParams): Promise<{
    success: boolean;
    reference?: string;
    authorizationUrl?: string;
    error?: string;
  }>;
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
  handleWebhook(
    payload: unknown,
  ): Promise<{ event: string; reference?: string; status?: string }>;
}
