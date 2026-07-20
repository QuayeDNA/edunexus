'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateTermDialogProps {
  academicYearId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTermDialog({ academicYearId, open, onOpenChange, onSuccess }: CreateTermDialogProps) {
  const [termNumber, setTermNumber] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch('/api/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId, termNumber, name, startDate, endDate }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Term created');
        setTermNumber('');
        setName('');
        setStartDate('');
        setEndDate('');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to create term');
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
          <DialogTitle>Add Term</DialogTitle>
          <DialogDescription>Add a term to the selected academic year.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termNumber">Term Number</Label>
              <Input id="termNumber" value={termNumber} onChange={(e) => setTermNumber(e.target.value)} placeholder="e.g. 1" required />
              {errors.termNumber && <p className="text-xs text-red-500">{errors.termNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="termName">Term Name</Label>
              <Input id="termName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First Term" required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termStart">Start Date</Label>
              <Input id="termStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="termEnd">End Date</Label>
              <Input id="termEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Term'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
