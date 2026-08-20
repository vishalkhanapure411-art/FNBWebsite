'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Role } from '@omniops/shared';

const ADMIN_ROLE_MAP: Record<string, Role[]> = {
  '/admin/tenants': [Role.SUPER_ADMIN],
  '/admin/sites': [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.FRANCHISE_OWNER, Role.OPERATIONS_MANAGER, Role.FINANCE_MANAGER],
  '/admin/signage': [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.MARKETING_ADMIN, Role.FRANCHISE_OWNER, Role.OPERATIONS_MANAGER, Role.FINANCE_MANAGER],
  '/admin/quality': [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.QUALITY_AUDITOR, Role.FRANCHISE_OWNER, Role.OPERATIONS_MANAGER, Role.FINANCE_MANAGER],
  '/admin/surveys': [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.MARKETING_ADMIN, Role.FRANCHISE_OWNER, Role.OPERATIONS_MANAGER, Role.FINANCE_MANAGER],
  '/admin/analytics': [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.FRANCHISE_OWNER, Role.OPERATIONS_MANAGER, Role.FINANCE_MANAGER],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-surface-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Determine allowed roles based on the current path prefix
  let allowedRoles: Role[] = [Role.SUPER_ADMIN];
  for (const [prefix, roles] of Object.entries(ADMIN_ROLE_MAP)) {
    if (pathname.startsWith(prefix)) {
      allowedRoles = roles;
      break;
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-2">Access Denied</h1>
        <p className="text-surface-500 dark:text-surface-400">
          You don&apos;t have permission to access this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
