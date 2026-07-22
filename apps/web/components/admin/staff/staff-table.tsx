'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Pencil, XCircle } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StaffRow {
  id: string; staffIdNumber: string; firstName: string; lastName: string;
  role: string; department: string | null; status: string; phone: string; email: string | null;
}

interface Props {
  data: StaffRow[];
  loading?: boolean;
  onDeactivate: (id: string, name: string) => void;
}

const DEPARTMENTS = [
  { value: 'academic', label: 'Academic' }, { value: 'administration', label: 'Administration' },
  { value: 'finance', label: 'Finance' }, { value: 'library', label: 'Library' },
  { value: 'transport', label: 'Transport' }, { value: 'health', label: 'Health' },
];

const ROLES = [
  { value: 'teacher', label: 'Teacher' }, { value: 'admin', label: 'Admin' },
  { value: 'support', label: 'Support' }, { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' }, { value: 'transport', label: 'Transport' },
  { value: 'nurse', label: 'Nurse' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
];

export function StaffTable({ data, loading, onDeactivate }: Props) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const filteredData = data.filter((s) => {
    const matchesSearch = !search ||
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.staffIdNumber.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !department || s.department === department;
    const matchesRole = !role || s.role === role;
    const matchesStatus = !status || s.status === status;
    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Name or Staff ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Label htmlFor="dept-filter">Department</Label>
          <Select value={department} onValueChange={(v) => setDepartment(v as string)} items={DEPARTMENTS}>
            <SelectTrigger id="dept-filter"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label htmlFor="role-filter">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as string)} items={ROLES}>
            <SelectTrigger id="role-filter"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as string)} items={STATUS_OPTIONS}>
            <SelectTrigger id="status-filter"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No staff found</TableCell></TableRow>
          ) : (
            filteredData.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.staffIdNumber}</TableCell>
                <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                <TableCell className="capitalize">{s.role}</TableCell>
                <TableCell>{s.department ?? '\u2014'}</TableCell>
                <TableCell>{s.phone}</TableCell>
                <TableCell><Badge variant={s.status === 'active' ? 'success' : 'danger'}>{s.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/staff/${s.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}><Eye className="h-4 w-4" /></Link>
                    <Link href={`/admin/staff/${s.id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}><Pencil className="h-4 w-4" /></Link>
                    {s.status === 'active' && (
                      <Button variant="ghost" size="sm" onClick={() => onDeactivate(s.id, `${s.firstName} ${s.lastName}`)}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
