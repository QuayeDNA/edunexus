import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolsApi } from '../services/api/schools.js';
import { academicYearsApi } from '../services/api/academicYears.js';
import { useSchoolStore } from '../store/schoolStore.js';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export const useSchoolData = (schoolId) => {
  const { setSchoolData } = useSchoolStore();

  const query = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsApi.getById(schoolId),
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) setSchoolData(query.data);
  }, [query.data, setSchoolData]);

  return query;
};

export const useCurrentTerm = (schoolId) => {
  const { setCurrentTerm, setCurrentAcademicYear } = useSchoolStore();

  const query = useQuery({
    queryKey: ['current-term', schoolId],
    queryFn: () => academicYearsApi.getCurrentTerm(schoolId),
    enabled: !!schoolId,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setCurrentTerm(query.data);
      if (query.data.academic_years) {
        setCurrentAcademicYear(query.data.academic_years);
      }
    }
  }, [query.data, setCurrentTerm, setCurrentAcademicYear]);

  return query;
};

export const useAcademicYears = (schoolId) =>
  useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: () => academicYearsApi.list(schoolId),
    enabled: !!schoolId,
    staleTime: 10 * 60_000,
  });

export const useCreateAcademicYear = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await academicYearsApi.create(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academic-years', data?.school_id] });
      toast.success('Academic year created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create academic year'),
  });
};

export const useUpdateAcademicYear = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await academicYearsApi.update(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academic-years', data?.school_id] });
      toast.success('Academic year updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update academic year'),
  });
};

export const useDeleteAcademicYear = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await academicYearsApi.deleteYear(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['academic-years', schoolId] });
      qc.invalidateQueries({ queryKey: ['current-term', schoolId] });
      toast.success('Academic year deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete academic year'),
  });
};

export const useSetCurrentAcademicYear = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { data, error } = await academicYearsApi.setCurrent(id, schoolId);
      if (error) throw error;
      return { data, schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['academic-years', schoolId] });
      toast.success('Current academic year updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to set current academic year'),
  });
};

export const useCreateTerm = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await academicYearsApi.createTerm(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academic-years', data?.school_id] });
      qc.invalidateQueries({ queryKey: ['current-term', data?.school_id] });
      toast.success('Term created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create term'),
  });
};

export const useUpdateTerm = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await academicYearsApi.updateTerm(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['academic-years', data?.school_id] });
      qc.invalidateQueries({ queryKey: ['current-term', data?.school_id] });
      toast.success('Term updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update term'),
  });
};

export const useDeleteTerm = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await academicYearsApi.deleteTerm(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['academic-years', schoolId] });
      qc.invalidateQueries({ queryKey: ['current-term', schoolId] });
      toast.success('Term deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete term'),
  });
};

export const useSetCurrentTerm = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { data, error } = await academicYearsApi.setCurrentTerm(id, schoolId);
      if (error) throw error;
      return { data, schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['academic-years', schoolId] });
      qc.invalidateQueries({ queryKey: ['current-term', schoolId] });
      toast.success('Current term updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to set current term'),
  });
};
