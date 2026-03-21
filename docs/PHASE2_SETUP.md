# EduNexus — Phase 2: Admin Shell Integration Guide

Phase 2 builds the complete admin shell: live dashboard with real Supabase data, reusable DataTable, stat cards, notifications panel, and all shared UI components.

---

## What Was Built in Phase 2

| File | Description |
|------|-------------|
| `src/hooks/useDashboard.js` | Dashboard data hooks (stats, fee stats, attendance, alerts) |
| `src/hooks/useClasses.js` | Class CRUD hooks with TanStack Query |
| `src/hooks/useStaff.js` | Staff CRUD hooks with offline fallback |
| `src/hooks/useNotifications.js` | Real-time notification hooks via Supabase Realtime |
| `src/components/ui/DataTable.jsx` | Reusable sortable/filterable/paginated table with Excel export |
| `src/components/ui/StatCard.jsx` | Metric cards with trend indicators and skeleton loading |
| `src/components/ui/StatusBadge.jsx` | Colored pill badges for any status string |
| `src/components/ui/ConfirmDialog.jsx` | Accessible confirmation modal for destructive actions |
| `src/components/ui/NotificationsPanel.jsx` | Slide-out panel with real-time updates |
| `src/pages/admin/AdminDashboard.jsx` | **Fully wired** dashboard with live Supabase data |
| `src/components/layouts/AdminLayout.jsx` | Updated with school data bootstrap + notifications |
| `src/components/ui/Header.jsx` | Updated with real unread notification count |

---

## Step 1 — Prerequisites

Make sure Phase 1 is complete and Supabase is set up (see `SUPABASE_SETUP.md`).

Verify your `.env.local` has valid values:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Step 2 — Install Any Missing Dependencies

Phase 2 uses `@tanstack/react-table` for DataTable. Verify it's installed:

```bash
npm install
```

All dependencies are already in `package.json`.

---

## Step 3 — Run the Additional SQL Functions

Open Supabase SQL Editor and run the helper functions from `SUPABASE_SETUP.md` Step 8. These power the dashboard stats:

```sql
-- Dashboard stats function
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_school_id uuid) ...

-- Fee stats function
CREATE OR REPLACE FUNCTION get_fee_stats(p_school_id uuid, p_term_id uuid) ...

-- Attendance rate function
CREATE OR REPLACE FUNCTION get_attendance_rate_today(p_school_id uuid) ...
```

---

## Step 4 — Enable Realtime for Notifications

In Supabase dashboard:

1. Go to **Database → Replication**
2. Enable the `notifications` table for replication
3. Also enable `attendance` and `payments` for live updates

---

## Step 5 — Start the Dev Server

```bash
npm run dev
```

Log in and you should see:
- ✅ Dashboard loads with real data (zeros if no data yet)
- ✅ Term badge shows in the header
- ✅ Notifications bell shows unread count
- ✅ Stat cards show skeleton while loading, then real values

---

## How to Use the Shared Components

### `<StatCard>` — metric display

```jsx
import StatCard from '../../components/ui/StatCard.jsx';
import { Users } from 'lucide-react';

<StatCard
  title="Total Students"
  value="847"
  delta="+23 this term"
  trend="up"               // 'up' | 'down' | 'neutral'
  icon={Users}
  iconColor="bg-brand-50 text-brand-600"
  loading={isLoading}      // shows skeleton while true
/>
```

### `<StatusBadge>` — colored status pill

```jsx
import StatusBadge from '../../components/ui/StatusBadge.jsx';

<StatusBadge status="Active" />       // green
<StatusBadge status="Suspended" />    // red
<StatusBadge status="Pending" />      // amber
<StatusBadge status="Paid" />         // green
<StatusBadge status="Overdue" />      // red
```

Supported statuses: Active, Inactive, Graduated, Transferred, Suspended, On Leave, Terminated, Retired, Paid, Partial, Unpaid, Overdue, Waived, Low, Normal, High, Urgent, Draft, Approved, Processed, Cancelled, Pending, Borrowed, Returned, Lost, Full-time, Part-time, Contract, Volunteer, Present, Absent, Late, Excused.

### `<ConfirmDialog>` — destructive action confirmation

```jsx
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

const [showConfirm, setShowConfirm] = useState(false);
const deleteStudent = useDeleteStudent();

<button onClick={() => setShowConfirm(true)}>Delete</button>

<ConfirmDialog
  open={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={() => deleteStudent.mutate(studentId)}
  title="Delete student?"
  description="This will permanently remove the student and all their records."
  confirmLabel="Delete Student"
  variant="danger"
  loading={deleteStudent.isPending}
/>
```

