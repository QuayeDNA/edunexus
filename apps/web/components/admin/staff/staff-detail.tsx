'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  staffIdNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: string;
  dateOfBirth: string;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  phone: string;
  email?: string | null;
  role: string;
  department?: string | null;
  employmentStatus: string;
  dateHired: string;
  qualification?: string | null;
  ssnitNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  emergencyContact?: string | null;
  emergencyName?: string | null;
  status: string;
}

interface Contract {
  id: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  position?: string | null;
  createdAt: Date;
}

interface Props {
  staff: StaffMember;
  contracts: Contract[];
}

export function StaffDetail({ staff: s, contracts }: Props) {
  const router = useRouter();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${s.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Staff deactivated');
        setShowDeactivate(false);
        router.refresh();
      } else {
        toast.error(body.error ?? 'Failed to deactivate');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${s.id}/reactivate`, { method: 'POST' });
      const body = await res.json();
      if (body.success) {
        toast.success('Staff reactivated');
        setShowReactivate(false);
        router.refresh();
      } else {
        toast.error(body.error ?? 'Failed to reactivate');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/staff" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2')}>
          <ArrowLeft className="h-4 w-4" /> Back to Staff
        </Link>
        <div className="flex items-center gap-2">
          {s.status === 'active' ? (
            <Button variant="destructive" onClick={() => setShowDeactivate(true)}>Deactivate</Button>
          ) : (
            <Button variant="outline" onClick={() => setShowReactivate(true)}>Reactivate</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{s.firstName} {s.lastName}{s.otherNames ? ` (${s.otherNames})` : ''}</h2>
                <p className="text-sm text-muted-foreground font-mono">{s.staffIdNumber}</p>
              </div>
              <Badge variant={s.status === 'active' ? 'success' : 'danger'}>{s.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Gender</span><p className="font-medium capitalize">{s.gender}</p></div>
              <div><span className="text-muted-foreground">Date of Birth</span><p className="font-medium">{s.dateOfBirth}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{s.phone}</p></div>
              <div><span className="text-muted-foreground">Email</span><p className="font-medium">{s.email ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">Nationality</span><p className="font-medium">{s.nationality ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">Religion</span><p className="font-medium">{s.religion ?? '\u2014'}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium">{s.address ?? '\u2014'}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Role</span><p className="font-medium capitalize">{s.role}</p></div>
              <div><span className="text-muted-foreground">Department</span><p className="font-medium">{s.department ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">Employment Status</span><p className="font-medium capitalize">{s.employmentStatus.replace('_', ' ')}</p></div>
              <div><span className="text-muted-foreground">Date Hired</span><p className="font-medium">{s.dateHired}</p></div>
              <div><span className="text-muted-foreground">Qualification</span><p className="font-medium">{s.qualification ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">SSNIT</span><p className="font-medium">{s.ssnitNumber ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">Bank</span><p className="font-medium">{s.bankName ?? '\u2014'}</p></div>
              <div><span className="text-muted-foreground">Account</span><p className="font-medium">{s.bankAccount ?? '\u2014'}</p></div>
            </div>
            {s.emergencyName && (
              <div className="border-t pt-3">
                <span className="text-muted-foreground">Emergency Contact</span>
                <p className="font-medium">{s.emergencyName} ({s.emergencyContact ?? '\u2014'})</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract History</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Salary (GHS)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="capitalize">{c.type.replace('_', ' ')}</TableCell>
                    <TableCell>{c.position ?? '\u2014'}</TableCell>
                    <TableCell>{c.startDate}</TableCell>
                    <TableCell>{c.endDate ?? '\u2014'}</TableCell>
                    <TableCell>{c.salary ? `GHS ${c.salary}` : '\u2014'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Staff</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &quot;{s.firstName} {s.lastName}&quot;? They will lose system access.
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

      <AlertDialog open={showReactivate} onOpenChange={setShowReactivate}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Staff</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate &quot;{s.firstName} {s.lastName}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="default" onClick={handleReactivate} disabled={submitting}>
              {submitting ? 'Reactivating...' : 'Reactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
