'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Permission } from '@omniops/shared';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

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

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
            {isSuperAdmin ? 'Platform Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Welcome back, {user.firstName} {user.lastName}
            <span className="ml-2 inline-flex items-center rounded-md bg-surface-100 dark:bg-surface-700 px-2 py-0.5 text-xs font-medium text-surface-600 dark:text-surface-300">
              {user.role.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        {isSuperAdmin ? (
          // SUPER_ADMIN sees platform stats
          <>
            <StatCard label="Total Tenants" value="—" color="bg-brand-500" />
            <StatCard label="Active Sites" value="—" color="bg-emerald-500" />
            <StatCard label="Total Users" value="—" color="bg-amber-500" />
            <StatCard label="Open Tickets" value="—" color="bg-purple-500" />
          </>
        ) : (
          // Site-level user sees site stats
          <>
            <StatCard label="Active Sites" value="—" color="bg-brand-500" />
            <StatCard label="Open Orders" value="—" color="bg-emerald-500" />
            <StatCard label="Staff On Duty" value="—" color="bg-amber-500" />
            <StatCard label="Open Tasks" value="—" color="bg-purple-500" />
          </>
        )}
      </div>

      {/* Role-based content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            {isSuperAdmin ? 'Platform Activity' : 'Recent Activity'}
          </h2>
          <p className="text-surface-500 dark:text-surface-400">
            {isSuperAdmin
              ? 'Platform-wide activity feed will appear here once connected to the API.'
              : 'Activity feed will be populated once connected to the API.'}
          </p>
        </div>

        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {hasPermission(Permission.ORDER_CREATE) && (
              <QuickAction label="New Order" description="Create a new dine-in or takeaway order" />
            )}
            {hasPermission(Permission.USER_CREATE) && (
              <QuickAction label="Add Staff" description="Invite a new team member" />
            )}
            {hasPermission(Permission.MENU_UPDATE) && (
              <QuickAction label="Update Menu" description="Modify menu items and pricing" />
            )}
            {hasPermission(Permission.TENANT_CREATE) && (
              <QuickAction label="New Tenant" description="Onboard a new brand" />
            )}
            {!user.permissions?.all && !hasPermission(Permission.ORDER_CREATE) && (
              <p className="text-surface-400 text-sm">Contact your administrator for additional permissions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold text-surface-900 dark:text-surface-50">{value}</p>
    </div>
  );
}

function QuickAction({ label, description }: { label: string; description: string }) {
  return (
    <button className="w-full text-left rounded-lg border border-surface-200 dark:border-surface-700 p-4 hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors">
      <p className="font-medium text-surface-900 dark:text-surface-50">{label}</p>
      <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{description}</p>
    </button>
  );
}
