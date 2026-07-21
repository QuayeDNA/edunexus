'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { CreateCurriculumDialog } from './create-curriculum-dialog';
import { EditCurriculumDialog } from './edit-curriculum-dialog';
import { EmptyState } from '@/components/empty-state';

interface CurriculumRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subjectCount: number;
  schoolId: string;
}

export function CurriculaSection() {
  const [curricula, setCurricula] = useState<CurriculumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CurriculumRow | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const loadCurricula = useCallback(async () => {
    try {
      const res = await fetch('/api/curricula');
      const body = await res.json();
      if (body.success) setCurricula(body.data);
    } catch {
      toast.error('Failed to load curricula');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurricula(); }, [loadCurricula]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/curricula/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum deleted');
        setDeleting(null);
        loadCurricula();
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
        <h2 className="text-lg font-semibold text-text-primary">Curricula</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Curriculum
        </Button>
      </div>

      {curricula.length === 0 ? (
        <EmptyState
          icon={Layers}
          heading="No curricula yet"
          description="Group subjects into curricula like 'General Science' or 'Business'."
          action={{ label: 'Add Curriculum', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {curricula.map((curriculum) => (
            <Card key={curriculum.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="info" className="font-mono text-xs">{curriculum.code}</Badge>
                  <div>
                    <p className="font-medium text-text-primary">{curriculum.name}</p>
                    <p className="text-sm text-text-muted">
                      {curriculum.subjectCount} subject{curriculum.subjectCount !== 1 ? 's' : ''}
                      {curriculum.description && ` \u00b7 ${curriculum.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(curriculum)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting({ id: curriculum.id, name: curriculum.name })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateCurriculumDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => { setShowCreate(false); loadCurricula(); }}
      />

      {editing && (
        <EditCurriculumDialog
          curriculum={editing}
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          onSuccess={() => { setEditing(null); loadCurricula(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Curriculum"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone if subjects are not assigned.`}
      />
    </div>
  );
}
