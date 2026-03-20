import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studentsApi } from '../services/api/students.js';
import db from '../db/schema.js';

export const STUDENTS_KEY = (filters) => ['students', filters];
export const STUDENT_KEY = (id) => ['student', id];

export const useStudents = (filters = {}) =>
  useQuery({
    queryKey: STUDENTS_KEY(filters),
    queryFn: async () => {
      if (!navigator.onLine) {
        const data = await db.students.toArray();
        return { data, count: data.length };
      }
      const { data, error, count } = await studentsApi.list(filters);
      if (error) throw error;
      await db.students.bulkPut(data.map(s => ({ ...s, syncStatus: 'synced' })));
      return { data, count };
    },
    staleTime: 60_000,
    enabled: !!filters.schoolId,
  });

export const useStudent = (id) =>
  useQuery({
    queryKey: STUDENT_KEY(id),
    queryFn: async () => {
      const { data, error } = await studentsApi.getById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student added successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to add student'),
  });
};

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => studentsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: STUDENT_KEY(id) });
      toast.success('Student updated successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update student'),
  });
};

export const useDeleteStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student removed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to remove student'),
  });
};
