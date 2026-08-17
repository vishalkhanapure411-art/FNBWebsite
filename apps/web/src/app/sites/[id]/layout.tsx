'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';

export default function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
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

  const siteId = params.id;
  const tabs = [
    { label: 'Dashboard', href: `/sites/${siteId}/dashboard`, icon: '📊' },
    { label: 'POS', href: `/sites/${siteId}/pos`, icon: '🖥️' },
    { label: 'KDS', href: `/sites/${siteId}/kds`, icon: '👨‍🍳' },
    { label: 'CDS', href: `/sites/${siteId}/cds`, icon: '📺' },
    { label: 'Orders', href: `/sites/${siteId}/orders`, icon: '🛒' },
    { label: 'Menu', href: `/sites/${siteId}/menu`, icon: '📋' },
    { label: 'Analytics', href: `/sites/${siteId}/analytics`, icon: '📈' },
    { label: 'Revenue Assurance', href: `/sites/${siteId}/revenue-assurance`, icon: '🛡️' },
    { label: 'Forecasting', href: `/sites/${siteId}/forecasting`, icon: '📈' },
    { label: 'Shifts', href: `/sites/${siteId}/shifts`, icon: '🕐' },
    { label: 'Tables', href: `/sites/${siteId}/tables`, icon: '🪑' },
    { label: 'Payments', href: `/sites/${siteId}/payments`, icon: '💳' },
    { label: 'Maintenance', href: `/sites/${siteId}/maintenance/tickets`, icon: '🔧' },
    { label: 'Quality', href: `/sites/${siteId}/quality/audits`, icon: '✅' },
    { label: 'Surveys', href: `/sites/${siteId}/surveys`, icon: '📊' },
    { label: 'Field Reports', href: `/sites/${siteId}/field-reports`, icon: '📋' },
  ];

  return (
    <div>
      {/* Sub-nav */}
      <div className="flex items-center gap-1 mb-6 border-b border-surface-200 dark:border-surface-700 pb-0">
        {tabs.map((tab) => {
          const isActive =
            tab.href === `/sites/${siteId}/maintenance/tickets`
              ? pathname.startsWith(`/sites/${siteId}/maintenance`)
              : tab.href === `/sites/${siteId}/quality/audits`
                ? pathname.startsWith(`/sites/${siteId}/quality`)
                : tab.href === `/sites/${siteId}/surveys`
                  ? pathname.startsWith(`/sites/${siteId}/surveys`)
                  : tab.href === `/sites/${siteId}/revenue-assurance`
                  ? pathname.startsWith(`/sites/${siteId}/revenue-assurance`)
                  : tab.href === `/sites/${siteId}/analytics`
                  ? pathname.startsWith(`/sites/${siteId}/analytics`)
                  : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'bg-white dark:bg-surface-800 text-brand-600 border-b-2 border-brand-600 -mb-px'
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
