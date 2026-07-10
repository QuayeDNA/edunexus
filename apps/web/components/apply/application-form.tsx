'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function ApplicationForm({ grades }: { grades: Grade[] }) {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary not configured');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setDocumentUrls(prev => [...prev, data.secure_url]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (url: string) => {
    setDocumentUrls(prev => prev.filter(u => u !== url));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitState('submitting');
    setServerError('');

    try {
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, documentUrls }),
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
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('gender')}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeLevelId">Applying for Grade *</Label>
            <select
              id="gradeLevelId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('gradeLevelId')}
            >
              <option value="">Select grade</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
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
            <Label htmlFor="documents">Upload documents (birth certificate, report card)</Label>
            <Input
              id="documents"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            {documentUrls.length > 0 && (
              <ul className="mt-2 space-y-1">
                {documentUrls.map((url) => (
                  <li key={url} className="flex items-center justify-between rounded-md bg-muted px-3 py-1 text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {url.split('/').pop()}
                    </a>
                    <button type="button" onClick={() => removeDocument(url)} className="text-destructive hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
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
