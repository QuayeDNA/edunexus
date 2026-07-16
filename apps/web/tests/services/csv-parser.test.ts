import { describe, it, expect } from 'vitest';
import { parseCsv, autoMapColumns } from '@/services/csv-parser';

describe('parseCsv', () => {
  it('parses basic CSV with quoted fields', () => {
    const result = parseCsv('name,age\nAlice,30\nBob,25');
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ index: 2, cells: ['Alice', '30'] });
    expect(result.rows[1]).toEqual({ index: 3, cells: ['Bob', '25'] });
    expect(result.totalRows).toBe(3);
  });

  it('handles commas inside quoted fields', () => {
    const result = parseCsv('name,description\nAlice,"loves cats, dogs"\nBob,"hello"');
    expect(result.headers).toEqual(['name', 'description']);
    expect(result.rows[0].cells).toEqual(['Alice', 'loves cats, dogs']);
  });

  it('handles escaped quotes inside quoted fields', () => {
    const result = parseCsv('name,note\nAlice,"she said ""hello"""');
    expect(result.rows[0].cells).toEqual(['Alice', 'she said "hello"']);
  });

  it('handles newlines inside quoted fields', () => {
    const result = parseCsv('name,note\nAlice,"line1\nline2"\nBob,"ok"');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].cells).toEqual(['Alice', 'line1\nline2']);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsv('name,age\r\nAlice,30\r\nBob,25\r\n');
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(3);
  });

  it('trims header names', () => {
    const result = parseCsv('  name  , age  \nAlice,30');
    expect(result.headers).toEqual(['name', 'age']);
  });

  it('returns empty result for empty CSV', () => {
    const result = parseCsv('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it('returns no data rows when CSV has only headers', () => {
    const result = parseCsv('name,age,class');
    expect(result.headers).toEqual(['name', 'age', 'class']);
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(1);
  });

  it('skips empty trailing rows', () => {
    const result = parseCsv('name\nAlice\n\n\n');
    expect(result.headers).toEqual(['name']);
    expect(result.rows).toHaveLength(1);
    expect(result.totalRows).toBe(2);
  });
});

describe('autoMapColumns', () => {
  it('maps exact matches', () => {
    const result = autoMapColumns(['First Name', 'Last Name', 'Gender', 'Date of Birth']);
    expect(result.mappings.firstName).toBe('First Name');
    expect(result.mappings.lastName).toBe('Last Name');
    expect(result.mappings.gender).toBe('Gender');
    expect(result.mappings.dateOfBirth).toBe('Date of Birth');
    expect(result.unmatched).toHaveLength(0);
  });

  it('maps fuzzy matches like fname and dob', () => {
    const result = autoMapColumns(['fname', 'lname', 'dob']);
    expect(result.mappings.firstName).toBe('fname');
    expect(result.mappings.lastName).toBe('lname');
    expect(result.mappings.dateOfBirth).toBe('dob');
    expect(result.matchScores['fname']).toBeGreaterThanOrEqual(0.5);
    expect(result.matchScores['dob']).toBeGreaterThanOrEqual(0.5);
  });

  it('leaves unknown columns as null and reports unmatched', () => {
    const result = autoMapColumns(['First Name', 'Unknown Column', 'Something Else']);
    expect(result.mappings.firstName).toBe('First Name');
    expect(result.mappings.lastName).toBeNull();
    expect(result.mappings.gender).toBeNull();
    expect(result.unmatched).toHaveLength(2);
    expect(result.unmatched[0].header).toBe('Unknown Column');
    expect(result.unmatched[1].header).toBe('Something Else');
  });

  it('ensures each known field maps to at most one header (first-come-first-served)', () => {
    const result = autoMapColumns(['phone', 'mobile', 'contact']);
    const mappedValues = Object.values(result.mappings).filter(Boolean);
    expect(new Set(mappedValues).size).toBe(mappedValues.length);
    expect(mappedValues.length).toBeLessThanOrEqual(Object.keys(result.mappings).length);
    expect(result.mappings.guardianPhone).not.toBeNull();
  });

  it('maps class-related headers', () => {
    const result = autoMapColumns(['Class', 'Section']);
    expect(result.mappings.classId).toBe('Class');
    expect(result.mappings.guardianName).toBeNull();
  });

  it('provides matchScores for each header', () => {
    const result = autoMapColumns(['First Name', 'nonsense']);
    expect(result.matchScores['First Name']).toBe(1.0);
    expect(result.matchScores['nonsense']).toBeLessThan(0.5);
  });
});
