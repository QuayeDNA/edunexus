import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export function Loading({ label = 'Loading...', className, fullScreen }: LoadingProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground',
        fullScreen && 'min-h-[60vh]',
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
