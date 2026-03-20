# EduNexus SMS — Complete AI Build Prompt
> Copy this entire document into your AI coding agent (Copilot Workspace, Cursor, Claude Code, or Windsurf).  
> The agent should read every section before writing a single line of code.

---

## 0. AGENT INSTRUCTIONS (Read First)

```
You are a senior full-stack engineer building a production-ready School Management System.
Read this entire document before writing any code.
Follow every instruction precisely — do not skip sections, do not improvise architecture.
When a section says "do not use X", do not use X.
Build features in the priority order defined in Section 11.
After completing each phase, output a summary of what was built and what comes next.
```

---

## 1. PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Product Name** | **EduNexus** |
| **Tagline** | *One platform. Every learner. Every school.* |
| **Target Market** | K-12 schools across Ghana and West Africa; configurable for British/American curricula |
| **Primary Users** | School Administrators, Teachers, Students, Parents/Guardians |
| **Design Language** | Professional Clarity — desktop-first, data-dense, accessible |
| **Brand Colors** | Primary `#6366F1` (Indigo) · Accent `#10B981` (Emerald) · Neutral `#0F172A` (Slate) |
| **Default Currency** | GHS (Ghana Cedis ₵) — configurable per school |
| **Default Calendar** | Ghana Academic Calendar (3 terms) — configurable to British (3 terms) or American (2 semesters) |

---

## 2. TECHNOLOGY STACK

### Frontend
```
Framework:        React 19 (with React Compiler enabled)
Build Tool:       Vite 6
Language:         JavaScript (JSX) — no TypeScript for speed of development
Styling:          Tailwind CSS v4 (CSS-first config)
Component Base:   shadcn/ui (copy components into src/components/ui/)
Icons:            lucide-react
Routing:          React Router v7
Forms:            react-hook-form v7 + yup v1
State (server):   TanStack Query v5
State (client):   Zustand v5
Tables:           @tanstack/react-table v8
Charts:           Recharts v2
Animations:       Framer Motion v11
Notifications:    react-hot-toast
Date handling:    date-fns v4
PDF generation:   jspdf v2 + jspdf-autotable
Excel export:     xlsx
Font:             Inter via @fontsource/inter
Offline DB:       Dexie v4 (IndexedDB wrapper)
```

### Backend
```
Platform:         Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
Auth:             Supabase Auth (email/password + magic link)
Database:         PostgreSQL via Supabase (managed)
File Storage:     Supabase Storage (student photos, documents, reports)
Realtime:         Supabase Realtime (live attendance, notifications, messaging)
Edge Functions:   Supabase Edge Functions (Deno) for complex business logic
Email:            Resend API (via Supabase Edge Function)
SMS:              Africa's Talking API (Ghana networks: MTN, Vodafone, AirtelTigo)
```

### DevOps
```
Frontend Deploy:  Vercel
Version Control:  Git (conventional commits)
Environment:      .env.local (never committed)
```

---

## 3. CORE ARCHITECTURE RULES

The agent MUST follow these rules throughout the entire build:

### 3.1 File Structure
```
src/
├── components/
│   ├── ui/              # shadcn/ui components + custom shared components
│   ├── layouts/         # AppLayout, AuthLayout, PrintLayout
│   └── [feature]/       # Feature-specific components
├── db/
│   ├── schema.js        # Complete Dexie schema
│   └── seed.js          # Development seed data
├── hooks/               # TanStack Query hooks (one file per domain)
├── pages/
│   ├── auth/
│   ├── admin/
│   ├── teacher/
│   ├── student/
│   └── parent/
├── routes/
│   ├── AppRouter.jsx
│   └── ProtectedRoute.jsx
├── services/
│   ├── api/             # Supabase API wrappers (one file per domain)
│   ├── local/           # Dexie service layer (one file per domain)
│   ├── syncService.js
│   └── supabaseClient.js
├── store/
│   ├── uiStore.js       # Sidebar, modals, active page
│   └── schoolStore.js   # Active school config, term, academic year
└── utils/
    ├── cn.js            # clsx + tailwind-merge
    ├── formatters.js    # GHS, dates, grades, phone numbers
    └── exportUtils.js   # PDF and Excel helpers
```

### 3.2 Data Layer Rules
- **NEVER** call Supabase or Dexie directly inside React components
- **ALWAYS** use the service layer in `src/services/`
- **ALWAYS** wrap service calls in TanStack Query hooks in `src/hooks/`
- **ALWAYS** cache data in Dexie when fetched from Supabase (offline fallback)
- **ALWAYS** add `syncStatus: 'pending' | 'synced' | 'error'` field to every Dexie record

### 3.3 Auth Rules
- Use Supabase Auth exclusively — no custom JWT
- Store user role in Supabase `profiles` table, not in JWT claims
- Protect routes by role: `admin`, `teacher`, `student`, `parent`
- `ProtectedRoute` must check both auth AND role before rendering

### 3.4 UI Rules
- Desktop-first layout (sidebar + content). Min sidebar width: 240px
- All data tables must have: search, column sort, pagination, export button
- All forms must have: loading state, error state, success toast
- All delete actions must have: confirmation dialog before executing
- Empty states: always show icon + heading + description + CTA, never blank space
- Loading states: use skeleton loaders (`animate-pulse`), never full-page spinners

### 3.5 cn() Utility — Use Everywhere
```js
// src/utils/cn.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...args) => twMerge(clsx(args));
```

---

## 4. DESIGN SYSTEM

### 4.1 Tailwind Configuration
```js
// tailwind.config.js (or use CSS variables in v4)
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          400: '#818CF8', 500: '#6366F1', 600: '#4F46E5',
          700: '#4338CA', 800: '#3730A3', 900: '#312E81',
        },
        accent: {
          400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          hover: '#F1F5F9',
          card: '#FFFFFF',
        },
        border: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        text: {
          primary: '#0F172A', secondary: '#475569', muted: '#94A3B8', inverse: '#FFFFFF'
        },
        status: {
          success: '#16A34A', successBg: '#DCFCE7',
          warning: '#D97706', warningBg: '#FEF3C7',
          danger:  '#DC2626', dangerBg:  '#FEE2E2',
          info:    '#2563EB', infoBg:    '#DBEAFE',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```

### 4.2 Component Patterns

**Page Layout:**
```jsx
// Every admin page follows this exact layout
<div className="space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Page Title</h1>
      <p className="text-sm text-text-secondary mt-1">Subtitle / breadcrumb</p>
    </div>
    <PrimaryActionButton />
  </div>

  {/* Stats row (if applicable) */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard />
  </div>

  {/* Main content card */}
  <div className="bg-white rounded-xl border border-border shadow-sm">
    <DataTable />
  </div>
</div>
```

**Stat Card:**
```jsx
const StatCard = ({ title, value, delta, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-text-secondary">{title}</span>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-3xl font-bold text-text-primary">{value}</p>
    {delta && <p className="text-xs text-accent-600 mt-1 font-medium">{delta}</p>}
  </div>
);
```

