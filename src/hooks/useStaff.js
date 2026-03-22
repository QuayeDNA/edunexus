import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { staffApi } from '../services/api/staff.js';
import db from '../db/schema.js';

export const STAFF_KEY = (filters) => ['staff', filters];
export const STAFF_MEMBER_KEY = (id) => ['staff-member', id];

export const useStaff = (filters = {}) =>
  useQuery({
    queryKey: STAFF_KEY(filters),
    queryFn: async () => {
      if (!navigator.onLine) {
        const data = await db.staff.toArray();
        return { data, count: data.length };
      }
      const { data, error, count } = await staffApi.list(filters);
      if (error) throw error;
      await db.staff.bulkPut(data.map(s => ({ ...s, syncStatus: 'synced' })));
      return { data, count };
    },
    enabled: !!filters.schoolId,
    staleTime: 60_000,
  });

export const useStaffMember = (id) =>
  useQuery({
    queryKey: STAFF_MEMBER_KEY(id),
    queryFn: async () => {
      const { data, error } = await staffApi.getById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await staffApi.create(data);
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to add staff member'),
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => staffApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: STAFF_MEMBER_KEY(id) });
      toast.success('Staff member updated');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update staff member'),
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: staffApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to remove staff member'),
  });
};