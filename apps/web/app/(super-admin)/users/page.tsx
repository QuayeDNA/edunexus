"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";

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
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

const columns: ColumnDef<User>[] = [
  {
    header: "Name",
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => roleLabels[row.original.role] || row.original.role,
  },
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
    accessorKey: "lastLoginAt",
    header: "Last Login",
    cell: ({ row }) =>
      row.original.lastLoginAt
        ? new Date(row.original.lastLoginAt).toLocaleDateString("en-GH")
        : "Never",
  },
];

export default function UsersPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
  });

  return (
    <div>
      <PageHeader title="Users" description="Manage users across all schools">
        <Button onClick={() => router.push("/users/new")}>
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
