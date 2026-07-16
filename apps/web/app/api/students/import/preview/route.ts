import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { parseCsv, autoMapColumns } from '@/services/csv-parser';
import type { KnownField } from '@/services/csv-parser';

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const body = await request.json();
  if (!body.csv || typeof body.csv !== 'string') {
    return apiError(422, 'CSV content is required');
  }

  const result = parseCsv(body.csv);
  if (result.headers.length === 0) {
    return apiError(422, 'CSV must have at least a header row');
  }

  const columnMap = autoMapColumns(result.headers);

  const suggestedMapping: Record<string, string | null> = {};
  const knownFields = Object.keys(columnMap.mappings) as KnownField[];
  for (const field of knownFields) {
    const header = columnMap.mappings[field];
    if (header !== null) {
      suggestedMapping[header] = field;
    }
  }
  for (const { header } of columnMap.unmatched) {
    if (!(header in suggestedMapping)) {
      suggestedMapping[header] = null;
    }
  }

  const sampleRows = result.rows.slice(0, 10).map(row => {
    const record: Record<string, string> = {};
    for (let i = 0; i < result.headers.length; i++) {
      record[result.headers[i]] = row.cells[i] ?? '';
    }
    return record;
  });

  return apiSuccess({
    headers: result.headers,
    suggestedMapping,
    sampleRows,
    totalRows: result.totalRows,
  });
}
