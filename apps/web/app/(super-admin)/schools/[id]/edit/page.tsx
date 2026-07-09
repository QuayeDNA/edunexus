'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/sonner';

const editSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  region: z.string().optional(),
  isActive: z.boolean(),
});

export default function EditSchoolPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ['school', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/schools/${params.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: data ? {
      name: data.name,
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      region: data.region || '',
      isActive: data.isActive,
    } : undefined,
  });

  async function onSubmit(formData: z.infer<typeof editSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Update failed');
        return;
      }
      toast.success('School updated');
      router.push(`/schools/${params.id}`);
    } catch {
      toast.error('Update failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit: ${data.name}`} description="Update school information" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="region" render={({ field }) => (
            <FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
            </FormItem>
          )} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
        </form>
      </Form>
    </div>
  );
}
