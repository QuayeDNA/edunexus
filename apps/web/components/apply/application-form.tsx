"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload, type PendingFile } from "@/components/shared/file-upload";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((val) => {
      const [y, m, d] = val.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d
      );
    }, "Not a real date"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  guardianName: z.string().min(1, "Guardian name is required").max(200),
  guardianEmail: z.string().email("Valid email is required"),
  guardianPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianEmployer: z.string().optional(),
  gradeLevelId: z.string().min(1, "Grade level is required"),
  previousSchool: z.string().optional(),
  medicalAllergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medicalMedications: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Grade {
  id: string;
  code: string;
  name: string;
  level: number;
  category: string;
}

export function ApplicationForm({
  grades,
  schoolName,
  schoolId,
}: {
  grades: Grade[];
  schoolName?: string;
  schoolId?: string;
}) {
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [serverError, setServerError] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<
    Array<{ name: string; phone: string; relationship: string }>
  >([]);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    relationship: "",
  });

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      guardianName: "",
      guardianEmail: "",
      guardianPhone: "",
      guardianAddress: "",
      guardianOccupation: "",
      guardianEmployer: "",
      gradeLevelId: "",
      previousSchool: "",
      medicalAllergies: "",
      medicalConditions: "",
      medicalMedications: "",
      doctorName: "",
      doctorPhone: "",
      siblingsEnrolled: false,
      siblingDetails: "",
    },
  });

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", "applicant");

    const headers: Record<string, string> = {};
    if (schoolId) headers["x-tenant-id"] = schoolId;

    const res = await fetch("/api/public/upload", {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "File upload failed");
    }

    const json = await res.json();
    return json.data?.id ?? null;
  }

  const addEmergencyContact = () => {
    if (!newContact.name || !newContact.phone || !newContact.relationship)
      return;
    setEmergencyContacts((prev) => [...prev, newContact]);
    setNewContact({ name: "", phone: "", relationship: "" });
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitState("submitting");
    setServerError("");

    try {
      const fileIds: Record<string, string | null> = {};

      if (pendingFile) {
        const uploadedId = await uploadFile(pendingFile.file);
        if (!uploadedId) {
          setServerError("File upload failed");
          setSubmitState("error");
          return;
        }
        fileIds.birthCertificateFileId = uploadedId;
      }

      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(schoolId ? { "x-tenant-id": schoolId } : {}),
        },
        body: JSON.stringify({
          ...data,
          emergencyContacts,
          ...fileIds,
          documentUrls: [],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "Submission failed");
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitState("error");
    }
  };

  if (submitState === "success") {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h2 className="text-xl font-semibold">Application Submitted</h2>
          <p className="mt-2 text-muted-foreground">
            Thank you! Your application has been received. A confirmation email
            will be sent to your provided email address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {schoolName && (
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl text-primary">{schoolName}</CardTitle>
        </CardHeader>
      )}
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>First Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Last Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Date of Birth *</Label>
                  <Input id={field.name} type="date" {...field} />
                  {errors.dateOfBirth && (
                    <p className="text-sm text-destructive">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Gender *</Label>
                  <Select
                    onValueChange={field.onChange}
                    items={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-destructive">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <Controller
            name="gradeLevelId"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Applying for Grade *</Label>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={grades.map((g) => ({
                    value: g.id,
                    label: `${g.name} (${g.code})`,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gradeLevelId && (
                  <p className="text-sm text-destructive">
                    {errors.gradeLevelId.message}
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            name="previousSchool"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Previous School</Label>
                <Input id={field.name} placeholder="Optional" {...field} />
              </div>
            )}
          />

          <CardHeader className="px-0 pt-4">
            <CardTitle>Guardian Information</CardTitle>
          </CardHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="guardianName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Full Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.guardianName && (
                    <p className="text-sm text-destructive">
                      {errors.guardianName.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="guardianEmail"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email *</Label>
                  <Input id={field.name} type="email" {...field} />
                  {errors.guardianEmail && (
                    <p className="text-sm text-destructive">
                      {errors.guardianEmail.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="guardianPhone"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Phone</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
            <Controller
              name="guardianAddress"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Address</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="guardianOccupation"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Occupation</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
            <Controller
              name="guardianEmployer"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Employer</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Documents</CardTitle>
          </CardHeader>

          <div className="space-y-2">
            <Label>Upload birth certificate (PDF)</Label>
            <FileUpload
              entityType="applicant"
              entityId="__pending__"
              accept=".pdf"
              maxFiles={1}
              uploadUrl="/api/public/upload"
              tenantId={schoolId}
              autoUpload={false}
              onFilesPending={(files) => {
                setPendingFile(files[0] ?? null);
              }}
            />
            {pendingFile && (
              <p className="text-xs text-muted-foreground">
                {pendingFile.name} ready to submit
              </p>
            )}
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>

          <div className="space-y-2">
            <Label htmlFor="medicalAllergies">Allergies</Label>
            <textarea
              id="medicalAllergies"
              className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("medicalAllergies")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalConditions">Medical Conditions</Label>
            <textarea
              id="medicalConditions"
              className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("medicalConditions")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalMedications">Current Medications</Label>
            <textarea
              id="medicalMedications"
              className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("medicalMedications")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="doctorName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Doctor Name</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
            <Controller
              name="doctorPhone"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Doctor Phone</Label>
                  <Input id={field.name} placeholder="Optional" {...field} />
                </div>
              )}
            />
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Emergency Contacts</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2 sm:col-span-1">
                <Label>Name</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Relationship</Label>
                <Input
                  value={newContact.relationship}
                  onChange={(e) =>
                    setNewContact((prev) => ({
                      ...prev,
                      relationship: e.target.value,
                    }))
                  }
                  placeholder="e.g. Mother"
                />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addEmergencyContact}
                >
                  Add Contact
                </Button>
              </div>
            </div>

            {emergencyContacts.length > 0 && (
              <ul className="space-y-1">
                {emergencyContacts.map((contact, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    <span>
                      {contact.name} — {contact.relationship} ({contact.phone})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(i)}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Siblings</CardTitle>
          </CardHeader>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="siblingsEnrolled"
                className="h-4 w-4 rounded border-gray-300"
                {...register("siblingsEnrolled")}
              />
              <Label htmlFor="siblingsEnrolled">
                Has siblings already enrolled
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siblingDetails">Sibling Details</Label>
              <textarea
                id="siblingDetails"
                className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Names and classes of siblings"
                {...register("siblingDetails")}
              />
            </div>
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitState === "submitting"}
          >
            {submitState === "submitting"
              ? "Submitting..."
              : "Submit Application"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
