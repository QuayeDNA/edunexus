import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { payrollApi } from '../services/api/payroll.js';

export const PAYROLL_RUNS_KEY = ({ schoolId, year, status, search, limit } = {}) => [
  'payroll-runs',
  schoolId,
  year ?? 'all',
  status ?? 'all',
  search ?? '',
  limit ?? 'all',
];

export const PAYSLIPS_KEY = ({ schoolId, payrollRunId, status, search, year, month, limit } = {}) => [
  'payslips',
  schoolId,
  payrollRunId ?? 'all',
  status ?? 'all',
  search ?? '',
  year ?? 'all',
  month ?? 'all',
  limit ?? 'all',
];

export const PAYROLL_ANALYTICS_KEY = (schoolId, year) => ['payroll-analytics', schoolId, year ?? 'current'];

export const RUN_SSNIT_KEY = (payrollRunId) => ['payroll-run-ssnit-summary', payrollRunId ?? 'none'];

export const usePayrollRuns = ({ schoolId, year, status, search, limit } = {}) =>
  useQuery({
    queryKey: PAYROLL_RUNS_KEY({ schoolId, year, status, search, limit }),
    queryFn: async () => {
      const result = await payrollApi.listPayrollRuns({ schoolId, year, status, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const usePayslips = ({ schoolId, payrollRunId, status, search, year, month, limit } = {}) =>
  useQuery({
    queryKey: PAYSLIPS_KEY({ schoolId, payrollRunId, status, search, year, month, limit }),
    queryFn: async () => {
      const result = await payrollApi.listPayslips({ schoolId, payrollRunId, status, search, year, month, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const usePayrollAnalytics = (schoolId, year = new Date().getFullYear()) =>
  useQuery({
    queryKey: PAYROLL_ANALYTICS_KEY(schoolId, year),
    queryFn: () => payrollApi.getPayrollAnalytics({ schoolId, year }),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export const usePayrollRunSSNITSummary = (payrollRunId) =>
  useQuery({
    queryKey: RUN_SSNIT_KEY(payrollRunId),
    queryFn: () => payrollApi.getRunSSNITSummary(payrollRunId),
    enabled: !!payrollRunId,
    staleTime: 30_000,
  });

export const useCreatePayrollRun = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await payrollApi.createPayrollRun(payload);
      if (result.error) throw result.error;
      return {
        schoolId: payload.schoolId,
        data: result.data,
      };
    },
    onSuccess: ({ schoolId, data }) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs', schoolId] });
      qc.invalidateQueries({ queryKey: ['payslips', schoolId] });
      qc.invalidateQueries({ queryKey: ['payroll-analytics', schoolId] });

      const month = data?.payrollRun?.month;
      const year = data?.payrollRun?.year;
      toast.success(`Payroll run created for ${month}/${year}`);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create payroll run'),
  });
};

export const useUpdatePayslipAdjustments = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await payrollApi.updatePayslipAdjustments(payload);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      const schoolId = data?.payslip?.payroll_runs?.school_id;
      if (schoolId) {
        qc.invalidateQueries({ queryKey: ['payslips', schoolId] });
        qc.invalidateQueries({ queryKey: ['payroll-runs', schoolId] });
        qc.invalidateQueries({ queryKey: ['payroll-analytics', schoolId] });
      } else {
        qc.invalidateQueries({ queryKey: ['payslips'] });
        qc.invalidateQueries({ queryKey: ['payroll-runs'] });
        qc.invalidateQueries({ queryKey: ['payroll-analytics'] });
      }

      toast.success('Payslip adjustments updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update payslip adjustments'),
  });
};

export const useSetPayrollRunStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await payrollApi.setPayrollRunStatus(payload);
      if (result.error) throw result.error;
      return {
        schoolId: payload.schoolId,
        status: payload.status,
        data: result.data,
      };
    },
    onSuccess: ({ schoolId, status }) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs', schoolId] });
      qc.invalidateQueries({ queryKey: ['payslips', schoolId] });
      qc.invalidateQueries({ queryKey: ['payroll-analytics', schoolId] });
      toast.success(`Payroll run marked as ${status}`);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update payroll run status'),
  });
};
