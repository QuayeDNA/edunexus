"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";

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
  active: "bg-green-100 text-green-800",
  past_due: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

const columns: ColumnDef<Subscription>[] = [
  { accessorKey: "schoolName", header: "School" },
  { accessorKey: "planName", header: "Plan" },
  {
    header: "Price",
    cell: ({ row }) =>
      row.original.planPrice ? `₵${row.original.planPrice}` : "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        className={statusColors[row.original.status] || ""}
        variant="outline"
      >
        {row.original.status.replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "startedAt",
    header: "Started",
    cell: ({ row }) =>
      new Date(row.original.startedAt).toLocaleDateString("en-GH"),
  },
  {
    accessorKey: "nextBillingAt",
    header: "Next Billing",
    cell: ({ row }) =>
      row.original.nextBillingAt
        ? new Date(row.original.nextBillingAt).toLocaleDateString("en-GH")
        : "-",
  },
];

export default function SubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/subscriptions");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="School subscription status"
      />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
