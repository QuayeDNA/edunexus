// ─── Ghana SSNIT Rates ────────────────────────────────────────────────────────

export const SSNIT_RATES = {
  employee: 0.055, // 5.5% of basic salary
  employer: 0.13,  // 13% of basic salary
};

// ─── Ghana PAYE Tax Bands (2024) ──────────────────────────────────────────────
// Annual income bands in GHS

export const GHANA_PAYE_BANDS = [
  { min: 0,      max: 4380,     rate: 0 },
  { min: 4380,   max: 5100,     rate: 0.05 },
  { min: 5100,   max: 6900,     rate: 0.10 },
  { min: 6900,   max: 11100,    rate: 0.175 },
  { min: 11100,  max: 43100,    rate: 0.25 },
  { min: 43100,  max: 240000,   rate: 0.30 },
  { min: 240000, max: Infinity, rate: 0.35 },
];

/**
 * Calculate Ghana PAYE (income tax) for a given annual income
 * @param {number} annualIncome - taxable annual income in GHS
 * @returns {number} - monthly income tax amount
 */
export const calculateGhanaPAYE = (annualIncome) => {
  let tax = 0;
  for (const band of GHANA_PAYE_BANDS) {
    if (annualIncome <= band.min) break;
    const taxableInBand = Math.min(annualIncome, band.max) - band.min;
    tax += taxableInBand * band.rate;
  }
  return tax / 12; // convert annual tax to monthly
};

/**
 * Calculate a complete payslip for a staff member
 * @param {Object} staff
 * @param {number} staff.salary - basic salary
 * @param {number} [staff.housing_allowance]
 * @param {number} [staff.transport_allowance]
 * @param {number} [staff.other_allowances]
 * @returns {Object} - complete payslip breakdown
 */
export const calculatePayslip = (staff) => {
  const basic = staff.salary ?? 0;
  const housingAllowance = staff.housing_allowance ?? 0;
  const transportAllowance = staff.transport_allowance ?? 0;
  const otherAllowances = staff.other_allowances ?? 0;

  const gross = basic + housingAllowance + transportAllowance + otherAllowances;

  const ssnitEmployee = basic * SSNIT_RATES.employee;
  const ssnitEmployer = basic * SSNIT_RATES.employer;

  // Taxable income = gross - SSNIT employee contribution
  const taxableMonthly = gross - ssnitEmployee;
  const incomeTax = calculateGhanaPAYE(taxableMonthly * 12);

  const totalDeductions = ssnitEmployee + incomeTax;
  const net = gross - totalDeductions;

  return {
    basic,
    housingAllowance,
    transportAllowance,
    otherAllowances,
    gross,
    ssnitEmployee,
    ssnitEmployer,
    incomeTax,
    totalDeductions,
    net,
  };
};

/**
 * Format SSNIT contribution summary for a list of staff (for SSNIT submission)
 * @param {Array} payslips
 * @returns {Object} - { totalEmployee, totalEmployer, total }
 */
export const calculateSSNITSummary = (payslips) => {
  const totalEmployee = payslips.reduce((sum, p) => sum + (p.ssnit_employee ?? 0), 0);
  const totalEmployer = payslips.reduce((sum, p) => sum + (p.ssnit_employer ?? 0), 0);
  return {
    totalEmployee,
    totalEmployer,
    total: totalEmployee + totalEmployer,
  };
};

/**
 * Check if a salary is above the minimum wage (Ghana 2024: GH₵ 1,302/month)
 */
export const GHANA_MINIMUM_WAGE_MONTHLY = 1302;

export const isAboveMinimumWage = (monthlySalary) =>
  monthlySalary >= GHANA_MINIMUM_WAGE_MONTHLY;
