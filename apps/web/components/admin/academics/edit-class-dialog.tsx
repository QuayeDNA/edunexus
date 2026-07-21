'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  code: string | null;
  capacity: number | null;
  roomNumber: string | null;
}

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classItem: ClassItem | null;
}

export function EditClassDialog({ open, onOpenChange, onSuccess, classItem }: EditClassDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (classItem) {
      setName(classItem.name);
      setCode(classItem.code ?? '');
      setCapacity(classItem.capacity != null ? String(classItem.capacity) : '');
      setRoomNumber(classItem.roomNumber ?? '');
      setErrors({});
    }
  }, [classItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classItem) return;
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/classes/${classItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(code ? { code } : { code: null }),
          ...(capacity ? { capacity: Number(capacity) } : {}),
          ...(roomNumber ? { roomNumber } : { roomNumber: null }),
        }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Class updated');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to update class');
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
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>Update class details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ec-name">Class Name</Label>
              <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-code">Code (optional)</Label>
              <Input id="ec-code" value={code} onChange={(e) => setCode(e.target.value)} />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ec-capacity">Capacity (optional)</Label>
              <Input id="ec-capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              {errors.capacity && <p className="text-xs text-red-500">{errors.capacity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-room">Room Number (optional)</Label>
              <Input id="ec-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
              {errors.roomNumber && <p className="text-xs text-red-500">{errors.roomNumber}</p>}
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
