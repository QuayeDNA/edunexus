"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";

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
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <a
        href={`/schools/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </a>
    ),
  },
  { accessorKey: "code", header: "Code" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "region", header: "Region" },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "outline"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-GH"),
  },
];

export default function SchoolsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/schools");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader
        title="Schools"
        description="Manage all schools on the platform"
      >
        <Button onClick={() => router.push("/schools/new")}>
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
