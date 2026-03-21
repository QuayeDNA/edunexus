import { supabase } from '../supabaseClient';
import { format } from 'date-fns';

export const dashboardApi = {
  /**
   * Fetch all admin dashboard stats in parallel
   */
  getAdminStats: async (schoolId, termId) => {
    console.log('📊 [Dashboard] Starting getAdminStats...');
    console.log('📊 [Dashboard] School ID:', schoolId);
    console.log('📊 [Dashboard] Term ID:', termId);

    if (!schoolId) {
      console.error('❌ [Dashboard] No school_id provided!');
      return {
        totalStudents: 0,
        activeStaff: 0,
        presentToday: 0,
        attendanceRate: 0,
        collectionRate: 0,
        totalDue: 0,
        totalPaid: 0,
        outstanding: 0,
        recentPayments: [],
        lowInventoryCount: 0,
      };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    console.log('📅 [Dashboard] Today:', today);

    try {
      // Test individual queries first
      console.log('🔍 [Dashboard] Fetching students count...');
      const studentsResult = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'Active');
      
      console.log('✅ [Dashboard] Students result:', studentsResult);
      if (studentsResult.error) {
        console.error('❌ [Dashboard] Students error:', studentsResult.error);
      }

      console.log('🔍 [Dashboard] Fetching staff count...');
      const staffResult = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('employment_status', 'Active');
      
      console.log('✅ [Dashboard] Staff result:', staffResult);
      if (staffResult.error) {
        console.error('❌ [Dashboard] Staff error:', staffResult.error);
      }

      console.log('🔍 [Dashboard] Fetching classes for attendance...');
      const classesResult = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId);
      
      console.log('✅ [Dashboard] Classes result:', classesResult);
      if (classesResult.error) {
        console.error('❌ [Dashboard] Classes error:', classesResult.error);
      }

      const classIds = classesResult.data?.map(c => c.id) || [];
      console.log('📋 [Dashboard] Class IDs:', classIds);

      let attendanceResult = { count: 0, error: null };
      if (classIds.length > 0) {
        console.log('🔍 [Dashboard] Fetching attendance for today...');
        attendanceResult = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .in('class_id', classIds)
          .eq('status', 'Present');
        
        console.log('✅ [Dashboard] Attendance result:', attendanceResult);
        if (attendanceResult.error) {
          console.error('❌ [Dashboard] Attendance error:', attendanceResult.error);
        }
      } else {
        console.warn('⚠️ [Dashboard] No classes found, skipping attendance query');
      }

      console.log('🔍 [Dashboard] Fetching student fees...');
      const feeResult = await supabase
        .from('student_fees')
        .select('amount_due, amount_paid')
        .in('student_id', 
          supabase.from('students').select('id').eq('school_id', schoolId)
        );
      
      console.log('✅ [Dashboard] Fee result:', feeResult);
      if (feeResult.error) {
        console.error('❌ [Dashboard] Fee error:', feeResult.error);
      }

      console.log('🔍 [Dashboard] Fetching recent payments...');
      const recentPaymentsResult = await supabase
        .from('payments')
        .select('*, students(first_name, last_name, current_class_id, classes(name))')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('✅ [Dashboard] Recent payments result:', recentPaymentsResult);
      if (recentPaymentsResult.error) {
        console.error('❌ [Dashboard] Recent payments error:', recentPaymentsResult.error);
      }

      console.log('🔍 [Dashboard] Fetching low inventory items...');
      const lowInventoryResult = await supabase
        .from('inventory_items')
        .select('id, name, quantity, reorder_level')
        .eq('school_id', schoolId)
        .lte('quantity', 5); // Simplified - just check if quantity <= 5
      
      console.log('✅ [Dashboard] Low inventory result:', lowInventoryResult);
      if (lowInventoryResult.error) {
        console.error('❌ [Dashboard] Low inventory error:', lowInventoryResult.error);
      }

      // Calculate totals
      const totalDue = feeResult.data?.reduce((s, r) => s + (r.amount_due ?? 0), 0) ?? 0;
      const totalPaid = feeResult.data?.reduce((s, r) => s + (r.amount_paid ?? 0), 0) ?? 0;
      const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

      const totalStudents = studentsResult.count ?? 0;
      const presentToday = attendanceResult.count ?? 0;
      const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

      const stats = {
        totalStudents,
        activeStaff: staffResult.count ?? 0,
        presentToday,
        attendanceRate,
        collectionRate,
        totalDue,
        totalPaid,
        outstanding: totalDue - totalPaid,
        recentPayments: recentPaymentsResult.data ?? [],
        lowInventoryCount: lowInventoryResult.data?.length ?? 0,
      };

      console.log('📊 [Dashboard] Final stats:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [Dashboard] Unexpected error:', error);
      throw error;
    }
  },

  /**
   * Monthly fee collection data for bar chart
   */
  getFeeCollectionChart: async (schoolId, academicYearId) => {
    console.log('📈 [Dashboard] Fetching fee collection chart...');
    console.log('📈 [Dashboard] School ID:', schoolId);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('school_id', schoolId)
      .order('payment_date');

    if (error) {
      console.error('❌ [Dashboard] Fee collection chart error:', error);
      return [];
    }

    console.log('✅ [Dashboard] Payments data:', data);

    // Group by month
    const months = {};
    for (const p of data ?? []) {
      const month = format(new Date(p.payment_date), 'MMM');
      months[month] = (months[month] ?? 0) + (p.amount ?? 0);
    }
    
    const chartData = Object.entries(months).map(([month, collected]) => ({ month, collected }));
    console.log('📊 [Dashboard] Chart data:', chartData);
    
    return chartData;
  },

  /**
   * Student enrollment trend by term
   */
  getEnrollmentTrend: async (schoolId) => {
    console.log('📈 [Dashboard] Fetching enrollment trend...');
    
    const { data, error } = await supabase
      .from('terms')
      .select('label, start_date')
      .eq('school_id', schoolId)
      .order('start_date')
      .limit(6);

    if (error) {
      console.error('❌ [Dashboard] Enrollment trend error:', error);
      return [];
    }

    console.log('✅ [Dashboard] Terms data:', data);
    return data ?? [];
  },
};