### `<DataTable>` — full-featured data table

```jsx
import DataTable from '../../components/ui/DataTable.jsx';
import { createColumnHelper } from '@tanstack/react-table';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Link } from 'react-router-dom';

const columnHelper = createColumnHelper();

const columns = [
  columnHelper.accessor('first_name', {
    header: 'Name',
    cell: ({ row }) => (
      <Link to={`/admin/students/${row.original.id}`} className="font-medium text-text-primary hover:text-brand-600">
        {row.original.first_name} {row.original.last_name}
      </Link>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  // ...more columns
];

<div className="bg-white rounded-xl border border-border shadow-card">
  <DataTable
    data={students}
    columns={columns}
    searchPlaceholder="Search students..."
    exportFilename="students-export"
    isLoading={isLoading}
    emptyTitle="No students found"
    emptyDescription="Add your first student to get started."
    emptyAction={<Link to="/admin/students/new" className="btn-primary text-sm">Add Student</Link>}
    actions={
      <Link to="/admin/students/new" className="btn-primary text-sm">
        + Add Student
      </Link>
    }
  />
</div>
```

---

## Hook Patterns

### Reading data with offline fallback

```js
// All data hooks follow this pattern:
const { data, isLoading, error } = useStudents({ schoolId, status: 'Active' });

// data is cached in Dexie — works offline automatically
// isLoading is true only on first fetch (skeleton state)
// isFetching is true on background refreshes (no skeleton)
```

### Mutations with automatic cache invalidation

```js
const createStudent = useCreateStudent();

// Calling mutate triggers:
// 1. Supabase insert
// 2. Automatic toast (success or error)
// 3. Cache invalidation → all student queries refetch
await createStudent.mutateAsync(studentData);
```

### Real-time subscriptions

The `useNotifications` hook subscribes to Supabase Realtime automatically.
The panel updates instantly when a new notification row is inserted.

---

## Dashboard Data Flow

```
AdminLayout mounts
  └─ useSchoolData(schoolId) → fetches school → stores in schoolStore
  └─ useCurrentTerm(schoolId) → fetches term → stores in schoolStore

AdminDashboard mounts
  └─ useDashboardStats(schoolId) → student/staff/class counts
  └─ useFeeStats(schoolId, termId) → expected/collected/outstanding
  └─ useTodayAttendance(schoolId) → live rate for today
  └─ useRecentPayments(schoolId) → last 5 transactions
  └─ useMonthlyFeeData(schoolId) → 12-month chart data
  └─ useAdminAlerts(schoolId, termId) → overdue fees, low stock
```

All queries run in parallel. The dashboard renders skeleton states immediately, then fills in real values as each query resolves.

---

## What's Next — Phase 3

Phase 3 builds:
- **Student List** — full DataTable with filters (class, grade, gender, status)
- **Student Profile** — 9-tab profile with photo upload, attendance heatmap, fee history
- **Add/Edit Student** — multi-step form with guardian, medical, class placement
- **Staff List** — same quality as Students
- **Staff Profile** — with payroll, attendance, CPD tabs

---

## File Structure After Phase 2

```
src/
├── components/
│   ├── layouts/
│   │   ├── AdminLayout.jsx        ← Updated (school bootstrap + notifications)
│   │   ├── AuthLayout.jsx
│   │   └── TeacherLayout.jsx
│   └── ui/
│       ├── ConfirmDialog.jsx      ← NEW
│       ├── DataTable.jsx          ← NEW
│       ├── Header.jsx             ← Updated (real notification count)
│       ├── NotificationsPanel.jsx ← NEW
│       ├── Sidebar.jsx
│       ├── StatCard.jsx           ← NEW
│       ├── StatusBadge.jsx        ← NEW
│       ├── TeacherSidebar.jsx
│       └── WelcomeModal.jsx
├── hooks/
│   ├── useClasses.js             ← NEW
│   ├── useDashboard.js           ← NEW
│   ├── useNotifications.js       ← NEW
│   ├── useSchool.js
│   ├── useStaff.js               ← NEW
│   └── useStudents.js
└── pages/
    └── admin/
        └── AdminDashboard.jsx    ← Rebuilt with live data
```

---

*EduNexus · Phase 2 Complete · Admin Shell*
