# EduNexus — Phase 2 Integration Guide

This document explains exactly how to integrate Phase 2 into the Phase 1 scaffold,
what was built, and what to do next.

---

## What Phase 2 Adds

### New Services (API layer)
| File | What it does |
|------|-------------|
| `src/services/api/classes.js`   | Classes CRUD, roster fetch, per-class stats |
| `src/services/api/staff.js`     | Staff CRUD with filters, stats aggregation |
| `src/services/api/dashboard.js` | Aggregated admin dashboard stats (parallel queries) |

### New Hooks (TanStack Query)
| File | Exports |
|------|---------|
| `src/hooks/useClasses.js` | `useClasses`, `useClass`, `useCreateClass`, `useUpdateClass`, `useDeleteClass` |
| `src/hooks/useStaff.js`   | `useStaff`, `useStaffMember`, `useCreateStaff`, `useUpdateStaff`, `useDeleteStaff` |

### New Shared UI Components
| Component | Purpose |
|-----------|---------|
| `DataTable.jsx`     | Universal sortable/filterable/paginated table with Excel export |
| `StatCard.jsx`      | Dashboard metric card with icon, delta, trend arrow |
| `StatusBadge.jsx`   | Coloured pill for 20+ status values |
| `Avatar.jsx`        | User photo or initials-based avatar with 6 colour variants |
| `ConfirmDialog.jsx` | Accessible confirmation modal for destructive actions |
| `PageHeader.jsx`    | Consistent page title + subtitle + action area |
| `EmptyState.jsx`    | Empty state with icon, heading, message, CTA |

### Updated Pages
| Page | What's new |
|------|-----------|
| `AdminDashboard.jsx`     | Live student/staff counts from Supabase, charts, quick actions |
| `StudentsPage.jsx`       | Full DataTable with status filter, stat cards, export |
| `StudentDetailPage.jsx`  | Tabbed profile, guardian list, delete confirmation |
| `StudentNewPage.jsx`     | 5-step multi-step form with animation |
| `StaffPage.jsx`          | Full DataTable with role/status filters, stat cards |
| `StaffNewPage.jsx`       | Single-page add form with validation |
| `StaffDetailPage.jsx`    | Tabbed profile with payroll breakdown (SSNIT + PAYE) |
| `ClassesPage.jsx`        | DataTable with level-group colour coding |

---

## How to Integrate (Step by Step)

### Step 1 — Install dependencies (if not done)
```bash
npm install
```

### Step 2 — Run your Supabase schema
See `SUPABASE_SETUP.md` for the complete guide. The minimum you need:
```bash
# 1. Run src/db/schema.sql in Supabase SQL Editor
# 2. Copy .env.example → .env.local and fill credentials
# 3. npm run seed  (creates demo school + students)
```

### Step 3 — Start the dev server
```bash
npm run dev
# Open http://localhost:5173
# Login: admin@edunexus.demo / Demo1234!
```

### Step 4 — Verify the data flow
1. Dashboard shows live student/staff counts from Supabase
2. Students page loads real student records
3. Click a student to see the tabbed profile
4. "Add Student" opens the 5-step multi-step form
5. Staff page and individual staff profiles work the same way

---

## Using the DataTable Component

Every admin list page should use `DataTable`. Here's the full API:

```jsx
import DataTable from '../../../components/ui/DataTable.jsx';
import { createColumnHelper } from '@tanstack/react-table';

const col = createColumnHelper();

const COLUMNS = [
  // Accessor column — data from a field
  col.accessor('first_name', {
    header: 'First Name',
    cell: info => <span>{info.getValue()}</span>,
  }),

  // Display column — custom rendering, no data accessor
  col.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <button onClick={() => navigate(`/admin/students/${row.original.id}`)}>
        View
      </button>
    ),
  }),

  // Computed accessor — derive value from row
  col.accessor(row => row.classes?.name ?? '—', {
    id: 'class',
    header: 'Class',
  }),
];

// In your component:
<DataTable
  columns={COLUMNS}
  data={students}
  isLoading={isLoading}
  exportFileName="students-export"
  pageSize={50}                          // optional, default 50
  searchable                             // shows search bar (default true)
  exportable                             // shows Excel export button (default true)
  emptyIcon={UserX}                      // lucide icon for empty state
  emptyTitle="No students found"
  emptyMessage="Enroll your first student to get started."
  emptyAction={{
    label: 'Add Student',
    onClick: () => navigate('/admin/students/new'),
  }}
  toolbar={                              // custom content right of search
    <select value={filter} onChange={...}>...</select>
  }
/>
```

---

## Using StatusBadge