**Status Badge:**
```jsx
const statusStyles = {
  Active:   'bg-status-successBg text-status-success',
  Inactive: 'bg-surface-muted text-text-muted',
  Pending:  'bg-status-warningBg text-status-warning',
  Paid:     'bg-status-successBg text-status-success',
  Overdue:  'bg-status-dangerBg text-status-danger',
};
<span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold', statusStyles[status])}>
  {status}
</span>
```

### 4.3 Sidebar Design
```jsx
// Fixed sidebar, collapsible. Active link gets brand-600 background.
// Group navigation links into sections with labels.
const navSections = [
  {
    label: 'Core',
    links: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/students', icon: GraduationCap, label: 'Students' },
      { to: '/admin/staff', icon: Users, label: 'Staff' },
      { to: '/admin/classes', icon: BookOpen, label: 'Classes' },
    ]
  },
  {
    label: 'Finance',
    links: [
      { to: '/admin/fees', icon: CreditCard, label: 'Fees & Billing' },
      { to: '/admin/payroll', icon: Banknote, label: 'Payroll' },
      { to: '/admin/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    ]
  },
  // ... more sections
];
```

---

## 5. DATABASE SCHEMA

### 5.1 Supabase PostgreSQL Schema

```sql
-- ─── SCHOOL CONFIGURATION ────────────────────────────────────────────────────

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  motto text,
  -- Curriculum mode: 'ghana_basic' | 'ghana_shs' | 'british' | 'american' | 'ib'
  curriculum_mode text default 'ghana_basic',
  -- Calendar mode: 'trimester' (Ghana/UK 3 terms) | 'semester' (US 2 semesters)
  calendar_mode text default 'trimester',
  -- Grading: 'ghana_basic' | 'ghana_wassce' | 'british_gcse' | 'american_gpa' | 'ib'
  grading_system text default 'ghana_basic',
  currency_code text default 'GHS',
  timezone text default 'Africa/Accra',
  country text default 'GH',
  created_at timestamptz default now()
);

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  label text not null,           -- e.g. "2024/2025"
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  academic_year_id uuid references academic_years(id),
  label text not null,           -- "First Term" | "Semester 1" | "Autumn Term"
  term_number int,               -- 1, 2, 3
  start_date date not null,
  end_date date not null,
  is_current boolean default false
);

-- ─── USERS & PROFILES ─────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id),
  role text not null check (role in ('super_admin','admin','teacher','student','parent')),
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── CLASSES & GRADES ─────────────────────────────────────────────────────────

create table grade_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,           -- "KG 1", "Primary 3", "JHS 2", "Year 7", "Grade 5"
  order_index int,              -- for sorting
  level_group text,             -- 'nursery' | 'primary' | 'jhs' | 'shs' | 'secondary'
  curriculum_code text          -- maps to national curriculum stage
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  grade_level_id uuid references grade_levels(id),
  name text not null,           -- "3A", "Blue Class", "Form 2B"
  academic_year_id uuid references academic_years(id),
  class_teacher_id uuid references profiles(id),
  room text,
  capacity int,
  created_at timestamptz default now()
);

-- ─── STUDENTS ─────────────────────────────────────────────────────────────────

create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  profile_id uuid references profiles(id),
  student_id_number text unique,      -- school-assigned ID e.g. "EDN-2024-001"
  first_name text not null,
  last_name text not null,
  other_names text,
  date_of_birth date,
  gender text check (gender in ('Male','Female','Other')),
  nationality text default 'Ghanaian',
  religion text,
  blood_type text,
  photo_url text,
  address text,
  city text,
  region text,
  admission_date date,
  admission_number text,
  current_class_id uuid references classes(id),
  status text default 'Active' check (status in ('Active','Inactive','Graduated','Transferred','Suspended')),
  -- Medical info
  medical_conditions text,
  allergies text,
  doctor_name text,
  doctor_phone text,
  created_at timestamptz default now()
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  first_name text not null,
  last_name text not null,
  relationship text,           -- 'Father' | 'Mother' | 'Guardian' | 'Sponsor'
  phone text not null,
  email text,
  occupation text,
  employer text,
  address text,
  is_primary_contact boolean default false,
  created_at timestamptz default now()
);

create table student_guardians (
  student_id uuid references students(id) on delete cascade,
  guardian_id uuid references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

-- ─── STAFF ────────────────────────────────────────────────────────────────────

create table staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  profile_id uuid references profiles(id),
  staff_id_number text unique,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  photo_url text,
  address text,
  role text not null,          -- 'Teacher' | 'Head Teacher' | 'Admin' | 'Accountant' | 'Support'
  department text,
  qualification text,
  specialization text,         -- subjects they can teach
  employment_type text,        -- 'Full-time' | 'Part-time' | 'Contract' | 'Volunteer'
  employment_status text default 'Active',
  start_date date,
  end_date date,
  salary numeric,
  bank_name text,
  bank_account text,
  social_security_number text,
  tin_number text,             -- Ghana Tax Identification Number
  created_at timestamptz default now()
);

-- ─── ACADEMICS ────────────────────────────────────────────────────────────────

create table subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  code text,
  category text,               -- 'Core' | 'Elective' | 'Extracurricular'
  level_group text,            -- which grade groups this subject applies to
  is_active boolean default true
);

create table class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  subject_id uuid references subjects(id),
  teacher_id uuid references staff(id),
  periods_per_week int default 5
);

create table timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  class_subject_id uuid references class_subjects(id),
  day_of_week int check (day_of_week between 1 and 5),  -- 1=Mon, 5=Fri
  period_number int,
  start_time time,
  end_time time,
  room text
);

-- ─── ASSESSMENTS & GRADING ────────────────────────────────────────────────────

create table assessment_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,          -- "Class Exercise" | "Homework" | "Mid-term Exam" | "End of Term Exam"
  weight_percentage numeric,   -- contribution to final grade
  grading_system text          -- which grading system uses this
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  class_subject_id uuid references class_subjects(id),
  assessment_type_id uuid references assessment_types(id),
  term_id uuid references terms(id),
  title text not null,
  total_marks numeric not null,
  date date,
  created_by uuid references profiles(id)
);

create table assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id),
  student_id uuid references students(id),
  score numeric,
  remarks text,
  is_absent boolean default false,
  created_at timestamptz default now()
);

create table report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  term_id uuid references terms(id),
  academic_year_id uuid references academic_years(id),
  total_score numeric,
  average_score numeric,
  position_in_class int,
  position_out_of int,
  conduct text,
  attitude text,
  interest text,
  days_present int,
  days_absent int,
  days_late int,
  class_teacher_remark text,
  head_teacher_remark text,
  is_promoted boolean,
  next_class_id uuid references classes(id),
  generated_at timestamptz,
  pdf_url text
);

-- ─── ATTENDANCE ───────────────────────────────────────────────────────────────

create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  date date not null,
  status text check (status in ('Present','Absent','Late','Excused')),
  marked_by uuid references profiles(id),
  remarks text,
  created_at timestamptz default now(),
  unique(student_id, date)
);

create table staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id),
  date date not null,
  check_in time,
  check_out time,
  status text,
  remarks text,
  unique(staff_id, date)
);

-- ─── FEES & FINANCE ───────────────────────────────────────────────────────────

create table fee_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,          -- "Tuition" | "PTA Levy" | "Feeding" | "Uniform" | "Sports"
  description text,
  is_recurring boolean default true
);

create table fee_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  fee_category_id uuid references fee_categories(id),
  grade_level_id uuid references grade_levels(id),
  term_id uuid references terms(id),
  amount numeric not null,
  due_date date,
  is_mandatory boolean default true
);

create table student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  fee_schedule_id uuid references fee_schedules(id),
  amount_due numeric not null,
  amount_paid numeric default 0,
  balance numeric generated always as (amount_due - amount_paid) stored,
  status text default 'Unpaid' check (status in ('Paid','Partial','Unpaid','Waived')),
  due_date date,
  waiver_reason text
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  student_id uuid references students(id),
  student_fee_id uuid references student_fees(id),
  amount numeric not null,
  payment_date date not null,
  payment_method text,         -- 'Cash' | 'MoMo' | 'Bank Transfer' | 'Cheque' | 'Card'
  mobile_money_number text,
  reference_number text unique,
  received_by uuid references profiles(id),
  receipt_number text,
  notes text,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  category text,               -- 'Utilities' | 'Maintenance' | 'Supplies' | 'Salaries' | 'Other'
  description text not null,
  amount numeric not null,
  date date not null,
  approved_by uuid references profiles(id),
  receipt_url text,
  created_at timestamptz default now()
);

-- ─── PAYROLL ──────────────────────────────────────────────────────────────────

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  month int,
  year int,
  status text default 'Draft' check (status in ('Draft','Approved','Processed','Cancelled')),
  processed_by uuid references profiles(id),
  processed_at timestamptz,
  total_gross numeric,
  total_deductions numeric,
  total_net numeric
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references payroll_runs(id),
  staff_id uuid references staff(id),
  basic_salary numeric,
  housing_allowance numeric default 0,
  transport_allowance numeric default 0,
  other_allowances numeric default 0,
  gross_salary numeric generated always as (basic_salary + housing_allowance + transport_allowance + other_allowances) stored,
  ssnit_employee numeric default 0,    -- Ghana SSNIT 5.5%
  ssnit_employer numeric default 0,    -- Ghana SSNIT 13%
  income_tax numeric default 0,        -- Ghana PAYE
  other_deductions numeric default 0,
  net_salary numeric,
  payment_status text default 'Pending',
  payment_date date,
  pdf_url text
);

-- ─── LIBRARY ──────────────────────────────────────────────────────────────────

create table books (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  author text,
  isbn text,
  publisher text,
  publication_year int,
  category text,
  subject_id uuid references subjects(id),
  total_copies int default 1,
  available_copies int default 1,
  location text,               -- shelf/section reference
  cover_url text,
  description text
);

create table book_loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id),
  borrower_id uuid references profiles(id),
  borrowed_date date not null,
  due_date date not null,
  returned_date date,
  status text default 'Borrowed' check (status in ('Borrowed','Returned','Overdue','Lost')),
  fine_amount numeric default 0,
  issued_by uuid references profiles(id)
);

-- ─── COMMUNICATION ────────────────────────────────────────────────────────────

create table announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  body text not null,
  audience text[],             -- ['all'] | ['students'] | ['staff'] | ['parents'] | ['class:uuid']
  priority text default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  publish_at timestamptz default now(),
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  subject text,
  body text not null,
  sender_id uuid references profiles(id),
  recipient_ids uuid[],
  channels text[],             -- ['email'] | ['sms'] | ['in_app'] | ['whatsapp']
  status text default 'Queued',
  sent_at timestamptz,
  delivery_report jsonb
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text not null,
  body text,
  type text,                   -- 'fee_reminder' | 'grade_posted' | 'attendance' | 'message' | 'system'
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- ─── TRANSPORT ────────────────────────────────────────────────────────────────

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  plate_number text not null,
  make text,
  model text,
  capacity int,
  driver_id uuid references staff(id),
  status text default 'Active',
  insurance_expiry date,
  last_service_date date,
  next_service_date date
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  vehicle_id uuid references vehicles(id),
  stops jsonb,                 -- [{name, latitude, longitude, order, morning_time, evening_time}]
  monthly_fee numeric
);

create table student_transport (
  student_id uuid references students(id),
  route_id uuid references routes(id),
  pickup_stop text,
  dropoff_stop text,
  is_active boolean default true,
  primary key (student_id, route_id)
);

-- ─── INVENTORY ────────────────────────────────────────────────────────────────

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  name text not null,
  category text,               -- 'Furniture' | 'Electronics' | 'Stationery' | 'Sports' | 'Lab'
  unit text,
  quantity int default 0,
  reorder_level int default 5,
  unit_price numeric,
  supplier text,
  location text,
  last_restocked date
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references inventory_items(id),
  type text check (type in ('Restock','Issue','Disposal','Return')),
  quantity int not null,
  date date not null,
  reference text,
  notes text,
  created_by uuid references profiles(id)
);

-- ─── INNOVATIVE FEATURES ──────────────────────────────────────────────────────

-- AI-powered behavior and incident tracking
create table behavior_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  recorded_by uuid references profiles(id),
  type text check (type in ('Positive','Negative','Neutral')),
  category text,               -- 'Academic' | 'Discipline' | 'Social' | 'Sports' | 'Leadership'
  title text not null,
  description text,
  points int default 0,        -- gamification points (+/-)
  date date not null,
  action_taken text,
  parent_notified boolean default false,
  created_at timestamptz default now()
);

-- Student wellness check-ins (mental health awareness)
create table wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  date date not null,
  mood_score int check (mood_score between 1 and 5),   -- 1=Very Sad, 5=Very Happy
  energy_score int check (energy_score between 1 and 5),
  notes text,                  -- optional student note
  flagged_for_review boolean default false,
  reviewed_by uuid references profiles(id)
);

-- Parent engagement portal activity
create table parent_engagements (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id),
  student_id uuid references students(id),
  type text,                   -- 'Portal Login' | 'Report Viewed' | 'Fee Paid' | 'Message Sent'
  date timestamptz default now()
);

-- Teacher lesson plans
create table lesson_plans (
  id uuid primary key default gen_random_uuid(),
  class_subject_id uuid references class_subjects(id),
  teacher_id uuid references staff(id),
  term_id uuid references terms(id),
  week_number int,
  topic text not null,
  objectives text,
  activities text,
  resources text,
  homework text,
  status text default 'Draft',
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table schools enable row level security;
alter table students enable row level security;
alter table staff enable row level security;
alter table payments enable row level security;
alter table payslips enable row level security;
alter table behavior_records enable row level security;
alter table wellness_checkins enable row level security;
```

