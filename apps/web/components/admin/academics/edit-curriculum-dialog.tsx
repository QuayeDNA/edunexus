'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CurriculumRow {
  id: string; code: string; name: string; description: string | null; subjectCount: number; schoolId: string;
}

interface Props {
  curriculum: CurriculumRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCurriculumDialog({ curriculum, open, onOpenChange, onSuccess }: Props) {
  const [code, setCode] = useState(curriculum.code);
  const [name, setName] = useState(curriculum.name);
  const [description, setDescription] = useState(curriculum.description ?? '');
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
      const res = await fetch(`/api/curricula/${curriculum.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum updated');
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to update curriculum');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit Curriculum</Dialog.Title>
          <Dialog.Description>Update curriculum details.</Dialog.Description>
        </Dialog.Header>
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
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
