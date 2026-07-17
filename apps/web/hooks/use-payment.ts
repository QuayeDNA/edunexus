"use client";

import { useState } from "react";

interface PaymentParams {
  amount: number;
  email: string;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  reference: string;
  authorizationUrl?: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (
    params: PaymentParams,
  ): Promise<PaymentResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (reference: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/verify?reference=${reference}`);
      const json = await res.json();
      return json.success && json.data?.status === "success";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { initializePayment, verifyPayment, isLoading, error };
}