### 5.2 Dexie (IndexedDB) Schema — Offline Cache

```js
// src/db/schema.js
import Dexie from 'dexie';

const db = new Dexie('EduNexus_v2');

db.version(1).stores({
  students:          '++localId, id, school_id, status, current_class_id, syncStatus',
  staff:             '++localId, id, school_id, role, syncStatus',
  classes:           '++localId, id, school_id, grade_level_id, syncStatus',
  attendance:        '++localId, id, student_id, date, syncStatus',
  assessment_scores: '++localId, id, assessment_id, student_id, syncStatus',
  payments:          '++localId, id, student_id, syncStatus',
  announcements:     '++localId, id, school_id, syncStatus',
  notifications:     '++localId, id, user_id, is_read',
  syncQueue:         '++id, table, operation, createdAt, attempts, status',
  cachedQueries:     'queryKey, data, cachedAt',
});

export default db;
```

---

## 6. GRADING SYSTEMS

The system must support all of these grading modes, switchable per school in Settings:

### 6.1 Ghana Basic Education (Default)
```js
export const GHANA_BASIC_GRADES = [
  { min: 80, max: 100, grade: '1', remark: 'Excellent' },
  { min: 70, max: 79,  grade: '2', remark: 'Very Good' },
  { min: 60, max: 69,  grade: '3', remark: 'Good' },
  { min: 50, max: 59,  grade: '4', remark: 'Credit' },
  { min: 40, max: 49,  grade: '5', remark: 'Pass' },
  { min: 0,  max: 39,  grade: '6', remark: 'Fail' },
];

// Ghana Basic Assessment Weighting
export const GHANA_BASIC_WEIGHTS = {
  classExercise:  20,   // Class Exercises (20%)
  groupExercise:  10,   // Group Exercise (10%)
  project:        10,   // Project (10%)
  homework:       10,   // Homework (10%)
  endOfTermExam:  50,   // End of Term Exam (50%)
};
```

