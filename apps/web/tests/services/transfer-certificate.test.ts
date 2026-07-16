import { describe, it, expect } from 'vitest';

const { generateTransferCertificate } = await import('@/services/transfer-certificate');

describe('generateTransferCertificate', () => {
  it('generates a PDF buffer with student info', async () => {
    const result = await generateTransferCertificate({
      studentName: 'John Doe',
      studentIdNumber: 'AABS20260001',
      dateOfBirth: '2015-06-01',
      lastClass: 'SS 1A',
      reason: 'Family relocation to Accra',
      targetSchool: 'Accra Academy',
      transferDate: '2026-07-15',
      schoolName: 'Accra Boys School',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(200);
  });
});
