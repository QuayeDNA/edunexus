import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { attendanceApi } from '../services/api/attendance.js';

export const ATTENDANCE_ROWS_KEY = (classId, date) => ['attendance-rows', classId, date];
export const ATTENDANCE_ROSTER_KEY = (classId) => ['attendance-roster', classId];
export const ATTENDANCE_REPORT_KEY = ({ classId, startDate, endDate, status } = {}) => [
  'attendance-report',
  classId ?? 'all',
  startDate ?? '',
  endDate ?? '',
  status ?? 'all',
];
export const TEACHER_CLASSES_KEY = (schoolId, teacherProfileId) => [
  'teacher-classes',
  schoolId,
  teacherProfileId,
];

export const useAttendanceRows = (classId, date) =>
  useQuery({
    queryKey: ATTENDANCE_ROWS_KEY(classId, date),
    queryFn: async () => {
      const { data, error, count } = await attendanceApi.listByClassDate({ classId, date });
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!classId && !!date,
    staleTime: 15_000,
  });

export const useAttendanceRoster = (classId) =>
  useQuery({
    queryKey: ATTENDANCE_ROSTER_KEY(classId),
    queryFn: async () => {
      const { data, error } = await attendanceApi.getRoster(classId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!classId,
    staleTime: 60_000,
  });

export const useAttendanceReport = ({ classId, startDate, endDate, status } = {}) =>
  useQuery({
    queryKey: ATTENDANCE_REPORT_KEY({ classId, startDate, endDate, status }),
    queryFn: async () => {
      const { data, error, count } = await attendanceApi.listByDateRange({
        classId,
        startDate,
        endDate,
        status,
      });
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!startDate && !!endDate,
    staleTime: 30_000,
  });

export const useTeacherClasses = (schoolId, teacherProfileId) =>
  useQuery({
    queryKey: TEACHER_CLASSES_KEY(schoolId, teacherProfileId),
    queryFn: async () => {
      const { data, error, count } = await attendanceApi.listTeacherClasses({
        schoolId,
        teacherProfileId,
      });
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !!schoolId && !!teacherProfileId,
    staleTime: 30_000,
  });

export const useSaveAttendanceBatch = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, date, markedBy, rows }) => {
      const { data, error } = await attendanceApi.saveBatch({ classId, date, markedBy, rows });
      if (error) throw error;
      return { data: data ?? [], classId, date };
    },
    onSuccess: ({ classId, date }) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_ROWS_KEY(classId, date) });
      qc.invalidateQueries({ queryKey: ATTENDANCE_ROSTER_KEY(classId) });
      qc.invalidateQueries({ queryKey: ['attendance-report'] });
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Attendance saved successfully');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to save attendance'),
  });
};