### 6.2 Ghana WASSCE / SHS
```js
export const GHANA_WASSCE_GRADES = [
  { min: 80, max: 100, grade: 'A1', points: 1, remark: 'Excellent' },
  { min: 70, max: 79,  grade: 'B2', points: 2, remark: 'Very Good' },
  { min: 65, max: 69,  grade: 'B3', points: 3, remark: 'Good' },
  { min: 60, max: 64,  grade: 'C4', points: 4, remark: 'Credit' },
  { min: 55, max: 59,  grade: 'C5', points: 5, remark: 'Credit' },
  { min: 50, max: 54,  grade: 'C6', points: 6, remark: 'Credit' },
  { min: 45, max: 49,  grade: 'D7', points: 7, remark: 'Pass' },
  { min: 40, max: 44,  grade: 'E8', points: 8, remark: 'Pass' },
  { min: 0,  max: 39,  grade: 'F9', points: 9, remark: 'Fail' },
];
```

### 6.3 British GCSE / A-Level
```js
export const BRITISH_GCSE_GRADES = [
  { min: 90, max: 100, grade: '9', remark: 'Exceptional' },
  { min: 80, max: 89,  grade: '8', remark: 'Outstanding' },
  { min: 70, max: 79,  grade: '7', remark: 'Very Good' },
  { min: 60, max: 69,  grade: '6', remark: 'Good' },
  { min: 50, max: 59,  grade: '5', remark: 'Strong Pass' },
  { min: 40, max: 49,  grade: '4', remark: 'Standard Pass' },
  { min: 30, max: 39,  grade: '3', remark: 'Below Standard' },
  { min: 20, max: 29,  grade: '2', remark: 'Poor' },
  { min: 0,  max: 19,  grade: '1', remark: 'Very Poor' },
];
```

### 6.4 American GPA
```js
export const AMERICAN_GPA_GRADES = [
  { min: 93, max: 100, grade: 'A',  gpa: 4.0, remark: 'Excellent' },
  { min: 90, max: 92,  grade: 'A-', gpa: 3.7, remark: 'Excellent' },
  { min: 87, max: 89,  grade: 'B+', gpa: 3.3, remark: 'Good' },
  { min: 83, max: 86,  grade: 'B',  gpa: 3.0, remark: 'Good' },
  { min: 80, max: 82,  grade: 'B-', gpa: 2.7, remark: 'Good' },
  { min: 77, max: 79,  grade: 'C+', gpa: 2.3, remark: 'Average' },
  { min: 73, max: 76,  grade: 'C',  gpa: 2.0, remark: 'Average' },
  { min: 70, max: 72,  grade: 'C-', gpa: 1.7, remark: 'Below Average' },
  { min: 0,  max: 69,  grade: 'F',  gpa: 0.0, remark: 'Fail' },
];
```

### 6.5 Grade Calculation Utility
```js
// src/utils/gradeUtils.js
export const getGrade = (score, system = 'ghana_basic') => {
  const scales = {
    ghana_basic: GHANA_BASIC_GRADES,
    ghana_wassce: GHANA_WASSCE_GRADES,
    british_gcse: BRITISH_GCSE_GRADES,
    american_gpa: AMERICAN_GPA_GRADES,
  };
  const scale = scales[system] || scales.ghana_basic;
  return scale.find(g => score >= g.min && score <= g.max) ?? scale[scale.length - 1];
};
```

---

## 7. GHANA-SPECIFIC FEATURES

These features are non-negotiable for the Ghanaian market:

### 7.1 Ghana Academic Calendar (Default)
```js
export const GHANA_TERMS = {
  term1: { label: 'First Term', months: ['Sep','Oct','Nov','Dec'] },
  term2: { label: 'Second Term', months: ['Jan','Feb','Mar','Apr'] },
  term3: { label: 'Third Term', months: ['Apr','May','Jun','Jul','Aug'] },
};

export const GHANA_GRADE_LEVELS = [
  // Crèche / Pre-school
  { name: 'Crèche',     group: 'nursery',  order: 1 },
  { name: 'Nursery 1',  group: 'nursery',  order: 2 },
  { name: 'Nursery 2',  group: 'nursery',  order: 3 },
  { name: 'KG 1',       group: 'nursery',  order: 4 },
  { name: 'KG 2',       group: 'nursery',  order: 5 },
  // Lower Primary
  { name: 'Primary 1',  group: 'primary',  order: 6 },
  { name: 'Primary 2',  group: 'primary',  order: 7 },
  { name: 'Primary 3',  group: 'primary',  order: 8 },
  // Upper Primary
  { name: 'Primary 4',  group: 'primary',  order: 9 },
  { name: 'Primary 5',  group: 'primary',  order: 10 },
  { name: 'Primary 6',  group: 'primary',  order: 11 },
  // Junior High School
  { name: 'JHS 1',      group: 'jhs',      order: 12 },
  { name: 'JHS 2',      group: 'jhs',      order: 13 },
  { name: 'JHS 3',      group: 'jhs',      order: 14 },
  // Senior High School
  { name: 'SHS 1',      group: 'shs',      order: 15 },
  { name: 'SHS 2',      group: 'shs',      order: 16 },
  { name: 'SHS 3',      group: 'shs',      order: 17 },
];
```

