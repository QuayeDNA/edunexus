'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
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
  {
    header: 'Name',
    cell: ({ row }) => (
      <a href={`/plans/${row.original.id}/edit`} className="font-medium hover:underline">
        {row.original.name}
      </a>
    ),
  },
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
