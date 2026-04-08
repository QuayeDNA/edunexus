import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { timetableApi } from '../services/api/timetable.js';

export const TIMETABLE_SLOTS_KEY = (filters) => ['timetable-slots', filters];
export const TIMETABLE_ASSIGNMENTS_KEY = (filters) => ['timetable-assignments', filters];

export const useTimetableSlots = (filters = {}) =>
  useQuery({
    queryKey: TIMETABLE_SLOTS_KEY(filters),
    queryFn: async () => {
      const { data, error, count } = await timetableApi.listSlots(filters);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 30_000,
  });

export const useTimetableAssignments = (filters = {}) =>
  useQuery({
    queryKey: TIMETABLE_ASSIGNMENTS_KEY(filters),
    queryFn: async () => {
      const { data, error, count } = await timetableApi.listAssignments(filters);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!filters.schoolId,
    staleTime: 30_000,
  });

export const useCreateTimetableSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await timetableApi.createSlot(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable-slots'] });
      toast.success('Timetable slot created');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create timetable slot'),
  });
};

export const useUpdateTimetableSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await timetableApi.updateSlot(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable-slots'] });
      toast.success('Timetable slot updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update timetable slot'),
  });
};

export const useDeleteTimetableSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await timetableApi.deleteSlot(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable-slots'] });
      toast.success('Timetable slot removed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to remove timetable slot'),
  });
};
