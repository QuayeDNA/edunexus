import { supabase } from '../supabaseClient.js';
import { calculatePayslip, calculateSSNITSummary } from '../../utils/ghanaPayroll.js';

const EMPTY_LIST = { data: [], error: null, count: 0 };

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeMonth = (value) => {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return month;
};

const normalizeYear = (value) => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
};

const getSchoolPayrollRunIds = async ({ schoolId, year, month } = {}) => {
  if (!schoolId) return { ids: [], error: null };

  let query = supabase
    .from('payroll_runs')
    .select('id')
    .eq('school_id', schoolId);

  if (year) {
    query = query.eq('year', year);
  }

  if (month) {
    query = query.eq('month', month);
  }

  const { data, error } = await query;
  if (error) return { ids: [], error };

  return {
    ids: (data ?? []).map((row) => row.id),
    error: null,
  };
};

const withRunSearch = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const status = (row.status ?? '').toLowerCase();
    const processorName = `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`
      .trim()
      .toLowerCase();
    const monthText = String(row.month ?? '');
    const yearText = String(row.year ?? '');

    return (
      status.includes(query) ||
      processorName.includes(query) ||
      monthText.includes(query) ||
      yearText.includes(query)
    );
  });
};

const withPayslipSearch = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const staffName = `${row.staff?.first_name ?? ''} ${row.staff?.last_name ?? ''}`
      .trim()
      .toLowerCase();
    const staffId = (row.staff?.staff_id_number ?? '').toLowerCase();
    const department = (row.staff?.department ?? '').toLowerCase();
    const status = (row.payment_status ?? '').toLowerCase();

    return (
      staffName.includes(query) ||
      staffId.includes(query) ||
      department.includes(query) ||
      status.includes(query)
    );
  });
};

const recalculateRunTotals = async (payrollRunId) => {
  const { data: payslips, error: payslipError } = await supabase
    .from('payslips')
    .select('gross_salary, ssnit_employee, income_tax, other_deductions, net_salary')
    .eq('payroll_run_id', payrollRunId);

  if (payslipError) {
    return { totals: null, error: payslipError };
  }

  const rows = payslips ?? [];

  const totalGross = rows.reduce((sum, row) => sum + Number(row.gross_salary ?? 0), 0);
  const totalDeductions = rows.reduce(
    (sum, row) =>
      sum +
      Number(row.ssnit_employee ?? 0) +
      Number(row.income_tax ?? 0) +
      Number(row.other_deductions ?? 0),
    0
  );
  const totalNet = rows.reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0);

  const totals = {
    total_gross: totalGross,
    total_deductions: totalDeductions,
    total_net: totalNet,
  };

  const { error: updateError } = await supabase
    .from('payroll_runs')
    .update(totals)
    .eq('id', payrollRunId);

  if (updateError) {
    return { totals: null, error: updateError };
  }

  return { totals, error: null };
};

