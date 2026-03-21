import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesApi } from '../services/api/classes.js';
import db from '../db/schema.js';

export const CLASSES_KEY = (filters) => ['classes', filters];
export const CLASS_KEY = (id) => ['class', id];

export const useClasses = (schoolId, academicYearId) =>
  useQuery({
    queryKey: CLASSES_KEY({ schoolId, academicYearId }),
    queryFn: async () => {
      if (!navigator.onLine) {
        const data = await db.classes.toArray();
        return { data, count: data.length };
      }
      const { data, error, count } = await classesApi.list(schoolId, academicYearId);
      if (error) throw error;
      await db.classes.bulkPut(data.map(c => ({ ...c, syncStatus: 'synced' })));
      return { data, count };
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export const useClass = (id) =>
  useQuery({
    queryKey: CLASS_KEY(id),
    queryFn: async () => {
      const { data, error } = await classesApi.getById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class created successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create class'),
  });
};

export const useUpdateClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => classesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: CLASS_KEY(id) });
      toast.success('Class updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update class'),
  });
};

export const useDeleteClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: classesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete class'),
  });
};
