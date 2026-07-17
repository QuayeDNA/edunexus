'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from 'sonner';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens'),
  code: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  curriculum: z.enum(['ghana_basic', 'british', 'american']),
  calendar: z.enum(['ghana_3_terms', 'british_3_terms', 'american_semester']),
});

type SchoolForm = z.infer<typeof schoolSchema>;

export default function NewSchoolPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { curriculum: 'ghana_basic', calendar: 'ghana_3_terms' },
  });

  async function onSubmit(data: SchoolForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to create school');
        return;
      }
      toast.success('School created successfully');
      router.push(`/schools/${json.data.id}`);
    } catch {
      toast.error('Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add School" description="Create a new school on the platform" />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller control={form.control} name="name" render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>School Name</Label>
            <Input id={field.name} {...field} />
            {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
          </div>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <Controller control={form.control} name="slug" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Slug (subdomain)</Label>
              <Input id={field.name} {...field} placeholder="my-school" />
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
          <Controller control={form.control} name="code" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>School Code</Label>
              <Input id={field.name} {...field} placeholder="SCH001" />
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Controller control={form.control} name="email" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input id={field.name} {...field} type="email" />
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
          <Controller control={form.control} name="phone" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Phone</Label>
              <Input id={field.name} {...field} />
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
        </div>
        <Controller control={form.control} name="address" render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Address</Label>
            <Input id={field.name} {...field} />
            {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
          </div>
        )} />
        <div className="grid grid-cols-3 gap-4">
          <Controller control={form.control} name="region" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Region</Label>
              <Input id={field.name} {...field} placeholder="Greater Accra" />
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
          <Controller control={form.control} name="curriculum" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label>Curriculum</Label>
              <Select value={field.value} onValueChange={field.onChange} items={[
                { value: 'ghana_basic', label: 'Ghana Basic' },
                { value: 'british', label: 'British' },
                { value: 'american', label: 'American' },
              ]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ghana_basic">Ghana Basic</SelectItem>
                  <SelectItem value="british">British</SelectItem>
                  <SelectItem value="american">American</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
          <Controller control={form.control} name="calendar" render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label>Calendar</Label>
              <Select value={field.value} onValueChange={field.onChange} items={[
                { value: 'ghana_3_terms', label: 'Ghana (3 Terms)' },
                { value: 'british_3_terms', label: 'British (3 Terms)' },
                { value: 'american_semester', label: 'American (Semester)' },
              ]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ghana_3_terms">Ghana (3 Terms)</SelectItem>
                  <SelectItem value="british_3_terms">British (3 Terms)</SelectItem>
                  <SelectItem value="american_semester">American (Semester)</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
            </div>
          )} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create School'}
        </Button>
      </form>
    </div>
  );
}
