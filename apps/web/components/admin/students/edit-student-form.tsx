"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import type { StudentProfileData } from "@/types/students";

const formSchema = z.object({
  firstName: z.string().min(1, "Required").max(100),
  lastName: z.string().min(1, "Required").max(100),
  otherNames: z.string().max(100).optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z
    .string()
    .min(1, "Required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  placeOfBirth: z.string().max(100).optional().or(z.literal("")),
  nationality: z.string().max(100).optional().or(z.literal("")),
  religion: z.string().max(50).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  medicalNotes: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function EditStudentForm({ student }: { student: StudentProfileData }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      otherNames: student.otherNames ?? "",
      gender: student.gender as "male" | "female",
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth ?? "",
      nationality: student.nationality ?? "",
      religion: student.religion ?? "",
      address: student.address ?? "",
      phone: student.phone ?? "",
      email: student.email ?? "",
      bloodGroup: student.bloodGroup ?? "",
      medicalNotes: student.medicalNotes ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setServerError("");
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
      );
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Failed to update student");
        return;
      }
      toast.success("Student profile updated");
      router.push(`/admin/students/${student.id}`);
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="First Name" error={errors.firstName?.message}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Other Names">
          <Controller
            name="otherNames"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Gender" error={errors.gender?.message}>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="YYYY-MM-DD" />
            )}
          />
        </Field>
        <Field label="Place of Birth">
          <Controller
            name="placeOfBirth"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Nationality">
          <Controller
            name="nationality"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Religion">
          <Controller
            name="religion"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Phone">
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Field>
        <Field label="Email">
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} type="email" />}
          />
        </Field>
        <Field label="Blood Group">
          <Controller
            name="bloodGroup"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field label="Address">
        <Controller
          name="address"
          control={control}
          render={({ field }) => <Textarea {...field} />}
        />
      </Field>
      <Field label="Medical Notes">
        <Controller
          name="medicalNotes"
          control={control}
          render={({ field }) => <Textarea {...field} />}
        />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
