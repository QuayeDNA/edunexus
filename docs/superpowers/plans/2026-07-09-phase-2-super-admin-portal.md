# Phase 2 — Super Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fully functional multi-tenant management console for the platform operator (super admin), including all shared infrastructure reused by Phases 3-10.

**Architecture:** Next.js 16 API routes with Drizzle ORM queries, TanStack Query for client data fetching, shadcn/ui for UI components. Role-based auth via `requireRole('super_admin')` guard. Email via Resend. Payments via abstract provider pattern with Paystack implementation.

**Tech Stack:** Next.js 16, TypeScript strict, Drizzle ORM, Auth.js v5, shadcn/ui, TanStack Query, react-hook-form + zod, TanStack Table, Resend, Paystack

## Global Constraints

- All API routes return `{ success, data, error, meta }` envelope
- All API routes guarded by `requireRole('super_admin')`
- All CUD operations logged to `audit_logs` table
- All monetary values stored as `numeric(12,2)` in GHS
- All dates stored as ISO 8601 UTC
- shadcn/ui components installed on-demand, never globally
- TypeScript strict mode everywhere
- Every new table has `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`

---

### Task 1: Install and Configure shadcn/ui

**Files:**
- Create: initialized shadcn/ui config in `apps/web/`
- Modify: `apps/web/tailwind.config.ts` — updated with shadcn theme tokens
- Modify: `apps/web/app/globals.css` — updated with CSS variables
- New: `apps/web/components.json`
- New: `apps/web/lib/utils/cn.ts` (if not exists)

**Interfaces:**
- Consumes: existing `apps/web/tailwind.config.ts`, `apps/web/app/globals.css`
- Produces: shadcn/ui theme configured and ready for component installation

- [ ] **Step 1: Initialize shadcn/ui**

```bash
cd apps/web && pnpm dlx shadcn@latest init -d --force
```

This creates `components.json`, updates `tailwind.config.ts` and `globals.css` with shadcn CSS variables. The `-d` flag uses defaults (neutral gray).

- [ ] **Step 2: Install core components**

```bash
cd apps/web && pnpm dlx shadcn@latest add button card dialog form input select table badge tabs dropdown-menu sheet toast skeleton avatar separator command popover -y
```

- [ ] **Step 3: Verify the install**

```bash
cd apps/web && pnpm t --filter=web --no-cache
```
Expected: Typecheck passes with no shadcn-related errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat: install shadcn/ui with core components"
```

---

### Task 2: Add Billing Schema Tables

**Files:**
- Create: `packages/database/src/schema/billing.ts`
- Modify: `packages/database/src/schema/index.ts` — add billing exports
- Modify: `packages/database/src/schema/schools.ts` — add `domain`, `customDomain` columns

**Interfaces:**
- Consumes: existing schema patterns from `schools.ts`, `profiles.ts`
- Produces: `schoolPlans`, `schoolSubscriptions`, `invoices` tables; updated `schools` table

- [ ] **Step 1: Create `billing.ts` schema file**

```typescript
// packages/database/src/schema/billing.ts
import { pgTable, uuid, varchar, numeric, jsonb, boolean, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const schoolPlans = pgTable('school_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  features: jsonb('features').$type<string[]>().default([]),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull().default('monthly'),
  maxStudents: integer('max_students').notNull().default(0),
  maxStaff: integer('max_staff').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const schoolSubscriptions = pgTable('school_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  planId: uuid('plan_id').references(() => schoolPlans.id).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  nextBillingAt: timestamp('next_billing_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  schoolIdx: index('idx_school_subscriptions_school').on(table.schoolId),
  planIdx: index('idx_school_subscriptions_plan').on(table.planId),
  statusIdx: index('idx_school_subscriptions_status').on(table.status),
}));

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => schoolSubscriptions.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  schoolIdx: index('idx_invoices_school').on(table.schoolId),
  statusIdx: index('idx_invoices_status').on(table.status),
}));
```

- [ ] **Step 2: Update `schools.ts` — add domain and customDomain columns**

Add these columns to the existing schools table:
```typescript
domain: varchar('domain', { length: 255 }),
customDomain: varchar('custom_domain', { length: 255 }),
```

Update the existing indexes section:
```typescript
slugIdx: uniqueIndex('idx_schools_slug').on(table.slug),
codeIdx: uniqueIndex('idx_schools_code').on(table.code),
```

- [ ] **Step 3: Update `index.ts` to export billing tables**

```typescript
// packages/database/src/schema/index.ts
export * from './billing';
export { schoolPlans, schoolSubscriptions, invoices } from './billing';
```

- [ ] **Step 4: Run migration**

```bash
pnpm db:migrate
```
Expected: Drizzle creates three new tables and adds two columns to schools.

- [ ] **Step 5: Verify schema**

```bash
pnpm t --filter=database
```
Expected: Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat: add billing schema (plans, subscriptions, invoices)"
```

---

### Task 3: Build Shared API Infrastructure

**Files:**
- Create: `apps/web/lib/api/response.ts`
- Create: `apps/web/lib/api/errors.ts`
- Create: `apps/web/lib/api/client.ts`
- Create: `apps/web/lib/api/require-role.ts`

**Interfaces:**
- Consumes: existing `auth()` from `@/lib/auth/auth.config.ts`
- Produces: reusable API patterns used by all Phase 2+ API routes and pages

- [ ] **Step 1: Create `response.ts`**

