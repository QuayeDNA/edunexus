'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ApplicantStatsBar } from './applicant-stats-bar';
import type { ApplicantStats, ApplicantListItem } from '@/types/applicant';

const statusBadge: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-purple-100 text-purple-800',
};

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
};

interface ApplicantTableProps {
  gradeLevels: Array<{ id: string; name: string; code: string }>;
}

export function ApplicantTable({ gradeLevels }: ApplicantTableProps) {
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [stats, setStats] = useState<ApplicantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (gradeLevelId) params.set('gradeLevelId', gradeLevelId);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const [applicantsRes, statsRes] = await Promise.all([
        fetch(`/api/applicants?${params}`),
        fetch('/api/applicants/stats'),
      ]);

      if (applicantsRes.ok) {
        const data = await applicantsRes.json();
        setApplicants(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, gradeLevelId, page]);

  useEffect(() => {
    setPage(1);
  }, [status, gradeLevelId]);

  return (
    <div className="space-y-6">
      {stats && (
        <ApplicantStatsBar stats={stats} activeStatus={status} onStatusChange={setStatus} />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={gradeLevelId} onValueChange={setGradeLevelId}>
            <SelectTrigger>
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All grades</SelectItem>
              {gradeLevels.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or guardian..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
          />
        </div>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No applicants found</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Guardian</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date Applied</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/applicants/${a.id}`} className="font-medium hover:underline">
                        {a.firstName} {a.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadge[a.status] ?? ''}>
                        {statusLabel[a.status] ?? a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.guardianName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString('en-GH')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/applicants/${a.id}`}>
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
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
