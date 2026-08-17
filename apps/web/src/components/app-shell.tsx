'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

// Routes that render WITHOUT the sidebar and the ml-64 main margin — full-viewport
// public screens (auth, kiosk, etc.). Add routes here as they are introduced.
const PUBLIC_ROUTES = ['/login'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
