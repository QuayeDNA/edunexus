'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  staffIdNumber: z.string().min(1, 'Staff ID is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  otherNames: z.string().max(100).optional().or(z.literal('')),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().max(100).optional().or(z.literal('')),
  religion: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['teacher', 'admin', 'support', 'accountant', 'librarian', 'transport', 'nurse'], {
    required_error: 'Role is required',
  }),
  department: z.string().max(100).optional().or(z.literal('')),
  employmentStatus: z.enum(['permanent', 'contract', 'probation', 'intern', 'part_time'], {
    required_error: 'Employment status is required',
  }),
  dateHired: z.string().min(1, 'Date hired is required'),
  qualification: z.string().max(100).optional().or(z.literal('')),
  ssnitNumber: z.string().max(50).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  bankAccount: z.string().max(50).optional().or(z.literal('')),
  emergencyContact: z.string().max(20).optional().or(z.literal('')),
  emergencyName: z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffRecord {
  id: string;
  staffIdNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: string;
  dateOfBirth: string;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  phone: string;
  email?: string | null;
  role: string;
  department?: string | null;
  employmentStatus: string;
  dateHired: string;
  qualification?: string | null;
  ssnitNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  emergencyContact?: string | null;
  emergencyName?: string | null;
}

interface Props {
  staff: StaffRecord;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
  { value: 'support', label: 'Support' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'transport', label: 'Transport' },
  { value: 'nurse', label: 'Nurse' },
];

const DEPT_OPTIONS = [
  { value: 'academic', label: 'Academic' },
  { value: 'administration', label: 'Administration' },
  { value: 'finance', label: 'Finance' },
  { value: 'library', label: 'Library' },
  { value: 'transport', label: 'Transport' },
  { value: 'health', label: 'Health' },
];

const EMP_STATUS_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
  { value: 'intern', label: 'Intern' },
  { value: 'part_time', label: 'Part Time' },
];

export function EditStaffForm({ staff: s }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffIdNumber: s.staffIdNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      otherNames: s.otherNames ?? '',
      gender: s.gender as 'male' | 'female',
      dateOfBirth: s.dateOfBirth,
      nationality: s.nationality ?? '',
      religion: s.religion ?? '',
      address: s.address ?? '',
      phone: s.phone,
      email: s.email ?? '',
      role: s.role as FormValues['role'],
      department: s.department ?? '',
      employmentStatus: s.employmentStatus as FormValues['employmentStatus'],
      dateHired: s.dateHired,
      qualification: s.qualification ?? '',
      ssnitNumber: s.ssnitNumber ?? '',
      bankName: s.bankName ?? '',
      bankAccount: s.bankAccount ?? '',
      emergencyContact: s.emergencyContact ?? '',
      emergencyName: s.emergencyName ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await fetch(`/api/staff/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.error ?? 'Failed to update staff');
      return body.data;
    },
    onSuccess: () => {
      toast.success('Staff updated successfully');
      router.push(`/admin/staff/${s.id}`);
      router.refresh();
    },
    onError: (err: Error) => {
      setServerError(err.message);
    },
  });

  const onSubmit = (data: FormValues) => {
    setServerError('');
    updateMutation.mutate(data);
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <fieldset className="border-b pb-4">
            <legend className="text-base font-semibold mb-4">Personal Information</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller name="staffIdNumber" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Staff ID *</Label>
                  <Input id={field.name} {...field} />
                  {errors.staffIdNumber && <p className="text-sm text-destructive">{errors.staffIdNumber.message}</p>}
                </div>
              )} />
              <Controller name="gender" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Gender *</Label>
                  <Select value={field.value ?? ''} onValueChange={field.onChange} items={GENDER_OPTIONS}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>{GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                </div>
              )} />
              <Controller name="firstName" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>First Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>
              )} />
              <Controller name="lastName" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Last Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>
              )} />
              <Controller name="otherNames" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Other Names</Label>
                  <Input id={field.name} {...field} />
                  {errors.otherNames && <p className="text-sm text-destructive">{errors.otherNames.message}</p>}
                </div>
              )} />
              <Controller name="dateOfBirth" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Date of Birth *</Label>
                  <Input id={field.name} type="date" {...field} />
                  {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
                </div>
              )} />
              <Controller name="nationality" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Nationality</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="religion" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Religion</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="phone" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Phone *</Label>
                  <Input id={field.name} type="tel" {...field} />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
              )} />
              <Controller name="email" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input id={field.name} type="email" {...field} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
              )} />
              <Controller name="address" control={control} render={({ field }) => (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={field.name}>Address</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
            </div>
          </fieldset>

          <fieldset className="border-b pb-4">
            <legend className="text-base font-semibold mb-4">Employment Details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller name="role" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Role *</Label>
                  <Select value={field.value ?? ''} onValueChange={field.onChange} items={ROLE_OPTIONS}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
                </div>
              )} />
              <Controller name="department" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Department</Label>
                  <Select value={field.value ?? ''} onValueChange={field.onChange} items={DEPT_OPTIONS}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{DEPT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )} />
              <Controller name="employmentStatus" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Employment Status *</Label>
                  <Select value={field.value ?? ''} onValueChange={field.onChange} items={EMP_STATUS_OPTIONS}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>{EMP_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.employmentStatus && <p className="text-sm text-destructive">{errors.employmentStatus.message}</p>}
                </div>
              )} />
              <Controller name="dateHired" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Date Hired *</Label>
                  <Input id={field.name} type="date" {...field} />
                  {errors.dateHired && <p className="text-sm text-destructive">{errors.dateHired.message}</p>}
                </div>
              )} />
              <Controller name="qualification" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Qualification</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="ssnitNumber" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>SSNIT Number</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="bankName" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Bank Name</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="bankAccount" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Bank Account</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
            </div>
          </fieldset>

          <fieldset className="border-b pb-4">
            <legend className="text-base font-semibold mb-4">Emergency Contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller name="emergencyName" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Contact Name</Label>
                  <Input id={field.name} {...field} />
                </div>
              )} />
              <Controller name="emergencyContact" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Contact Phone</Label>
                  <Input id={field.name} type="tel" {...field} />
                </div>
              )} />
            </div>
          </fieldset>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Link href={`/admin/staff/${s.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}>
              Cancel
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
