import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a number as Ghana Cedis
 * @param {number} amount
 * @param {boolean} compact - use compact notation (1.2K)
 */
export const formatGHS = (amount, compact = false) => {
  if (amount == null || isNaN(amount)) return 'GH₵ 0.00';

  if (compact && Math.abs(amount) >= 1000) {
    const formatter = new Intl.NumberFormat('en-GH', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return `GH₵ ${formatter.format(amount)}`;
  }

  const formatter = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `GH₵ ${formatter.format(amount)}`;
};

export const formatCurrency = formatGHS;

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Format a date string or Date object in Ghana locale (15 Jan 2024)
 */
export const formatDate = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'd MMM yyyy');
  } catch {
    return '—';
  }
};

export const formatDateLong = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'EEEE, d MMMM yyyy');
  } catch {
    return '—';
  }
};

export const formatDateShort = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, 'dd/MM/yyyy');
  } catch {
    return '—';
  }
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatTime = (time) => {
  if (!time) return '—';
  // Handles "HH:MM:SS" or "HH:MM"
  const parts = time.split(':');
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
};

export const formatMonthYear = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMMM yyyy');
  } catch {
    return '—';
  }
};

// ─── Names ────────────────────────────────────────────────────────────────────

export const formatFullName = (firstName, lastName, otherNames) => {
  const parts = [firstName, otherNames, lastName].filter(Boolean);
  return parts.join(' ') || '—';
};

export const formatInitials = (firstName, lastName) => {
  const f = firstName?.[0]?.toUpperCase() ?? '';
  const l = lastName?.[0]?.toUpperCase() ?? '';
  return f + l || '?';
};

export const formatDisplayName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(' ') || '—';

// ─── Phone Numbers ────────────────────────────────────────────────────────────

export const formatPhone = (phone) => {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
};

// ─── Numbers ─────────────────────────────────────────────────────────────────

export const formatNumber = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-GH').format(n);
};

export const formatPercent = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatPercentValue = (value) => {
  if (value == null) return '—';
  return `${Math.round(value)}%`;
};

// ─── Academic ─────────────────────────────────────────────────────────────────

export const formatPosition = (position, total) => {
  if (!position) return '—';
  const suffix =
    position === 1 ? 'st' :
    position === 2 ? 'nd' :
    position === 3 ? 'rd' : 'th';
  return total ? `${position}${suffix} / ${total}` : `${position}${suffix}`;
};

export const formatScore = (score, total) => {
  if (score == null) return '—';
  return total ? `${score} / ${total}` : `${score}`;
};

// ─── File Size ────────────────────────────────────────────────────────────────

export const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ─── Student ID ───────────────────────────────────────────────────────────────

export const generateStudentId = (schoolPrefix = 'EDN', year = new Date().getFullYear(), sequence) => {
  const seq = String(sequence ?? Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `${schoolPrefix}-${year}-${seq}`;
};