### 7.2 Mobile Money Integration (Fees Payment)
```js
// Mobile Money is the primary payment method in Ghana
export const MOMO_PROVIDERS = [
  { code: 'mtn', name: 'MTN Mobile Money', prefix: ['024','054','055','059'] },
  { code: 'vodafone', name: 'Vodafone Cash', prefix: ['020','050'] },
  { code: 'airteltigo', name: 'AirtelTigo Money', prefix: ['027','057','026','056'] },
];

// Payment form should auto-detect provider from phone number prefix
export const detectMoMoProvider = (phone) => {
  const prefix = phone?.replace(/\s/g, '').slice(0, 3);
  return MOMO_PROVIDERS.find(p => p.prefix.includes(prefix));
};
```

### 7.3 Ghana Payroll (SSNIT + PAYE)
```js
// src/utils/ghanaPayroll.js
// Ghana SSNIT contributions
export const SSNIT_RATES = {
  employee: 0.055,   // 5.5% of basic salary
  employer: 0.13,    // 13% of basic salary
};

// Ghana PAYE Tax Bands 2024 (GHS per year)
export const GHANA_PAYE_BANDS = [
  { min: 0,      max: 4380,   rate: 0 },
  { min: 4380,   max: 5100,   rate: 0.05 },
  { min: 5100,   max: 6900,   rate: 0.10 },
  { min: 6900,   max: 11100,  rate: 0.175 },
  { min: 11100,  max: 43100,  rate: 0.25 },
  { min: 43100,  max: 240000, rate: 0.30 },
  { min: 240000, max: Infinity, rate: 0.35 },
];

export const calculateGhanaPAYE = (annualIncome) => {
  let tax = 0;
  for (const band of GHANA_PAYE_BANDS) {
    if (annualIncome <= band.min) break;
    const taxable = Math.min(annualIncome, band.max) - band.min;
    tax += taxable * band.rate;
  }
  return tax / 12; // monthly
};

export const calculatePayslip = (staff) => {
  const basic = staff.salary;
  const ssnitEmployee = basic * SSNIT_RATES.employee;
  const ssnitEmployer = basic * SSNIT_RATES.employer;
  const gross = basic + (staff.housing_allowance || 0) + (staff.transport_allowance || 0);
  const taxableIncome = gross - ssnitEmployee;
  const incomeTax = calculateGhanaPAYE(taxableIncome * 12);
  const net = gross - ssnitEmployee - incomeTax;
  return { basic, gross, ssnitEmployee, ssnitEmployer, incomeTax, net };
};
```

### 7.4 Report Card Format
The Ghanaian end-of-term report card must include:
- Student details (name, class, term, academic year)
- Subject scores: Class Exercise (20%) + Group Work (10%) + Project (10%) + Homework (10%) + Exams (50%)
- Grade (1–6 for basic, A1–F9 for WASSCE)
- Position in class (e.g., "3rd out of 45")
- Attendance record (days present / days absent / days late)
- Conduct rating
- Class teacher remark
- Head teacher remark
- School stamp area
- Promotion status

---

## 8. FEATURE MODULES — COMPLETE SPECIFICATION

### MODULE 1: Authentication & Onboarding
**Routes:** `/login`, `/register`, `/onboarding`, `/forgot-password`

**Features:**
- School registration with setup wizard (5 steps: School Info → Curriculum Mode → Grade Levels → Admin Account → Done)
- Login with email/password + magic link option
- Role-based redirects: admin → `/admin/dashboard`, teacher → `/teacher/dashboard`, student → `/student/dashboard`, parent → `/parent/dashboard`
- "Remember me" on devices
- Password strength indicator on signup
- Offline login using cached credentials in Dexie

**Onboarding Wizard Steps:**
1. School basic info (name, logo, address, phone, email)
2. Curriculum & calendar mode selection (Ghana/British/American) with visual comparison
3. Auto-generate grade levels based on selected curriculum
4. Create first admin account
5. Invite staff via email or shareable link

---

### MODULE 2: Dashboard (Role-specific)

**Admin Dashboard** — `/admin/dashboard`

Widgets (all real-time from Supabase):
- Total Students (with trend: +/- vs last term)
- Total Staff (active vs on leave)
- Fee Collection Rate (% of total expected collected this term)
- Outstanding Fees (total GHS amount)
- Attendance Rate Today (% present)
- Upcoming Events (next 3 from announcements)
- Recent Payments (last 5 transactions)
- Behavior Alerts (students with 3+ negative records this week)
- Low Inventory Alerts (items below reorder level)

Charts:
- Monthly fee collection bar chart (current academic year, 12 months)
- Student enrollment trend line chart (by term)
- Attendance heatmap (last 30 days, similar to GitHub contribution graph)
- Subject performance radar chart (average scores per subject)

**Teacher Dashboard** — `/teacher/dashboard`

Widgets:
- My Classes Today (with timetable for today)
- Attendance Marked (yes/no indicator per class)
- Pending Assessments to Mark
- Lesson Plans Due This Week
- Class Behavior Summary
- Student Wellness Alerts (flagged wellness check-ins)

**Student Dashboard** — `/student/dashboard`

Widgets:
- My Schedule Today
- Recent Grades
- Outstanding Fees
- Library Books Borrowed
- Announcements
- Wellness Check-in Prompt (daily)
- Behavior Points Balance (gamification)

**Parent Dashboard** — `/parent/dashboard`

Widgets:
- Child's Attendance This Week
- Latest Report Card Summary
- Outstanding Fee Balance + Pay Now button
- Recent Grades
- Behavior Summary
- Messages from School

---

### MODULE 3: Student Management
**Routes:** `/admin/students`, `/admin/students/:id`, `/admin/students/new`

**Student List Page:**
- Data table with: photo, name, student ID, class, guardian, status
- Columns sortable, filterable
- Filter panel: by class, grade level, gender, status, admission year
- Bulk actions: change class, export to Excel, print list, send message
- Search: by name, student ID, guardian name, phone

**Student Profile Page (tabbed):**
- Tab 1 — Personal Info: all demographics, photo upload, medical info
- Tab 2 — Academic: current class, grade history, subject performance chart, report cards list
- Tab 3 — Attendance: monthly attendance calendar heatmap + summary stats
- Tab 4 — Finance: fee schedule, payment history, current balance, Pay button
- Tab 5 — Behavior: timeline of behavior records, points balance, badges earned
- Tab 6 — Wellness: mood trend chart (last 30 days), recent check-ins
- Tab 7 — Transport: assigned route, pickup/dropoff stop
- Tab 8 — Documents: uploaded files (birth cert, report cards, etc.)
- Tab 9 — Guardians: list of guardians with contact info

**Add/Edit Student Form:**
- Multi-step form: Personal → Guardian → Academic Placement → Medical → Review
- Photo upload with crop (use react-image-crop)
- Auto-generate student ID number on creation
- Duplicate detection: warn if similar name + DOB already exists

**Innovative Features:**
- **Smart Search:** search by name OR parent phone number OR student ID
- **Quick Add:** minimal form (name, class, guardian phone) for rapid bulk enrollment during intake
- **Bulk Import:** upload Excel/CSV template to enroll multiple students at once
- **Student QR Code:** each student profile has a unique QR code for quick check-in/identification

