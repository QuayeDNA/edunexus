'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/sonner';

const planSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  maxStudents: z.coerce.number().int().min(0).default(0),
  maxStaff: z.coerce.number().int().min(0).default(0),
});

export default function NewPlanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { billingCycle: 'monthly', maxStudents: 0, maxStaff: 0 },
  });

  async function onSubmit(data: z.infer<typeof planSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, features: [] }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error); return; }
      toast.success('Plan created');
      router.push('/plans');
    } catch { toast.error('Failed to create plan'); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Plan" description="Create a new pricing plan" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input {...field} type="number" step="0.01" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="billingCycle" render={({ field }) => (
              <FormItem><FormLabel>Billing</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="maxStudents" render={({ field }) => (
              <FormItem><FormLabel>Max Students</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Plan'}</Button>
        </form>
      </Form>
    </div>
  );
}
