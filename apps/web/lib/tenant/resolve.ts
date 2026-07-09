import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { schools } from '@edunexus/database';
import { tenantCache } from './cache';
import { parseHostname, isSuperAdminHost } from './host';
import type { TenantInfo } from './host';

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
