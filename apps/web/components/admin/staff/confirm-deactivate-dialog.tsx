'use client';

import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
}

export function ConfirmDeactivateDialog({ open, onOpenChange, staffId, staffName }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleDeactivate = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Staff deactivated');
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(body.error ?? 'Failed to deactivate');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  }, [staffId, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Staff</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate &quot;{staffName}&quot;? They will lose system access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDeactivate} disabled={submitting}>
            {submitting ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
