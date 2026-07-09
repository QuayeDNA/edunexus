import { describe, it, expect } from 'vitest';
import { formatGHS, formatDate, formatPhone, formatName, truncate, pluralize } from '@edunexus/shared';

describe('formatGHS', () => {
  it('formats whole numbers with two decimal places', () => {
    const result = formatGHS(100);
    expect(result).toContain('100');
    expect(result).toContain('GH₵');
  });

  it('formats decimal amounts', () => {
    const result = formatGHS(1234.5);
    expect(result).toContain('1,234.50');
  });

  it('formats zero', () => {
    const result = formatGHS(0);
    expect(result).toContain('0.00');
  });

  it('formats small amounts', () => {
    const result = formatGHS(0.5);
    expect(result).toContain('0.50');
  });
});

describe('formatDate', () => {
  it('formats a date string in short style', () => {
    const result = formatDate('2026-07-08');
    expect(result).toContain('2026');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2026-07-08'));
    expect(result).toContain('2026');
  });

  it('formats in long style with month name', () => {
    const result = formatDate('2026-07-08', 'long');
    expect(result).toContain('July');
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit Ghanaian number', () => {
    const result = formatPhone('0241234567');
    expect(result).toBe('024 123 4567');
  });

  it('formats a 12-digit number with 233 prefix', () => {
    const result = formatPhone('233241234567');
    expect(result).toBe('024 123 4567');
  });

  it('handles numbers with special characters', () => {
    const result = formatPhone('+233 24 123 4567');
    expect(result).toBe('024 123 4567');
  });

  it('returns original string for unrecognized format', () => {
    const result = formatPhone('123');
    expect(result).toBe('123');
  });
});

describe('formatName', () => {
  it('formats first and last name', () => {
    expect(formatName('John', 'Doe')).toBe('John Doe');
  });

  it('includes other names when provided', () => {
    expect(formatName('John', 'Doe', 'Michael')).toBe('John Michael Doe');
  });

  it('handles null other names', () => {
    expect(formatName('Jane', 'Smith', null)).toBe('Jane Smith');
  });

  it('handles empty strings', () => {
    expect(formatName('', '')).toBe('');
  });
});

describe('truncate', () => {
  it('returns the original string if within max length', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and adds ellipsis if over max length', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });
});

describe('pluralize', () => {
  it('returns singular for count of 1', () => {
    expect(pluralize(1, 'student')).toBe('student');
  });

  it('returns plural for count of 0', () => {
    expect(pluralize(0, 'student')).toBe('students');
  });

  it('returns plural for count > 1', () => {
    expect(pluralize(5, 'class')).toBe('classes');
  });

  it('uses custom plural when provided', () => {
    expect(pluralize(3, 'child', 'children')).toBe('children');
  });
});
