import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="bg-white font-body text-navy-900 antialiased min-h-screen flex flex-col selection:bg-primary/30 selection:text-navy-900">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-navy-900 font-body text-sm">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}