---

### MODULE 4: Staff Management
**Routes:** `/admin/staff`, `/admin/staff/:id`, `/admin/staff/new`

**Features (mirror Student Management in quality):**
- Staff list with role/department filters
- Staff profile with tabs: Personal, Academic Background, Employment, Payroll, Attendance, Classes Assigned, Documents
- Leave management: apply for leave, approve/reject leave requests
- Staff directory (phone + email visible to other staff)
- Performance appraisal module (term-based self-assessment + HOD review)
- CPD (Continuing Professional Development) record tracking

---

### MODULE 5: Academic Management
**Routes:** `/admin/academics/*`

**Sub-pages:**

**Classes** — list, create, assign class teacher, view roster
**Subjects** — CRUD, assign to grade levels, map to national curriculum codes
**Timetable Builder:**
- Visual drag-and-drop grid (days × periods)
- Conflict detection: warn if teacher or room double-booked
- Auto-generate timetable option (algorithm assigns subjects round-robin)
- Print-ready timetable PDF per class and per teacher
- Export to iCal format

**Assessment Management:**
- Create assessments per subject per term
- Enter scores in a spreadsheet-style grid (student rows × assessment columns)
- Auto-calculate weighted averages
- Grade distribution chart per assessment

**Report Cards:**
- Generate report cards per term per class (batch generation)
- Preview before finalization
- Lock scores after finalization (prevent edits)
- Print/PDF individual or batch
- Send to parent email/WhatsApp automatically

**Academic Year Setup:**
- Create academic years, define terms/semesters with dates
- Set current term (single source of truth)
- Holiday calendar with public Ghana holidays pre-loaded

---

### MODULE 6: Attendance
**Routes:** `/admin/attendance`, `/teacher/attendance`

**Features:**
- Teacher marks attendance per class per day on a simple card grid (tap to toggle Present/Absent/Late)
- Real-time updates via Supabase Realtime (admin sees attendance being marked live)
- Admin can view and edit attendance for any class/date
- Attendance reports: by student (term summary), by class (daily), by date range
- Auto-notification to parent when student marked Absent (SMS + in-app)
- Late attendance threshold alert (warn admin if attendance < 75%)
- Attendance heatmap calendar per student
- Bulk mark all present with one click, then individually mark absences
- Offline support: mark attendance offline, sync when online

---

### MODULE 7: Fees & Finance
**Routes:** `/admin/finance/*`

**Fee Management:**
- Configure fee categories per grade level per term
- Fee schedule automatically generates `student_fees` records for all active students
- Bulk fee assignment when new term starts
- Fee waivers with reason (partial or full)
- Sibling discount configuration

**Payment Recording:**
- Record payment: select student (search), view balance, enter amount, select method
- MoMo: auto-detect network from phone prefix, show confirmation prompt
- Generate and print official receipt (with school logo, receipt number, QR code)
- Email/SMS receipt to guardian on payment

**Fee Portal (Parent-facing):**
- View all outstanding fees per child
- Pay online via Paystack integration (card + MoMo + bank)
- Download receipts
- Payment history

**Financial Reports:**
- Daily collection report
- Term collection report (expected vs collected vs outstanding per class)
- Revenue by fee category chart
- Outstanding debtors list (sortable by amount, class, days overdue)
- Income vs Expenses dashboard
- Export all reports to Excel and PDF

**Expenses:**
- Record school expenses by category
- Attach receipt photo
- Monthly expense summary chart
- Budget tracking (set monthly budget per category, show % used)

---

### MODULE 8: Payroll
**Routes:** `/admin/payroll/*`

**Features:**
- Monthly payroll run (creates payslips for all active staff)
- Auto-calculate: basic + allowances + Ghana SSNIT + Ghana PAYE = net pay
- Manual adjustments: add bonuses, deductions per staff member
- Payroll approval workflow: Accountant drafts → Admin approves → Processed
- Payslip PDF generation (school letterhead, all deduction breakdowns)
- Email payslip to staff on processing
- Payroll history (searchable by month/year/staff)
- Salary analytics: total payroll cost by department, average salary by role
- SSNIT contribution summary report (for submission to SSNIT)
- P9 Tax return data export

---

### MODULE 9: E-Library
**Routes:** `/admin/library`, `/student/library`, `/teacher/library`

**Features:**
- Book catalog with cover images, search by title/author/ISBN/subject
- Barcode/ISBN scanner (camera-based, for adding books quickly)
- Loan management: borrow, renew, return
- Fine calculation for overdue books (configurable rate per day)
- Student borrowing limit enforcement (max N books at once)
- Popular books list (most borrowed)
- Overdue books dashboard with bulk reminder SMS
- Digital resources section: upload PDFs of class notes, past exam papers, textbooks
- Curriculum-mapped resource library (link resources to subjects and grade levels)

---

### MODULE 10: Communication
**Routes:** `/admin/messaging`, `/teacher/messaging`

