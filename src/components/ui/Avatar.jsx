import { cn } from '../../utils/cn.js';

const SIZE_MAP = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const COLOR_MAP = [
  'bg-brand-100 text-brand-700',
  'bg-accent-100 text-accent-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
];

function getColor(name) {
  const code = (name ?? '').charCodeAt(0) + (name ?? '').charCodeAt(1);
  return COLOR_MAP[code % COLOR_MAP.length];
}

/**
 * Avatar — user avatar with photo or initials fallback.
 *
 * Props:
 *   src        — image URL (optional)
 *   firstName  — for initials fallback
 *   lastName   — for initials fallback
 *   size       — 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (default 'md')
 *   className  — extra classes
 */
export default function Avatar({ src, firstName, lastName, size = 'md', className }) {
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const colorClass = getColor(firstName + lastName);
  const sizeClass = SIZE_MAP[size] ?? SIZE_MAP.md;

  return (
    <div className={cn('rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 font-semibold', sizeClass, !src && colorClass, className)}>
      {src ? (
        <img src={src} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
