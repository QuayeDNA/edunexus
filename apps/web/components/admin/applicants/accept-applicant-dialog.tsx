'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

interface ClassOption {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
}

interface AcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  gradeLevelId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function AcceptApplicantDialog({ open, onOpenChange, applicantId, gradeLevelId, onSuccess, onError }: AcceptDialogProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`/api/classes?gradeLevelId=${gradeLevelId}`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => setClasses(data.data ?? []));
      setSelectedClassId('');
      setCapacityWarning(null);
      setOverride(false);
    }
  }, [open, gradeLevelId]);

  const handleAccept = async () => {
    if (!selectedClassId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/applicants/${applicantId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetClassId: selectedClassId,
          override,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setCapacityWarning(body.error);
        return;
      }

      if (!res.ok) {
        onError(body.error ?? 'Failed to accept applicant');
        return;
      }

      onSuccess();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Applicant</DialogTitle>
          <DialogDescription>
            Select a class to place the student in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code}) — Capacity: {c.capacity ?? 'Unlimited'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {capacityWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{capacityWarning}</p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={e => setOverride(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300"
                    />
                    Override — accept despite capacity limit
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAccept} disabled={!selectedClassId || submitting}>
            {submitting ? 'Accepting...' : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
