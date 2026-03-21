import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * StatCard — metric card for dashboards.
 *
 * Props:
 *   title    — label above the number
 *   value    — main metric (string or number)
 *   delta    — change description text
 *   trend    — 'up' | 'down' | null  (colours the delta)
 *   icon     — lucide icon component
 *   color    — tailwind classes for icon bg+text e.g. 'bg-brand-50 text-brand-600'
 *   loading  — show skeleton
 *   onClick  — optional click handler
 */
export default function StatCard({
  title,
  value,
  delta,
  trend,
  icon: Icon,
  color = 'bg-brand-50 text-brand-600',
  loading = false,
  onClick,
  className,
}) {
  const deltaColor = trend === 'up'
    ? 'text-status-success'
    : trend === 'down'
    ? 'text-status-danger'
    : 'text-text-muted';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-border p-5 shadow-card',
        onClick && 'cursor-pointer hover:shadow-md hover:border-brand-200 transition-all',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary leading-tight">{title}</span>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-24 bg-surface-hover rounded" />
          <div className="h-3 w-32 bg-surface-hover rounded" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-text-primary leading-none">{value ?? '—'}</p>
          {delta && (
            <p className={cn('text-xs mt-1.5 font-medium flex items-center gap-1', deltaColor)}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {delta}
            </p>
          )}
        </>
      )}
    </div>
  );
}