```typescript
// apps/web/lib/api/response.ts
import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function apiSuccess<T>(data: T, meta?: ApiResponse['meta']) {
  return NextResponse.json({ success: true, data, meta } satisfies ApiResponse<T>);
}

export function apiError(
  status: number,
  message: string,
  errors?: Record<string, string[]>
) {
  return NextResponse.json(
    { success: false, error: message, errors } satisfies ApiResponse,
    { status }
  );
}
```

- [ ] **Step 2: Create `errors.ts`**

```typescript
// apps/web/lib/api/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 422, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}
```

- [ ] **Step 3: Create `require-role.ts`**

```typescript
// apps/web/lib/api/require-role.ts
import { auth } from '@/lib/auth/auth.config';
import { UserRole } from '@edunexus/shared/src/types/common';
import { UnauthorizedError, ForbiddenError } from './errors';
import { apiError } from './response';

export async function requireRole(...roles: UserRole[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: apiError(401, 'Unauthorized'), user: null as const };
  }
  if (!roles.includes(session.user.role as UserRole)) {
    return { error: apiError(403, 'Forbidden: insufficient permissions'), user: null as const };
  }
  return { error: null, user: session.user as { id: string; role: UserRole; schoolId: string | null; email: string; name: string } };
}
```

- [ ] **Step 4: Create `client.ts`**

```typescript
// apps/web/lib/api/client.ts
'use client';

import { QueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';

export function getQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function useAuthenticatedFetch() {
  const { data: session } = useSession();

  async function authFetch(url: string, options?: RequestInit) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Request failed');
    }

    return json;
  }

  return { authFetch, session };
}
```

- [ ] **Step 5: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/api/
git commit -m "feat: add shared API infrastructure (response, errors, client, require-role)"
```

---

### Task 4: Build Shared UI Components

**Files:**
- Create: `apps/web/components/data-table.tsx`
- Create: `apps/web/components/confirm-dialog.tsx`
- Create: `apps/web/components/empty-state.tsx`
- Create: `apps/web/components/page-header.tsx`
- Create: `apps/web/components/stat-card.tsx`

**Interfaces:**
- Consumes: shadcn/ui components (Table, Dialog, Card, Button, Badge)
- Produces: reusable page building blocks used by all Phase 2+ pages

- [ ] **Step 1: Create `stat-card.tsx`**

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-text-muted">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-text-muted">{description}</p>
            )}
          </div>
          <div className="rounded-full bg-accent-50 p-3">
            <Icon className="h-5 w-5 text-accent-600" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-xs">
            <span className={cn(
              'font-medium',
              trend.direction === 'up' && 'text-green-600',
              trend.direction === 'down' && 'text-red-600',
              trend.direction === 'neutral' && 'text-text-muted'
            )}>
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
            <span className="text-text-muted">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `page-header.tsx`**

```tsx
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
      <Separator className="mt-4" />
    </div>
  );
}
```

- [ ] **Step 3: Create `empty-state.tsx`**

```tsx
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Inbox, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-accent-50 p-4">
        <Icon className="h-8 w-8 text-accent-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{heading}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `confirm-dialog.tsx`**

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? 'bg-status-danger hover:bg-red-600' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 5: Create `data-table.tsx`**

```tsx
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  totalCount?: number;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  });

  return (
    <div>
      {searchKey && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="max-w-sm pl-9"
          />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-text-muted">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data.length > 0 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-text-muted">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/
git commit -m "feat: add shared UI components (data-table, confirm-dialog, empty-state, page-header, stat-card)"
```

---

### Task 5: Build Shared Hooks

**Files:**
- Create: `apps/web/hooks/use-pagination.ts`
- Create: `apps/web/hooks/use-filters.ts`
- Create: `apps/web/hooks/use-debounce.ts`
- Create: `apps/web/hooks/use-payment.ts`

- [ ] **Step 1: Create `use-debounce.ts`**

```typescript
'use client';

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 2: Create `use-pagination.ts`**

```typescript
'use client';

import { useState, useMemo } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
}

export function usePagination({ initialPage = 1, initialPageSize = 10, total = 0 }: UsePaginationProps = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
```

- [ ] **Step 3: Create `use-filters.ts`**

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';

type FilterValue = string | number | boolean | undefined | null;

interface FilterState {
  [key: string]: FilterValue;
}

export function useFilters(initialFilters: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== null && v !== '').length,
    [filters]
  );

  return { filters, setFilter, resetFilters, activeFilterCount };
}
```

- [ ] **Step 4: Create `use-payment.ts`**

```typescript
'use client';

import { useState } from 'react';

interface PaymentParams {
  amount: number;
  email: string;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  reference: string;
  authorizationUrl?: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = async (params: PaymentParams): Promise<PaymentResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (reference: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/verify?reference=${reference}`);
      const json = await res.json();
      return json.success && json.data?.status === 'success';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { initializePayment, verifyPayment, isLoading, error };
}
```

- [ ] **Step 5: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/hooks/
git commit -m "feat: add shared hooks (pagination, filters, debounce, payment)"
```

---

### Task 6: Build Email Service

**Files:**
- Create: `apps/web/services/email/index.ts`
- Create: `apps/web/services/email/templates/welcome-admin.ts`

**Interfaces:**
- Produces: `sendEmail({ to, subject, html })` — used by user creation in Task 10

- [ ] **Step 1: Create email service wrapper**

