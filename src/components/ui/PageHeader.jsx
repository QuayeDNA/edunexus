import { cn } from '../../utils/cn.js';

/**
 * PageHeader — consistent page title + subtitle + action button area.
 *
 * Props:
 *   title      — page heading
 *   subtitle   — sub-heading / breadcrumb
 *   actions    — JSX node rendered on the right (buttons etc.)
 *   className  — extra classes
 */
export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
