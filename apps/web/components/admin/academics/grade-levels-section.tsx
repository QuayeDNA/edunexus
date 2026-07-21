'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { CreateGradeLevelDialog } from './create-grade-level-dialog';
import { EditGradeLevelDialog } from './edit-grade-level-dialog';
import { CreateClassDialog } from './create-class-dialog';
import { EditClassDialog } from './edit-class-dialog';
import { EmptyState } from '@/components/empty-state';

interface GradeLevelRow {
  id: string;
  code: string;
  name: string;
  level: number;
  category: string;
  sortOrder: number;
  description: string | null;
  schoolId: string;
  classCount: number;
}

interface ClassRow {
  id: string;
  name: string;
  code: string | null;
  gradeLevelId: string;
  academicYearId: string;
  capacity: number | null;
  roomNumber: string | null;
  homeroomTeacherId: string | null;
  schoolId: string;
  gradeLevelName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  creche: 'Creche',
  nursery: 'Nursery',
  kindergarten: 'Kindergarten',
  primary: 'Primary',
  junior_secondary: 'Junior Secondary',
  senior_secondary: 'Senior Secondary',
};

export function GradeLevelsSection() {
  const [gradeLevels, setGradeLevels] = useState<GradeLevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGlId, setSelectedGlId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [currentYearId, setCurrentYearId] = useState<string | null>(null);

  const [showCreateGl, setShowCreateGl] = useState(false);
  const [editingGl, setEditingGl] = useState<GradeLevelRow | null>(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'gradeLevel' | 'class'; id: string; name: string } | null>(null);

  const loadGradeLevels = useCallback(async () => {
    try {
      const res = await fetch('/api/grade-levels');
      const body = await res.json();
      if (body.success) setGradeLevels(body.data);
    } catch {
      toast.error('Failed to load grade levels');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentYear = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      const body = await res.json();
      if (body.success) {
        const current = body.data.find((y: { isCurrent: boolean }) => y.isCurrent);
        if (current) setCurrentYearId(current.id);
      }
    } catch {
      // silently fail – classes just won't auto-select a year
    }
  }, []);

  const loadClasses = useCallback(async (gradeLevelId: string) => {
    setClassesLoading(true);
    try {
      const res = await fetch(`/api/classes?gradeLevelId=${gradeLevelId}`);
      const body = await res.json();
      if (body.success) setClasses(body.data);
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => { loadGradeLevels(); loadCurrentYear(); }, [loadGradeLevels, loadCurrentYear]);

  useEffect(() => {
    if (selectedGlId) loadClasses(selectedGlId);
  }, [selectedGlId, loadClasses]);

  const handleSelectGl = (id: string) => {
    setSelectedGlId(prev => prev === id ? null : id);
  };

  const handleDelete = async () => {
    if (!deletingTarget) return;
    try {
      const endpoint = deletingTarget.type === 'gradeLevel'
        ? `/api/grade-levels/${deletingTarget.id}`
        : `/api/classes/${deletingTarget.id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success(`${deletingTarget.type === 'gradeLevel' ? 'Grade level' : 'Class'} deleted`);
        setDeletingTarget(null);
        loadGradeLevels();
        if (deletingTarget.type === 'class' && selectedGlId) loadClasses(selectedGlId);
        if (deletingTarget.type === 'gradeLevel') setSelectedGlId(null);
      } else {
        toast.error(body.error ?? 'Failed to delete');
      }
    } catch {
      toast.error('Network error — could not delete');
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Grade Levels</h2>
        <Button onClick={() => setShowCreateGl(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Grade Level
        </Button>
      </div>

      {gradeLevels.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          heading="No grade levels yet"
          description="Create grade levels to start organising classes and subjects."
          action={{ label: 'Add Grade Level', onClick: () => setShowCreateGl(true) }}
        />
      ) : (
        <div className="space-y-3">
          {gradeLevels.map((gl) => (
            <Card key={gl.id} className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-surface-hover"
                onClick={() => handleSelectGl(gl.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {gl.code}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{gl.name}</p>
                    <p className="text-sm text-text-muted">
                      Level {gl.level} &mdash; {CATEGORY_LABELS[gl.category] ?? gl.category}
                      {gl.classCount > 0 && <> &middot; {gl.classCount} class{gl.classCount > 1 ? 'es' : ''}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{gl.sortOrder}</Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingGl(gl); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeletingTarget({ type: 'gradeLevel', id: gl.id, name: gl.name }); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {selectedGlId === gl.id && (
                <div className="border-t border-border bg-surface-muted px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">Classes</h3>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (!currentYearId) {
                        toast.error('Please set a current academic year before adding classes');
                        return;
                      }
                      setShowCreateClass(true);
                    }}>
                      <Plus className="mr-1 h-3 w-3" /> Add Class
                    </Button>
                  </div>

                  {classesLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <Users className="mb-2 h-8 w-8 text-text-muted" />
                      <p className="text-sm text-text-muted">No classes yet for this grade level.</p>
                      <Button variant="link" size="sm" onClick={() => {
                        if (!currentYearId) {
                          toast.error('Please set a current academic year before adding classes');
                          return;
                        }
                        setShowCreateClass(true);
                      }}>
                        Create the first class
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classes.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                {cls.name}{cls.code ? ` (${cls.code})` : ''}
                              </p>
                              <p className="text-xs text-text-muted">
                                {cls.roomNumber && <>Room {cls.roomNumber} &middot; </>}
                                {cls.capacity ? `${cls.capacity} students` : 'No capacity set'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingClass(cls)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingTarget({ type: 'class', id: cls.id, name: cls.name })}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateGradeLevelDialog
        open={showCreateGl}
        onOpenChange={setShowCreateGl}
        onSuccess={() => { setShowCreateGl(false); loadGradeLevels(); }}
      />

      {editingGl && (
        <EditGradeLevelDialog
          gradeLevel={editingGl}
          open={!!editingGl}
          onOpenChange={() => setEditingGl(null)}
          onSuccess={() => { setEditingGl(null); loadGradeLevels(); }}
        />
      )}

      {showCreateClass && selectedGlId && currentYearId && (
        <CreateClassDialog
          gradeLevelId={selectedGlId}
          academicYearId={currentYearId}
          open={showCreateClass}
          onOpenChange={setShowCreateClass}
          onSuccess={() => { setShowCreateClass(false); loadClasses(selectedGlId); loadGradeLevels(); }}
        />
      )}

      {editingClass && (
        <EditClassDialog
          classItem={editingClass}
          open={!!editingClass}
          onOpenChange={() => setEditingClass(null)}
          onSuccess={() => { setEditingClass(null); if (selectedGlId) loadClasses(selectedGlId); loadGradeLevels(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deletingTarget}
        onOpenChange={() => setDeletingTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deletingTarget?.type === 'gradeLevel' ? 'Grade Level' : 'Class'}`}
        description={`Are you sure you want to delete "${deletingTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