```typescript
// apps/web/services/email/index.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  // In development, log instead of sending
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${html.substring(0, 200)}...`);
    return { success: true as const, id: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'EduNexus <noreply@edunexus.com>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL] Send failed:', error);
      return { success: false as const, error: error.message };
    }

    return { success: true as const, id: data?.id };
  } catch (err) {
    console.error('[EMAIL] Send error:', err);
    return { success: false as const, error: 'Failed to send email' };
  }
}
```

- [ ] **Step 2: Create welcome admin email template**

```typescript
// apps/web/services/email/templates/welcome-admin.ts
interface WelcomeAdminParams {
  schoolName: string;
  schoolUrl: string;
  email: string;
  password: string;
  adminName: string;
}

export function welcomeAdminEmail(params: WelcomeAdminParams): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1a1a2e;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Welcome to EduNexus</h1>
    </div>
    <p style="font-size: 16px; line-height: 1.5;">Hi ${params.adminName},</p>
    <p style="font-size: 16px; line-height: 1.5;">
      Your school, <strong>${params.schoolName}</strong>, has been registered on EduNexus.
      You can now log in to manage your school's operations.
    </p>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px;"><strong>School Portal:</strong></p>
      <p style="margin: 0 0 4px;"><a href="${params.schoolUrl}" style="color: #4f46e5;">${params.schoolUrl}</a></p>
      <p style="margin: 0 0 12px;"><strong>Email:</strong> ${params.email}</p>
      <p style="margin: 0 0 4px;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${params.password}</code></p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">Please change your password after logging in.</p>
    </div>
    <p style="font-size: 16px; line-height: 1.5;">
      If you have any questions, contact the EduNexus support team.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      &copy; ${new Date().getFullYear()} EduNexus. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/email/
git commit -m "feat: add email service with Resend wrapper and welcome template"
```

---

### Task 7: Build Payment Infrastructure

**Files:**
- Create: `apps/web/services/payment/types.ts`
- Create: `apps/web/services/payment/index.ts`
- Create: `apps/web/services/payment/providers/paystack.ts`
- Create: `apps/web/components/ui/payment-button.tsx`
- Create: `apps/web/components/ui/payment-status.tsx`
- Create: `apps/web/app/api/payments/webhook/route.ts`

- [ ] **Step 1: Create payment types (interface)**

```typescript
// apps/web/services/payment/types.ts
export interface InitializePaymentParams {
  amount: number; // in GHS (not pesewas)
  email: string;
  reference?: string;
  metadata?: Record<string, string>;
  callbackUrl?: string;
}

export interface PaymentVerificationResult {
  status: 'success' | 'failed' | 'pending';
  reference: string;
  amount: number;
  paidAt?: string;
  metadata?: Record<string, string>;
}

export interface IPaymentProvider {
  initializePayment(params: InitializePaymentParams): Promise<{
    success: boolean;
    reference?: string;
    authorizationUrl?: string;
    error?: string;
  }>;
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
  handleWebhook(payload: unknown): Promise<{ event: string; reference?: string; status?: string }>;
}
```

- [ ] **Step 2: Create Paystack provider**

```typescript
// apps/web/services/payment/providers/paystack.ts
import { IPaymentProvider, InitializePaymentParams, PaymentVerificationResult } from '../types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_API = 'https://api.paystack.co';

