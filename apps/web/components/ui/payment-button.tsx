'use client';

import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { usePayment } from '@/hooks/use-payment';

interface PaymentButtonProps {
  amount: number;
  email: string;
  label?: string;
  metadata?: Record<string, string>;
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function PaymentButton({
  amount,
  email,
  label = 'Pay Now',
  metadata,
  onSuccess,
  onError,
  disabled,
}: PaymentButtonProps) {
  const { initializePayment, isLoading } = usePayment();

  const handlePayment = async () => {
    const result = await initializePayment({ amount, email, metadata });
    if (result?.authorizationUrl) {
      window.open(result.authorizationUrl, '_blank');
      onSuccess?.(result.reference);
    } else {
      onError?.('Failed to initialize payment');
    }
  };

  return (
    <Button onClick={handlePayment} disabled={isLoading || disabled}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Processing...' : label}
    </Button>
  );
}
