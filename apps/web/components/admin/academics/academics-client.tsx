'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Lock, Unlock, Star, Pencil, Trash2, Calendar } from 'lucide-react';
import { CreateYearDialog } from './create-year-dialog';
import { EditYearDialog } from './edit-year-dialog';
import { CreateTermDialog } from './create-term-dialog';
import { EditTermDialog } from './edit-term-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface Term {
  id: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  locked: boolean;
}

export function AcademicManagementClient() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);

  const [showCreateYear, setShowCreateYear] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [showCreateTerm, setShowCreateTerm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'year' | 'term'; id: string; name: string } | null>(null);

  const loadYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      const body = await res.json();
      if (body.success) setYears(body.data);
    } catch {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTerms = useCallback(async (yearId: string) => {
    setTermsLoading(true);
    try {
      const res = await fetch(`/api/terms?academicYearId=${yearId}`);
      const body = await res.json();
      if (body.success) setTerms(body.data);
    } catch {
      toast.error('Failed to load terms');
    } finally {
      setTermsLoading(false);
    }
  }, []);

  useEffect(() => { loadYears(); }, [loadYears]);

  useEffect(() => {
    if (selectedYearId) loadTerms(selectedYearId);
  }, [selectedYearId, loadTerms]);

  const handleSelectYear = (yearId: string) => {
    setSelectedYearId(prev => prev === yearId ? null : yearId);
  };

  const handleSetCurrentYear = async (id: string) => {
    const res = await fetch(`/api/academic-years/${id}/set-current`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success('Current year updated');
      loadYears();
    } else {
      toast.error(body.error);
    }
  };

  const handleSetCurrentTerm = async (id: string) => {
    const res = await fetch(`/api/terms/${id}/set-current`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success('Current term updated');
      if (selectedYearId) loadTerms(selectedYearId);
    } else {
      toast.error(body.error);
    }
  };

  const handleToggleLock = async (id: string) => {
    const res = await fetch(`/api/terms/${id}/toggle-lock`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success(body.data.locked ? 'Term locked' : 'Term unlocked');
      if (selectedYearId) loadTerms(selectedYearId);
    } else {
      toast.error(body.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingTarget) return;
    const endpoint = deletingTarget.type === 'year'
      ? `/api/academic-years/${deletingTarget.id}`
      : `/api/terms/${deletingTarget.id}`;
    const res = await fetch(endpoint, { method: 'DELETE' });
    const body = await res.json();
    if (body.success) {
      toast.success(`${deletingTarget.type === 'year' ? 'Year' : 'Term'} deleted`);
      setDeletingTarget(null);
      loadYears();
      if (deletingTarget.type === 'term' && selectedYearId) loadTerms(selectedYearId);
      if (deletingTarget.type === 'year') setSelectedYearId(null);
    } else {
      toast.error(body.error);
    }
  };

  const currentYear = years.find(y => y.isCurrent);
  const currentTerm = selectedYearId ? terms.find(t => t.isCurrent) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentYear && (
        <Card className="border-brand-200 bg-brand-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 text-brand-600" />
            <p className="text-sm font-medium text-brand-800">
              Current Academic Year: <strong>{currentYear.name}</strong>
              {currentTerm && <> &mdash; Current Term: <strong>{currentTerm.name}</strong></>}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Academic Years</h2>
        <Button onClick={() => setShowCreateYear(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Academic Year
        </Button>
      </div>

      {years.length === 0 ? (
        <EmptyState
          icon={Calendar}
          heading="No academic years yet"
          description="Create your first academic year to start managing the school calendar."
          action={{ label: 'Add Academic Year', onClick: () => setShowCreateYear(true) }}
        />
      ) : (
        <div className="space-y-3">
          {years.map((year) => (
            <Card key={year.id} className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-surface-hover"
                onClick={() => handleSelectYear(year.id)}
              >
                <div className="flex items-center gap-3">
                  {year.isCurrent && <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />}
                  <div>
                    <p className="font-medium text-text-primary">{year.name}</p>
                    <p className="text-sm text-text-muted">
                      {new Date(year.startDate).toLocaleDateString('en-GH')} &mdash; {new Date(year.endDate).toLocaleDateString('en-GH')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {year.isCurrent && <Badge>Current</Badge>}
                  {!year.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleSetCurrentYear(year.id); }}
                    >
                      Set Current
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingYear(year); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeletingTarget({ type: 'year', id: year.id, name: year.name }); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {selectedYearId === year.id && (
                <div className="border-t border-border bg-surface-muted px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">Terms</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateTerm(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Term
                    </Button>
                  </div>

                  {termsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : terms.length === 0 ? (
                    <p className="py-4 text-center text-sm text-text-muted">No terms yet for this academic year.</p>
                  ) : (
                    <div className="space-y-2">
                      {terms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                          <div className="flex items-center gap-3">
                            {term.isCurrent && <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />}
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                Term {term.termNumber}: {term.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                {new Date(term.startDate).toLocaleDateString('en-GH')} &mdash; {new Date(term.endDate).toLocaleDateString('en-GH')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {term.isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                            <Badge variant={term.locked ? 'secondary' : 'outline'} className="text-xs">
                              {term.locked ? 'Locked' : 'Active'}
                            </Badge>
                            {!term.isCurrent && (
                              <Button variant="ghost" size="sm" onClick={() => handleSetCurrentTerm(term.id)}>
                                Set Current
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleToggleLock(term.id)}>
                              {term.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingTerm(term)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingTarget({ type: 'term', id: term.id, name: term.name })}>
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

      <CreateYearDialog
        open={showCreateYear}
        onOpenChange={setShowCreateYear}
        onSuccess={() => { setShowCreateYear(false); loadYears(); }}
      />

      {editingYear && (
        <EditYearDialog
          year={editingYear}
          open={!!editingYear}
          onOpenChange={() => setEditingYear(null)}
          onSuccess={() => { setEditingYear(null); loadYears(); }}
        />
      )}

      {showCreateTerm && selectedYearId && (
        <CreateTermDialog
          academicYearId={selectedYearId}
          open={showCreateTerm}
          onOpenChange={setShowCreateTerm}
          onSuccess={() => { setShowCreateTerm(false); loadTerms(selectedYearId); }}
        />
      )}

      {editingTerm && (
        <EditTermDialog
          term={editingTerm}
          open={!!editingTerm}
          onOpenChange={() => setEditingTerm(null)}
          onSuccess={() => { setEditingTerm(null); if (selectedYearId) loadTerms(selectedYearId); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deletingTarget}
        onOpenChange={() => setDeletingTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deletingTarget?.type === 'year' ? 'Academic Year' : 'Term'}`}
        description={`Are you sure you want to delete "${deletingTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
