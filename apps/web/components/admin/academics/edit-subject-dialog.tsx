'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'core', label: 'Core' }, { value: 'elective', label: 'Elective' },
  { value: 'vocational', label: 'Vocational' }, { value: 'language', label: 'Language' },
  { value: 'religious', label: 'Religious & Moral' }, { value: 'creative', label: 'Creative Arts' },
  { value: 'science', label: 'Science' }, { value: 'mathematics', label: 'Mathematics' },
  { value: 'humanities', label: 'Humanities' },
];

interface SubjectRow {
  id: string; code: string; name: string; category: string | null; description: string | null; schoolId: string;
}

interface Props {
  subject: SubjectRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSubjectDialog({ subject, open, onOpenChange, onSuccess }: Props) {
  const [code, setCode] = useState(subject.code);
  const [name, setName] = useState(subject.name);
  const [category, setCategory] = useState(subject.category ?? '');
  const [description, setDescription] = useState(subject.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Code is required';
    if (code.length > 20) errs.code = 'Code must be at most 20 characters';
    if (!name.trim()) errs.name = 'Name is required';
    if (name.length > 100) errs.name = 'Name must be at most 100 characters';
    if (description.length > 500) errs.description = 'Description must be at most 500 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          category: category || null,
          description: description.trim() || null,
        }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Subject updated');
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to update subject');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>Update subject details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-code">Code</Label>
            <Input id="edit-code" value={code} onChange={(e) => setCode(e.target.value)} />
            {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as string)} items={CATEGORIES}>
              <SelectTrigger className="w-full" id="edit-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
