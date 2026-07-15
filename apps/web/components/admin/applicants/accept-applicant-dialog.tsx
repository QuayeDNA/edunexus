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
import { AlertTriangle, CheckCircle } from 'lucide-react';

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

interface ConversionResult {
  applicant: { id: string; status: string; targetClassId: string };
  student: { id: string; studentIdNumber: string; firstName: string; lastName: string };
  enrollment: { id: string; classId: string; academicYearId: string };
  guardian: { id: string; name: string; email: string };
  credentials: {
    student: { email: string | null; password: string };
    parent: { email: string | null; password: string };
  };
}

export function AcceptApplicantDialog({ open, onOpenChange, applicantId, gradeLevelId, onSuccess, onError }: AcceptDialogProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [override, setOverride] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);

  useEffect(() => {
    if (open) {
      fetch(`/api/classes?gradeLevelId=${gradeLevelId}`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => setClasses(data.data ?? []));
      setSelectedClassId('');
      setCapacityWarning(null);
      setOverride(false);
      setResult(null);
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

      setResult(body.data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (result) onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={result ? 'sm:max-w-lg' : undefined}>
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Accept Applicant</DialogTitle>
              <DialogDescription>
                Select a class to place the student in and convert the applicant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={(value) => setSelectedClassId(value as string)}
                  items={classes.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                >
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
                {submitting ? 'Converting...' : 'Accept & Convert'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <DialogTitle>Conversion Successful</DialogTitle>
              </div>
              <DialogDescription>
                Applicant has been converted to a student. Share the credentials below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-semibold">Student</h4>
                <p className="text-sm">{result.student.firstName} {result.student.lastName}</p>
                <p className="text-sm text-muted-foreground">ID: {result.student.studentIdNumber}</p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-semibold">Guardian</h4>
                <p className="text-sm">{result.guardian.name}</p>
                <p className="text-sm text-muted-foreground">{result.guardian.email}</p>
              </div>

              {result.credentials.student.email && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-amber-800">Student Login</h4>
                  <p className="text-sm text-amber-700">Email: {result.credentials.student.email}</p>
                  <p className="text-sm text-amber-700">Password: <code className="bg-amber-100 px-1 rounded">{result.credentials.student.password}</code></p>
                </div>
              )}

              {result.credentials.parent.email && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-amber-800">Parent Login</h4>
                  <p className="text-sm text-amber-700">Email: {result.credentials.parent.email}</p>
                  <p className="text-sm text-amber-700">Password: <code className="bg-amber-100 px-1 rounded">{result.credentials.parent.password}</code></p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
