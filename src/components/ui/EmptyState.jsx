import { cn } from '../../utils/cn.js';

/**
 * EmptyState — consistent empty state block for pages and sections.
 *
 * Props:
 *   icon     — Lucide icon component
 *   title    — heading text
 *   message  — body text
 *   action   — { label, onClick, icon: Icon } primary CTA
 *   compact  — smaller variant for cards (default false)
 */
export default function EmptyState({ icon: Icon, title, message, action, compact = false, className }) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'py-10 gap-3' : 'py-20 gap-4', className)}>
      {Icon && (
        <div className={cn('rounded-2xl bg-surface-hover flex items-center justify-center', compact ? 'w-12 h-12' : 'w-16 h-16')}>
          <Icon className={cn('text-text-muted', compact ? 'w-6 h-6' : 'w-8 h-8')} />
        </div>
      )}
      <div className="max-w-xs">
        <p className={cn('font-semibold text-text-primary', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {message && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{message}</p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="btn-primary text-sm mt-1">
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
