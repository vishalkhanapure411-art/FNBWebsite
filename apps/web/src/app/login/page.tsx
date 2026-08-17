import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full-viewport background image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/backgrounds/login.jpg')" }}
      />
      {/* Subtle dark overlay for card contrast (light & dark mode) */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
      <div className="relative z-10">
        <Suspense
          fallback={
            <div className="flex min-h-[80vh] items-center justify-center">
              <div className="text-white/80">Loading...</div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
