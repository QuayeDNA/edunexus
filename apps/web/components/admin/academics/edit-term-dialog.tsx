'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Term {
  id: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface EditTermDialogProps {
  term: Term;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTermDialog({ term, open, onOpenChange, onSuccess }: EditTermDialogProps) {
  const formatDate = (d: string) => new Date(d).toISOString().split('T')[0];
  const [termNumber, setTermNumber] = useState(term.termNumber);
  const [name, setName] = useState(term.name);
  const [startDate, setStartDate] = useState(formatDate(term.startDate));
  const [endDate, setEndDate] = useState(formatDate(term.endDate));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termNumber, name, startDate, endDate }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Term updated');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to update term');
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
          <DialogTitle>Edit Term</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-termNumber">Term Number</Label>
              <Input id="edit-termNumber" value={termNumber} onChange={(e) => setTermNumber(e.target.value)} required />
              {errors.termNumber && <p className="text-xs text-red-500">{errors.termNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-termName">Term Name</Label>
              <Input id="edit-termName" value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-termStart">Start Date</Label>
              <Input id="edit-termStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-termEnd">End Date</Label>
              <Input id="edit-termEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
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
