import { describe, it, expect, beforeEach } from 'vitest';
import { parseHostname, isSuperAdminHost } from '@/lib/tenant/host';
import { tenantCache } from '@/lib/tenant/cache';

describe('parseHostname', () => {
  it('extracts slug from school subdomain', () => {
    const result = parseHostname('academy.edunexus.com');
    expect(result).toEqual({ subdomain: 'academy', slug: 'academy' });
  });

  it('strips port number from hostname', () => {
    const result = parseHostname('academy.edunexus.com:3000');
    expect(result).toEqual({ subdomain: 'academy', slug: 'academy' });
  });

  it('returns null slug for super admin console host', () => {
    const result = parseHostname('console.edunexus.com');
    expect(result.subdomain).toBe('console');
    expect(result.slug).toBeNull();
  });

  it('returns null slug for app host', () => {
    const result = parseHostname('app.edunexus.com');
    expect(result.slug).toBeNull();
  });

  it('returns null slug for www host', () => {
    const result = parseHostname('www.edunexus.com');
    expect(result.slug).toBeNull();
  });

  it('returns null slug and subdomain for localhost', () => {
    const result = parseHostname('localhost');
    expect(result).toEqual({ subdomain: null, slug: null });
  });

  it('returns null slug and subdomain for localhost with port', () => {
    const result = parseHostname('localhost:3000');
    expect(result).toEqual({ subdomain: null, slug: null });
  });

  it('handles uppercase hostname', () => {
    const result = parseHostname('ACADEMY.EDUNEXUS.COM');
    expect(result).toEqual({ subdomain: 'academy', slug: 'academy' });
  });

  it('handles multi-level subdomain (picks first segment)', () => {
    const result = parseHostname('deep.academy.edunexus.com');
    expect(result.subdomain).toBe('deep');
    expect(result.slug).toBe('deep');
  });

  it('handles IP address (4 parts)', () => {
    const result = parseHostname('192.168.1.1:3000');
    expect(result.subdomain).toBe('192');
    expect(result.slug).toBe('192');
  });
});

describe('isSuperAdminHost', () => {
  it('returns true for console host', () => {
    expect(isSuperAdminHost('console.edunexus.com')).toBe(true);
  });

  it('returns true for app host', () => {
    expect(isSuperAdminHost('app.edunexus.com')).toBe(true);
  });

  it('returns true for www host', () => {
    expect(isSuperAdminHost('www.edunexus.com')).toBe(true);
  });

  it('returns false for school subdomain', () => {
    expect(isSuperAdminHost('academy.edunexus.com')).toBe(false);
  });

  it('returns true for localhost (fewer than 3 parts)', () => {
    expect(isSuperAdminHost('localhost')).toBe(true);
  });

  it('returns true for localhost with port', () => {
    expect(isSuperAdminHost('localhost:3000')).toBe(true);
  });

  it('treats unknown single-subdomain host as super admin', () => {
    expect(isSuperAdminHost('mysite.local')).toBe(true);
  });
});

describe('tenantCache', () => {
  beforeEach(() => {
    tenantCache.clear();
  });

  it('stores and retrieves values', () => {
    tenantCache.set('academy', { schoolId: '123', slug: 'academy', name: 'Test School', isSuperAdmin: false });
    const result = tenantCache.get('academy');
    expect(result).toEqual({ schoolId: '123', slug: 'academy', name: 'Test School', isSuperAdmin: false });
  });

  it('returns null for missing key', () => {
    expect(tenantCache.get('nonexistent')).toBeNull();
  });

  it('expires entries after TTL', async () => {
    tenantCache.set('academy', { schoolId: '123', slug: 'academy', name: 'Test School', isSuperAdmin: false }, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(tenantCache.get('academy')).toBeNull();
  });

  it('tracks cache size', () => {
    expect(tenantCache.size).toBe(0);
    tenantCache.set('a', { schoolId: '1', slug: 'a', name: 'A', isSuperAdmin: false });
    tenantCache.set('b', { schoolId: '2', slug: 'b', name: 'B', isSuperAdmin: false });
    expect(tenantCache.size).toBe(2);
  });

  it('clear removes all entries', () => {
    tenantCache.set('a', { schoolId: '1', slug: 'a', name: 'A', isSuperAdmin: false });
    tenantCache.clear();
    expect(tenantCache.size).toBe(0);
    expect(tenantCache.get('a')).toBeNull();
  });
});
