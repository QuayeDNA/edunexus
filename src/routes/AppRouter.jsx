import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute.jsx';
import OnboardingGuard from './OnboardingGuard.jsx';
import { ROLES } from '../utils/constants.js';

// ─── Layouts ──────────────────────────────────────────────────────────────────
import AdminLayout from '../components/layouts/AdminLayout.jsx';
import AuthLayout from '../components/layouts/AuthLayout.jsx';
import TeacherLayout from '../components/layouts/TeacherLayout.jsx';

// ─── Auth Pages (eager-loaded) ────────────────────────────────────────────────
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import OnboardingPage from '../pages/auth/OnboardingPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';

// ─── Admin Pages (lazy-loaded) ────────────────────────────────────────────────
const AdminDashboard      = lazy(() => import('../pages/admin/AdminDashboard.jsx'));
const StudentsPage        = lazy(() => import('../pages/admin/students/StudentsPage.jsx'));
const StudentNewPage      = lazy(() => import('../pages/admin/students/StudentNewPage.jsx'));
const StudentDetailPage   = lazy(() => import('../pages/admin/students/StudentDetailPage.jsx'));
const StaffPage           = lazy(() => import('../pages/admin/staff/StaffPage.jsx'));
const StaffNewPage        = lazy(() => import('../pages/admin/staff/StaffNewPage.jsx'));
const StaffDetailPage     = lazy(() => import('../pages/admin/staff/StaffDetailPage.jsx'));
const ClassesPage         = lazy(() => import('../pages/admin/academics/ClassesPage.jsx'));
const ClassNewPage        = lazy(() => import('../pages/admin/academics/ClassNewPage.jsx'));
const ClassDetailPage     = lazy(() => import('../pages/admin/academics/ClassDetailPage.jsx'));
const SubjectsPage        = lazy(() => import('../pages/admin/academics/SubjectsPage.jsx'));
const TimetablePage       = lazy(() => import('../pages/admin/academics/TimetablePage.jsx'));
const AssessmentsPage     = lazy(() => import('../pages/admin/academics/AssessmentsPage.jsx'));
const ReportCardsPage     = lazy(() => import('../pages/admin/academics/ReportCardsPage.jsx'));
const CalendarPage        = lazy(() => import('../pages/admin/academics/CalendarPage.jsx'));
const AttendancePage      = lazy(() => import('../pages/admin/attendance/AttendancePage.jsx'));
const FeesPage            = lazy(() => import('../pages/admin/finance/FeesPage.jsx'));
const PaymentsPage        = lazy(() => import('../pages/admin/finance/PaymentsPage.jsx'));
const ExpensesPage        = lazy(() => import('../pages/admin/finance/ExpensesPage.jsx'));
const FinanceReportsPage  = lazy(() => import('../pages/admin/finance/FinanceReportsPage.jsx'));
const PayrollPage         = lazy(() => import('../pages/admin/payroll/PayrollPage.jsx'));
const LibraryPage         = lazy(() => import('../pages/admin/library/LibraryPage.jsx'));
const MessagingPage       = lazy(() => import('../pages/admin/messaging/MessagingPage.jsx'));
const TransportPage       = lazy(() => import('../pages/admin/transport/TransportPage.jsx'));
const InventoryPage       = lazy(() => import('../pages/admin/inventory/InventoryPage.jsx'));
const ReportsPage         = lazy(() => import('../pages/admin/reports/ReportsPage.jsx'));
const SettingsPage        = lazy(() => import('../pages/admin/settings/SettingsPage.jsx'));

// ─── Teacher Pages ────────────────────────────────────────────────────────────
const TeacherDashboard      = lazy(() => import('../pages/teacher/TeacherDashboard.jsx'));
const TeacherAttendancePage = lazy(() => import('../pages/teacher/TeacherAttendancePage.jsx'));
const TeacherGradesPage     = lazy(() => import('../pages/teacher/TeacherGradesPage.jsx'));

// ─── Student / Parent Pages ───────────────────────────────────────────────────
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard.jsx'));
const ParentDashboard  = lazy(() => import('../pages/parent/ParentDashboard.jsx'));

// ─── Fallback spinner ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-text-muted">Loading...</p>
    </div>
  </div>
);

const S = (Page) => (
  <Suspense fallback={<PageLoader />}>
    <Page />
  </Suspense>
);

export default function AppRouter() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Onboarding — only accessible when authenticated AND school not configured yet */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <OnboardingPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />

      {/* ── Admin ──────────────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"              element={S(AdminDashboard)} />

        {/* Students */}
        <Route path="students"               element={S(StudentsPage)} />
        <Route path="students/new"           element={S(StudentNewPage)} />
        <Route path="students/:id"           element={S(StudentDetailPage)} />

        {/* Staff */}
        <Route path="staff"                  element={S(StaffPage)} />
        <Route path="staff/new"              element={S(StaffNewPage)} />
        <Route path="staff/:id"              element={S(StaffDetailPage)} />

        {/* Academics */}
        <Route path="classes"                element={S(ClassesPage)} />
        <Route path="classes/new"            element={S(ClassNewPage)} />
        <Route path="classes/:id"            element={S(ClassDetailPage)} />
        <Route path="academics/subjects"     element={S(SubjectsPage)} />
        <Route path="academics/timetable"    element={S(TimetablePage)} />
        <Route path="academics/assessments"  element={S(AssessmentsPage)} />
        <Route path="academics/reports"      element={S(ReportCardsPage)} />
        <Route path="academics/calendar"     element={S(CalendarPage)} />

        {/* Attendance */}
        <Route path="attendance"             element={S(AttendancePage)} />

        {/* Finance */}
        <Route path="finance/fees"           element={S(FeesPage)} />
        <Route path="finance/payments"       element={S(PaymentsPage)} />
        <Route path="finance/expenses"       element={S(ExpensesPage)} />
        <Route path="finance/reports"        element={S(FinanceReportsPage)} />

        {/* Payroll */}
        <Route path="payroll"                element={S(PayrollPage)} />

        {/* Services */}
        <Route path="library"                element={S(LibraryPage)} />
        <Route path="messaging"              element={S(MessagingPage)} />
        <Route path="transport"              element={S(TransportPage)} />
        <Route path="inventory"              element={S(InventoryPage)} />
        <Route path="reports"                element={S(ReportsPage)} />
        <Route path="settings"               element={S(SettingsPage)} />
      </Route>

      {/* ── Teacher ────────────────────────────────────────────────────────── */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="dashboard"                element={S(TeacherDashboard)} />
        <Route path="attendance"               element={S(TeacherAttendancePage)} />
        <Route path="attendance/:classId"      element={S(TeacherAttendancePage)} />
        <Route path="grades/:classId"          element={S(TeacherGradesPage)} />
      </Route>

      {/* ── Student ────────────────────────────────────────────────────────── */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── Parent ─────────────────────────────────────────────────────────── */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}