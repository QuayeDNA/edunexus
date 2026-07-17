import type { StudentRow, StatsData, ValidationData, ImportData } from '@/types/students';

export interface StudentListParams {
  status?: string | null;
  classId?: string;
  gradeLevelId?: string;
  search?: string;
  page: number;
  pageSize?: number;
}

export interface StudentListResponse {
  data: StudentRow[];
  meta: { total: number; totalPages: number };
}

export interface StudentCreateResponse {
  student: { studentIdNumber: string; firstName: string; lastName: string };
  credentials: { student: { email: string | null; password: string } };
}

export async function fetchStudents(params: StudentListParams): Promise<StudentListResponse> {
  const url = new URLSearchParams();
  if (params.status) url.set('status', params.status);
  if (params.classId) url.set('classId', params.classId);
  if (params.gradeLevelId) url.set('gradeLevelId', params.gradeLevelId);
  if (params.search) url.set('search', params.search);
  url.set('page', String(params.page));
  url.set('pageSize', String(params.pageSize ?? 20));

  const res = await fetch(`/api/students?${url}`);
  if (!res.ok) throw new Error('Failed to fetch students');
  return res.json();
}

export async function fetchStudentStats(): Promise<{ data: StatsData }> {
  const res = await fetch('/api/students/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function createStudent(data: Record<string, unknown>): Promise<StudentCreateResponse> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? json.details?.message ?? 'Failed to create student');
  return json.data;
}

export async function previewImport(csv: string): Promise<{
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
}> {
  const res = await fetch('/api/students/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Preview failed');
  return json.data;
}

export async function validateImport(csv: string, mapping: Record<string, string>): Promise<ValidationData> {
  const res = await fetch('/api/students/import/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, mapping }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Validation failed');
  return json.data;
}

export async function executeImport(csv: string, mapping: Record<string, string>): Promise<ImportData> {
  const res = await fetch('/api/students/import/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, mapping }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Import failed');
  return json.data;
}
