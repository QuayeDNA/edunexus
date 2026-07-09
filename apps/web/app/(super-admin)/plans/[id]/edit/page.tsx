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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';
import { toast } from 'sonner';

const editPlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.coerce.number().positive().optional(),
  maxStudents: z.coerce.number().int().min(0).optional(),
  maxStaff: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export default function EditPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/super-admin/plans');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data.find((p: { id: string }) => p.id === params.id);
    },
  });

  const form = useForm<z.infer<typeof editPlanSchema>>({
    resolver: zodResolver(editPlanSchema),
    values: data ? {
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      maxStudents: data.maxStudents,
      maxStaff: data.maxStaff,
      isActive: data.isActive,
    } : undefined,
  });

  async function onSubmit(formData: z.infer<typeof editPlanSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error); return; }
      toast.success('Plan updated');
      router.push('/plans');
    } catch { toast.error('Update failed'); }
    finally { setIsSubmitting(false); }
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit: ${data.name}`} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Controller control={form.control} name="name" render={({ field, fieldState }) => (
          <div className="space-y-2"><Label htmlFor={field.name}>Name</Label><Input id={field.name} {...field} />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
        )} />
        <Controller control={form.control} name="description" render={({ field, fieldState }) => (
          <div className="space-y-2"><Label htmlFor={field.name}>Description</Label><Textarea id={field.name} {...field} />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <Controller control={form.control} name="price" render={({ field, fieldState }) => (
            <div className="space-y-2"><Label htmlFor={field.name}>Price (GHS)</Label><Input id={field.name} {...field} type="number" step="0.01" />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
          )} />
          <Controller control={form.control} name="maxStudents" render={({ field, fieldState }) => (
            <div className="space-y-2"><Label htmlFor={field.name}>Max Students</Label><Input id={field.name} {...field} type="number" />{fieldState.error?.message && <p className="text-sm text-destructive">{fieldState.error.message}</p>}</div>
          )} />
        </div>
        <Controller control={form.control} name="isActive" render={({ field }) => (
          <div className="flex items-center gap-2">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            <Label htmlFor={field.name}>Active</Label>
          </div>
        )} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
      </form>
    </div>
  );
}
