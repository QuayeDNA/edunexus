'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StudentStatsBar } from './student-stats-bar';

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800',
  graduated: 'bg-blue-100 text-blue-800',
};
const statusLabel: Record<string, string> = {
  active: 'Active', withdrawn: 'Withdrawn',
  transferred_out: 'Transferred', graduated: 'Graduated',
};

interface ClassOption { id: string; name: string; code: string | null; gradeLevelId: string }
interface GradeOption { id: string; name: string; code: string }
interface StudentTableProps { classes: ClassOption[]; gradeLevels: GradeOption[] }
interface StudentRow {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  studentIdNumber: string; gender: string; status: string;
  enrollmentDate: string; className: string | null;
  gradeLevelName: string | null; guardianName: string | null;
}
interface StatsData {
  total: number; activeCount: number;
  byStatus: Array<{ status: string; count: number }>;
  byClass: Array<{ className: string; count: number }>;
}

export function StudentTable({ classes, gradeLevels }: StudentTableProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [classId, setClassId] = useState<string>('');
  const [gradeLevelId, setGradeLevelId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (classId) params.set('classId', classId);
      if (gradeLevelId) params.set('gradeLevelId', gradeLevelId);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const [studentsRes, statsRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch('/api/students/stats'),
      ]);
      if (studentsRes.ok) {
        const d = await studentsRes.json();
        setStudents(d.data ?? []);
        setTotalPages(d.meta?.totalPages ?? 1);
        setTotal(d.meta?.total ?? 0);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
    } finally { setLoading(false); }
  }, [status, classId, gradeLevelId, search, page]);

  useEffect(() => { fetchData(); }, [status, classId, gradeLevelId, page]);
  useEffect(() => { setPage(1); }, [status, classId, gradeLevelId]);

  const handleClassFilter = (className: string | null) => {
    if (!className) { setClassId(''); return; }
    const found = classes.find(c => c.name === className);
    setClassId(found?.id ?? '');
  };

  return (
    <div className="space-y-6">
      {stats && (
        <StudentStatsBar stats={stats} activeStatus={status}
          onStatusChange={setStatus} onClassFilter={handleClassFilter} />
      )}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={classId} onValueChange={v => setClassId(v as string)}>
            <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={gradeLevelId} onValueChange={v => setGradeLevelId(v as string)}>
            <SelectTrigger><SelectValue placeholder="All Grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Grades</SelectItem>
              {gradeLevels.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by name or ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(); }} />
        </div>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No students found</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/students/${s.id}`} className="font-medium hover:underline">
                        {s.firstName} {s.lastName}
                      </Link>
                      {s.guardianName && (
                        <p className="text-xs text-muted-foreground">{s.guardianName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.studentIdNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.className ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadge[s.status] ?? ''}>
                        {statusLabel[s.status] ?? s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/students/${s.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