export const payrollApi = {
  listPayrollRuns: async ({ schoolId, year, status, search, limit } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('payroll_runs')
      .select(
        'id, school_id, month, year, status, processed_by, processed_at, total_gross, total_deductions, total_net, profiles!payroll_runs_processed_by_fkey(id, first_name, last_name)',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('processed_at', { ascending: false, nullsFirst: false });

    const parsedYear = year ? normalizeYear(year) : null;
    if (parsedYear) {
      query = query.eq('year', parsedYear);
    }

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: runRows, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const rows = runRows ?? [];
    const runIds = rows.map((row) => row.id);

    const statsByRunId = {};
    if (runIds.length > 0) {
      const { data: payslipRows, error: payslipError } = await supabase
        .from('payslips')
        .select('payroll_run_id, payment_status')
        .in('payroll_run_id', runIds);

      if (payslipError) {
        return { data: [], error: payslipError, count: 0 };
      }

      (payslipRows ?? []).forEach((row) => {
        const key = row.payroll_run_id;
        if (!statsByRunId[key]) {
          statsByRunId[key] = { payslipCount: 0, paidCount: 0 };
        }

        statsByRunId[key].payslipCount += 1;
        if (row.payment_status === 'Paid') {
          statsByRunId[key].paidCount += 1;
        }
      });
    }

    const enriched = rows.map((row) => ({
      ...row,
      payslipCount: statsByRunId[row.id]?.payslipCount ?? 0,
      paidCount: statsByRunId[row.id]?.paidCount ?? 0,
    }));

    const filtered = withRunSearch(enriched, search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createPayrollRun: async ({ schoolId, month, year, processedBy } = {}) => {
    const parsedMonth = normalizeMonth(month);
    const parsedYear = normalizeYear(year);

    if (!schoolId || !parsedMonth || !parsedYear) {
      return {
        data: null,
        error: new Error('School, month, and year are required to create payroll run'),
      };
    }

    const { data: existingRun, error: existingError } = await supabase
      .from('payroll_runs')
      .select('id, status')
      .eq('school_id', schoolId)
      .eq('month', parsedMonth)
      .eq('year', parsedYear)
      .maybeSingle();

    if (existingError) {
      return { data: null, error: existingError };
    }

    if (existingRun?.id) {
      return {
        data: null,
        error: new Error('A payroll run already exists for this month and year'),
      };
    }

    const { data: staffRows, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, staff_id_number, department, salary, housing_allowance, transport_allowance, other_allowances')
      .eq('school_id', schoolId)
      .eq('employment_status', 'Active');

    if (staffError) {
      return { data: null, error: staffError };
    }

    const activeStaff = staffRows ?? [];
    if (activeStaff.length === 0) {
      return {
        data: null,
        error: new Error('No active staff found for payroll run'),
      };
    }

    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        school_id: schoolId,
        month: parsedMonth,
        year: parsedYear,
        status: 'Draft',
        processed_by: processedBy ?? null,
        processed_at: new Date().toISOString(),
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
      })
      .select('id, school_id, month, year, status, processed_by, processed_at, total_gross, total_deductions, total_net')
      .single();

    if (runError) {
      return { data: null, error: runError };
    }

    const payslipInserts = activeStaff.map((staff) => {
      const payslip = calculatePayslip({
        salary: Number(staff.salary ?? 0),
        housing_allowance: Number(staff.housing_allowance ?? 0),
        transport_allowance: Number(staff.transport_allowance ?? 0),
        other_allowances: Number(staff.other_allowances ?? 0),
      });

      return {
        payroll_run_id: payrollRun.id,
        staff_id: staff.id,
        basic_salary: payslip.basic,
        housing_allowance: payslip.housingAllowance,
        transport_allowance: payslip.transportAllowance,
        other_allowances: payslip.otherAllowances,
        ssnit_employee: payslip.ssnitEmployee,
        ssnit_employer: payslip.ssnitEmployer,
        income_tax: payslip.incomeTax,
        other_deductions: 0,
        net_salary: payslip.net,
        payment_status: 'Pending',
      };
    });

    const { data: insertedPayslips, error: payslipInsertError } = await supabase
      .from('payslips')
      .insert(payslipInserts)
      .select('id, payroll_run_id, staff_id, gross_salary, ssnit_employee, income_tax, other_deductions, net_salary');

    if (payslipInsertError) {
      await supabase.from('payroll_runs').delete().eq('id', payrollRun.id);
      return { data: null, error: payslipInsertError };
    }

    const totalsResult = await recalculateRunTotals(payrollRun.id);
    if (totalsResult.error) {
      return { data: null, error: totalsResult.error };
    }

    return {
      data: {
        payrollRun: {
          ...payrollRun,
          ...totalsResult.totals,
        },
        payslipCount: insertedPayslips?.length ?? 0,
      },
      error: null,
    };
  },

  listPayslips: async ({ schoolId, payrollRunId, status, search, year, month, limit } = {}) => {
    const parsedYear = year ? normalizeYear(year) : null;
    const parsedMonth = month ? normalizeMonth(month) : null;

    let runIds = [];

    if (payrollRunId) {
      runIds = [payrollRunId];
    } else {
      const { ids, error: runIdsError } = await getSchoolPayrollRunIds({ schoolId, year: parsedYear, month: parsedMonth });

      if (runIdsError) {
        return { data: [], error: runIdsError, count: 0 };
      }

      if (ids.length === 0) {
        return EMPTY_LIST;
      }

      runIds = ids;
    }

    let query = supabase
      .from('payslips')
      .select(
        'id, payroll_run_id, staff_id, basic_salary, housing_allowance, transport_allowance, other_allowances, gross_salary, ssnit_employee, ssnit_employer, income_tax, other_deductions, net_salary, payment_status, payment_date, pdf_url, payroll_runs(id, school_id, month, year, status, processed_at), staff(id, staff_id_number, first_name, last_name, department, role)',
        { count: 'exact' }
      )
      .in('payroll_run_id', runIds)
      .order('id', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('payment_status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withPayslipSearch(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  updatePayslipAdjustments: async ({ id, otherAllowances, otherDeductions } = {}) => {
    if (!id) {
      return { data: null, error: new Error('Payslip id is required') };
    }

    const nextAllowances = Number(otherAllowances ?? 0);
    const nextDeductions = Number(otherDeductions ?? 0);

    if (nextAllowances < 0 || nextDeductions < 0) {
      return { data: null, error: new Error('Adjustments cannot be negative') };
    }

    const { data: payslip, error: payslipError } = await supabase
      .from('payslips')
      .select('id, payroll_run_id, basic_salary, housing_allowance, transport_allowance, other_allowances, other_deductions')
      .eq('id', id)
      .single();

    if (payslipError) {
      return { data: null, error: payslipError };
    }

    const recalculated = calculatePayslip({
      salary: Number(payslip.basic_salary ?? 0),
      housing_allowance: Number(payslip.housing_allowance ?? 0),
      transport_allowance: Number(payslip.transport_allowance ?? 0),
      other_allowances: nextAllowances,
    });

    const netSalary = recalculated.gross - recalculated.ssnitEmployee - recalculated.incomeTax - nextDeductions;

    const { data: updatedPayslip, error: updateError } = await supabase
      .from('payslips')
      .update({
        other_allowances: nextAllowances,
        ssnit_employee: recalculated.ssnitEmployee,
        ssnit_employer: recalculated.ssnitEmployer,
        income_tax: recalculated.incomeTax,
        other_deductions: nextDeductions,
        net_salary: netSalary,
      })
      .eq('id', id)
      .select(
        'id, payroll_run_id, staff_id, basic_salary, housing_allowance, transport_allowance, other_allowances, gross_salary, ssnit_employee, ssnit_employer, income_tax, other_deductions, net_salary, payment_status, payment_date, pdf_url, payroll_runs(id, school_id, month, year, status, processed_at), staff(id, staff_id_number, first_name, last_name, department, role)'
      )
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    const totalsResult = await recalculateRunTotals(payslip.payroll_run_id);
    if (totalsResult.error) {
      return { data: null, error: totalsResult.error };
    }

    return {
      data: {
        payslip: updatedPayslip,
        totals: totalsResult.totals,
      },
      error: null,
    };
  },

  setPayrollRunStatus: async ({ id, status, processedBy, markPayslipsPaid = false, paymentDate } = {}) => {
    if (!id || !status) {
      return { data: null, error: new Error('Payroll run id and status are required') };
    }

    const validStatuses = ['Draft', 'Approved', 'Processed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return { data: null, error: new Error('Invalid payroll status') };
    }

    const patch = {
      status,
      processed_by: processedBy ?? null,
      processed_at: new Date().toISOString(),
    };

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .update(patch)
      .eq('id', id)
      .select('id, school_id, month, year, status, processed_by, processed_at, total_gross, total_deductions, total_net')
      .single();

    if (runError) {
      return { data: null, error: runError };
    }

    if (status === 'Processed' && markPayslipsPaid) {
      const { error: payslipUpdateError } = await supabase
        .from('payslips')
        .update({
          payment_status: 'Paid',
          payment_date: paymentDate || toIsoDate(),
        })
        .eq('payroll_run_id', id);

      if (payslipUpdateError) {
        return { data: null, error: payslipUpdateError };
      }
    }

    return { data: run, error: null };
  },

  getPayrollAnalytics: async ({ schoolId, year = new Date().getFullYear() } = {}) => {
    if (!schoolId) {
      return {
        year: Number(year),
        totals: {
          gross: 0,
          deductions: 0,
          net: 0,
          runs: 0,
          processedRuns: 0,
        },
        monthlyHistory: MONTH_LABELS.map((month) => ({
          month,
          gross: 0,
          deductions: 0,
          net: 0,
        })),
        departmentTotals: [],
      };
    }

    const parsedYear = normalizeYear(year) || new Date().getFullYear();

    const { data: runRows, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, month, year, status, total_gross, total_deductions, total_net')
      .eq('school_id', schoolId)
      .eq('year', parsedYear)
      .order('month', { ascending: true });

    if (runError) throw runError;

    const runs = runRows ?? [];
    const runIds = runs.map((row) => row.id);

    const monthlyHistory = MONTH_LABELS.map((monthLabel) => ({
      month: monthLabel,
      gross: 0,
      deductions: 0,
      net: 0,
    }));

    runs.forEach((row) => {
      const monthIndex = Number(row.month ?? 0) - 1;
      if (monthIndex < 0 || monthIndex > 11 || !monthlyHistory[monthIndex]) return;

      monthlyHistory[monthIndex].gross += Number(row.total_gross ?? 0);
      monthlyHistory[monthIndex].deductions += Number(row.total_deductions ?? 0);
      monthlyHistory[monthIndex].net += Number(row.total_net ?? 0);
    });

    const totals = {
      gross: runs.reduce((sum, row) => sum + Number(row.total_gross ?? 0), 0),
      deductions: runs.reduce((sum, row) => sum + Number(row.total_deductions ?? 0), 0),
      net: runs.reduce((sum, row) => sum + Number(row.total_net ?? 0), 0),
      runs: runs.length,
      processedRuns: runs.filter((row) => row.status === 'Processed').length,
    };

    let departmentTotals = [];

    if (runIds.length > 0) {
      const { data: payslips, error: payslipError } = await supabase
        .from('payslips')
        .select('payroll_run_id, net_salary, gross_salary, staff(id, department)')
        .in('payroll_run_id', runIds);

      if (payslipError) throw payslipError;

      const departmentMap = {};
      (payslips ?? []).forEach((row) => {
        const department = row.staff?.department?.trim() || 'Unassigned';
        if (!departmentMap[department]) {
          departmentMap[department] = { department, gross: 0, net: 0, staffCount: 0 };
        }

        departmentMap[department].gross += Number(row.gross_salary ?? 0);
        departmentMap[department].net += Number(row.net_salary ?? 0);
        departmentMap[department].staffCount += 1;
      });

      departmentTotals = Object.values(departmentMap).sort((a, b) => b.net - a.net);
    }

    return {
      year: parsedYear,
      totals,
      monthlyHistory,
      departmentTotals,
    };
  },

  getRunSSNITSummary: async (payrollRunId) => {
    if (!payrollRunId) {
      return {
        totalEmployee: 0,
        totalEmployer: 0,
        total: 0,
      };
    }

    const { data, error } = await supabase
      .from('payslips')
      .select('ssnit_employee, ssnit_employer')
      .eq('payroll_run_id', payrollRunId);

    if (error) throw error;

    return calculateSSNITSummary(data ?? []);
  },
};
