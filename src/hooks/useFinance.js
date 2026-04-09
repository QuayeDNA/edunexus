import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { financeApi } from '../services/api/finance.js';

export const FEE_CATEGORIES_KEY = (schoolId) => ['fee-categories', schoolId];
export const FEE_SCHEDULES_KEY = ({ schoolId, termId } = {}) => [
  'fee-schedules',
  schoolId,
  termId ?? 'all',
];
export const STUDENT_FEES_KEY = ({ schoolId, termId, status, classId, gradeLevelId, search, onlyOutstanding } = {}) => [
  'student-fees',
  schoolId,
  termId ?? 'all',
  status ?? 'all',
  classId ?? 'all',
  gradeLevelId ?? 'all',
  search ?? '',
  onlyOutstanding === true ? 'outstanding' : 'all',
];
export const PAYMENTS_KEY = ({ schoolId, startDate, endDate, search, limit } = {}) => [
  'payments',
  schoolId,
  startDate ?? '',
  endDate ?? '',
  search ?? '',
  limit ?? 'all',
];
export const EXPENSES_KEY = ({ schoolId, startDate, endDate, category, search, limit } = {}) => [
  'expenses',
  schoolId,
  startDate ?? '',
  endDate ?? '',
  category ?? 'all',
  search ?? '',
  limit ?? 'all',
];
export const FINANCE_SUMMARY_KEY = (schoolId, termId) => ['finance-summary', schoolId, termId ?? 'all'];
export const MONTHLY_FEE_ANALYTICS_KEY = (schoolId, year, termId) => [
  'monthly-fee-analytics',
  schoolId,
  year,
  termId ?? 'all',
];
export const RECENT_PAYMENTS_KEY = (schoolId, limit = 5) => ['recent-payments', schoolId, limit];
export const EXPENSE_SUMMARY_KEY = (schoolId, year, month) => [
  'expense-summary',
  schoolId,
  year ?? 'current',
  month ?? 'all',
];

