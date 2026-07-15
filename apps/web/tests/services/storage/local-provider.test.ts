import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { LocalStorageProvider } from '@/services/storage/providers/local';

describe('LocalStorageProvider', () => {
  let tmpDir: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edunexus-test-'));
    provider = new LocalStorageProvider(tmpDir);
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('uploads a file to the correct path', async () => {
    const result = await provider.upload(
      Buffer.from('test content'),
      'school-1/applicant/entity-1/test.pdf',
      'application/pdf',
    );
    expect(result.mimeType).toBe('application/pdf');
    expect(result.size).toBe(12);
    expect(result.path).toBe('school-1/applicant/entity-1/test.pdf');
    expect(result.url).toContain('/api/files/serve/');

    const fileContent = await fsp.readFile(
      path.join(tmpDir, 'school-1/applicant/entity-1/test.pdf'),
      'utf-8',
    );
    expect(fileContent).toBe('test content');
  });

  it('deletes a file from disk', async () => {
    await provider.upload(
      Buffer.from('to-delete'),
      'test/file.txt',
      'text/plain',
    );
    await provider.delete('test/file.txt');
    await expect(
      fsp.access(path.join(tmpDir, 'test/file.txt')),
    ).rejects.toThrow();
  });

  it('getSignedUrl returns a URL with signature', async () => {
    const url = await provider.getSignedUrl('test/doc.pdf', 3600);
    expect(url).toContain('/api/files/serve/');
    expect(url).toContain('expires=');
    expect(url).toContain('sig=');
  });

  it('copy duplicates a file', async () => {
    await provider.upload(Buffer.from('original'), 'source.txt', 'text/plain');
    const destPath = await provider.copy('source.txt', 'dest.txt');
    expect(destPath).toBe('dest.txt');
    const destContent = await fsp.readFile(path.join(tmpDir, 'dest.txt'), 'utf-8');
    expect(destContent).toBe('original');
  });
});
