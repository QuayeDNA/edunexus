'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/sonner';

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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (subdomain)</FormLabel>
                <FormControl><Input {...field} placeholder="my-school" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>School Code</FormLabel>
                <FormControl><Input {...field} placeholder="SCH001" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="region" render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl><Input {...field} placeholder="Greater Accra" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="curriculum" render={({ field }) => (
              <FormItem>
                <FormLabel>Curriculum</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ghana_basic">Ghana Basic</SelectItem>
                    <SelectItem value="british">British</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="calendar" render={({ field }) => (
              <FormItem>
                <FormLabel>Calendar</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ghana_3_terms">Ghana (3 Terms)</SelectItem>
                    <SelectItem value="british_3_terms">British (3 Terms)</SelectItem>
                    <SelectItem value="american_semester">American (Semester)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create School'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
