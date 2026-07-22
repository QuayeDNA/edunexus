'use client'

import { useState, useCallback, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import type { GradeLevel, ClassRow, SubjectCol, StaffOption, MatrixClientProps } from '@/types/class-subject-teacher'

export function MatrixClient({ gradeLevels, defaultAcademicYearId }: MatrixClientProps) {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [subjects, setSubjects] = useState<SubjectCol[]>([])
  const [assignments, setAssignments] = useState<Map<string, string | null>>(new Map())
  const [teachers, setTeachers] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/staff?role=teacher')
      const body = await res.json()
      if (body.success) setTeachers(body.data ?? [])
    } catch { toast.error('Failed to load teacher list') }
  }, [])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const loadMatrix = useCallback(async (gradeLevelId: string, academicYearId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/class-subject-teacher?gradeLevelId=${gradeLevelId}&academicYearId=${academicYearId}`)
      const body = await res.json()
      if (body.success) {
        setClasses(body.data.classes)
        setSubjects(body.data.subjects)
        const map = new Map<string, string | null>()
        for (const a of body.data.assignments) {
          map.set(`${a.classId}|${a.subjectId}`, a.teacherId)
        }
        setAssignments(map)
      }
    } catch {
      toast.error('Failed to load matrix')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value)
    if (defaultAcademicYearId) loadMatrix(value, defaultAcademicYearId)
  }

  const setTeacher = (classId: string, subjectId: string, teacherId: string) => {
    const key = `${classId}|${subjectId}`
    setAssignments((prev) => {
      const next = new Map(prev)
      next.set(key, teacherId || null)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      gradeLevelId: selectedGrade,
      assignments: Array.from(assignments.entries()).map(([key, teacherId]) => {
        const [classId, subjectId] = key.split('|')
        return { classId, subjectId, teacherId }
      }),
    }
    try {
      const res = await fetch('/api/class-subject-teacher', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (body.success) {
        toast.success(`Saved ${body.data.saved} assignments`)
        if (body.data.errors?.length > 0) {
          body.data.errors.forEach((e: { classId: string; subjectId: string; error: string }) => toast.error(`${e.classId}/${e.subjectId}: ${e.error}`))
        }
        if (defaultAcademicYearId) loadMatrix(selectedGrade, defaultAcademicYearId)
      } else {
        toast.error(body.error ?? 'Failed to save')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="w-64">
          <Label htmlFor="grade">Grade Level</Label>
          <Select value={selectedGrade} onValueChange={(v) => handleGradeChange(v as string)} items={gradeLevels.map((g) => ({ value: g.id, label: `${g.name}${g.code ? ` (${g.code})` : ''}` }))}>
            <SelectTrigger id="grade"><SelectValue placeholder="Select grade level" /></SelectTrigger>
            <SelectContent>
              {gradeLevels.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedGrade && (
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save All'}
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading matrix...</p>}

      {!loading && classes.length > 0 && subjects.length > 0 && (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white">Class</TableHead>
                  {subjects.map((sub) => (
                    <TableHead key={sub.id} className="min-w-44">
                      {sub.name}
                      {!sub.isCore && <span className="text-xs text-muted-foreground ml-1">(elective)</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="sticky left-0 bg-white font-medium">{cls.name}</TableCell>
                    {subjects.map((sub) => {
                      const key = `${cls.id}|${sub.id}`
                      const teacherId = assignments.get(key) ?? ''
                      return (
                        <TableCell key={sub.id}>
                          <Select value={teacherId} onValueChange={(v) => setTeacher(cls.id, sub.id, v as string)} items={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && selectedGrade && classes.length === 0 && (
        <p className="text-sm text-muted-foreground">No classes found for this grade level. Create classes first.</p>
      )}

      {!loading && selectedGrade && classes.length > 0 && subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">No subjects found for this grade level. Map subjects to grade levels first.</p>
      )}
    </div>
  )
}
