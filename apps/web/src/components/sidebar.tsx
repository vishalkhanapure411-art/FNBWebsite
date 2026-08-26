'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { useAuth } from '@/providers/auth-provider';
import { Role } from '@omniops/shared';
import { getSites, type SiteWithTenant } from '@/lib/api/sites';
import { INCIDENT_ROLES } from '@/lib/incidents';

// Top-level navigation — only routes that actually exist. Per-site pages live
// under the "Site" section below; /admin/* routes live under "Admin".
const mainNavigation = [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }];

const TENANT_MANAGEMENT = [
  Role.FRANCHISE_OWNER,
  Role.OPERATIONS_MANAGER,
  Role.FINANCE_MANAGER,
] as const;

const adminNavigation = [
  { label: 'Tenants', href: '/admin/tenants', icon: '🏛️', roles: [Role.SUPER_ADMIN] },
  { label: 'Sites', href: '/admin/sites', icon: '🏢', roles: [Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_MANAGEMENT] },
  { label: 'Signage', href: '/admin/signage', icon: '📺', roles: [Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, ...TENANT_MANAGEMENT] },
  { label: 'Quality', href: '/admin/quality/templates', icon: '✅', roles: [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.QUALITY_AUDITOR, ...TENANT_MANAGEMENT] },
  { label: 'Surveys', href: '/admin/surveys/templates', icon: '📊', roles: [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.MARKETING_ADMIN, ...TENANT_MANAGEMENT] },
  { label: 'Exec Analytics', href: '/admin/analytics', icon: '📈', roles: [Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_MANAGEMENT] },
  // centralOnly: only surfaces for users WITHOUT their own siteId (central dept +
  // tenant-level management). Site-scoped incident users use the per-site nav.
  { label: 'Incidents', href: '/admin/incidents', icon: '🎫', roles: [...INCIDENT_ROLES], centralOnly: true },
];

// Per-site navigation — every href resolves to an existing /sites/[id]/* route.
const siteNavigation = [
  { label: 'Dashboard', href: (id: string) => `/sites/${id}/dashboard`, icon: '📍' },
  { label: 'POS', href: (id: string) => `/sites/${id}/pos`, icon: '🖥️' },
  { label: 'KDS', href: (id: string) => `/sites/${id}/kds`, icon: '👨‍🍳' },
  { label: 'Orders', href: (id: string) => `/sites/${id}/orders`, icon: '🛒' },
  { label: 'Menu', href: (id: string) => `/sites/${id}/menu`, icon: '📋' },
  { label: 'Tables', href: (id: string) => `/sites/${id}/tables`, icon: '🪑' },
  { label: 'Shifts', href: (id: string) => `/sites/${id}/shifts`, icon: '🕐' },
  { label: 'Payments', href: (id: string) => `/sites/${id}/payments`, icon: '💳' },
  { label: 'Analytics', href: (id: string) => `/sites/${id}/analytics`, icon: '📈' },
  { label: 'Revenue Assurance', href: (id: string) => `/sites/${id}/revenue-assurance`, icon: '🛡️' },
  { label: 'Forecasting', href: (id: string) => `/sites/${id}/forecasting`, icon: '🔮' },
  { label: 'CDS', href: (id: string) => `/sites/${id}/cds`, icon: '📺' },
  { label: 'Signage', href: (id: string) => `/sites/${id}/signage`, icon: '🎞️' },
  { label: 'Surveys', href: (id: string) => `/sites/${id}/surveys`, icon: '📊' },
  { label: 'Field Reports', href: (id: string) => `/sites/${id}/field-reports`, icon: '📝' },
  { label: 'Maintenance', href: (id: string) => `/sites/${id}/maintenance/tickets`, icon: '🔧' },
  { label: 'Audits', href: (id: string) => `/sites/${id}/quality/audits`, icon: '✅' },
  { label: 'CAPAs', href: (id: string) => `/sites/${id}/quality/capas`, icon: '🛠️' },
  { label: 'Incidents', href: (id: string) => `/sites/${id}/incidents`, icon: '🎫', roles: [...INCIDENT_ROLES] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  // Resolve the current site: prefer the user's own siteId; for tenant-level
  // users (e.g. BRAND_MANAGER with no siteId) fetch their sites client-side and
  // default to the first one. If nothing resolves, the Site section is hidden —
  // we never render a per-site link without a real id.
  const [sites, setSites] = useState<SiteWithTenant[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.siteId) {
      setActiveSiteId(user.siteId);
      // Still fetch the list so a site switcher can be offered when available.
      getSites({ limit: 100 })
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : [];
          setSites(list);
        })
        .catch(() => setSites([]));
      return;
    }
    let cancelled = false;
    getSites({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setSites(list);
        setActiveSiteId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setSites([]);
          setActiveSiteId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const hasSiteAccess = isAuthenticated && !!activeSiteId;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex flex-col">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-700 hover:opacity-80 transition-opacity">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
          O
        </div>
        <span className="text-lg font-bold text-surface-900 dark:text-surface-50">OmniOps</span>
      </Link>

      {/* Nav — Only show when authenticated */}
      {isAuthenticated && (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Site — per-site pages, resolved to a real site id */}
          {hasSiteAccess && activeSiteId && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  Site
                </p>
              </div>
              {sites.length > 1 && (
                <div className="px-3 pb-2">
                  <select
                    value={activeSiteId}
                    onChange={(e) => setActiveSiteId(e.target.value)}
                    aria-label="Switch site"
                    className="w-full text-xs rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {siteNavigation.map((item) => {
                const siteRoles = (item as { roles?: Role[] }).roles;
                if (siteRoles && !siteRoles.includes(user?.role as Role)) return null;
                const href = item.href(activeSiteId);
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          {/* Admin Section */}
          {adminNavigation.some((item) => item.roles.includes(user?.role as Role) && (!(item as { centralOnly?: boolean }).centralOnly || !user?.siteId)) && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  Admin
                </p>
              </div>
              {adminNavigation
                .filter((item) => item.roles.includes(user?.role as Role) && (!(item as { centralOnly?: boolean }).centralOnly || !user?.siteId))
                .map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
            </>
          )}
        </nav>
      )}

      {!isAuthenticated && (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link href="/login" className="sidebar-link">
            <span className="text-lg">🔑</span>
            <span className="text-sm font-medium">Sign In</span>
          </Link>
        </nav>
      )}

      {/* Bottom */}
      <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-4 space-y-2">
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full text-left"
        >
          <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="text-sm font-medium">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {isAuthenticated ? (
          <div className="space-y-1">
            <div className="px-3 py-1">
              <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                {user?.email}
              </p>
            </div>
            <button onClick={logout} className="sidebar-link w-full text-left">
              <span className="text-lg">🚪</span>
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link href="/login" className="sidebar-link">
            <span className="text-lg">🚪</span>
            <span className="text-sm font-medium">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
