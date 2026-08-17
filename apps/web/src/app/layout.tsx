import type { Metadata } from 'next';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/app-shell';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'OmniOps — Hospitality Operations Platform',
  description: 'Multi-tenant enterprise operations platform for the hospitality industry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
