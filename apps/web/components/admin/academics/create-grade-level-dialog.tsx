'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateGradeLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'creche', label: 'Creche' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'primary', label: 'Primary' },
  { value: 'junior_secondary', label: 'Junior Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
];

export function CreateGradeLevelDialog({ open, onOpenChange, onSuccess }: CreateGradeLevelDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch('/api/grade-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, name, level: Number(level), category,
          ...(sortOrder ? { sortOrder: Number(sortOrder) } : {}),
          ...(description ? { description } : {}),
        }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Grade level created');
        setCode(''); setName(''); setLevel(''); setCategory(''); setSortOrder(''); setDescription('');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to create grade level');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Grade Level</DialogTitle>
          <DialogDescription>Create a new grade level for the school.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gl-code">Code</Label>
              <Input id="gl-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P1" required />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gl-name">Name</Label>
              <Input id="gl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary 1" required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gl-level">Level Number</Label>
              <Input id="gl-level" type="number" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. 5" required />
              {errors.level && <p className="text-xs text-red-500">{errors.level}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gl-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as string)} items={CATEGORIES}>
                <SelectTrigger id="gl-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gl-sortOrder">Sort Order</Label>
              <Input id="gl-sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="e.g. 5" />
              {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gl-description">Description (optional)</Label>
            <Input id="gl-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Grade Level'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
