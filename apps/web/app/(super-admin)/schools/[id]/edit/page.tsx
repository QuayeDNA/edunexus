"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const editSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  isActive: z.boolean(),
});

export default function EditSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = use(params);

  // TODO(separation-of-concern): Move the API calls out of the page component.
  // Future: extract fetching into a hook (e.g. useSchool(id)) and the PATCH submit
  // into a Server Action / route-handler wrapper, keeping this page presentational.
  const { data } = useQuery({
    queryKey: ["school", id],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/schools/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: data
      ? {
          name: data.name,
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          region: data.region || "",
          isActive: data.isActive,
        }
      : undefined,
  });

  async function onSubmit(formData: z.infer<typeof editSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Update failed");
        return;
      }
      toast.success("School updated");
      router.push(`/schools/${id}`);
    } catch {
      toast.error("Update failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data)
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Edit: ${data.name}`}
        description="Update school information"
      />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Name</Label>
              <Input id={field.name} {...field} />
              {fieldState.error?.message && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input id={field.name} {...field} />
                {fieldState.error?.message && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Phone</Label>
                <Input id={field.name} {...field} />
                {fieldState.error?.message && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
        <Controller
          control={form.control}
          name="address"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Address</Label>
              <Input id={field.name} {...field} />
              {fieldState.error?.message && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="region"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Region</Label>
              <Input id={field.name} {...field} />
              {fieldState.error?.message && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor={field.name}>Active</Label>
            </div>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