export class PaystackProvider implements IPaymentProvider {
  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async initializePayment(params: InitializePaymentParams) {
    try {
      const response = await this.request('POST', '/transaction/initialize', {
        amount: Math.round(params.amount * 100), // Convert GHS to pesewas
        email: params.email,
        reference: params.reference,
        metadata: params.metadata,
        callback_url: params.callbackUrl,
      });

      if (!response.status) {
        return { success: false, error: response.message || 'Payment initialization failed' };
      }

      return {
        success: true,
        reference: response.data.reference,
        authorizationUrl: response.data.authorization_url,
      };
    } catch (err) {
      return { success: false, error: 'Payment service unavailable' };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const response = await this.request('GET', `/transaction/verify/${reference}`);

    return {
      status: response.data?.status === 'success' ? 'success' : response.data?.status === 'failed' ? 'failed' : 'pending',
      reference,
      amount: (response.data?.amount || 0) / 100,
      paidAt: response.data?.paid_at,
      metadata: response.data?.metadata,
    };
  }

  async handleWebhook(payload: any) {
    const event = payload?.event || '';
    const reference = payload?.data?.reference || '';
    const status = payload?.data?.status || '';

    return { event, reference, status };
  }
}
```

- [ ] **Step 3: Create payment service factory**

```typescript
// apps/web/services/payment/index.ts
import { IPaymentProvider } from './types';
import { PaystackProvider } from './providers/paystack';

let provider: IPaymentProvider | null = null;

export function getPaymentProvider(): IPaymentProvider {
  if (!provider) {
    provider = new PaystackProvider();
  }
  return provider;
}
```

- [ ] **Step 4: Create payment button component**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { usePayment } from '@/hooks/use-payment';

interface PaymentButtonProps {
  amount: number;
  email: string;
  label?: string;
  metadata?: Record<string, string>;
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function PaymentButton({
  amount,
  email,
  label = 'Pay Now',
  metadata,
  onSuccess,
  onError,
  disabled,
}: PaymentButtonProps) {
  const { initializePayment, isLoading } = usePayment();

  const handlePayment = async () => {
    const result = await initializePayment({ amount, email, metadata });
    if (result?.authorizationUrl) {
      window.open(result.authorizationUrl, '_blank');
      onSuccess?.(result.reference);
    } else {
      onError?.('Failed to initialize payment');
    }
  };

  return (
    <Button onClick={handlePayment} disabled={isLoading || disabled}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Processing...' : label}
    </Button>
  );
}
```

- [ ] **Step 5: Create payment status badge**

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface PaymentStatusProps {
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'partial';
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
  partial: { label: 'Partial', className: 'bg-blue-100 text-blue-800' },
};

export function PaymentStatus({ status }: PaymentStatusProps) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge className={cn('font-medium', config.className)} variant="outline">
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 6: Create Paystack webhook handler**

```typescript
// apps/web/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProvider } from '@/services/payment';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const provider = getPaymentProvider();

  const result = await provider.handleWebhook(payload);

  // Log the webhook event
  console.log('[PAYMENT WEBHOOK]', result);

  // Acknowledge receipt
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/services/payment/ apps/web/components/ui/payment-button.tsx apps/web/components/ui/payment-status.tsx apps/web/app/api/payments/
git commit -m "feat: add payment infrastructure with Paystack provider"
```

---

### Task 8: Build Super Admin Dashboard API + Page

**Files:**
- Create: `apps/web/app/api/super-admin/dashboard/stats/route.ts`
- Modify: `apps/web/app/(super-admin)/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard stats API route**

```typescript
// apps/web/app/api/super-admin/dashboard/stats/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schools, profiles } from '@edunexus/database/src/schema';
import { sql, count, eq, and, gte } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const [schoolStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(case when ${schools.isActive} = true then 1 end)`,
    })
    .from(schools);

  const [userStats] = await db
    .select({ total: count() })
    .from(profiles);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newSignups] = await db
    .select({ count: count() })
    .from(profiles)
    .where(gte(profiles.createdAt, thirtyDaysAgo));

  const [roleBreakdown] = await db
    .select({
      role: profiles.role,
      count: count(),
    })
    .from(profiles)
    .groupBy(profiles.role);

  return apiSuccess({
    totalSchools: Number(schoolStats.total),
    activeSchools: Number(schoolStats.active),
    totalUsers: Number(userStats.total),
    newSignupsLast30Days: Number(newSignups.count),
    usersByRole: roleBreakdown,
    systemStatus: 'healthy',
  });
}
```

- [ ] **Step 2: Rewrite super admin dashboard page**

```tsx
// apps/web/app/(super-admin)/dashboard/page.tsx
import { requireRole } from '@/lib/api/require-role';
import { apiError } from '@/lib/api/response';
import { DashboardClient } from './dashboard-client';

export default async function SuperAdminDashboardPage() {
  const { error } = await requireRole('super_admin');
  if (error) {
    const res = apiError(403, 'Forbidden');
    return <div>Access Denied</div>;
  }

  return <DashboardClient />;
}
```

- [ ] **Step 3: Create dashboard client component**

```tsx
// apps/web/app/(super-admin)/dashboard/dashboard-client.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserPlus, Activity } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchStats() {
  const res = await fetch('/api/super-admin/dashboard/stats');
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export function DashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-dashboard-stats'],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Super Admin Dashboard" description="Platform overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" description="Platform overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={data?.totalSchools ?? 0}
          icon={Building2}
        />
        <StatCard
          title="Active Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          title="New Signups (30d)"
          value={data?.newSignupsLast30Days ?? 0}
          icon={UserPlus}
        />
        <StatCard
          title="System Status"
          value={data?.systemStatus ?? 'Unknown'}
          icon={Activity}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Install tanstack/react-query if not present**

```bash
cd apps/web && pnpm add @tanstack/react-query
```

- [ ] **Step 5: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(super-admin)/dashboard/ apps/web/app/api/super-admin/dashboard/
git commit -m "feat: add super admin dashboard with real stats"
```

---

### Task 9: Build School Management API + Pages

**Files:**
- Create: `apps/web/app/api/super-admin/schools/route.ts`
- Create: `apps/web/app/api/super-admin/schools/[id]/route.ts`
- Create: `apps/web/app/(super-admin)/schools/page.tsx`
- Create: `apps/web/app/(super-admin)/schools/new/page.tsx`
- Create: `apps/web/app/(super-admin)/schools/[id]/page.tsx`
- Create: `apps/web/app/(super-admin)/schools/[id]/edit/page.tsx`

- [ ] **Step 1: Create schools list API (GET + POST)**

```typescript
// apps/web/app/api/super-admin/schools/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schools, academicYears, terms, gradeLevels } from '@edunexus/database/src/schema';
import { desc, eq, like, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createId } from '@paralleldrive/cuid2';

const createSchoolSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  code: z.string().min(2).max(20),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  curriculum: z.string().max(50).default('ghana_basic'),
  calendar: z.string().max(50).default('ghana_3_terms'),
});

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const conditions = and(
    search ? like(schools.name, `%${search}%`) : undefined,
    status === 'active' ? eq(schools.isActive, true) : undefined,
    status === 'inactive' ? eq(schools.isActive, false) : undefined,
  );

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schools)
    .where(conditions);

  const schoolList = await db
    .select()
    .from(schools)
    .where(conditions)
    .orderBy(desc(schools.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(schoolList, {
    page,
    pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { name, slug, code, email, phone, address, region, curriculum, calendar } = parsed.data;

  // Check slug uniqueness
  const [existingSlug] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
  if (existingSlug) {
    return apiError(409, 'A school with this slug already exists');
  }

  // Create school
  const [school] = await db.insert(schools).values({
    name, slug, code, email, phone, address, region, curriculum, calendar, isActive: true,
  }).returning();

  // Seed default academic year
  const year = new Date().getFullYear();
  const [academicYear] = await db.insert(academicYears).values({
    schoolId: school.id,
    name: `${year}/${year + 1}`,
    startDate: new Date(year, 8, 1), // September 1
    endDate: new Date(year + 1, 6, 31), // July 31
    isCurrent: true,
  }).returning();

  // Seed three terms
  const termData = [
    { termNumber: 1, name: 'First Term', startDate: new Date(year, 8, 1), endDate: new Date(year, 11, 20) },
    { termNumber: 2, name: 'Second Term', startDate: new Date(year + 1, 0, 7), endDate: new Date(year + 1, 3, 11) },
    { termNumber: 3, name: 'Third Term', startDate: new Date(year + 1, 4, 5), endDate: new Date(year + 1, 6, 31) },
  ];
  await db.insert(terms).values(
    termData.map((t) => ({ schoolId: school.id, academicYearId: academicYear.id, ...t }))
  );

  // Seed grade levels (KG1-JHS3)
  const gradeData = [
    { code: 'KG1', name: 'Kindergarten 1', level: 0, category: 'kindergarten', sortOrder: 1 },
    { code: 'KG2', name: 'Kindergarten 2', level: 0, category: 'kindergarten', sortOrder: 2 },
    { code: 'P1', name: 'Primary 1', level: 1, category: 'primary', sortOrder: 3 },
    { code: 'P2', name: 'Primary 2', level: 2, category: 'primary', sortOrder: 4 },
    { code: 'P3', name: 'Primary 3', level: 3, category: 'primary', sortOrder: 5 },
    { code: 'P4', name: 'Primary 4', level: 4, category: 'primary', sortOrder: 6 },
    { code: 'P5', name: 'Primary 5', level: 5, category: 'primary', sortOrder: 7 },
    { code: 'P6', name: 'Primary 6', level: 6, category: 'primary', sortOrder: 8 },
    { code: 'JHS1', name: 'Junior High School 1', level: 7, category: 'junior_high', sortOrder: 9 },
    { code: 'JHS2', name: 'Junior High School 2', level: 8, category: 'junior_high', sortOrder: 10 },
    { code: 'JHS3', name: 'Junior High School 3', level: 9, category: 'junior_high', sortOrder: 11 },
  ];
  await db.insert(gradeLevels).values(
    gradeData.map((g) => ({ schoolId: school.id, ...g }))
  );

  // Audit log
  await db.insert(auditLogs).values({
    schoolId: school.id,
    action: 'school.created',
    tableName: 'schools',
    recordId: school.id,
    newData: { name, slug, code },
  });

  return apiSuccess(school);
}
```

- [ ] **Step 2: Create single school API (GET, PATCH, DELETE)**

```typescript
// apps/web/app/api/super-admin/schools/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schools, auditLogs } from '@edunexus/database/src/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateSchoolSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const [school] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!school) return apiError(404, 'School not found');

  return apiSuccess(school);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'School not found');

  const [updated] = await db.update(schools)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schools.id, params.id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId: params.id,
    action: 'school.updated',
    tableName: 'schools',
    recordId: params.id,
    oldData: { isActive: existing.isActive },
    newData: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const [existing] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'School not found');

  await db.update(schools)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(schools.id, params.id));

  await db.insert(auditLogs).values({
    schoolId: params.id,
    action: 'school.deleted',
    tableName: 'schools',
    recordId: params.id,
    oldData: { name: existing.name, slug: existing.slug },
  });

  return apiSuccess({ deleted: true });
}
```

- [ ] **Step 3: Create schools list page**

```tsx
// apps/web/app/(super-admin)/schools/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Plus } from 'lucide-react';

interface School {
  id: string;
  name: string;
  slug: string;
  code: string;
  email: string | null;
  region: string | null;
  isActive: boolean;
  createdAt: string;
}

const columns: ColumnDef<School>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'region', header: 'Region' },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('en-GH'),
  },
];

export default function SchoolsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/schools');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Schools" description="Manage all schools on the platform">
        <Button onClick={() => router.push('/schools/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add School
        </Button>
      </PageHeader>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKey="name"
        searchPlaceholder="Search schools..."
        isLoading={isLoading}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create school creation page**

```tsx
// apps/web/app/(super-admin)/schools/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens'),
  code: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  curriculum: z.enum(['ghana_basic', 'british', 'american']),
  calendar: z.enum(['ghana_3_terms', 'british_3_terms', 'american_semester']),
});

