export const SSNIT_RATES = {
  employee: 0.055,
  employer: 0.13,
} as const;

export interface GHANA_PAYE_BAND {
  min: number;
  max: number | null;
  rate: number;
  cumulative_base: number;
}

export const GHANA_PAYE_BANDS: GHANA_PAYE_BAND[] = [
  { min: 0, max: 490, rate: 0, cumulative_base: 0 },
  { min: 490, max: 730, rate: 0.05, cumulative_base: 0 },
  { min: 730, max: 1096, rate: 0.10, cumulative_base: 12 },
  { min: 1096, max: 2000, rate: 0.175, cumulative_base: 48.60 },
  { min: 2000, max: 3650, rate: 0.25, cumulative_base: 206.80 },
  { min: 3650, max: 20000, rate: 0.30, cumulative_base: 619.30 },
  { min: 20000, max: null, rate: 0.35, cumulative_base: 5524.30 },
] as const;

export function calculateGhanaPAYE(monthlyGross: number): number {
  for (let i = GHANA_PAYE_BANDS.length - 1; i >= 0; i--) {
    const band = GHANA_PAYE_BANDS[i];
    if (band.max === null || monthlyGross > band.min) {
      if (band.max === null || monthlyGross <= band.max) {
        const taxableInBand = monthlyGross - band.min;
        return taxableInBand * band.rate + band.cumulative_base;
      }
    }
  }
  return 0;
}

export interface PayslipInput {
  basicSalary: number;
  allowances: number;
  deductions: number;
  employeeSSNITRate?: number;
}

export interface PayslipResult {
  grossPay: number;
  employeeSSNIT: number;
  employerSSNIT: number;
  taxableIncome: number;
  payeTax: number;
  totalDeductions: number;
  netPay: number;
}

export function calculatePayslip(input: PayslipInput): PayslipResult {
  const empRate = input.employeeSSNITRate ?? SSNIT_RATES.employee;
  const grossPay = input.basicSalary + input.allowances;
  const employeeSSNIT = grossPay * empRate;
  const employerSSNIT = grossPay * SSNIT_RATES.employer;
  const taxableIncome = grossPay - employeeSSNIT;
  const payeTax = calculateGhanaPAYE(taxableIncome);
  const totalDeductions = employeeSSNIT + payeTax + input.deductions;
  const netPay = grossPay - totalDeductions;

  return {
    grossPay,
    employeeSSNIT,
    employerSSNIT,
    taxableIncome,
    payeTax,
    totalDeductions,
    netPay,
  };
}