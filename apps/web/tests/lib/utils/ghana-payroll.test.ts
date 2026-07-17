import { describe, it, expect } from "vitest";
import {
  calculatePayslip,
  calculateGhanaPAYE,
  SSNIT_RATES,
} from "@edunexus/shared";

describe("calculatePayslip", () => {
  it("calculates payslip for basic salary of 2000 with no allowances", () => {
    const result = calculatePayslip({
      basicSalary: 2000,
      allowances: 0,
      deductions: 0,
    });

    expect(result.grossPay).toBe(2000);
    expect(result.employeeSSNIT).toBe(2000 * SSNIT_RATES.employee);
    expect(result.employeeSSNIT).toBeCloseTo(110, 2);
    expect(result.employerSSNIT).toBe(2000 * SSNIT_RATES.employer);
    expect(result.employerSSNIT).toBeCloseTo(260, 2);
    expect(result.taxableIncome).toBeGreaterThan(0);
    expect(result.payeTax).toBeGreaterThan(0);
    expect(result.totalDeductions).toBeGreaterThan(0);
    expect(result.netPay).toBeGreaterThan(0);
    expect(result.netPay).toBeLessThan(result.grossPay);
  });

  it("includes allowances in gross pay", () => {
    const result = calculatePayslip({
      basicSalary: 1500,
      allowances: 500,
      deductions: 0,
    });

    expect(result.grossPay).toBe(2000);
  });

  it("applies additional deductions", () => {
    const result = calculatePayslip({
      basicSalary: 2000,
      allowances: 0,
      deductions: 100,
    });

    expect(result.totalDeductions).toBe(
      result.employeeSSNIT + result.payeTax + 100,
    );
    expect(result.netPay).toBe(result.grossPay - result.totalDeductions);
  });

  it("handles minimum wage scenario", () => {
    const result = calculatePayslip({
      basicSalary: 500,
      allowances: 0,
      deductions: 0,
    });

    expect(result.grossPay).toBe(500);
    expect(result.employeeSSNIT).toBeCloseTo(27.5, 2);
    expect(result.netPay).toBeGreaterThan(0);
  });

  it("uses custom SSNIT rate when provided", () => {
    const result = calculatePayslip({
      basicSalary: 2000,
      allowances: 0,
      deductions: 0,
      employeeSSNITRate: 0.05,
    });

    expect(result.employeeSSNIT).toBe(100);
  });
});

describe("calculateGhanaPAYE", () => {
  it("returns 0 for income below tax threshold", () => {
    expect(calculateGhanaPAYE(400)).toBe(0);
  });

  it("calculates correctly for first tax band", () => {
    const tax = calculateGhanaPAYE(600);
    expect(tax).toBeGreaterThan(0);
  });
});
