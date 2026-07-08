import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { schools } from '@edunexus/database';
import { tenantCache } from './cache';

export interface TenantInfo {
  schoolId: string | null;
  slug: string | null;
  name: string | null;
  isSuperAdmin: boolean;
}

export function parseHostname(hostname: string): {
  subdomain: string | null;
  slug: string | null;
} {
  const host = hostname?.replace(/:\d+$/, '').toLowerCase() ?? '';
  const parts = host.split('.');

  if (parts.length < 3) {
    return { subdomain: null, slug: null };
  }

  const subdomain = parts[0];

  const superAdminDomains = ['console', 'app', 'www'];
  if (superAdminDomains.includes(subdomain)) {
    return { subdomain, slug: null };
  }

  return { subdomain, slug: subdomain };
}

export function isSuperAdminHost(hostname: string): boolean {
  const host = hostname?.replace(/:\d+$/, '').toLowerCase() ?? '';
  const parts = host.split('.');

  if (parts.length < 3) return true;

  const subdomain = parts[0];
  const superAdminDomains = ['console', 'app', 'www'];
  return superAdminDomains.includes(subdomain);
}

export async function resolveTenant(hostname: string): Promise<TenantInfo> {
  const { slug } = parseHostname(hostname);

  if (isSuperAdminHost(hostname)) {
    return { schoolId: null, slug: null, name: null, isSuperAdmin: true };
  }

  if (!slug) {
    return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
  }

  const cached = tenantCache.get<TenantInfo>(slug);
  if (cached) return cached;

  try {
    const row = await db
      .select({ id: schools.id, name: schools.name, slug: schools.slug })
      .from(schools)
      .where(eq(schools.slug, slug))
      .then((rows) => rows[0] ?? null);

    if (row) {
      const info: TenantInfo = {
        schoolId: row.id,
        slug: row.slug,
        name: row.name,
        isSuperAdmin: false,
      };
      tenantCache.set(slug, info);
      return info;
    }
  } catch (error) {
    console.error('[TenantResolver] DB query failed:', error);
  }

  return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
}
