import type { IPaymentProvider } from "./types";
import { PaystackProvider } from "./providers/paystack";

let provider: IPaymentProvider | null = null;

export function getPaymentProvider(): IPaymentProvider {
  if (!provider) {
    provider = new PaystackProvider();
  }
  return provider;
}
