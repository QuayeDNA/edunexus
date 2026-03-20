import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names safely, handling conflicts.
 * Use this everywhere instead of template literals for conditional classes.
 */
export const cn = (...args) => twMerge(clsx(args));
