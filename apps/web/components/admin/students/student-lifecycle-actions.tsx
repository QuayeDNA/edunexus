'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';
import { LogOut, Send, GraduationCap, RotateCcw, Loader2 } from 'lucide-react';

interface ClassOption { id: string; name: string }
interface AcademicYearOption { id: string; name: string }

interface Props {
  studentId: string;
  activeEnrollmentId: string | null;
  studentStatus: string;
  classes: ClassOption[];
  academicYears: AcademicYearOption[];
}

export function StudentLifecycleActions({ studentId, activeEnrollmentId, studentStatus, classes, academicYears }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason] = useState('');

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [targetSchool, setTargetSchool] = useState('');

  const [graduateOpen, setGraduateOpen] = useState(false);

  const [readmitOpen, setReadmitOpen] = useState(false);
  const [readmitClassId, setReadmitClassId] = useState('');
  const [readmitYearId, setReadmitYearId] = useState('');

  const handleWithdraw = async () => {
    if (!activeEnrollmentId || !withdrawReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${activeEnrollmentId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      toast.success('Student withdrawn');
      setWithdrawOpen(false);
      router.refresh();
    } finally { setSubmitting(false); }
  };

  const handleTransfer = async () => {
    if (!activeEnrollmentId || !transferReason.trim() || !targetSchool.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${activeEnrollmentId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: transferReason.trim(), targetSchoolName: targetSchool.trim() }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      toast.success('Student transferred');
      setTransferOpen(false);
      router.refresh();
    } finally { setSubmitting(false); }
  };

  const handleGraduate = async () => {
    if (!activeEnrollmentId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${activeEnrollmentId}/graduate`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      toast.success('Student graduated');
      setGraduateOpen(false);
      router.refresh();
    } finally { setSubmitting(false); }
  };

  const handleReadmit = async () => {
    if (!readmitClassId || !readmitYearId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/students/${studentId}/re-admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: readmitClassId, academicYearId: readmitYearId }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return; }
      toast.success('Student re-admitted');
      setReadmitOpen(false);
      router.refresh();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {studentStatus === 'active' && activeEnrollmentId && (
        <>
          <Button variant="outline" size="sm" onClick={() => setWithdrawOpen(true)} disabled={submitting}>
            <LogOut className="mr-1.5 h-4 w-4" /> Withdraw
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} disabled={submitting}>
            <Send className="mr-1.5 h-4 w-4" /> Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGraduateOpen(true)} disabled={submitting}>
            <GraduationCap className="mr-1.5 h-4 w-4" /> Graduate
          </Button>
        </>
      )}
      {(studentStatus === 'withdrawn' || studentStatus === 'transferred_out') && (
        <Button variant="outline" size="sm" onClick={() => setReadmitOpen(true)} disabled={submitting}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Re-admit
        </Button>
      )}

      {/* Withdraw dialog */}
      <ConfirmDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        onConfirm={handleWithdraw}
        title="Withdraw Student"
        description="This will mark the student as withdrawn. Provide a reason for the withdrawal."
        confirmLabel={submitting ? 'Processing...' : 'Confirm Withdrawal'}
        destructive
      />

      {/* Transfer dialog */}
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        reason={transferReason}
        onReasonChange={setTransferReason}
        targetSchool={targetSchool}
        onTargetSchoolChange={setTargetSchool}
        onConfirm={handleTransfer}
        submitting={submitting}
      />

      {/* Graduate dialog */}
      <ConfirmDialog
        open={graduateOpen}
        onOpenChange={setGraduateOpen}
        onConfirm={handleGraduate}
        title="Graduate Student"
        description="This will mark the student's current enrollment as graduated. This action can be reversed."
        confirmLabel={submitting ? 'Processing...' : 'Confirm Graduation'}
      />

      {/* Re-admit dialog */}
      <ReadmitDialog
        open={readmitOpen}
        onOpenChange={setReadmitOpen}
        classes={classes}
        academicYears={academicYears}
        selectedClassId={readmitClassId}
        onClassChange={setReadmitClassId}
        selectedYearId={readmitYearId}
        onYearChange={setReadmitYearId}
        onConfirm={handleReadmit}
        submitting={submitting}
      />
    </div>
  );
}

function TransferDialog({
  open, onOpenChange,
  reason, onReasonChange,
  targetSchool, onTargetSchoolChange,
  onConfirm, submitting,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  reason: string; onReasonChange: (v: string) => void;
  targetSchool: string; onTargetSchoolChange: (v: string) => void;
  onConfirm: () => void; submitting: boolean;
}) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Transfer Student</h2>
        <p className="mt-1 text-sm text-muted-foreground">Transfer the student to another school.</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label>Target School Name</Label>
            <Input value={targetSchool} onChange={e => onTargetSchoolChange(e.target.value)} placeholder="e.g. St. Mary's Senior High" />
          </div>
          <div className="space-y-1">
            <Label>Reason for Transfer</Label>
            <Input value={reason} onChange={e => onReasonChange(e.target.value)} placeholder="e.g. Family relocation" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={submitting || !reason.trim() || !targetSchool.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Processing...' : 'Confirm Transfer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReadmitDialog({
  open, onOpenChange, classes, academicYears,
  selectedClassId, onClassChange,
  selectedYearId, onYearChange,
  onConfirm, submitting,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  classes: ClassOption[]; academicYears: AcademicYearOption[];
  selectedClassId: string; onClassChange: (v: string) => void;
  selectedYearId: string; onYearChange: (v: string) => void;
  onConfirm: () => void; submitting: boolean;
}) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Re-admit Student</h2>
        <p className="mt-1 text-sm text-muted-foreground">Re-enroll the student in a new class and academic year.</p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label>Academic Year</Label>
            <Select value={selectedYearId} onValueChange={v => onYearChange(v as string)}
              items={academicYears.map(y => ({ value: y.id, label: y.name }))}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={v => onClassChange(v as string)}
              items={classes.map(c => ({ value: c.id, label: c.name }))}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={submitting || !selectedClassId || !selectedYearId}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Processing...' : 'Confirm Re-admission'}
          </Button>
        </div>
      </div>
    </div>
  );
}
