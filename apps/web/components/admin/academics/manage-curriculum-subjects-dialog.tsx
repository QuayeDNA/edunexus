'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SubjectOption {
  id: string;
  code: string;
  name: string;
  selected: boolean;
}

interface Props {
  curriculumId: string;
  curriculumName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageCurriculumSubjectsDialog({ curriculumId, curriculumName, open, onOpenChange, onSuccess }: Props) {
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectsRes, curriculumRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch(`/api/curricula/${curriculumId}`),
      ]);
      const subjectsBody = await subjectsRes.json();
      const curriculumBody = await curriculumRes.json();
      if (subjectsBody.success && curriculumBody.success) {
        const selectedIds = new Set((curriculumBody.data.subjects ?? []).map((s: any) => s.id));
        setAllSubjects(
          subjectsBody.data.map((s: any) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            selected: selectedIds.has(s.id),
          })),
        );
      }
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const toggleSubject = (id: string) => {
    setAllSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const subjectIds = allSubjects.filter((s) => s.selected).map((s) => s.id);
      const res = await fetch(`/api/curricula/${curriculumId}/subjects`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subjectIds }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Subjects updated');
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to update subjects');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-lg">
        <Dialog.Header>
          <Dialog.Title>Manage Subjects</Dialog.Title>
          <Dialog.Description>
            Select subjects to include in &quot;{curriculumName}&quot;
          </Dialog.Description>
        </Dialog.Header>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto py-2">
            {allSubjects.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">No subjects available. Create subjects first.</p>
            ) : (
              allSubjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-alt transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={subject.selected}
                    onChange={() => toggleSubject(subject.id)}
                    className="h-4 w-4 rounded border-border accent-brand-600"
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{subject.code}</Badge>
                    <span className="text-sm font-medium text-text-primary">{subject.name}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={submitting || loading}>
            {submitting ? 'Saving...' : 'Save Subjects'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
