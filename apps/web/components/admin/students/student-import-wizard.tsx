'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Upload, FileText, Download } from 'lucide-react';

type Step = 'upload' | 'mapping' | 'validation' | 'results';

const KNOWN_FIELDS = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'classCode', 'guardianName', 'guardianPhone'];

export function StudentImportWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      setCsvText(text);
      const res = await fetch('/api/students/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Preview failed'); return; }
      setHeaders(json.data.headers);
      setSampleRows(json.data.sampleRows);
      setMapping(Object.fromEntries(
        json.data.headers.map((h: string) => [h, json.data.suggestedMapping[h] ?? ''])
      ));
      setStep('mapping');
    } catch { setError('Failed to read file'); }
    finally { setLoading(false); }
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, mapping }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Validation failed'); return; }
      setValidationResult(json.data);
      setStep('validation');
    } catch { setError('Validation request failed'); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, mapping }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Import failed'); return; }
      setImportResult(json.data);
      setStep('results');
    } catch { setError('Import request failed'); }
    finally { setLoading(false); }
  };

  const downloadErrorReport = () => {
    if (!validationResult) return;
    const errors = validationResult.rows.filter((r: any) => !r.valid);
    const csvRows = [['Row', 'Name', 'Errors'].join(',')];
    errors.forEach((r: any) => {
      const errorStr = r.errors ? Object.values(r.errors).flat().join('; ') : '';
      csvRows.push([r.rowNumber, r.firstName, `"${errorStr}"`].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'import-errors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'upload') {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Upload a CSV file with student data</p>
            <p className="text-xs text-muted-foreground mt-1">Headers: firstName, lastName, gender, dateOfBirth, classCode, guardianName, guardianPhone</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
            {loading ? 'Reading...' : 'Select CSV File'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (step === 'mapping') {
    return (
      <Card>
        <CardHeader><CardTitle>Map Columns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map CSV columns to student fields. Fields without a mapping will be skipped.
          </p>
          {headers.map(header => (
            <div key={header} className="flex items-center gap-3">
              <Label className="w-40 shrink-0 text-sm font-mono">{header}</Label>
              <Select value={mapping[header] ?? ''} onValueChange={(v) => setMapping(p => ({ ...p, [header]: v } as Record<string, string>))}
                items={KNOWN_FIELDS.map(f => ({ value: f, label: f.replace(/([A-Z])/g, ' $1').trim() }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Skip column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Skip column</SelectItem>
                  {KNOWN_FIELDS.map(f => <SelectItem key={f} value={f}>{f.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          {sampleRows.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview (first {sampleRows.length} rows)</p>
              <div className="overflow-x-auto text-xs border rounded-md">
                <table className="w-full">
                  <thead><tr className="bg-muted">{headers.map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
                  <tbody>{sampleRows.map((row, i) => (
                    <tr key={i} className="border-t">{headers.map(h => <td key={h} className="p-2">{row[h]}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
            <Button onClick={handleValidate} disabled={loading}>{loading ? 'Validating...' : 'Validate'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'validation') {
    return (
      <Card>
        <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-green-700">{validationResult?.valid ?? 0}</p>
              <p className="text-sm text-green-600">Valid</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-red-700">{validationResult?.invalid ?? 0}</p>
              <p className="text-sm text-red-600">Invalid</p>
            </div>
          </div>
          {validationResult?.invalid > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-700">Rows with errors</p>
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="h-3 w-3 mr-1" /> Error Report
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto text-sm border rounded-md">
                <table className="w-full">
                  <thead><tr className="bg-muted"><th className="p-2 text-left">Row</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Errors</th></tr></thead>
                  <tbody>{validationResult?.rows.filter((r: any) => !r.valid).map((r: any) => (
                    <tr key={r.rowNumber} className="border-t">
                      <td className="p-2">{r.rowNumber}</td>
                      <td className="p-2">{r.firstName}</td>
                      <td className="p-2 text-red-600">{r.errors ? Object.values(r.errors).flat().join('; ') : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
            <Button onClick={handleImport} disabled={loading || (validationResult?.valid ?? 0) === 0}>
              {loading ? 'Importing...' : `Import ${validationResult?.valid ?? 0} Valid Students`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center space-y-4">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="text-xl font-semibold">Import Complete</h2>
        <div className="flex gap-4 justify-center">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{importResult?.imported ?? 0}</p>
            <p className="text-sm text-green-600">Imported</p>
          </div>
          {importResult?.failed > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{importResult?.failed ?? 0}</p>
              <p className="text-sm text-red-600">Failed</p>
            </div>
          )}
        </div>
        {importResult?.failed > 0 && (
          <Button variant="outline" onClick={downloadErrorReport}>
            <Download className="h-4 w-4 mr-1" /> Download Error Report
          </Button>
        )}
        <Button onClick={() => { setStep('upload'); setCsvText(''); setMapping({}); setValidationResult(null); setImportResult(null); }}>
          Import Another File
        </Button>
      </CardContent>
    </Card>
  );
}
