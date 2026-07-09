import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentStatusProps {
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'partial';
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
  partial: { label: 'Partial', className: 'bg-blue-100 text-blue-800' },
};

export function PaymentStatus({ status }: PaymentStatusProps) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge className={cn('font-medium', config.className)} variant="outline">
      {config.label}
    </Badge>
  );
}
