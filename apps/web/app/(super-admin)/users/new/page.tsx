'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from 'sonner';

const userSchema = z.object({
  schoolId: z.string().min(1, 'School is required'),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['admin', 'teacher', 'student', 'parent']),
});

export default function NewUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: schoolsData } = useQuery({
    queryKey: ['schools-list'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/schools');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'admin' },
  });

  async function onSubmit(data: z.infer<typeof userSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to create user');
        return;
      }
      toast.success('User created. Welcome email sent.');
      router.push('/users');
    } catch {
      toast.error('Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add User" description="Create a new user account for a school" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller control={form.control} name="schoolId" render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>School</Label>
            <Select onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
              <SelectContent>
                {(schoolsData || []).map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
          </div>
        )} />
        <Controller control={form.control} name="email" render={({ field, fieldState }) => (
          <div className="space-y-2"><Label htmlFor={field.name}>Email</Label><Input id={field.name} {...field} type="email" />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <Controller control={form.control} name="firstName" render={({ field, fieldState }) => (
            <div className="space-y-2"><Label htmlFor={field.name}>First Name</Label><Input id={field.name} {...field} />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
          )} />
          <Controller control={form.control} name="lastName" render={({ field, fieldState }) => (
            <div className="space-y-2"><Label htmlFor={field.name}>Last Name</Label><Input id={field.name} {...field} />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
          )} />
        </div>
        <Controller control={form.control} name="role" render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>Role</Label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
            {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
          </div>
        )} />
        <Controller control={form.control} name="phone" render={({ field, fieldState }) => (
          <div className="space-y-2"><Label htmlFor={field.name}>Phone (optional)</Label><Input id={field.name} {...field} />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
        )} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </form>
    </div>
  );
}
