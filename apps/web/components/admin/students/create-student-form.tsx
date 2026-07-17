'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createStudent } from '@/lib/api/students';
import type { ClassOption, GradeOption } from '@/types/students';
import { CheckCircle } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classId: z.string().min(1, 'Class is required'),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianPhone: z.string().min(1, 'Guardian phone is required').max(20),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  classes: ClassOption[];
  grades: GradeOption[];
}

export function CreateStudentForm({ classes, grades }: Props) {
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<{
    student: { studentIdNumber: string; firstName: string; lastName: string };
    credentials: { student: { email: string | null; password: string } };
  } | null>(null);

  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '', lastName: '', dateOfBirth: '', classId: '', guardianName: '', guardianPhone: '',
    },
  });

  const [selectedGradeId, setSelectedGradeId] = useState('');

  const filteredClasses = selectedGradeId
    ? classes.filter(c => c.gradeLevelId === selectedGradeId)
    : classes;

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => createStudent(data),
    onSuccess: (data) => { setResult(data); setServerError(''); },
    onError: (err) => { setServerError(err.message); },
  });

  const onSubmit = (data: FormValues) => { setServerError(''); createMutation.mutate(data); };

  if (result) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
          <h2 className="text-xl font-semibold">Student Created</h2>
          <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-1">
            <p className="font-medium">{result.student.firstName} {result.student.lastName}</p>
            <p className="text-sm text-muted-foreground">ID: {result.student.studentIdNumber}</p>
          </div>
          {result.credentials.student.email && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left space-y-1">
              <p className="text-sm font-semibold text-amber-800">Student Login</p>
              <p className="text-sm text-amber-700">Email: {result.credentials.student.email}</p>
              <p className="text-sm text-amber-700">Password: <code className="bg-amber-100 px-1 rounded">{result.credentials.student.password}</code></p>
            </div>
          )}
          <Button onClick={() => setResult(null)}>Add Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller name="firstName" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>First Name *</Label>
                <Input id={field.name} {...field} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>
            )} />
            <Controller name="lastName" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Last Name *</Label>
                <Input id={field.name} {...field} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
            )} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller name="gender" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Gender *</Label>
                <Select onValueChange={field.onChange} items={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
              </div>
            )} />
            <Controller name="dateOfBirth" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Date of Birth *</Label>
                <Input id={field.name} type="date" {...field} />
                {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
              </div>
            )} />
          </div>

          <div className="space-y-2">
            <Label>Grade Level</Label>
            <Select value={selectedGradeId} onValueChange={(value) => setSelectedGradeId(value as string)}
              items={grades.map(g => ({ value: g.id, label: `${g.name} (${g.code})` }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Controller name="classId" control={control} render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Class *</Label>
              <Select value={field.value} onValueChange={field.onChange}
                items={filteredClasses.map(c => ({ value: c.id, label: `${c.name}${c.code ? ` (${c.code})` : ''}` }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder={selectedGradeId ? 'Select a class' : 'Select a grade first'} /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-sm text-destructive">{errors.classId.message}</p>}
            </div>
          )} />

          <fieldset className="border-t pt-4">
            <legend className="text-base font-semibold px-0">Guardian Information</legend>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <Controller name="guardianName" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Guardian Name *</Label>
                  <Input id={field.name} {...field} />
                  {errors.guardianName && <p className="text-sm text-destructive">{errors.guardianName.message}</p>}
                </div>
              )} />
              <Controller name="guardianPhone" control={control} render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Guardian Phone *</Label>
                  <Input id={field.name} type="tel" {...field} />
                  {errors.guardianPhone && <p className="text-sm text-destructive">{errors.guardianPhone.message}</p>}
                </div>
              )} />
            </div>
          </fieldset>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
          )}

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Student'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