```jsx
import StatusBadge from '../../../components/ui/StatusBadge.jsx';

// Supported statuses (auto-coloured):
// Active, Inactive, Graduated, Transferred, Suspended, On Leave,
// Paid, Partial, Unpaid, Overdue, Waived,
// Draft, Approved, Processed, Cancelled,
// Borrowed, Returned, Lost,
// Male, Female, Core, Elective, Pending

<StatusBadge status="Active" />           // default size
<StatusBadge status="Overdue" size="sm" /> // small
<StatusBadge status="Active" dot />        // with coloured dot prefix
```

---

## Using Avatar

```jsx
import Avatar from '../../../components/ui/Avatar.jsx';

<Avatar firstName="Kofi" lastName="Mensah" size="md" />        // initials
<Avatar firstName="Ama" lastName="Asante" src={photoUrl} />    // photo

// Sizes: xs (24px), sm (32px), md (40px), lg (48px), xl (64px), 2xl (80px)
```

---

## Using ConfirmDialog

Always wrap destructive actions (delete, terminate, lock) in ConfirmDialog:

```jsx
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';

const [showDelete, setShowDelete] = useState(false);
const deleteStudent = useDeleteStudent();

// In JSX:
<button onClick={() => setShowDelete(true)}>Delete</button>

<ConfirmDialog
  open={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={async () => {
    await deleteStudent.mutateAsync(student.id);
    setShowDelete(false);
  }}
  title="Delete student?"
  message="This removes the student and all related records. Cannot be undone."
  confirmLabel="Delete Student"
  loading={deleteStudent.isPending}
/>
```

---

## Adding a New Admin List Page (Template)

Copy this pattern for any new module:

```jsx
// src/pages/admin/[module]/[Module]Page.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SomeIcon, Plus } from 'lucide-react';
import { createColumnHelper } from '@tanstack/react-table';
import { useMyHook } from '../../../hooks/useMyHook.js';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';

const col = createColumnHelper();
const COLUMNS = [ /* your columns */ ];

export default function MyModulePage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const { data, isLoading } = useMyHook({ schoolId });
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Name"
        subtitle={`${items.length} records`}
        actions={<button onClick={() => navigate('/admin/module/new')} className="btn-primary"><Plus className="w-4 h-4" />Add New</button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={items.length} icon={SomeIcon} color="bg-brand-50 text-brand-600" loading={isLoading} />
        {/* more stat cards */}
      </div>
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={items}
          isLoading={isLoading}
          exportFileName="module-export"
          emptyIcon={SomeIcon}
          emptyTitle="No records found"
          emptyMessage="Create your first record."
          emptyAction={{ label: 'Add New', onClick: () => navigate('/admin/module/new') }}
        />
      </div>
    </div>
  );
}
```

---

## Phase 2 Checklist

- [x] `src/services/api/classes.js`
- [x] `src/services/api/staff.js`
- [x] `src/services/api/dashboard.js`
- [x] `src/hooks/useClasses.js`
- [x] `src/hooks/useStaff.js`
- [x] `src/components/ui/DataTable.jsx`
- [x] `src/components/ui/StatCard.jsx`
- [x] `src/components/ui/StatusBadge.jsx`
- [x] `src/components/ui/Avatar.jsx`
- [x] `src/components/ui/ConfirmDialog.jsx`
- [x] `src/components/ui/PageHeader.jsx`
- [x] `src/components/ui/EmptyState.jsx`
- [x] `src/pages/admin/AdminDashboard.jsx` (live data)
- [x] `src/pages/admin/students/StudentsPage.jsx`
- [x] `src/pages/admin/students/StudentDetailPage.jsx`
- [x] `src/pages/admin/students/StudentNewPage.jsx`
- [x] `src/pages/admin/staff/StaffPage.jsx`
- [x] `src/pages/admin/staff/StaffDetailPage.jsx`
- [x] `src/pages/admin/staff/StaffNewPage.jsx`
- [x] `src/pages/admin/academics/ClassesPage.jsx`
- [x] `src/App.jsx` updated with school data auto-loading

---

## Phase 3 Outcome and Next Step

Phase 3 (Academics) is now complete:
- [x] Subjects management (CRUD with grade level mapping)
- [x] Timetable builder (manual slot management with conflict detection)
- [x] Assessment entry and score save flows
- [x] Report card generator (Ghana Basic format + PDF output)
- [x] Academic calendar management

Next up:
- [ ] Attendance heatmap and trend analytics
- [ ] Parent attendance notification automation
- [ ] Attendance anomaly/risk insights

---

*EduNexus · Phase 2 Complete · v1.0.0*
