import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { assessmentsApi } from '../services/api/assessments.js';

export const ASSESSMENT_TYPES_KEY = (filters) => ['assessment-types', filters];
export const ASSESSMENTS_KEY = (filters) => ['assessments', filters];
export const ASSESSMENT_SCORES_KEY = (assessmentId) => ['assessment-scores', assessmentId];
export const ASSESSMENT_ROSTER_KEY = (classId) => ['assessment-roster', classId];

export const useAssessmentTypes = (filters = {}) =>
  useQuery({
    queryKey: ASSESSMENT_TYPES_KEY(filters),
    queryFn: async () => {
      const { data, error, count } = await assessmentsApi.listAssessmentTypes(filters);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 60_000,
  });

export const useCreateAssessmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await assessmentsApi.createAssessmentType(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-types'] });
      toast.success('Assessment type created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create assessment type'),
  });
};

export const useUpdateAssessmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await assessmentsApi.updateAssessmentType(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-types'] });
      toast.success('Assessment type updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update assessment type'),
  });
};

export const useDeleteAssessmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await assessmentsApi.deleteAssessmentType(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-types'] });
      toast.success('Assessment type removed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to remove assessment type'),
  });
};

export const useAssessments = (filters = {}) =>
  useQuery({
    queryKey: ASSESSMENTS_KEY(filters),
    queryFn: async () => {
      const { data, error, count } = await assessmentsApi.listAssessments(filters);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 30_000,
  });

export const useCreateAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await assessmentsApi.createAssessment(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create assessment'),
  });
};

export const useDeleteAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await assessmentsApi.deleteAssessment(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete assessment'),
  });
};

export const useAssessmentScores = (assessmentId) =>
  useQuery({
    queryKey: ASSESSMENT_SCORES_KEY(assessmentId),
    queryFn: async () => {
      const { data, error } = await assessmentsApi.listAssessmentScores(assessmentId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!assessmentId,
    staleTime: 15_000,
  });

export const useSaveAssessmentScore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row) => assessmentsApi.saveAssessmentScore(row),
    onSuccess: (_, row) => {
      qc.invalidateQueries({ queryKey: ASSESSMENT_SCORES_KEY(row.assessment_id) });
    },
    onError: (err) => toast.error(err.message ?? 'Failed to save score'),
  });
};

export const useSaveAssessmentScoresBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assessmentId, rows }) => {
      const data = await assessmentsApi.saveAssessmentScoresBatch(rows);
      return { assessmentId, data };
    },
    onSuccess: ({ assessmentId }) => {
      qc.invalidateQueries({ queryKey: ASSESSMENT_SCORES_KEY(assessmentId) });
      toast.success('Assessment scores saved');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to save assessment scores'),
  });
};

export const useAssessmentRoster = (classId) =>
  useQuery({
    queryKey: ASSESSMENT_ROSTER_KEY(classId),
    queryFn: async () => {
      const { data, error } = await assessmentsApi.getClassRoster(classId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!classId,
    staleTime: 60_000,
  });
