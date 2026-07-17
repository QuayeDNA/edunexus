"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  withdrawEnrollment,
  transferEnrollment,
  graduateEnrollment,
  readmitStudent,
} from "@/lib/api/enrollments";
import { toast } from "sonner";
import type { ClassOption, AcademicYearOption } from "@/types/students";
import { LogOut, Send, GraduationCap, RotateCcw, Loader2 } from "lucide-react";

interface Props {
  studentId: string;
  activeEnrollmentId: string | null;
  studentStatus: string;
  classes: ClassOption[];
  academicYears: AcademicYearOption[];
}

export function StudentLifecycleActions({
  studentId,
  activeEnrollmentId,
  studentStatus,
  classes,
  academicYears,
}: Props) {
  const router = useRouter();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason] = useState("");

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferReason, setTransferReason] = useState("");
  const [targetSchool, setTargetSchool] = useState("");

  const [graduateOpen, setGraduateOpen] = useState(false);

  const [readmitOpen, setReadmitOpen] = useState(false);
  const [readmitClassId, setReadmitClassId] = useState("");
  const [readmitYearId, setReadmitYearId] = useState("");

  const withdrawMutation = useMutation({
    mutationFn: () =>
      withdrawEnrollment(activeEnrollmentId!, withdrawReason.trim()),
    onSuccess: () => {
      toast.success("Student withdrawn");
      setWithdrawOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      transferEnrollment(
        activeEnrollmentId!,
        transferReason.trim(),
        targetSchool.trim(),
      ),
    onSuccess: () => {
      toast.success("Student transferred");
      setTransferOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const graduateMutation = useMutation({
    mutationFn: () => graduateEnrollment(activeEnrollmentId!),
    onSuccess: () => {
      toast.success("Student graduated");
      setGraduateOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const readmitMutation = useMutation({
    mutationFn: () => readmitStudent(studentId, readmitClassId, readmitYearId),
    onSuccess: () => {
      toast.success("Student re-admitted");
      setReadmitOpen(false);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleWithdraw = () => {
    if (!activeEnrollmentId || !withdrawReason.trim()) return;
    withdrawMutation.mutate();
  };

  const handleTransfer = () => {
    if (!activeEnrollmentId || !transferReason.trim() || !targetSchool.trim())
      return;
    transferMutation.mutate();
  };

  const handleGraduate = () => {
    if (!activeEnrollmentId) return;
    graduateMutation.mutate();
  };

  const handleReadmit = () => {
    if (!readmitClassId || !readmitYearId) return;
    readmitMutation.mutate();
  };

  const anyPending =
    withdrawMutation.isPending ||
    transferMutation.isPending ||
    graduateMutation.isPending ||
    readmitMutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {studentStatus === "active" && activeEnrollmentId && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
            disabled={anyPending}
          >
            <LogOut className="mr-1.5 h-4 w-4" /> Withdraw
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransferOpen(true)}
            disabled={anyPending}
          >
            <Send className="mr-1.5 h-4 w-4" /> Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGraduateOpen(true)}
            disabled={anyPending}
          >
            <GraduationCap className="mr-1.5 h-4 w-4" /> Graduate
          </Button>
        </>
      )}
      {(studentStatus === "withdrawn" ||
        studentStatus === "transferred_out") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReadmitOpen(true)}
          disabled={anyPending}
        >
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
        confirmLabel={
          withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"
        }
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
        submitting={transferMutation.isPending}
      />

      {/* Graduate dialog */}
      <ConfirmDialog
        open={graduateOpen}
        onOpenChange={setGraduateOpen}
        onConfirm={handleGraduate}
        title="Graduate Student"
        description="This will mark the student's current enrollment as graduated. This action can be reversed."
        confirmLabel={
          graduateMutation.isPending ? "Processing..." : "Confirm Graduation"
        }
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
        submitting={readmitMutation.isPending}
      />
    </div>
  );
}

function TransferDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  targetSchool,
  onTargetSchoolChange,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  targetSchool: string;
  onTargetSchoolChange: (v: string) => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Student</DialogTitle>
          <DialogDescription>
            Transfer the student to another school.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Target School Name</Label>
            <Input
              value={targetSchool}
              onChange={(e) => onTargetSchoolChange(e.target.value)}
              placeholder="e.g. St. Mary's Senior High"
            />
          </div>
          <div className="space-y-1">
            <Label>Reason for Transfer</Label>
            <Input
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="e.g. Family relocation"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting || !reason.trim() || !targetSchool.trim()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Processing..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadmitDialog({
  open,
  onOpenChange,
  classes,
  academicYears,
  selectedClassId,
  onClassChange,
  selectedYearId,
  onYearChange,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classes: ClassOption[];
  academicYears: AcademicYearOption[];
  selectedClassId: string;
  onClassChange: (v: string) => void;
  selectedYearId: string;
  onYearChange: (v: string) => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Re-admit Student</DialogTitle>
          <DialogDescription>
            Re-enroll the student in a new class and academic year.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Academic Year</Label>
            <Select
              value={selectedYearId}
              onValueChange={(v) => onYearChange(v as string)}
              items={academicYears.map((y) => ({ value: y.id, label: y.name }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Class</Label>
            <Select
              value={selectedClassId}
              onValueChange={(v) => onClassChange(v as string)}
              items={classes.map((c) => ({ value: c.id, label: c.name }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting || !selectedClassId || !selectedYearId}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Processing..." : "Confirm Re-admission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