export const useFeeCategories = (schoolId) =>
  useQuery({
    queryKey: FEE_CATEGORIES_KEY(schoolId),
    queryFn: async () => {
      const { data, error, count } = await financeApi.listFeeCategories(schoolId);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export const useFeeSchedules = ({ schoolId, termId } = {}) =>
  useQuery({
    queryKey: FEE_SCHEDULES_KEY({ schoolId, termId }),
    queryFn: async () => {
      const { data, error, count } = await financeApi.listFeeSchedules({ schoolId, termId });
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export const useStudentFees = ({
  schoolId,
  termId,
  status,
  classId,
  gradeLevelId,
  search,
  onlyOutstanding,
} = {}) =>
  useQuery({
    queryKey: STUDENT_FEES_KEY({
      schoolId,
      termId,
      status,
      classId,
      gradeLevelId,
      search,
      onlyOutstanding,
    }),
    queryFn: async () => {
      const result = await financeApi.listStudentFees({
        schoolId,
        termId,
        status,
        classId,
        gradeLevelId,
        search,
        onlyOutstanding,
      });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const usePayments = ({ schoolId, startDate, endDate, search, limit } = {}) =>
  useQuery({
    queryKey: PAYMENTS_KEY({ schoolId, startDate, endDate, search, limit }),
    queryFn: async () => {
      const result = await financeApi.listPayments({ schoolId, startDate, endDate, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useExpenses = ({ schoolId, startDate, endDate, category, search, limit } = {}) =>
  useQuery({
    queryKey: EXPENSES_KEY({ schoolId, startDate, endDate, category, search, limit }),
    queryFn: async () => {
      const result = await financeApi.listExpenses({ schoolId, startDate, endDate, category, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useFinanceSummary = (schoolId, termId) =>
  useQuery({
    queryKey: FINANCE_SUMMARY_KEY(schoolId, termId),
    queryFn: () => financeApi.getFeeSummary({ schoolId, termId }),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useMonthlyFeeAnalytics = (schoolId, year = new Date().getFullYear(), termId) =>
  useQuery({
    queryKey: MONTHLY_FEE_ANALYTICS_KEY(schoolId, year, termId),
    queryFn: () => financeApi.getMonthlyFeeAnalytics({ schoolId, year, termId }),
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });

export const useRecentPayments = (schoolId, limit = 5) =>
  useQuery({
    queryKey: RECENT_PAYMENTS_KEY(schoolId, limit),
    queryFn: async () => {
      const result = await financeApi.getRecentPayments({ schoolId, limit });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useExpenseSummary = (schoolId, year = new Date().getFullYear(), month) =>
  useQuery({
    queryKey: EXPENSE_SUMMARY_KEY(schoolId, year, month),
    queryFn: () => financeApi.getExpenseSummary({ schoolId, year, month }),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useCreateFeeCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await financeApi.createFeeCategory(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: FEE_CATEGORIES_KEY(data?.school_id) });
      toast.success('Fee category created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create fee category'),
  });
};

export const useDeleteFeeCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await financeApi.deleteFeeCategory(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: FEE_CATEGORIES_KEY(schoolId) });
      qc.invalidateQueries({ queryKey: ['fee-schedules', schoolId] });
      toast.success('Fee category deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete fee category'),
  });
};

export const useCreateFeeSchedule = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await financeApi.createFeeSchedule(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['fee-schedules', schoolId] });
      qc.invalidateQueries({ queryKey: ['finance-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['monthly-fee-analytics', schoolId] });
      toast.success('Fee schedule created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create fee schedule'),
  });
};

export const useDeleteFeeSchedule = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await financeApi.deleteFeeSchedule(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['fee-schedules', schoolId] });
      qc.invalidateQueries({ queryKey: ['student-fees', schoolId] });
      qc.invalidateQueries({ queryKey: ['finance-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['monthly-fee-analytics', schoolId] });
      toast.success('Fee schedule deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete fee schedule'),
  });
};

export const useGenerateStudentFees = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, feeScheduleId }) => {
      const result = await financeApi.generateStudentFeesForSchedule({ schoolId, feeScheduleId });
      if (result.error) throw result.error;
      return {
        schoolId,
        meta: result.meta,
      };
    },
    onSuccess: ({ schoolId, meta }) => {
      qc.invalidateQueries({ queryKey: ['student-fees', schoolId] });
      qc.invalidateQueries({ queryKey: ['finance-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['monthly-fee-analytics', schoolId] });

      const created = meta?.createdCount ?? 0;
      const skipped = meta?.skippedCount ?? 0;

      if (created > 0) {
        toast.success(`Generated ${created} student fee record${created !== 1 ? 's' : ''}`);
      } else {
        toast(`No new records generated (${skipped} already assigned)`);
      }
    },
    onError: (err) => toast.error(err.message ?? 'Failed to generate student fees'),
  });
};

export const useCreateExpense = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await financeApi.createExpense(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['expenses', schoolId] });
      qc.invalidateQueries({ queryKey: ['expense-summary', schoolId] });
      toast.success('Expense recorded');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to record expense'),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await financeApi.deleteExpense(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', schoolId] });
      qc.invalidateQueries({ queryKey: ['expense-summary', schoolId] });
      toast.success('Expense deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete expense'),
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await financeApi.createPayment(payload);
      if (result.error) throw result.error;
      return {
        schoolId: payload.schoolId,
        data: result.data,
      };
    },
    onSuccess: ({ schoolId, data }) => {
      qc.invalidateQueries({ queryKey: ['payments', schoolId] });
      qc.invalidateQueries({ queryKey: ['recent-payments', schoolId] });
      qc.invalidateQueries({ queryKey: ['student-fees', schoolId] });
      qc.invalidateQueries({ queryKey: ['finance-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['monthly-fee-analytics', schoolId] });
      qc.invalidateQueries({ queryKey: ['expense-summary', schoolId] });

      const receipt = data?.payment?.receipt_number;
      toast.success(receipt ? `Payment recorded (${receipt})` : 'Payment recorded');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to record payment'),
  });
};
