import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute.jsx';
import { ROLES } from '../utils/constants.js';

// ─── Layouts ──────────────────────────────────────────────────────────────────
import AdminLayout from '../components/layouts/AdminLayout.jsx';
import AuthLayout from '../components/layouts/AuthLayout.jsx';
import TeacherLayout from '../components/layouts/TeacherLayout.jsx';

// ─── Auth Pages (eager-loaded — needed immediately) ───────────────────────────
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import OnboardingPage from '../pages/auth/OnboardingPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';

// ─── Admin Pages (lazy-loaded) ────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard.jsx'));
const StudentsPage = lazy(() => import('../pages/admin/students/StudentsPage.jsx'));
const StudentNewPage = lazy(() => import('../pages/admin/students/StudentNewPage.jsx'));
const StudentDetailPage = lazy(() => import('../pages/admin/students/StudentDetailPage.jsx'));
const StaffPage = lazy(() => import('../pages/admin/staff/StaffPage.jsx'));
const StaffNewPage = lazy(() => import('../pages/admin/staff/StaffNewPage.jsx'));
const StaffDetailPage = lazy(() => import('../pages/admin/staff/StaffDetailPage.jsx'));
const ClassesPage = lazy(() => import('../pages/admin/academics/ClassesPage.jsx'));
const SubjectsPage = lazy(() => import('../pages/admin/academics/SubjectsPage.jsx'));
const TimetablePage = lazy(() => import('../pages/admin/academics/TimetablePage.jsx'));
const AssessmentsPage = lazy(() => import('../pages/admin/academics/AssessmentsPage.jsx'));
const ReportCardsPage = lazy(() => import('../pages/admin/academics/ReportCardsPage.jsx'));
const CalendarPage = lazy(() => import('../pages/admin/academics/CalendarPage.jsx'));
const AttendancePage = lazy(() => import('../pages/admin/attendance/AttendancePage.jsx'));
const FeesPage = lazy(() => import('../pages/admin/finance/FeesPage.jsx'));
const PaymentsPage = lazy(() => import('../pages/admin/finance/PaymentsPage.jsx'));
const ExpensesPage = lazy(() => import('../pages/admin/finance/ExpensesPage.jsx'));
const FinanceReportsPage = lazy(() => import('../pages/admin/finance/FinanceReportsPage.jsx'));
const PayrollPage = lazy(() => import('../pages/admin/payroll/PayrollPage.jsx'));
const LibraryPage = lazy(() => import('../pages/admin/library/LibraryPage.jsx'));
const MessagingPage = lazy(() => import('../pages/admin/messaging/MessagingPage.jsx'));
const TransportPage = lazy(() => import('../pages/admin/transport/TransportPage.jsx'));
const InventoryPage = lazy(() => import('../pages/admin/inventory/InventoryPage.jsx'));
const ReportsPage = lazy(() => import('../pages/admin/reports/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('../pages/admin/settings/SettingsPage.jsx'));

// ─── Teacher Pages ────────────────────────────────────────────────────────────
const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard.jsx'));
const TeacherAttendancePage = lazy(() => import('../pages/teacher/TeacherAttendancePage.jsx'));
const TeacherGradesPage = lazy(() => import('../pages/teacher/TeacherGradesPage.jsx'));

// ─── Student Pages ────────────────────────────────────────────────────────────
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard.jsx'));

// ─── Parent Pages ─────────────────────────────────────────────────────────────
const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard.jsx'));

// ─── Page Loading Fallback ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-text-muted">Loading...</p>
    </div>
  </div>
);

export default function AppRouter() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Onboarding (auth required, no layout chrome) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* ─── Admin routes ────────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />

        {/* Students */}
        <Route path="students" element={<Suspense fallback={<PageLoader />}><StudentsPage /></Suspense>} />
        <Route path="students/new" element={<Suspense fallback={<PageLoader />}><StudentNewPage /></Suspense>} />
        <Route path="students/:id" element={<Suspense fallback={<PageLoader />}><StudentDetailPage /></Suspense>} />

        {/* Staff */}
        <Route path="staff" element={<Suspense fallback={<PageLoader />}><StaffPage /></Suspense>} />
        <Route path="staff/new" element={<Suspense fallback={<PageLoader />}><StaffNewPage /></Suspense>} />
        <Route path="staff/:id" element={<Suspense fallback={<PageLoader />}><StaffDetailPage /></Suspense>} />

        {/* Academics */}
        <Route path="classes" element={<Suspense fallback={<PageLoader />}><ClassesPage /></Suspense>} />
        <Route path="academics/subjects" element={<Suspense fallback={<PageLoader />}><SubjectsPage /></Suspense>} />
        <Route path="academics/timetable" element={<Suspense fallback={<PageLoader />}><TimetablePage /></Suspense>} />
        <Route path="academics/assessments" element={<Suspense fallback={<PageLoader />}><AssessmentsPage /></Suspense>} />
        <Route path="academics/reports" element={<Suspense fallback={<PageLoader />}><ReportCardsPage /></Suspense>} />
        <Route path="academics/calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />

        {/* Attendance */}
        <Route path="attendance" element={<Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>} />

        {/* Finance */}
        <Route path="finance/fees" element={<Suspense fallback={<PageLoader />}><FeesPage /></Suspense>} />
        <Route path="finance/payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
        <Route path="finance/expenses" element={<Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>} />
        <Route path="finance/reports" element={<Suspense fallback={<PageLoader />}><FinanceReportsPage /></Suspense>} />

        {/* Payroll */}
        <Route path="payroll" element={<Suspense fallback={<PageLoader />}><PayrollPage /></Suspense>} />

        {/* Supporting modules */}
        <Route path="library" element={<Suspense fallback={<PageLoader />}><LibraryPage /></Suspense>} />
        <Route path="messaging" element={<Suspense fallback={<PageLoader />}><MessagingPage /></Suspense>} />
        <Route path="transport" element={<Suspense fallback={<PageLoader />}><TransportPage /></Suspense>} />
        <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
      </Route>

      {/* ─── Teacher routes ───────────────────────────────────────────────────── */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>} />
        <Route path="attendance/:classId" element={<Suspense fallback={<PageLoader />}><TeacherAttendancePage /></Suspense>} />
        <Route path="grades/:classId" element={<Suspense fallback={<PageLoader />}><TeacherGradesPage /></Suspense>} />
      </Route>

      {/* ─── Student routes ───────────────────────────────────────────────────── */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ─── Parent routes ────────────────────────────────────────────────────── */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
