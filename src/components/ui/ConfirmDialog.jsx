import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * ConfirmDialog — modal for destructive action confirmation.
 *
 * Props:
 *   open       — boolean
 *   onClose    — close handler
 *   onConfirm  — confirm handler (can be async)
 *   title      — dialog title
 *   message    — body message
 *   confirmLabel  — confirm button text (default 'Delete')
 *   variant    — 'danger' | 'warning' (default 'danger')
 *   loading    — show spinner on confirm button
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  variant = 'danger',
  loading = false,
}) {
  if (!open) return null;

  const iconColor = variant === 'danger' ? 'bg-status-dangerBg text-status-danger' : 'bg-status-warningBg text-status-warning';
  const btnColor = variant === 'danger' ? 'btn-danger' : 'bg-status-warning hover:bg-amber-600 text-white btn-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconColor)}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost w-8 h-8 p-0 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('btn-danger', variant !== 'danger' && 'bg-status-warning hover:bg-amber-600')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