**Features:**
- Compose messages to: All, Students, Parents, Staff, specific Class, individual
- Channels: In-App notification, Email (via Resend), SMS (via Africa's Talking)
- Message templates (stored per school)
- Schedule messages for future delivery
- Bulk SMS for fee reminders, exam schedules, events
- Message delivery reports (sent/delivered/failed per recipient)
- In-app notification center (bell icon, real-time via Supabase Realtime)
- Announcement board (pinned to dashboards)

---

### MODULE 11: Transport Management
**Routes:** `/admin/transport`

**Features:**
- Vehicle fleet management (registration, capacity, insurance, service dates)
- Route management with stop mapping
- Assign students to routes/stops
- Driver assignment
- Real-time location tracking (optional: GPS tracker integration via webhook)
- Monthly transport fee auto-billing to enrolled students
- Transport manifest: list of students per route per morning/evening
- Maintenance log per vehicle
- Insurance/road-worthiness expiry alerts

---

### MODULE 12: Inventory & Procurement
**Routes:** `/admin/inventory`

**Features:**
- Item catalog: name, category, unit, quantity, unit price
- Stock movements: restock, issue to class/department, disposal
- Low stock alerts (email when below reorder level)
- Purchase orders (create PO, mark as received)
- Asset register (fixed assets: computers, projectors, furniture with serial numbers)
- Asset assignment to rooms/staff
- Asset condition tracking
- Stocktake: periodic inventory count with variance report

---

### MODULE 13: Reports & Analytics
**Routes:** `/admin/reports`

**Tabs:**
- Academic Reports: subject performance, class rankings, grade distribution
- Financial Reports: collection, expenses, payroll cost
- Attendance Reports: by class, by student, term summary
- Behavior Reports: incident log, top positive/negative students
- Custom Report Builder: select fields, filters, date range → generate table or chart

---

### MODULE 14: Settings
**Routes:** `/admin/settings`

**Tabs:**
- **School Profile:** name, logo, address, contacts, motto
- **Curriculum:** select mode (Ghana/British/American), import grade levels
- **Grading System:** select scale, view/edit grade boundaries
- **Academic Calendar:** manage academic years and terms
- **Fee Configuration:** categories, payment methods, MoMo accounts
- **Notification Settings:** which events trigger SMS/email, templates
- **User Management:** invite/create accounts, assign roles, deactivate users
- **Integrations:** Paystack keys, Africa's Talking credentials, Resend API key
- **Data & Privacy:** export all school data, GDPR data deletion
- **Appearance:** school brand color (accent), dark mode toggle

---

### MODULE 15: INNOVATIVE FEATURES (Differentiators)

#### 15.1 AI-Powered Student Insights
```
Feature: "EduNexus Intelligence" panel on student profile and admin dashboard
Uses: Client-side rule-based logic (no external AI API needed for MVP)

Generates automatic insights such as:
- "Kofi's Math scores dropped 23% vs last term. Consider extra support."
- "Ama has been absent 8 days this term — above the 75% threshold."
- "3 students in Primary 4A are consistently scoring below 50% in English."

Implementation:
- Run analysis queries against Dexie/Supabase data on page load
- Display as an "Insights" card with actionable suggestion chips
- Teacher can dismiss insights or mark as actioned
```

#### 15.2 Student Behavior Gamification
```
Feature: House Points / Merit System
- Schools define houses (e.g., Eagle, Falcon, Lion, Tiger) with colors
- Each positive behavior record awards points to student's house
- Leaderboard shows house standings (updated in real-time)
- Individual student "Merit Badge" system (earn badges for milestones)
- End-of-term badge certificates auto-generated as PDF
- Parents see their child's points and badges in the parent portal
```

#### 15.3 Daily Wellness Check-in
```
Feature: Student mood tracking (for pastoral care)
- Students see a simple 5-emoji mood selector on their dashboard each morning
- Optionally add a text note ("I'm nervous about the maths test")
- Class teacher sees a class wellness overview (aggregate, anonymous)
- Flagging: if a student scores 1 or 2 for 3 consecutive days, teacher is alerted
- School counselor has a dedicated view of flagged students
- Parents cannot see individual check-ins (privacy) but see a weekly wellness summary
```

#### 15.4 Parent Engagement Score
```
Feature: Tracks and scores parent involvement
- Score 0–100 based on: portal logins, fees paid on time, messages responded to, events attended
- Displayed to admin/teacher to identify disengaged families
- Auto-trigger outreach to low-engagement parents after 2 weeks of inactivity
- "Engaged Parent" badge visible in parent portal (positive reinforcement)
```

#### 15.5 Smart Fee Reminders
```
Feature: Intelligent fee reminder engine
- Analyzes payment history to predict likelihood of default
- Sends reminders 3 days before due date, on due date, 3 days after
- Escalates: in-app → SMS → phone call list generation
- Tracks which reminder led to payment (attribution)
- Auto-stops reminders once paid
```

#### 15.6 Digital Report Card Portal
```
Feature: Parent QR-scannable report card verification
- Each generated report card has a unique QR code
- Parents scan to verify authenticity on school website
- Prevents fraudulent report cards
- Download history tracked
```

#### 15.7 Timetable Conflict AI Guard
```
Feature: Real-time conflict detection in timetable builder
- Warns immediately when: same teacher assigned twice same slot, same room double-booked
- Suggests alternative slots based on teacher availability
- "One-click fix" to resolve simple conflicts
```

#### 15.8 Ghana BECE/WAEC Prep Tracker (JHS/SHS specific)
```
Feature: Exam preparation dashboard for JHS 3 / SHS 3 students
- Track practice test scores per BECE/WAEC subject
- Compare performance against pass mark thresholds
- "Areas to improve" auto-generated from weakest topics
- Past questions bank (teachers upload past BECE/WAEC papers as PDFs)
- Countdown timer to exam date
```

---

## 9. PAGE-BY-PAGE ROUTE MAP

```
/                              → Redirect to /login
/login                         → Login page
/register                      → School registration
/onboarding                    → Setup wizard (post-registration)

/admin/dashboard               → Admin home
/admin/students                → Student list
/admin/students/new            → Add student form
/admin/students/:id            → Student profile
/admin/staff                   → Staff list
/admin/staff/new               → Add staff form
/admin/staff/:id               → Staff profile
/admin/classes                 → Class list
/admin/classes/:id             → Class detail + roster
/admin/academics/subjects      → Subject management
/admin/academics/timetable     → Timetable builder
/admin/academics/assessments   → Assessment management
/admin/academics/reports       → Report card management
/admin/academics/calendar      → Academic calendar
/admin/attendance              → Attendance overview + manual mark
/admin/finance/fees            → Fee management
/admin/finance/payments        → Payment recording
/admin/finance/expenses        → Expense tracking
/admin/finance/reports         → Financial reports
/admin/payroll                 → Payroll management
/admin/library                 → Library management
/admin/messaging               → Communication center
/admin/transport               → Transport management
/admin/inventory               → Inventory management
/admin/reports                 → Analytics & reports
/admin/settings                → Settings (all tabs)

/teacher/dashboard             → Teacher home
/teacher/classes               → My classes
/teacher/attendance/:classId   → Mark attendance
/teacher/grades/:classId       → Enter grades
/teacher/lessons               → Lesson plans
/teacher/library               → Library (borrow/return)
/teacher/messaging             → Messages

/student/dashboard             → Student home
/student/grades                → My grades + report cards
/student/attendance            → My attendance record
/student/fees                  → My fees + payment history
/student/library               → Library + borrow
/student/timetable             → My timetable
/student/wellness              → Daily check-in + history

/parent/dashboard              → Parent home
/parent/children               → Switch between children (if multiple)
/parent/grades                 → Child's grades
/parent/attendance             → Child's attendance
/parent/fees                   → Pay fees + history
/parent/messages               → Messages from school
```

---

## 10. API SERVICE PATTERN

```js
// src/services/api/students.js — template for ALL domain API files
import { supabase } from '../supabaseClient';

export const studentsApi = {
  list: ({ schoolId, classId, status, search, page = 0, limit = 50 }) => {
    let q = supabase
      .from('students')
      .select('*, profiles(*), classes(name, grade_levels(name))', { count: 'exact' })
      .eq('school_id', schoolId)
      .range(page * limit, (page + 1) * limit - 1);

    if (classId)  q = q.eq('current_class_id', classId);
    if (status)   q = q.eq('status', status);
    if (search)   q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

    return q;
  },

  getById: (id) =>
    supabase
      .from('students')
      .select('*, profiles(*), student_guardians(guardians(*))')
      .eq('id', id)
      .single(),

  create: (data) =>
    supabase.from('students').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('students').update(data).eq('id', id).select().single(),

  delete: (id) =>
    supabase.from('students').delete().eq('id', id),
};

// src/hooks/useStudents.js — TanStack Query wrapper
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '../services/api/students';
import db from '../db/schema';

export const STUDENTS_KEY = (filters) => ['students', filters];

export const useStudents = (filters) => useQuery({
  queryKey: STUDENTS_KEY(filters),
  queryFn: async () => {
    if (!navigator.onLine) {
      return { data: await db.students.toArray(), count: null };
    }
    const { data, error, count } = await studentsApi.list(filters);
    if (error) throw error;
    await db.students.bulkPut(data.map(s => ({ ...s, syncStatus: 'synced' })));
    return { data, count };
  },
  staleTime: 60_000,
});

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student added successfully');
    },
    onError: (err) => toast.error(err.message),
  });
};
```

---

## 11. BUILD PRIORITY ORDER

The agent must build in this exact sequence. Complete each phase fully before starting the next.

### Phase 1 — Foundation (Build First)
- [ ] Project scaffold: Vite + React 19 + Tailwind v4 + shadcn/ui init
- [ ] Install all dependencies from Section 2
- [ ] Configure `tailwind.config.js` with design tokens from Section 4.1
- [ ] Create `src/utils/cn.js`
- [ ] Setup `@fontsource/inter` in `main.jsx`
- [ ] Create Supabase project, run SQL schema from Section 5.1
- [ ] Create `src/services/supabaseClient.js`
- [ ] Create `src/db/schema.js` (Dexie)
- [ ] Create `AppRouter.jsx` with all routes from Section 9
- [ ] Create `ProtectedRoute.jsx` with role-based access
- [ ] Build `AuthContext` with Supabase Auth
- [ ] Build Login page + School Registration + Onboarding Wizard

### Phase 2 — Core Admin Shell
- [ ] Build `AdminLayout` (sidebar + header + content outlet)
- [ ] Build `Sidebar` with all nav sections and active state
- [ ] Build `Header` with notifications bell, user menu
- [ ] Build `uiStore.js` (Zustand)
- [ ] Build `schoolStore.js` (active school config)
- [ ] Build Admin Dashboard with stat cards and charts (use mock data first)
- [ ] Build reusable `DataTable` component using TanStack Table

### Phase 3 — Students & Staff
- [ ] Build Student List page (DataTable with all filters)
- [ ] Build Student Profile page (all 9 tabs)
- [ ] Build Add/Edit Student multi-step form
- [ ] Build Staff List page
- [ ] Build Staff Profile page
- [ ] Build Add/Edit Staff form

### Phase 4 — Academics
- [ ] Build Class management
- [ ] Build Subject management
- [ ] Build Timetable builder (drag-and-drop grid)
- [ ] Build Assessment entry (spreadsheet-style score entry)
- [ ] Build Report card generator + PDF output
- [ ] Build Academic Calendar

### Phase 5 — Attendance
- [ ] Build attendance marking UI (teacher view — card grid)
- [ ] Build attendance admin overview
- [ ] Build attendance reports and heatmap calendar

### Phase 6 — Finance
- [ ] Build fee schedule configuration
- [ ] Build payment recording form with MoMo detection
- [ ] Build receipt PDF generation
- [ ] Build financial dashboard and reports
- [ ] Build expense tracking

### Phase 7 — Payroll
- [ ] Build payroll run creation
- [ ] Build Ghana SSNIT + PAYE auto-calculation
- [ ] Build payslip PDF generation
- [ ] Build payroll history and analytics

### Phase 8 — Supporting Modules
- [ ] E-Library
- [ ] Communication / Messaging
- [ ] Transport Management
- [ ] Inventory Management

### Phase 9 — Role Portals
- [ ] Teacher Dashboard + Attendance + Grades + Lesson Plans
- [ ] Student Dashboard + Grades + Wellness Check-in
- [ ] Parent Dashboard + Fee Payment + Report Viewing

### Phase 10 — Innovative Features
- [ ] Behavior Gamification (house points + badges)
- [ ] Wellness Check-in system
- [ ] AI Insights panel (rule-based)
- [ ] Parent Engagement Score
- [ ] Smart Fee Reminders
- [ ] Report Card QR verification
- [ ] BECE/WAEC Prep Tracker

### Phase 11 — Polish & Production
- [ ] Offline sync service (Dexie ↔ Supabase)
- [ ] Supabase Edge Functions for email/SMS triggers
- [ ] Africa's Talking SMS integration
- [ ] Paystack payment gateway integration
- [ ] PWA manifest + service worker (installable on mobile)
- [ ] Performance audit (Lighthouse score ≥ 90)
- [ ] Supabase RLS policies (data isolation per school)
- [ ] Error boundaries on all routes
- [ ] Loading skeletons on all data tables

---

## 12. ENVIRONMENT VARIABLES

```bash
# .env.local — never commit this file
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx
VITE_APP_NAME=EduNexus
VITE_APP_VERSION=1.0.0
```

```bash
# .env.example — commit this file
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PAYSTACK_PUBLIC_KEY=
VITE_APP_NAME=EduNexus
VITE_APP_VERSION=1.0.0
```

---

## 13. KEY CONSTANTS

```js
// src/utils/constants.js
export const APP_NAME = 'EduNexus';
export const APP_VERSION = '1.0.0';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const CURRICULUM_MODES = {
  GHANA_BASIC: 'ghana_basic',
  GHANA_SHS: 'ghana_shs',
  BRITISH: 'british',
  AMERICAN: 'american',
  IB: 'ib',
};

export const CALENDAR_MODES = {
  TRIMESTER: 'trimester',   // Ghana / British: 3 terms
  SEMESTER: 'semester',     // American: 2 semesters
};

export const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money', 'Bank Transfer', 'Paystack', 'Cheque'];

export const STUDENT_STATUSES = ['Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended'];
export const STAFF_STATUSES = ['Active', 'On Leave', 'Terminated', 'Retired'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Volunteer'];
```

---

## 14. FINAL AGENT NOTES

```
1. Build mobile-responsive from the start. The sidebar should collapse to a bottom tab bar on mobile (≤768px).

2. Every form must show a loading spinner on the submit button while async operations are pending.

3. Every destructive action (delete, terminate, lock report cards) must show a confirmation dialog.

4. Every data table must support: search, column sorting, pagination (50 rows default), and export to Excel.

5. Generate placeholder/seed data for development. Create src/db/seed.js that populates:
   - 1 school
   - 3 academic years (current marked)
   - All Ghana grade levels
   - 5 classes (KG1, Primary 3, Primary 6, JHS 1, JHS 3)
   - 30 students across those classes
   - 8 staff members (2 teachers per class + admin + accountant)
   - 3 terms for current academic year
   - Sample assessments + scores
   - Sample fee schedules + 60% payment rate
   This seed data must be runnable with: npm run seed

6. All monetary values stored as numeric in database (GHS). Display always formatted with GH₵ prefix.

7. All dates stored in ISO 8601 (UTC). Display in en-GH locale (DD Mon YYYY).

8. Print styles: add a print.css that hides the sidebar and header when printing report cards, receipts, and payslips.

9. Accessibility: all icon-only buttons must have aria-label. All form fields must have associated labels. Color is never the ONLY way information is conveyed.

10. The first time an admin logs in after onboarding, show a "Welcome to EduNexus" modal with 3 quick-start actions: Add your first class, Add your first student, Set up fees.
```

---

*EduNexus — One platform. Every learner. Every school.*  
*Prompt version 1.0 · March 2025*