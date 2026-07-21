'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { CreateSubjectDialog } from './create-subject-dialog';
import { EditSubjectDialog } from './edit-subject-dialog';
import { EmptyState } from '@/components/empty-state';

interface SubjectRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  schoolId: string;
}

export function SubjectsSection() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      const body = await res.json();
      if (body.success) setSubjects(body.data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/subjects/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Subject deleted');
        setDeleting(null);
        loadSubjects();
      } else {
        toast.error(body.error ?? 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Subjects</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          heading="No subjects yet"
          description="Create subjects to build your school's curriculum."
          action={{ label: 'Add Subject', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Badge variant="info" className="mt-0.5 shrink-0 font-mono text-xs">{subject.code}</Badge>
                  <div>
                    <p className="font-medium text-text-primary">{subject.name}</p>
                    {subject.description && (
                      <p className="mt-1 text-sm text-text-muted line-clamp-2">{subject.description}</p>
                    )}
                    {subject.category && (
                      <p className="mt-1 text-xs text-text-muted capitalize">{subject.category}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(subject)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting({ id: subject.id, name: subject.name })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateSubjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => { setShowCreate(false); loadSubjects(); }}
      />

      {editing && (
        <EditSubjectDialog
          subject={editing}
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          onSuccess={() => { setEditing(null); loadSubjects(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone if the subject is not referenced by any class or grade-level mapping.`}
      />
    </div>
  );
}