type SchoolForm = z.infer<typeof schoolSchema>;

export default function NewSchoolPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { curriculum: 'ghana_basic', calendar: 'ghana_3_terms' },
  });

  async function onSubmit(data: SchoolForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'School created successfully' });
      router.push(`/schools/${json.data.id}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to create school', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add School" description="Create a new school on the platform" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (subdomain)</FormLabel>
                <FormControl><Input {...field} placeholder="my-school" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>School Code</FormLabel>
                <FormControl><Input {...field} placeholder="SCH001" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="region" render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl><Input {...field} placeholder="Greater Accra" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="curriculum" render={({ field }) => (
              <FormItem>
                <FormLabel>Curriculum</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ghana_basic">Ghana Basic</SelectItem>
                    <SelectItem value="british">British</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="calendar" render={({ field }) => (
              <FormItem>
                <FormLabel>Calendar</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ghana_3_terms">Ghana (3 Terms)</SelectItem>
                    <SelectItem value="british_3_terms">British (3 Terms)</SelectItem>
                    <SelectItem value="american_semester">American (Semester)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create School'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 5: Create school detail page**

```tsx
// apps/web/app/(super-admin)/schools/[id]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

export default function SchoolDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['school', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/schools/${params.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-text-muted">School not found</div>;

  return (
    <div>
      <PageHeader title={data.name} description={`Code: ${data.code} | Slug: ${data.slug}`}>
        <Button onClick={() => router.push(`/schools/${params.id}/edit`)}>Edit School</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {data.email && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <Mail className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Email</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.email}</p></CardContent>
          </Card>
        )}
        {data.phone && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <Phone className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Phone</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.phone}</p></CardContent>
          </Card>
        )}
        {data.region && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <MapPin className="h-4 w-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Region</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.region}</p></CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-text-muted">Curriculum</dt><dd className="font-medium">{data.curriculum}</dd></div>
                <div><dt className="text-sm text-text-muted">Calendar</dt><dd className="font-medium">{data.calendar}</dd></div>
                <div><dt className="text-sm text-text-muted">Status</dt><dd className="font-medium">{data.isActive ? 'Active' : 'Inactive'}</dd></div>
                {data.address && <div><dt className="text-sm text-text-muted">Address</dt><dd className="font-medium">{data.address}</dd></div>}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <p className="text-sm text-text-muted">Users will be listed here in Phase 3.</p>
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <p className="text-sm text-text-muted">Subscriptions will be managed once billing is active.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 6: Create school edit page**

```tsx
// apps/web/app/(super-admin)/schools/[id]/edit/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';

const editSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  isActive: z.boolean(),
});

export default function EditSchoolPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ['school', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/schools/${params.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: data ? { name: data.name, email: data.email || '', phone: data.phone || '', address: data.address || '', region: data.region || '', isActive: data.isActive } : undefined,
  });

  async function onSubmit(formData: z.infer<typeof editSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'School updated' });
      router.push(`/schools/${params.id}`);
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit: ${data.name}`} description="Update school information" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="region" render={({ field }) => (
            <FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 7: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/(super-admin)/schools/ apps/web/app/api/super-admin/schools/
git commit -m "feat: add school management CRUD with pages"
```

---

### Task 10: Build User Management API + Pages

**Files:**
- Create: `apps/web/app/api/super-admin/users/route.ts`
- Create: `apps/web/app/api/super-admin/users/[id]/route.ts`
- Create: `apps/web/app/(super-admin)/users/page.tsx`
- Create: `apps/web/app/(super-admin)/users/new/page.tsx`

- [ ] **Step 1: Create users list + create API**

```typescript
// apps/web/app/api/super-admin/users/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { profiles, schools } from '@edunexus/database/src/schema';
import { desc, eq, like, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendEmail } from '@/services/email';
import { welcomeAdminEmail } from '@/services/email/templates/welcome-admin';

const createUserSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const schoolId = searchParams.get('schoolId');
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const conditions = and(
    search ? like(profiles.email, `%${search}%`) : undefined,
    schoolId ? eq(profiles.schoolId, schoolId) : undefined,
    role ? eq(profiles.role, role) : undefined,
    status === 'active' ? eq(profiles.isActive, true) : undefined,
    status === 'inactive' ? eq(profiles.isActive, false) : undefined,
  );

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(profiles)
    .where(conditions);

  const userList = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      role: profiles.role,
      isActive: profiles.isActive,
      schoolId: profiles.schoolId,
      createdAt: profiles.createdAt,
      lastLoginAt: profiles.lastLoginAt,
    })
    .from(profiles)
    .where(conditions)
    .orderBy(desc(profiles.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(userList, {
    page, pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { schoolId, email, firstName, lastName, phone } = parsed.data;

  // Check email uniqueness within school
  const [existing] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), eq(profiles.schoolId, schoolId)))
    .limit(1);
  if (existing) {
    return apiError(409, 'A user with this email already exists in this school');
  }

  // Get school for welcome email
  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!school) return apiError(404, 'School not found');

  // Generate password
  const tempPassword = randomBytes(8).toString('hex');
  const passwordHash = hashPassword(tempPassword);

  const [user] = await db.insert(profiles).values({
    schoolId,
    email,
    firstName,
    lastName,
    phone,
    role: 'admin',
    passwordHash,
    isActive: true,
  }).returning();

  // Send welcome email
  await sendEmail({
    to: email,
    subject: `Welcome to EduNexus — ${school.name}`,
    html: welcomeAdminEmail({
      schoolName: school.name,
      schoolUrl: `https://${school.slug}.edunexus.com`,
      email,
      password: tempPassword,
      adminName: firstName,
    }),
  });

  return apiSuccess({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
}
```

- [ ] **Step 2: Create single user API (PATCH, DELETE)**

```typescript
// apps/web/app/api/super-admin/users/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { profiles } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(profiles).where(eq(profiles.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'User not found');

  // Prevent super_admin role change from super admin
  if (existing.role === 'super_admin') {
    return apiError(403, 'Cannot modify super admin users');
  }

  const [updated] = await db.update(profiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profiles.id, params.id))
    .returning();

  return apiSuccess(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const [existing] = await db.select().from(profiles).where(eq(profiles.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'User not found');
  if (existing.role === 'super_admin') return apiError(403, 'Cannot delete super admin users');

  await db.update(profiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(profiles.id, params.id));

  return apiSuccess({ deleted: true });
}
```

- [ ] **Step 3: Create users list page**

```tsx
// apps/web/app/(super-admin)/users/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

const columns: ColumnDef<User>[] = [
  {
    header: 'Name',
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => roleLabels[row.original.role] || row.original.role,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'lastLoginAt',
    header: 'Last Login',
    cell: ({ row }) => row.original.lastLoginAt
      ? new Date(row.original.lastLoginAt).toLocaleDateString('en-GH')
      : 'Never',
  },
];

export default function UsersPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/users');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Users" description="Manage users across all schools">
        <Button onClick={() => router.push('/users/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </PageHeader>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKey="email"
        searchPlaceholder="Search by email..."
        isLoading={isLoading}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create user creation page**

```tsx
// apps/web/app/(super-admin)/users/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';

const userSchema = z.object({
  schoolId: z.string().min(1, 'School is required'),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: schoolsData } = useQuery({
    queryKey: ['schools-list'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/schools');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
  });

  async function onSubmit(data: z.infer<typeof userSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: 'Error', description: json.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Admin user created. Welcome email sent.' });
      router.push('/users');
    } catch {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Admin User" description="Create an admin account for a school" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="schoolId" render={({ field }) => (
            <FormItem>
              <FormLabel>School</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger></FormControl>
                <SelectContent>
                  {(schoolsData || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone (optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Admin User'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(super-admin)/users/ apps/web/app/api/super-admin/users/
git commit -m "feat: add user management CRUD with welcome email"
```

---

### Task 11: Build Audit Log Viewer

**Files:**
- Create: `apps/web/app/api/super-admin/audit-logs/route.ts`
- Create: `apps/web/app/(super-admin)/audit-logs/page.tsx`

- [ ] **Step 1: Create audit logs API**

```typescript
// apps/web/app/api/super-admin/audit-logs/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { auditLogs } from '@edunexus/database/src/schema';
import { desc, eq, and, gte, lte, like, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const schoolId = searchParams.get('schoolId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const conditions = and(
    action ? eq(auditLogs.action, action) : undefined,
    userId ? eq(auditLogs.userId, userId) : undefined,
    schoolId ? eq(auditLogs.schoolId, schoolId) : undefined,
    dateFrom ? gte(auditLogs.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(auditLogs.createdAt, new Date(dateTo)) : undefined,
  );

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(conditions);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(conditions)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(logs, {
    page, pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
}
```

- [ ] **Step 2: Create audit logs page**

```tsx
// apps/web/app/(super-admin)/audit-logs/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Input } from '@/components/ui/input';

interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  userId: string | null;
  schoolId: string | null;
  createdAt: string;
}

const columns: ColumnDef<AuditLog>[] = [
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'tableName', header: 'Table' },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('en-GH'),
  },
];

export default function AuditLogsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/super-admin/audit-logs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Audit Logs" description="System activity log" />
      <div className="mb-4 flex gap-4">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-48" placeholder="From date" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-48" placeholder="To date" />
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(super-admin)/audit-logs/ apps/web/app/api/super-admin/audit-logs/
git commit -m "feat: add audit log viewer with date filtering"
```

---

### Task 12: Build Billing Management (Plans + Subscriptions)

**Files:**
- Create: `apps/web/app/api/super-admin/plans/route.ts`
- Create: `apps/web/app/api/super-admin/plans/[id]/route.ts`
- Create: `apps/web/app/api/super-admin/subscriptions/route.ts`
- Create: `apps/web/app/api/super-admin/subscriptions/[id]/route.ts`
- Create: `apps/web/app/(super-admin)/plans/page.tsx`
- Create: `apps/web/app/(super-admin)/plans/new/page.tsx`
- Create: `apps/web/app/(super-admin)/plans/[id]/edit/page.tsx`
- Create: `apps/web/app/(super-admin)/subscriptions/page.tsx`

- [ ] **Step 1: Create plans API (GET, POST)**

```typescript
// apps/web/app/api/super-admin/plans/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolPlans } from '@edunexus/database/src/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const createPlanSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  maxStudents: z.number().int().min(0).default(0),
  maxStaff: z.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
});

export async function GET() {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const plans = await db.select().from(schoolPlans).orderBy(desc(schoolPlans.createdAt));
  return apiSuccess(plans);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [plan] = await db.insert(schoolPlans).values(parsed.data).returning();
  return apiSuccess(plan);
}
```

- [ ] **Step 2: Create single plan API (PATCH)**

```typescript
// apps/web/app/api/super-admin/plans/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolPlans } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updatePlanSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(500).optional(),
  price: z.number().positive().optional(),
  maxStudents: z.number().int().min(0).optional(),
  maxStaff: z.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schoolPlans).where(eq(schoolPlans.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'Plan not found');

  const [updated] = await db.update(schoolPlans)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schoolPlans.id, params.id))
    .returning();

  return apiSuccess(updated);
}
```

- [ ] **Step 3: Create subscriptions API (GET, PATCH)**

```typescript
// apps/web/app/api/super-admin/subscriptions/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolSubscriptions, schools, schoolPlans } from '@edunexus/database/src/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export async function GET() {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const subscriptions = await db
    .select({
      id: schoolSubscriptions.id,
      schoolId: schoolSubscriptions.schoolId,
      planId: schoolSubscriptions.planId,
      status: schoolSubscriptions.status,
      startedAt: schoolSubscriptions.startedAt,
      nextBillingAt: schoolSubscriptions.nextBillingAt,
      schoolName: schools.name,
      planName: schoolPlans.name,
      planPrice: schoolPlans.price,
    })
    .from(schoolSubscriptions)
    .leftJoin(schools, eq(schoolSubscriptions.schoolId, schools.id))
    .leftJoin(schoolPlans, eq(schoolSubscriptions.planId, schoolPlans.id))
    .orderBy(desc(schoolSubscriptions.createdAt));

  return apiSuccess(subscriptions);
}
```

```typescript
// apps/web/app/api/super-admin/subscriptions/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolSubscriptions } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'past_due', 'cancelled', 'expired']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'Subscription not found');

  const [updated] = await db.update(schoolSubscriptions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schoolSubscriptions.id, params.id))
    .returning();

  return apiSuccess(updated);
}
```

- [ ] **Step 4: Create plans list page**

```tsx
// apps/web/app/(super-admin)/plans/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Plus } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  code: string;
  price: string;
  billingCycle: string;
  maxStudents: number;
  isActive: boolean;
}

const columns: ColumnDef<Plan>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'code', header: 'Code' },
  {
    header: 'Price',
    cell: ({ row }) => `₵${row.original.price} / ${row.original.billingCycle}`,
  },
  { accessorKey: 'maxStudents', header: 'Max Students' },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function PlansPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/plans');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Pricing Plans" description="Manage subscription plans">
        <Button onClick={() => router.push('/plans/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add Plan
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 5: Create plan create + edit pages**

```tsx
// apps/web/app/(super-admin)/plans/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';

const planSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  maxStudents: z.coerce.number().int().min(0).default(0),
  maxStaff: z.coerce.number().int().min(0).default(0),
});

export default function NewPlanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { billingCycle: 'monthly', maxStudents: 0, maxStaff: 0 },
  });

  async function onSubmit(data: z.infer<typeof planSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, features: [] }),
      });
      const json = await res.json();
      if (!json.success) { toast({ title: 'Error', description: json.error, variant: 'destructive' }); return; }
      toast({ title: 'Success', description: 'Plan created' });
      router.push('/plans');
    } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Plan" description="Create a new pricing plan" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input {...field} type="number" step="0.01" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="billingCycle" render={({ field }) => (
              <FormItem><FormLabel>Billing Cycle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="maxStudents" render={({ field }) => (
              <FormItem><FormLabel>Max Students</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Plan'}</Button>
        </form>
      </Form>
    </div>
  );
}
```

```tsx
// apps/web/app/(super-admin)/plans/[id]/edit/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';

const editPlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.coerce.number().positive().optional(),
  maxStudents: z.coerce.number().int().min(0).optional(),
  maxStaff: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export default function EditPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ['plan', params.id],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/plans');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.find((p: any) => p.id === params.id);
    },
  });

  const form = useForm<z.infer<typeof editPlanSchema>>({
    resolver: zodResolver(editPlanSchema),
    values: data ? { name: data.name, description: data.description, price: parseFloat(data.price), maxStudents: data.maxStudents, maxStaff: data.maxStaff, isActive: data.isActive } : undefined,
  });

  async function onSubmit(formData: z.infer<typeof editPlanSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) { toast({ title: 'Error', description: json.error, variant: 'destructive' }); return; }
      toast({ title: 'Success', description: 'Plan updated' });
      router.push('/plans');
    } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }); }
    finally { setIsSubmitting(false); }
  }

  if (!data) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit: ${data.name}`} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input {...field} type="number" step="0.01" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="maxStudents" render={({ field }) => (
              <FormItem><FormLabel>Max Students</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
            </FormItem>
          )} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 6: Create subscriptions page**

```tsx
// apps/web/app/(super-admin)/subscriptions/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

interface Subscription {
  id: string;
  schoolName: string | null;
  planName: string | null;
  planPrice: string | null;
  status: string;
  startedAt: string;
  nextBillingAt: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  past_due: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
};

