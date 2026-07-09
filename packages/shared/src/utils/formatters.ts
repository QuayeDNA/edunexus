import { CURRENCY } from '../constants/ghana';

export function formatGHS(amount: number): string {
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, style: 'short' | 'long' | 'full' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'numeric', year: 'numeric' }
      : style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };

  return new Intl.DateTimeFormat(CURRENCY.locale, options).format(d);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) return `${match[1]} ${match[2]} ${match[3]}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('233')) {
    const national = cleaned.slice(3);
    const match = national.match(/^(\d{2})(\d{3})(\d{4})$/);
    if (match) return `0${match[1]} ${match[2]} ${match[3]}`;
  }

  return phone;
}

export function formatName(firstName: string, lastName: string, otherNames?: string | null): string {
  const parts = [firstName, lastName];
  if (otherNames) {
    parts.splice(1, 0, otherNames);
  }
  return parts.join(' ').trim();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  if (plural) return plural;
  if (/[sxz]$/.test(singular) || /[cs]h$/.test(singular)) return `${singular}es`;
  if (/[^aeiou]y$/.test(singular)) return `${singular.slice(0, -1)}ies`;
  return `${singular}s`;
}