import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient.js';
import db from '../db/schema.js';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const useDashboardStats = (schoolId) =>
  useQuery({
    queryKey: ['dashboard-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      // Parallel queries for performance
      const [studentsRes, staffRes, classesRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'Active'),
        supabase
          .from('staff')
          .select('id, employment_status', { count: 'exact' })
          .eq('school_id', schoolId)
          .eq('employment_status', 'Active'),
        supabase
          .from('classes')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
      ]);

      return {
        totalStudents: studentsRes.count ?? 0,
        totalStaff: staffRes.count ?? 0,
        totalClasses: classesRes.count ?? 0,
      };
    },
    enabled: !!schoolId,
    staleTime: 2 * 60_000,
  });

// ─── Fee Stats for current term ───────────────────────────────────────────────

export const useFeeStats = (schoolId, termId) =>
  useQuery({
    queryKey: ['fee-stats', schoolId, termId],
    queryFn: async () => {
      if (!schoolId || !termId) return null;

      const { data, error } = await supabase
        .from('student_fees')
        .select('amount_due, amount_paid, balance, status')
        .in('fee_schedule_id', (
          await supabase
            .from('fee_schedules')
            .select('id')
            .eq('school_id', schoolId)
            .eq('term_id', termId)
        ).data?.map(f => f.id) ?? []);

      if (error) throw error;
      if (!data || data.length === 0) return { totalExpected: 0, totalCollected: 0, totalOutstanding: 0, collectionRate: 0 };

      const totalExpected = data.reduce((s, f) => s + (f.amount_due ?? 0), 0);
      const totalCollected = data.reduce((s, f) => s + (f.amount_paid ?? 0), 0);
      const totalOutstanding = data.reduce((s, f) => s + (f.balance ?? 0), 0);
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      return { totalExpected, totalCollected, totalOutstanding, collectionRate };
    },
    enabled: !!schoolId && !!termId,
    staleTime: 5 * 60_000,
  });

// ─── Today's Attendance ───────────────────────────────────────────────────────

export const useTodayAttendance = (schoolId) =>
  useQuery({
    queryKey: ['attendance-today', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const today = new Date().toISOString().split('T')[0];

      const [studentsRes, attendanceRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'Active'),
        supabase
          .from('attendance')
          .select('status')
          .eq('date', today)
          .in('class_id', (
            await supabase.from('classes').select('id').eq('school_id', schoolId)
          ).data?.map(c => c.id) ?? []),
      ]);

      const totalStudents = studentsRes.count ?? 0;
      const records = attendanceRes.data ?? [];
      const present = records.filter(r => r.status === 'Present').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const late = records.filter(r => r.status === 'Late').length;
      const marked = records.length;
      const rate = totalStudents > 0 ? Math.round(((present + late) / totalStudents) * 100) : 0;

      return { totalStudents, present, absent, late, marked, rate };
    },
    enabled: !!schoolId,
    staleTime: 60_000, // refresh every minute
    refetchInterval: 60_000,
  });

// ─── Recent Payments ──────────────────────────────────────────────────────────

export const useRecentPayments = (schoolId, limit = 5) =>
  useQuery({
    queryKey: ['recent-payments', schoolId, limit],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*, students(first_name, last_name, current_class_id, classes(name))')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

// ─── Monthly Fee Collection (chart data) ─────────────────────────────────────

export const useMonthlyFeeData = (schoolId) =>
  useQuery({
    queryKey: ['monthly-fee-chart', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('school_id', schoolId)
        .gte('payment_date', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .order('payment_date', { ascending: true });
      if (error) throw error;

      // Group by month
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const grouped = {};
      (data ?? []).forEach(p => {
        const m = months[new Date(p.payment_date).getMonth()];
        grouped[m] = (grouped[m] ?? 0) + p.amount;
      });

      return months.map(m => ({ month: m, collected: grouped[m] ?? 0 }));
    },
    enabled: !!schoolId,
    staleTime: 10 * 60_000,
  });

// ─── Enrollment Trend (chart data) ───────────────────────────────────────────

export const useEnrollmentTrend = (schoolId) =>
  useQuery({
    queryKey: ['enrollment-trend', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      // Get student counts by admission year/term
      const { data, error } = await supabase
        .from('students')
        .select('admission_date')
        .eq('school_id', schoolId)
        .eq('status', 'Active')
        .not('admission_date', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
    staleTime: 15 * 60_000,
  });

// ─── Alerts / Notifications ───────────────────────────────────────────────────

export const useAdminAlerts = (schoolId, termId) =>
  useQuery({
    queryKey: ['admin-alerts', schoolId, termId],
    queryFn: async () => {
      if (!schoolId) return [];
      const alerts = [];

      // Check overdue fees
      const { count: overdueCount } = await supabase
        .from('student_fees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Unpaid')
        .lt('due_date', new Date().toISOString().split('T')[0]);

      if (overdueCount > 0) {
        alerts.push({
          type: 'fee',
          severity: 'warning',
          message: `${overdueCount} student${overdueCount !== 1 ? 's have' : ' has'} overdue fee payments`,
          link: '/admin/finance/fees',
        });
      }

      // Check low inventory
      const { count: lowStockCount } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .filter('quantity', 'lte', 'reorder_level');

      if (lowStockCount > 0) {
        alerts.push({
          type: 'inventory',
          severity: 'info',
          message: `${lowStockCount} inventory item${lowStockCount !== 1 ? 's are' : ' is'} below reorder level`,
          link: '/admin/inventory',
        });
      }

      return alerts;
    },
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });
