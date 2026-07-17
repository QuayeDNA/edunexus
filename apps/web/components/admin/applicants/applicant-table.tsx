'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ApplicantStatsBar } from './applicant-stats-bar';
import { EmptyState } from '@/components/empty-state';
import { fetchApplicants, fetchApplicantStats } from '@/lib/api/applicants';
import { ClipboardList } from 'lucide-react';

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
  const [status, setStatus] = useState<string | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);

  const queryKey = ['applicants', { status, gradeLevelId, search: committedSearch, page }] as const;
  const applicantsQuery = useQuery({
    queryKey,
    queryFn: () => fetchApplicants({ status, gradeLevelId, search: committedSearch, page }),
  });

  const statsQuery = useQuery({
    queryKey: ['applicants-stats'],
    queryFn: () => fetchApplicantStats(),
  });

  const applicants = applicantsQuery.data?.data ?? [];
  const stats = statsQuery.data?.data ?? null;
  const totalPages = applicantsQuery.data?.pagination?.totalPages ?? 1;
  const total = applicantsQuery.data?.pagination?.total ?? 0;
  const loading = applicantsQuery.isLoading;

  useEffect(() => { setPage(1); }, [status, gradeLevelId, committedSearch]);

  return (
    <div className="space-y-6">
      {stats && (
        <ApplicantStatsBar stats={stats} activeStatus={status} onStatusChange={setStatus} />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={gradeLevelId} onValueChange={(value) => setGradeLevelId(value as string)}
            items={gradeLevels.map(g => ({ value: g.id, label: g.name }))}>
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setCommittedSearch(searchInput); setPage(1); } }}
          />
        </div>
        <Button variant="outline" onClick={() => { setCommittedSearch(searchInput); statsQuery.refetch(); }}>Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          heading="No applicants found"
          description="Applicants appear here when they submit the public application form or are added manually."
        />
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
