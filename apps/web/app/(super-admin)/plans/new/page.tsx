"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const planSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  billingCycle: z.enum(["monthly", "annual"]),
  maxStudents: z.coerce.number().int().min(0),
  maxStaff: z.coerce.number().int().min(0),
});

export default function NewPlanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { billingCycle: "monthly", maxStudents: 0, maxStaff: 0 },
  });

  async function onSubmit(data: z.infer<typeof planSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, features: [] }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error);
        return;
      }
      toast.success("Plan created");
      router.push("/plans");
    } catch {
      toast.error("Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Plan" description="Create a new pricing plan" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Plan Name</Label>
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
            name="code"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Code</Label>
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
          name="description"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Description</Label>
              <Textarea id={field.name} {...field} />
              {fieldState.error?.message && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
          <Controller
            control={form.control}
            name="price"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Price (GHS)</Label>
                <Input id={field.name} {...field} type="number" step="0.01" />
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
            name="billingCycle"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label>Billing</Label>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={[
                    { value: "monthly", label: "Monthly" },
                    { value: "annual", label: "Annual" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
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
            name="maxStudents"
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Max Students</Label>
                <Input id={field.name} {...field} type="number" />
                {fieldState.error?.message && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Plan"}
        </Button>
      </form>
    </div>
  );
}
