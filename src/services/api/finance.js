import { supabase } from '../supabaseClient.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY_LIST = { data: [], error: null, count: 0 };

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const buildMonthBuckets = () =>
  MONTH_LABELS.map((month, idx) => ({
    month,
    monthIndex: idx,
    expected: 0,
    collected: 0,
  }));

const getSchoolStudentIds = async ({ schoolId, classId } = {}) => {
  if (!schoolId) return { ids: [], error: null };

  let query = supabase
    .from('students')
    .select('id, current_class_id')
    .eq('school_id', schoolId);

  if (classId) {
    query = query.eq('current_class_id', classId);
  }

  const { data, error } = await query;
  if (error) return { ids: [], error };

  return {
    ids: (data ?? []).map((row) => row.id),
    error: null,
  };
};

const getSchoolScheduleIds = async ({ schoolId, termId, gradeLevelId } = {}) => {
  if (!schoolId) return { ids: [], error: null };

  let query = supabase
    .from('fee_schedules')
    .select('id')
    .eq('school_id', schoolId);

  if (termId) {
    query = query.eq('term_id', termId);
  }

  if (gradeLevelId) {
    query = query.eq('grade_level_id', gradeLevelId);
  }

  const { data, error } = await query;
  if (error) return { ids: [], error };

  return {
    ids: (data ?? []).map((row) => row.id),
    error: null,
  };
};

const withSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const first = row.students?.first_name ?? '';
    const last = row.students?.last_name ?? '';
    const studentName = `${first} ${last}`.trim().toLowerCase();
    const studentIdNumber = (row.students?.student_id_number ?? '').toLowerCase();
    const className = (row.students?.classes?.name ?? '').toLowerCase();
    const categoryName = (row.fee_schedules?.fee_categories?.name ?? '').toLowerCase();
    const termLabel = (row.fee_schedules?.terms?.label ?? '').toLowerCase();

    return (
      studentName.includes(query) ||
      studentIdNumber.includes(query) ||
      className.includes(query) ||
      categoryName.includes(query) ||
      termLabel.includes(query)
    );
  });
};

const withPaymentSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const first = row.students?.first_name ?? '';
    const last = row.students?.last_name ?? '';
    const studentName = `${first} ${last}`.trim().toLowerCase();
    const studentIdNumber = (row.students?.student_id_number ?? '').toLowerCase();
    const className = (row.students?.classes?.name ?? '').toLowerCase();
    const paymentMethod = (row.payment_method ?? '').toLowerCase();
    const receiptNumber = (row.receipt_number ?? '').toLowerCase();
    const referenceNumber = (row.reference_number ?? '').toLowerCase();

    return (
      studentName.includes(query) ||
      studentIdNumber.includes(query) ||
      className.includes(query) ||
      paymentMethod.includes(query) ||
      receiptNumber.includes(query) ||
      referenceNumber.includes(query)
    );
  });
};

const withExpenseSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const category = (row.category ?? '').toLowerCase();
    const description = (row.description ?? '').toLowerCase();
    const approverName = `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`
      .trim()
      .toLowerCase();

    return (
      category.includes(query) ||
      description.includes(query) ||
      approverName.includes(query)
    );
  });
};

