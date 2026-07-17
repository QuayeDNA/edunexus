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
  const host = hostname?.replace(/:\d+$/, "").toLowerCase() ?? "";
  const parts = host.split(".");

  if (parts.length < 3) {
    return { subdomain: null, slug: null };
  }

  const subdomain = parts[0];

  const superAdminDomains = ["console", "app", "www"];
  if (superAdminDomains.includes(subdomain)) {
    return { subdomain, slug: null };
  }

  return { subdomain, slug: subdomain };
}

export function isSuperAdminHost(hostname: string): boolean {
  const host = hostname?.replace(/:\d+$/, "").toLowerCase() ?? "";
  const parts = host.split(".");

  if (parts.length < 3) return true;

  const subdomain = parts[0];
  const superAdminDomains = ["console", "app", "www"];
  return superAdminDomains.includes(subdomain);
}
