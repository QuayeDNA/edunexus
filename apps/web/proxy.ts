import { auth } from '@/lib/auth/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { tenantCache } from '@/lib/tenant/cache';
import { parseHostname, isSuperAdminHost, type TenantInfo } from '@/lib/tenant/host';
import { ROLE_ROUTES } from '@edunexus/shared';
import type { UserRole } from '@edunexus/shared';

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/dashboard',
  ],
};

const SUPER_ADMIN_PREFIX = '/super-admin';

function isDevLocalhost(hostname: string): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  const host = hostname?.replace(/:\d+$/, '').toLowerCase() ?? '';
  return host === 'localhost' || host === '127.0.0.1';
}

async function fetchTenantByHost(hostname: string): Promise<TenantInfo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/internal/resolve-tenant?hostname=${encodeURIComponent(hostname)}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const tenant: TenantInfo = await res.json();
      if (tenant.schoolId) return tenant;
    }
  } catch (error) {
    console.error('[Middleware] Tenant fetch failed:', error);
  }
  return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
}

async function fetchTenant(hostname: string): Promise<TenantInfo> {
  const { slug } = parseHostname(hostname);

  if (isSuperAdminHost(hostname)) {
    if (isDevLocalhost(hostname)) {
      return fetchTenantByHost(hostname);
    }
    return { schoolId: null, slug: null, name: null, isSuperAdmin: true };
  }

  if (!slug) {
    if (isDevLocalhost(hostname)) {
      return fetchTenantByHost(hostname);
    }
    return { schoolId: null, slug: null, name: null, isSuperAdmin: false };
  }

  const cached = tenantCache.get<TenantInfo>(slug);
  if (cached) return cached;

  const tenant = await fetchTenantByHost(hostname);
  if (tenant.slug) {
    tenantCache.set(slug, tenant);
  }
  return tenant;
}

function getRouteRole(pathname: string): UserRole | null {
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) return 'super_admin';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/parent')) return 'parent';
  return null;
}

const proxyHandler = auth(async function proxy(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') ?? '';
  const session = req.auth;

  const resolvedTenant = await fetchTenant(hostname);

  const requestHeaders = new Headers(req.headers);
  if (resolvedTenant.schoolId) {
    requestHeaders.set('x-tenant-id', resolvedTenant.schoolId);
  }
  if (resolvedTenant.slug) {
    requestHeaders.set('x-tenant-slug', resolvedTenant.slug);
  }

  const url = req.nextUrl;
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (resolvedTenant.isSuperAdmin) {
    response.headers.set('x-tenant-type', 'super_admin');
  } else if (resolvedTenant.schoolId) {
    response.headers.set('x-tenant-type', 'school');
    response.headers.set('x-tenant-id', resolvedTenant.schoolId);
  }

  const routeRole = getRouteRole(pathname);

  if (routeRole) {
    if (!session?.user) {
      const loginUrl = new URL('/login', url);
      loginUrl.searchParams.set('callbackUrl', url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.user.role !== routeRole) {
      const redirectPath = ROLE_ROUTES[session.user.role as UserRole] ?? '/login';
      return NextResponse.redirect(new URL(redirectPath, url));
    }

    if (routeRole !== 'super_admin' && resolvedTenant.schoolId && session.user.schoolId) {
      if (session.user.schoolId !== resolvedTenant.schoolId) {
        const loginUrl = new URL('/login', url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  if (pathname === '/dashboard') {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', url));
    }
    const targetPath = ROLE_ROUTES[session.user.role as UserRole] ?? '/login';
    if (pathname !== targetPath) {
      return NextResponse.redirect(new URL(targetPath, url));
    }
  }

  return response;
}) as unknown as (req: NextRequest) => Promise<NextResponse | undefined>;

export default proxyHandler;
