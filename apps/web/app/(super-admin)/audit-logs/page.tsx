"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";

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
  { accessorKey: "action", header: "Action" },
  { accessorKey: "tableName", header: "Table" },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("en-GH"),
  },
];

export default function AuditLogsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
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
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-48"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-48"
        />
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
