import { Inbox } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon = Inbox, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{heading}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Link href={action.href} className={cn(buttonVariants(), 'mt-4')}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