export const financeApi = {
  listFeeCategories: (schoolId) => {
    if (!schoolId) return Promise.resolve(EMPTY_LIST);

    return supabase
      .from('fee_categories')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
  },

  createFeeCategory: (payload) =>
    supabase
      .from('fee_categories')
      .insert(payload)
      .select()
      .single(),

  updateFeeCategory: (id, payload) =>
    supabase
      .from('fee_categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single(),

  deleteFeeCategory: (id) =>
    supabase
      .from('fee_categories')
      .delete()
      .eq('id', id),

  listFeeSchedules: ({ schoolId, termId } = {}) => {
    if (!schoolId) return Promise.resolve(EMPTY_LIST);

    let query = supabase
      .from('fee_schedules')
      .select(
        'id, school_id, fee_category_id, grade_level_id, term_id, amount, due_date, is_mandatory, fee_categories(id, name), grade_levels(id, name, level_group, order_index), terms(id, label, term_number, start_date, end_date)',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .order('due_date', { ascending: true });

    if (termId) {
      query = query.eq('term_id', termId);
    }

    return query;
  },

  createFeeSchedule: (payload) =>
    supabase
      .from('fee_schedules')
      .insert(payload)
      .select(
        'id, school_id, fee_category_id, grade_level_id, term_id, amount, due_date, is_mandatory, fee_categories(id, name), grade_levels(id, name, level_group, order_index), terms(id, label, term_number, start_date, end_date)'
      )
      .single(),

  updateFeeSchedule: (id, payload) =>
    supabase
      .from('fee_schedules')
      .update(payload)
      .eq('id', id)
      .select(
        'id, school_id, fee_category_id, grade_level_id, term_id, amount, due_date, is_mandatory, fee_categories(id, name), grade_levels(id, name, level_group, order_index), terms(id, label, term_number, start_date, end_date)'
      )
      .single(),

  deleteFeeSchedule: (id) =>
    supabase
      .from('fee_schedules')
      .delete()
      .eq('id', id),

  listStudentFees: async ({
    schoolId,
    termId,
    status,
    classId,
    gradeLevelId,
    search,
    onlyOutstanding = false,
  } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    const { ids: studentIds, error: studentIdsError } = await getSchoolStudentIds({ schoolId, classId });
    if (studentIdsError) return { data: [], error: studentIdsError, count: 0 };
    if (studentIds.length === 0) return EMPTY_LIST;

    const { ids: scheduleIds, error: scheduleIdsError } = await getSchoolScheduleIds({
      schoolId,
      termId,
      gradeLevelId,
    });
    if (scheduleIdsError) return { data: [], error: scheduleIdsError, count: 0 };
    if (scheduleIds.length === 0) return EMPTY_LIST;

    let query = supabase
      .from('student_fees')
      .select(
        'id, student_id, fee_schedule_id, amount_due, amount_paid, balance, status, due_date, waiver_reason, students(id, first_name, last_name, student_id_number, current_class_id, classes(id, name)), fee_schedules(id, term_id, grade_level_id, amount, due_date, fee_category_id, fee_categories(id, name), terms(id, label, term_number), grade_levels(id, name, order_index))',
        { count: 'exact' }
      )
      .in('student_id', studentIds)
      .in('fee_schedule_id', scheduleIds)
      .order('due_date', { ascending: true });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (onlyOutstanding) {
      query = query.gt('balance', 0);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withSearchFilter(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  generateStudentFeesForSchedule: async ({ schoolId, feeScheduleId } = {}) => {
    if (!schoolId || !feeScheduleId) {
      return {
        data: [],
        error: new Error('School and fee schedule are required'),
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from('fee_schedules')
      .select('id, school_id, grade_level_id, amount, due_date')
      .eq('id', feeScheduleId)
      .single();

    if (scheduleError) {
      return {
        data: [],
        error: scheduleError,
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade_level_id', schedule.grade_level_id);

    if (classesError) {
      return {
        data: [],
        error: classesError,
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const classIds = (classes ?? []).map((row) => row.id);
    if (classIds.length === 0) {
      return {
        data: [],
        error: null,
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'Active')
      .in('current_class_id', classIds);

    if (studentsError) {
      return {
        data: [],
        error: studentsError,
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const studentIds = (students ?? []).map((row) => row.id);
    if (studentIds.length === 0) {
      return {
        data: [],
        error: null,
        meta: { createdCount: 0, skippedCount: 0, targetCount: 0 },
      };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('student_fees')
      .select('student_id')
      .eq('fee_schedule_id', feeScheduleId)
      .in('student_id', studentIds);

    if (existingError) {
      return {
        data: [],
        error: existingError,
        meta: { createdCount: 0, skippedCount: 0, targetCount: studentIds.length },
      };
    }

    const existingIds = new Set((existingRows ?? []).map((row) => row.student_id));
    const rowsToInsert = studentIds
      .filter((studentId) => !existingIds.has(studentId))
      .map((studentId) => ({
        student_id: studentId,
        fee_schedule_id: feeScheduleId,
        amount_due: schedule.amount,
        amount_paid: 0,
        status: 'Unpaid',
        due_date: schedule.due_date,
      }));

    if (rowsToInsert.length === 0) {
      return {
        data: [],
        error: null,
        meta: {
          createdCount: 0,
          skippedCount: studentIds.length,
          targetCount: studentIds.length,
        },
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('student_fees')
      .insert(rowsToInsert)
      .select('id, student_id, fee_schedule_id, amount_due, amount_paid, balance, status, due_date');

    if (insertError) {
      return {
        data: [],
        error: insertError,
        meta: {
          createdCount: 0,
          skippedCount: studentIds.length - rowsToInsert.length,
          targetCount: studentIds.length,
        },
      };
    }

    return {
      data: inserted ?? [],
      error: null,
      meta: {
        createdCount: rowsToInsert.length,
        skippedCount: studentIds.length - rowsToInsert.length,
        targetCount: studentIds.length,
      },
    };
  },

  listPayments: async ({ schoolId, startDate, endDate, search, limit } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('payments')
      .select(
        'id, school_id, student_id, student_fee_id, amount, payment_date, payment_method, mobile_money_number, reference_number, receipt_number, notes, created_at, students(id, first_name, last_name, student_id_number, current_class_id, classes(id, name))',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('payment_date', startDate);
    }

    if (endDate) {
      query = query.lte('payment_date', endDate);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withPaymentSearchFilter(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  listExpenses: async ({ schoolId, startDate, endDate, category, search, limit } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('expenses')
      .select(
        'id, school_id, category, description, amount, date, approved_by, receipt_url, created_at, profiles!expenses_approved_by_fkey(id, first_name, last_name)',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withExpenseSearchFilter(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createExpense: (payload) =>
    supabase
      .from('expenses')
      .insert(payload)
      .select(
        'id, school_id, category, description, amount, date, approved_by, receipt_url, created_at, profiles!expenses_approved_by_fkey(id, first_name, last_name)'
      )
      .single(),

  deleteExpense: (id) =>
    supabase
      .from('expenses')
      .delete()
      .eq('id', id),

  createPayment: async ({
    schoolId,
    studentFeeId,
    studentId,
    amount,
    paymentDate,
    paymentMethod,
    mobileMoneyNumber,
    receivedBy,
    notes,
    referenceNumber,
    receiptNumber,
  } = {}) => {
    const paymentAmount = Number(amount ?? 0);

    if (!schoolId || !studentFeeId || !studentId || paymentAmount <= 0) {
      return {
        data: null,
        error: new Error('Valid school, student fee, student, and amount are required'),
      };
    }

    const { data: feeRow, error: feeError } = await supabase
      .from('student_fees')
      .select('id, student_id, amount_due, amount_paid, status')
      .eq('id', studentFeeId)
      .single();

    if (feeError) {
      return { data: null, error: feeError };
    }

    if ((feeRow.amount_due ?? 0) <= (feeRow.amount_paid ?? 0)) {
      return { data: null, error: new Error('This fee item is already fully paid') };
    }

    const balanceBefore = Math.max((feeRow.amount_due ?? 0) - (feeRow.amount_paid ?? 0), 0);
    if (paymentAmount > balanceBefore) {
      return {
        data: null,
        error: new Error('Payment amount cannot be greater than the outstanding balance'),
      };
    }

    const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const safeReference = referenceNumber?.trim() || `PAY-${stamp}`;
    const safeReceipt = receiptNumber?.trim() || `RCPT-${stamp}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        school_id: schoolId,
        student_id: studentId,
        student_fee_id: studentFeeId,
        amount: paymentAmount,
        payment_date: paymentDate || toIsoDate(),
        payment_method: paymentMethod || 'Cash',
        mobile_money_number: mobileMoneyNumber?.trim() || null,
        reference_number: safeReference,
        receipt_number: safeReceipt,
        received_by: receivedBy || null,
        notes: notes?.trim() || null,
      })
      .select(
        'id, school_id, student_id, student_fee_id, amount, payment_date, payment_method, mobile_money_number, reference_number, receipt_number, notes, created_at, students(id, first_name, last_name, student_id_number, current_class_id, classes(id, name))'
      )
      .single();

    if (paymentError) {
      return { data: null, error: paymentError };
    }

    const nextPaid = Number(feeRow.amount_paid ?? 0) + paymentAmount;
    const amountDue = Number(feeRow.amount_due ?? 0);

    let nextStatus = 'Unpaid';
    if (nextPaid >= amountDue) {
      nextStatus = 'Paid';
    } else if (nextPaid > 0) {
      nextStatus = 'Partial';
    }

    const { data: updatedFee, error: updateError } = await supabase
      .from('student_fees')
      .update({
        amount_paid: nextPaid,
        status: nextStatus,
      })
      .eq('id', studentFeeId)
      .select('id, amount_due, amount_paid, balance, status')
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return {
      data: {
        payment,
        studentFee: updatedFee,
      },
      error: null,
    };
  },

  getFeeSummary: async ({ schoolId, termId } = {}) => {
    if (!schoolId) {
      return {
        totalDue: 0,
        totalPaid: 0,
        outstanding: 0,
        collectionRate: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        waivedCount: 0,
        overdueCount: 0,
        totalRecords: 0,
      };
    }

    const { ids: scheduleIds, error: scheduleError } = await getSchoolScheduleIds({ schoolId, termId });
    if (scheduleError) throw scheduleError;
    if (scheduleIds.length === 0) {
      return {
        totalDue: 0,
        totalPaid: 0,
        outstanding: 0,
        collectionRate: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        waivedCount: 0,
        overdueCount: 0,
        totalRecords: 0,
      };
    }

    const { data, error } = await supabase
      .from('student_fees')
      .select('id, amount_due, amount_paid, balance, status, due_date')
      .in('fee_schedule_id', scheduleIds);

    if (error) throw error;

    const today = toIsoDate();
    const rows = data ?? [];

    const totalDue = rows.reduce((sum, row) => sum + Number(row.amount_due ?? 0), 0);
    const totalPaid = rows.reduce((sum, row) => sum + Number(row.amount_paid ?? 0), 0);
    const outstanding = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);

    const paidCount = rows.filter((row) => row.status === 'Paid').length;
    const partialCount = rows.filter((row) => row.status === 'Partial').length;
    const unpaidCount = rows.filter((row) => row.status === 'Unpaid').length;
    const waivedCount = rows.filter((row) => row.status === 'Waived').length;
    const overdueCount = rows.filter((row) => {
      if (!(row.status === 'Unpaid' || row.status === 'Partial')) return false;
      if (!row.due_date) return false;
      return row.due_date < today;
    }).length;

    return {
      totalDue,
      totalPaid,
      outstanding,
      collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
      paidCount,
      partialCount,
      unpaidCount,
      waivedCount,
      overdueCount,
      totalRecords: rows.length,
    };
  },

  getMonthlyFeeAnalytics: async ({ schoolId, year = new Date().getFullYear(), termId } = {}) => {
    if (!schoolId) {
      return buildMonthBuckets().map(({ month, expected, collected }) => ({ month, expected, collected }));
    }

    const { ids: scheduleIds, error: scheduleError } = await getSchoolScheduleIds({ schoolId, termId });
    if (scheduleError) throw scheduleError;

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const buckets = buildMonthBuckets();

    if (scheduleIds.length > 0) {
      const { data: expectedRows, error: expectedError } = await supabase
        .from('student_fees')
        .select('id, amount_due, due_date')
        .in('fee_schedule_id', scheduleIds)
        .not('due_date', 'is', null)
        .gte('due_date', start)
        .lte('due_date', end);

      if (expectedError) throw expectedError;

      (expectedRows ?? []).forEach((row) => {
        const monthIndex = new Date(row.due_date).getMonth();
        if (!Number.isNaN(monthIndex) && buckets[monthIndex]) {
          buckets[monthIndex].expected += Number(row.amount_due ?? 0);
        }
      });

      let feeIdsForPayments = [];
      if (termId) {
        const { data: feeIdsRows, error: feeIdsError } = await supabase
          .from('student_fees')
          .select('id')
          .in('fee_schedule_id', scheduleIds);

        if (feeIdsError) throw feeIdsError;
        feeIdsForPayments = (feeIdsRows ?? []).map((row) => row.id);
      }

      let paymentsQuery = supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('school_id', schoolId)
        .gte('payment_date', start)
        .lte('payment_date', end);

      if (termId) {
        if (feeIdsForPayments.length === 0) {
          return buckets.map(({ month, expected, collected }) => ({ month, expected, collected }));
        }
        paymentsQuery = paymentsQuery.in('student_fee_id', feeIdsForPayments);
      }

      const { data: paymentRows, error: paymentError } = await paymentsQuery;
      if (paymentError) throw paymentError;

      (paymentRows ?? []).forEach((row) => {
        const monthIndex = new Date(row.payment_date).getMonth();
        if (!Number.isNaN(monthIndex) && buckets[monthIndex]) {
          buckets[monthIndex].collected += Number(row.amount ?? 0);
        }
      });
    }

    return buckets.map(({ month, expected, collected }) => ({ month, expected, collected }));
  },

  getExpenseSummary: async ({ schoolId, year = new Date().getFullYear(), month } = {}) => {
    const parsedYear = Number(year) || new Date().getFullYear();

    if (!schoolId) {
      return {
        year: parsedYear,
        month: month ? Number(month) : null,
        totalExpense: 0,
        totalIncome: 0,
        netBalance: 0,
        expenseCount: 0,
        averageExpense: 0,
        highestExpense: 0,
        byCategory: [],
        monthlyFlow: MONTH_LABELS.map((monthLabel) => ({
          month: monthLabel,
          income: 0,
          expense: 0,
          net: 0,
        })),
      };
    }

    const start = `${parsedYear}-01-01`;
    const end = `${parsedYear}-12-31`;

    const [{ data: expenseRows, error: expensesError }, { data: paymentRows, error: paymentsError }] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, amount, date, category')
        .eq('school_id', schoolId)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('payments')
        .select('id, amount, payment_date')
        .eq('school_id', schoolId)
        .gte('payment_date', start)
        .lte('payment_date', end),
    ]);

    if (expensesError) throw expensesError;
    if (paymentsError) throw paymentsError;

    const safeExpenseRows = expenseRows ?? [];
    const safePaymentRows = paymentRows ?? [];

    const numericMonth = Number(month);
    const monthPrefix = Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12
      ? `${parsedYear}-${String(numericMonth).padStart(2, '0')}`
      : null;

    const scopedExpenses = monthPrefix
      ? safeExpenseRows.filter((row) => (row.date ?? '').startsWith(monthPrefix))
      : safeExpenseRows;

    const scopedPayments = monthPrefix
      ? safePaymentRows.filter((row) => (row.payment_date ?? '').startsWith(monthPrefix))
      : safePaymentRows;

    const monthlyFlow = MONTH_LABELS.map((monthLabel) => ({
      month: monthLabel,
      income: 0,
      expense: 0,
      net: 0,
    }));

    safeExpenseRows.forEach((row) => {
      if (!row.date) return;
      const monthIndex = new Date(row.date).getMonth();
      if (Number.isNaN(monthIndex) || !monthlyFlow[monthIndex]) return;
      monthlyFlow[monthIndex].expense += Number(row.amount ?? 0);
    });

    safePaymentRows.forEach((row) => {
      if (!row.payment_date) return;
      const monthIndex = new Date(row.payment_date).getMonth();
      if (Number.isNaN(monthIndex) || !monthlyFlow[monthIndex]) return;
      monthlyFlow[monthIndex].income += Number(row.amount ?? 0);
    });

    monthlyFlow.forEach((row) => {
      row.net = row.income - row.expense;
    });

    const byCategoryMap = {};
    scopedExpenses.forEach((row) => {
      const key = (row.category ?? 'Other').trim() || 'Other';
      byCategoryMap[key] = (byCategoryMap[key] ?? 0) + Number(row.amount ?? 0);
    });

    const byCategory = Object.entries(byCategoryMap)
      .map(([categoryName, total]) => ({ category: categoryName, total }))
      .sort((a, b) => b.total - a.total);

    const totalExpense = scopedExpenses.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const totalIncome = scopedPayments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    const highestExpense = scopedExpenses.reduce(
      (max, row) => Math.max(max, Number(row.amount ?? 0)),
      0
    );

    return {
      year: parsedYear,
      month: monthPrefix ? numericMonth : null,
      totalExpense,
      totalIncome,
      netBalance: totalIncome - totalExpense,
      expenseCount: scopedExpenses.length,
      averageExpense: scopedExpenses.length > 0 ? totalExpense / scopedExpenses.length : 0,
      highestExpense,
      byCategory,
      monthlyFlow,
    };
  },

  getRecentPayments: async ({ schoolId, limit = 5 } = {}) => {
    const result = await financeApi.listPayments({ schoolId, limit });
    return {
      data: result.data ?? [],
      error: result.error ?? null,
      count: result.count ?? 0,
    };
  },
};
