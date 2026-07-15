'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/file-upload';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianEmail: z.string().email('Valid email is required'),
  guardianPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  gradeLevelId: z.string().min(1, 'Grade level is required'),
  previousSchool: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Grade {
  id: string;
  code: string;
  name: string;
  level: number;
  category: string;
}

export function ApplicationForm({ grades, schoolName, schoolId }: { grades: Grade[]; schoolName?: string; schoolId?: string }) {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [birthCertificateFileId, setBirthCertificateFileId] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitState('submitting');
    setServerError('');

    try {
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(schoolId ? { 'x-tenant-id': schoolId } : {}),
        },
        body: JSON.stringify({
          ...data,
          birthCertificateFileId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Submission failed');
        setSubmitState('error');
        return;
      }

      setSubmitState('success');
    } catch {
      setServerError('Network error. Please try again.');
      setSubmitState('error');
    }
  };

  if (submitState === 'success') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h2 className="text-xl font-semibold">Application Submitted</h2>
          <p className="mt-2 text-muted-foreground">
            Thank you! Your application has been received. A confirmation email will be sent to your provided email address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {schoolName && (
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl text-primary">{schoolName}</CardTitle>
        </CardHeader>
      )}
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" placeholder="YYYY-MM-DD" {...register('dateOfBirth')} />
              {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="gradeLevelId">Applying for Grade *</Label>
            <Controller
              name="gradeLevelId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name} ({g.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gradeLevelId && <p className="text-sm text-destructive">{errors.gradeLevelId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousSchool">Previous School</Label>
            <Input id="previousSchool" placeholder="Optional" {...register('previousSchool')} />
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Guardian Information</CardTitle>
          </CardHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardianName">Full Name *</Label>
              <Input id="guardianName" {...register('guardianName')} />
              {errors.guardianName && <p className="text-sm text-destructive">{errors.guardianName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianEmail">Email *</Label>
              <Input id="guardianEmail" type="email" {...register('guardianEmail')} />
              {errors.guardianEmail && <p className="text-sm text-destructive">{errors.guardianEmail.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardianPhone">Phone</Label>
              <Input id="guardianPhone" placeholder="Optional" {...register('guardianPhone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianAddress">Address</Label>
              <Input id="guardianAddress" placeholder="Optional" {...register('guardianAddress')} />
            </div>
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Documents</CardTitle>
          </CardHeader>

          <div className="space-y-2">
            <Label>Upload birth certificate (PDF)</Label>
            <FileUpload
              entityType="applicant"
              entityId="__pending__"
              accept=".pdf"
              maxFiles={1}
              uploadUrl="/api/public/upload"
              onUploadComplete={(files) => {
                if (files.length > 0) {
                  setBirthCertificateFileId(files[0].id);
                }
              }}
            />
            {birthCertificateFileId && (
              <p className="text-xs text-muted-foreground">Birth certificate uploaded</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitState === 'submitting'}>
            {submitState === 'submitting' ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
