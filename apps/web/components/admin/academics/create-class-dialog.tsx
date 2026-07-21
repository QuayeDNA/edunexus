'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gradeLevelId: string;
  academicYearId: string;
}

export function CreateClassDialog({ open, onOpenChange, onSuccess, gradeLevelId, academicYearId }: CreateClassDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(code ? { code } : {}),
          gradeLevelId,
          academicYearId,
          ...(capacity ? { capacity: Number(capacity) } : {}),
          ...(roomNumber ? { roomNumber } : {}),
        }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Class created');
        setName(''); setCode(''); setCapacity(''); setRoomNumber('');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to create class');
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
          <DialogTitle>Add Class</DialogTitle>
          <DialogDescription>Create a new class for this grade level.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-name">Class Name</Label>
              <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1A" required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-code">Code (optional)</Label>
              <Input id="cc-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P1A" />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-capacity">Capacity (optional)</Label>
              <Input id="cc-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 40" />
              {errors.capacity && <p className="text-xs text-red-500">{errors.capacity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-room">Room Number (optional)</Label>
              <Input id="cc-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 201" />
              {errors.roomNumber && <p className="text-xs text-red-500">{errors.roomNumber}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Class'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
