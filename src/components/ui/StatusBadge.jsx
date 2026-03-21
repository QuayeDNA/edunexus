import { cn } from '../../utils/cn.js';

const STYLES = {
  // Student / Staff statuses
  Active:       'bg-status-successBg text-status-success',
  Inactive:     'bg-surface-hover text-text-muted',
  Graduated:    'bg-brand-50 text-brand-600',
  Transferred:  'bg-status-infoBg text-status-info',
  Suspended:    'bg-status-dangerBg text-status-danger',
  'On Leave':   'bg-status-warningBg text-status-warning',
  Terminated:   'bg-status-dangerBg text-status-danger',
  Retired:      'bg-surface-hover text-text-muted',
  // Payment statuses
  Paid:         'bg-status-successBg text-status-success',
  Partial:      'bg-status-warningBg text-status-warning',
  Unpaid:       'bg-status-dangerBg text-status-danger',
  Overdue:      'bg-status-dangerBg text-status-danger',
  Waived:       'bg-brand-50 text-brand-600',
  // Misc
  Pending:      'bg-status-warningBg text-status-warning',
  Draft:        'bg-surface-hover text-text-muted',
  Approved:     'bg-status-successBg text-status-success',
  Processed:    'bg-brand-50 text-brand-600',
  Cancelled:    'bg-status-dangerBg text-status-danger',
  Borrowed:     'bg-status-infoBg text-status-info',
  Returned:     'bg-status-successBg text-status-success',
  Lost:         'bg-status-dangerBg text-status-danger',
  Male:         'bg-blue-50 text-blue-600',
  Female:       'bg-pink-50 text-pink-600',
  Core:         'bg-brand-50 text-brand-700',
  Elective:     'bg-accent-100 text-accent-700',
};

/**
 * StatusBadge — coloured pill for status values.
 *
 * Props:
 *   status  — the status string (keys from STYLES above, or fallback)
 *   size    — 'sm' | 'md' (default 'md')
 *   dot     — show a coloured dot before the label (default false)
 */
export default function StatusBadge({ status, size = 'md', dot = false, className }) {
  const style = STYLES[status] ?? 'bg-surface-hover text-text-muted';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-md',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        style,
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      )}
      {status}
    </span>
  );
}
