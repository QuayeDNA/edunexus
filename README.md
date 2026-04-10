# EduNexus — One platform. Every learner. Every school.

A production-ready School Management System built for K-12 schools across Ghana and West Africa, configurable for British/American curricula.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack dashboard → Settings → API Keys |

### 3. Set up the database

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** in your Supabase dashboard
3. Run the complete schema from `src/db/schema.sql` (see below)

### 4. Seed development data (optional)

```bash
npm run seed
```

This creates:
- 1 school (Accra Academy Basic School)
- 3 academic years + terms
- All Ghana grade levels (Crèche → JHS 3)
- 5 classes, 30 students, 8 staff
- Demo login: `admin@edunexus.demo` / `Demo1234!`

### 4b. Bootstrap a platform super admin (optional)

```bash
npm run seed:super-admin
```

Custom credentials:

```bash
npm run seed:super-admin -- --email superadmin@yourdomain.com --password "StrongPass123!"
```

This command creates (or updates) an auth user and upserts a `profiles` row with `role='super_admin'` and `school_id=null`.

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Components | shadcn/ui, lucide-react |
| State (server) | TanStack Query v5 |
| State (client) | Zustand v5 |
| Tables | TanStack Table v8 |
| Charts | Recharts v2 |
| Animations | Framer Motion v11 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Offline | Dexie v4 (IndexedDB) |
| Forms | react-hook-form v7 + yup v1 |
| Routing | React Router v7 |

---

## Access Model (Option A)

The codebase follows a platform-level access model:

- `super_admin` is a cross-school platform role.
- `admin`, `teacher`, `student`, and `parent` are school-scoped roles tied to `profiles.school_id`.
- Super admin write operations must execute through Supabase Edge Functions using service role credentials.
- Client-side code must never perform service-role operations directly.

### User Hierarchy

| Role | Scope | Primary Responsibility |
|---|---|---|
| `super_admin` | Platform-wide (all schools) | School provisioning, cross-school user lifecycle, platform governance |
| `admin` | Single school | School operations, user administration, settings, reporting |
| `teacher` | Assigned classes/subjects | Attendance, grading, class-level communication |
| `student` | Self | Personal academics, attendance, fees, wellness |
| `parent` | Linked children | Child progress, communication, fee visibility/payments |

---

## Build Phases

The project is structured into 11 phases. Complete each before starting the next.

| Phase | Status | Description |
|---|---|---|
| **1 — Foundation** | ✅ **Complete** | Project scaffold, auth, routing, onboarding wizard |
| **2 — Admin Shell** | ✅ **Complete** | DataTable, StatCard, Avatar, ConfirmDialog, live dashboard, Students, Staff, Classes |
| **3 — Academics** | ✅ **Complete** | Subjects, timetable builder (manual), assessments, report cards, academic calendar |
| **4 — Attendance** | 🔨 **In Progress** | Daily marking, lock windows with admin override, reports/export, analytics enhancements pending |
| 5 — Finance | ⬜ Pending | Fees, payments, MoMo, receipts |
| 6 — Payroll | ⬜ Pending | SSNIT + PAYE auto-calculation, payslips |
| 7 — Supporting Modules | ⬜ Pending | Library, messaging, transport, inventory |
| 8 — Role Portals | ⬜ Pending | Teacher, Student, Parent dashboards + super-admin console |
| 9 — Innovative Features | ⬜ Pending | Behavior gamification, wellness, AI insights |
| 10 — Production | ⬜ Pending | Offline sync, SMS, Paystack, PWA, RLS, service-role super-admin workflows |

### Future Feature Roadmaps

- Attendance roadmap: `docs/ATTENDANCE_TODO.md`
- Messaging roadmap: `docs/MESSAGING_TODO.md`

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # Shared UI components (Sidebar, Header, etc.)
│   ├── layouts/         # Page layouts (AdminLayout, AuthLayout, etc.)
│   └── [feature]/       # Feature-specific components
├── contexts/
│   └── AuthContext.jsx  # Supabase auth state
├── db/
│   ├── schema.js        # Dexie (IndexedDB) schema
│   └── seed.js          # Development seed script
├── hooks/               # TanStack Query hooks (one file per domain)
├── pages/
│   ├── auth/            # Login, Register, Onboarding, ForgotPassword
│   ├── admin/           # All admin pages (grouped by module)
│   ├── teacher/         # Teacher-facing pages
│   ├── student/         # Student-facing pages
│   └── parent/          # Parent portal pages
├── routes/
│   ├── AppRouter.jsx    # All routes with lazy loading
│   └── ProtectedRoute.jsx
├── services/
│   ├── api/             # Supabase API wrappers (one per domain)
│   ├── supabaseClient.js
│   └── local/           # Dexie service layer
├── store/
│   ├── uiStore.js       # Sidebar, modals, page state (Zustand)
│   └── schoolStore.js   # Active school config, term, year
└── utils/
    ├── cn.js            # clsx + tailwind-merge
    ├── constants.js     # App-wide constants
    ├── formatters.js    # GHS, dates, names, phone
    ├── gradeUtils.js    # All grading systems
    ├── ghanaPayroll.js  # SSNIT + PAYE calculations
    └── ghanaCalendar.js # Ghana terms, grade levels
```

---

## Key Conventions

- **Never** call Supabase directly in components — always use `services/api/`
- **Always** wrap service calls in TanStack Query hooks in `hooks/`
- **Always** cache Supabase data in Dexie for offline fallback
- All monetary values stored as `numeric` in GHS
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Use `cn()` from `utils/cn.js` for all conditional class names
- Delete actions must always show a confirmation dialog first
- Super admin cross-school actions must run through backend Edge Functions with service-role credentials
- School settings user management must handle only school roles (`admin`, `teacher`, `student`, `parent`), never `super_admin`

---

## Supported Curricula

| Mode | Grade Levels | Grading | Calendar |
|---|---|---|---|
| Ghana Basic (default) | Crèche → JHS 3 | Grade 1–6 | 3 terms |
| Ghana SHS (WASSCE) | SHS 1–3 | A1–F9 | 3 terms |
| British | Nursery → Year 13 | GCSE 9–1 | 3 terms |
| American | Pre-K → Grade 12 | A–F / GPA | 2 semesters |
| IB | Configurable | 1–7 | 2 semesters |

---

## Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Indigo (Primary) | `#6366F1` | Buttons, active states, brand |
| Emerald (Accent) | `#10B981` | Success states, growth indicators |
| Slate (Neutral) | `#0F172A` | Primary text |

---

*EduNexus · v1.0.0 · Phase 3 Complete (Academics)*
