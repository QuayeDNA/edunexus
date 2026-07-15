import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { schools } from '@edunexus/database';
import { tenantCache } from './cache';
import { parseHostname, isSuperAdminHost } from './host';
import type { TenantInfo } from './host';

function isDevLocalhost(hostname: string): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  const host = hostname?.replace(/:\d+$/, '').toLowerCase() ?? '';
  return host === 'localhost' || host === '127.0.0.1';
}

async function resolveDefaultSchool(): Promise<TenantInfo> {
  const cacheKey = '__dev_default_school__';
  const cached = tenantCache.get<TenantInfo>(cacheKey);
  if (cached) return cached;

  try {
    const { slug } = process.env.DEV_SCHOOL_SLUG
      ? { slug: process.env.DEV_SCHOOL_SLUG }
      : await db
          .select({ slug: schools.slug })
          .from(schools)
          .limit(1)
          .then((rows) => rows[0] ?? { slug: null });

    if (!slug) {
      console.warn('[TenantResolver] No schools found for dev fallback');
      return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
    }

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
      tenantCache.set(cacheKey, info);
      return info;
    }
  } catch (error) {
    console.error('[TenantResolver] Default school query failed:', error);
  }

  return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
}

export async function resolveTenant(hostname: string): Promise<TenantInfo> {
  const { slug } = parseHostname(hostname);

  if (isSuperAdminHost(hostname)) {
    if (isDevLocalhost(hostname)) {
      return resolveDefaultSchool();
    }
    return { schoolId: null, slug: null, name: null, isSuperAdmin: true };
  }

  if (!slug) {
    if (isDevLocalhost(hostname)) {
      return resolveDefaultSchool();
    }
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
