import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import db from '../db/schema.js';
import { subjectsApi } from '../services/api/subjects.js';

export const SUBJECTS_KEY = (filters) => ['subjects', filters];
export const SUBJECT_ASSIGNMENTS_KEY = (schoolId) => ['subject-assignments', schoolId];

export const useSubjects = (filters = {}) =>
  useQuery({
    queryKey: SUBJECTS_KEY(filters),
    queryFn: async () => {
      if (!filters.schoolId) return { data: [], count: 0 };

      if (!navigator.onLine) {
        const localRows = await db.subjects
          .where('school_id')
          .equals(filters.schoolId)
          .toArray();
        return { data: localRows, count: localRows.length };
      }

      const { data, error, count } = await subjectsApi.list(filters);
      if (error) throw error;

      await db.subjects.bulkPut((data ?? []).map((row) => ({
        ...row,
        syncStatus: 'synced',
      })));

      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 60_000,
  });

export const useCreateSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await subjectsApi.create(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create subject'),
  });
};

export const useUpdateSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await subjectsApi.update(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update subject'),
  });
};

export const useDeleteSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await subjectsApi.delete(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      qc.invalidateQueries({ queryKey: ['subject-assignments'] });
      toast.success('Subject deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete subject'),
  });
};

export const useSubjectAssignments = (schoolId) =>
  useQuery({
    queryKey: SUBJECT_ASSIGNMENTS_KEY(schoolId),
    queryFn: async () => {
      if (!schoolId) return { data: [], count: 0 };
      const { data, error, count } = await subjectsApi.listAssignments(schoolId);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useCreateSubjectAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await subjectsApi.createAssignment(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-assignments'] });
      toast.success('Subject assigned to class');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to assign subject'),
  });
};

export const useUpdateSubjectAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await subjectsApi.updateAssignment(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-assignments'] });
      toast.success('Assignment updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update assignment'),
  });
};

export const useDeleteSubjectAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await subjectsApi.deleteAssignment(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-assignments'] });
      toast.success('Assignment removed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to remove assignment'),
  });
};
