import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportCardsApi } from '../services/api/reportCards.js';

export const REPORT_CARDS_KEY = (filters) => ['report-cards', filters];

export const useReportCards = (filters = {}) =>
  useQuery({
    queryKey: REPORT_CARDS_KEY(filters),
    queryFn: async () => {
      const { data, error, count } = await reportCardsApi.list(filters);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 30_000,
  });

export const useGenerateReportCards = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, termId }) =>
      reportCardsApi.generateForClassTerm({ classId, termId }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['report-cards'] });
      const generated = result?.generatedCount ?? 0;
      const updated = result?.updatedCount ?? 0;
      toast.success(`Report cards generated (${generated} new, ${updated} updated)`);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to generate report cards'),
  });
};

export const useUpdateReportCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await reportCardsApi.update(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-cards'] });
      toast.success('Report card updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update report card'),
  });
};

export const useDeleteReportCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await reportCardsApi.delete(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-cards'] });
      toast.success('Report card deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete report card'),
  });
};
