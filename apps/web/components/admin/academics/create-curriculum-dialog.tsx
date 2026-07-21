'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCurriculumDialog({ open, onOpenChange, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/curricula', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum created');
        setCode(''); setName(''); setDescription(''); setErrors({});
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to create curriculum');
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
          <DialogTitle>Add Curriculum</DialogTitle>
          <DialogDescription>Create a curriculum grouping for subjects.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SCI" />
            {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General Science" />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Curriculum'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
