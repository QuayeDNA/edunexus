'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
interface GradeLevel {
  id: string;
  code: string;
  name: string;
  level: number;
  category: string;
  sortOrder: number;
  description: string | null;
  schoolId: string;
  classCount: number;
}

interface EditGradeLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gradeLevel: GradeLevel | null;
}

const CATEGORIES = [
  { value: 'creche', label: 'Creche' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'primary', label: 'Primary' },
  { value: 'junior_secondary', label: 'Junior Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
];

export function EditGradeLevelDialog({ open, onOpenChange, onSuccess, gradeLevel }: EditGradeLevelDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (gradeLevel) {
      setCode(gradeLevel.code);
      setName(gradeLevel.name);
      setLevel(String(gradeLevel.level));
      setCategory(gradeLevel.category);
      setSortOrder(gradeLevel.sortOrder != null ? String(gradeLevel.sortOrder) : '');
      setDescription(gradeLevel.description ?? '');
      setErrors({});
    }
  }, [gradeLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeLevel) return;
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/grade-levels/${gradeLevel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, name, level: Number(level), category,
          ...(sortOrder ? { sortOrder: Number(sortOrder) } : {}),
          ...(description ? { description } : {}),
        }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Grade level updated');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to update grade level');
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
          <DialogTitle>Edit Grade Level</DialogTitle>
          <DialogDescription>Update grade level details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="egl-code">Code</Label>
              <Input id="egl-code" value={code} onChange={(e) => setCode(e.target.value)} required />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="egl-name">Name</Label>
              <Input id="egl-name" value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="egl-level">Level Number</Label>
              <Input id="egl-level" type="number" value={level} onChange={(e) => setLevel(e.target.value)} required />
              {errors.level && <p className="text-xs text-red-500">{errors.level}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="egl-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as string)} items={CATEGORIES}>
                <SelectTrigger id="egl-category">
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
              <Label htmlFor="egl-sortOrder">Sort Order</Label>
              <Input id="egl-sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="egl-description">Description (optional)</Label>
            <Input id="egl-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