const columns: ColumnDef<Subscription>[] = [
  { accessorKey: 'schoolName', header: 'School' },
  { accessorKey: 'planName', header: 'Plan' },
  {
    header: 'Price',
    cell: ({ row }) => row.original.planPrice ? `₵${row.original.planPrice}` : '-',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status] || ''} variant="outline">
        {row.original.status.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'startedAt',
    header: 'Started',
    cell: ({ row }) => new Date(row.original.startedAt).toLocaleDateString('en-GH'),
  },
  {
    accessorKey: 'nextBillingAt',
    header: 'Next Billing',
    cell: ({ row }) => row.original.nextBillingAt ? new Date(row.original.nextBillingAt).toLocaleDateString('en-GH') : '-',
  },
];

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/subscriptions');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Subscriptions" description="School subscription status" />
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 7: Verify typecheck**

```bash
pnpm t --filter=web
```
Expected: Typecheck passes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/(super-admin)/plans/ apps/web/app/(super-admin)/subscriptions/ apps/web/app/api/super-admin/plans/ apps/web/app/api/super-admin/subscriptions/
git commit -m "feat: add billing management (plans + subscriptions CRUD)"
```

---

### Task 13: Update ROADMAP.md with New Phase Structure

**Files:**
- Modify: `ROADMAP.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Read current ROADMAP.md**

```bash
cat ROADMAP.md
```

- [ ] **Step 2: Rewrite ROADMAP.md with new phase structure**

Update the phase table to match the new role-based plan.

- [ ] **Step 3: Verify everything works together**

```bash
pnpm t --filter=web --filter=database
pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md AGENTS.md
git commit -m "docs: update roadmap and agents instructions for role-based phases"
```

---

### Self-Review Checklist

- [ ] All API routes return `{ success, data, error, meta }` envelope
- [ ] All API routes guarded by `requireRole('super_admin')`
- [ ] All CUD operations logged to `audit_logs` table
- [ ] TypeScript strict mode — no `any` types in production code
- [ ] shadcn/ui components only, no custom CSS for layout
- [ ] No hardcoded secrets — all env vars via `process.env`
- [ ] School creation seeds all default data (academic year, terms, grade levels)
- [ ] User creation sends welcome email
- [ ] Payment provider is abstracted via interface
- [ ] All monetary values use `numeric` type (not float)
- [ ] All Pagination uses `page`/`pageSize`/`total`/`totalPages` meta
