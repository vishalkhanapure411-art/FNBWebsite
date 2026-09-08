'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { ApiRequestError } from '@/lib/api-client';

/**
 * Staff Console Sign-In — faithful port of `1. login/code.html` into a Next.js
 * client component. Only the email + passcode path is real (POST /auth/login via
 * useAuth().login). Everything else in the mockup (SSO, FIDO2, venue lookup,
 * nav links, EN-US dropdown) is decorative and rendered disabled/non-interactive.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Mockup renders the "Remember authorized terminal for 30 days" box checked.
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAuthenticated, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password, rememberMe);

      // Set auth mirror cookie for middleware (navigation is driven by the
      // isAuthenticated effect below — the single navigation authority — so the
      // /dashboard route is only entered AFTER auth state is fully committed,
      // avoiding double-navigation races during its hydration).
      document.cookie = 'omniops_auth=true; path=/; max-age=86400; SameSite=Lax';
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 401) {
          setError('Invalid email or password');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ============ TOP NAVBAR ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-border shadow-sm">
        <div className="h-16 w-full px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mini Compass Mark */}
            <a className="flex items-center gap-2.5 focus:outline-none" href="#">
              <div className="w-8 h-8 rounded-lg bg-navy-900 border border-slate-border flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
              </div>
              <span className="font-headline font-extrabold text-xl tracking-tight text-navy-900 uppercase">
                OMNI<span className="text-primary">OPS</span>
                <span className="text-slate-muted lowercase text-base font-semibold">.ai</span>
              </span>
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-surface-subtle border border-slate-border text-navy-900 font-mono text-[11px] font-semibold uppercase tracking-wider ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              OS 3.8 Enterprise
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-slate-body hover:text-navy-900 cursor-pointer py-1.5 px-2.5 rounded-md hover:bg-slate-surface transition-colors border border-transparent hover:border-slate-border">
              <span className="material-symbols-outlined text-[17px] text-slate-muted">language</span>
              <span className="font-body text-xs font-semibold">EN-US</span>
              <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
            </div>
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-border pl-4">
              <a className="font-body text-xs font-medium text-slate-body hover:text-navy-900 px-3 py-1.5 rounded-md hover:bg-slate-surface transition-colors" href="#">
                System Status
              </a>
              <a className="font-body text-xs font-medium text-slate-body hover:text-navy-900 px-3 py-1.5 rounded-md hover:bg-slate-surface transition-colors" href="#">
                Help Center
              </a>
              <a className="font-body text-xs font-semibold text-navy-900 px-3 py-1.5 rounded-md bg-slate-surface border border-slate-border transition-colors hover:border-slate-300" href="#">
                Staff Portal
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 w-full lg:h-full lg:overflow-hidden">
          {/* ============ LEFT PANEL: Enterprise Showcase & Official Compass Emblem ============ */}
          <div className="lg:col-span-6 xl:col-span-7 bg-slate-surface lg:border-r border-slate-border p-6 lg:p-8 xl:p-10 flex flex-col relative lg:overflow-y-auto lg:justify-center">
            {/* Subtle Architectural Grid Background Accent */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
            {/* Local watermark (replaces the external Google-hosted image) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/login/omniops-watermark.svg"
                alt="OmniOps Watermark"
                className="w-[85%] max-w-2xl object-contain opacity-[0.06] filter grayscale select-none pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <div className="relative z-10 space-y-8 my-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-border shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy-900">
                    OMNIOPS INTERNAL // RESTRICTED ACCESS // STAFF ONLY
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-muted font-medium bg-white px-2.5 py-0.5 rounded border border-slate-border">
                  CLUSTER: US-EAST-SYS4
                </span>
              </div>
              <div className="space-y-3 max-w-xl">
                <h1 className="font-headline font-bold text-2xl sm:text-3xl lg:text-4xl text-navy-900 tracking-tight leading-tight">
                  Authorized Staff Gateway: Mission-Critical{' '}
                  <span className="text-primary-dark">Orchestration</span>.
                </h1>
                <p className="font-body text-sm sm:text-base text-slate-body leading-relaxed max-w-lg">
                  Unified enterprise operations terminal synchronizing kitchen display telemetry, automated
                  inventory pacing, and multi-unit floor management.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                {/* 01 */}
                <div className="p-4 rounded-xl bg-white border border-slate-border shadow-xs hover:border-primary/60 transition-all group flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 text-navy-900">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary transition-colors">psychology</span>
                    <span className="font-mono text-[11px] font-bold text-slate-muted group-hover:text-primary transition-colors">01</span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-sm text-navy-900">AI-Enabled Process</div>
                    <div className="font-body text-xs text-slate-body mt-0.5 leading-relaxed">Real-time predictive automation &amp; smart station orchestration</div>
                  </div>
                </div>
                {/* 02 */}
                <div className="p-4 rounded-xl bg-white border border-slate-border shadow-xs hover:border-primary/60 transition-all group flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 text-navy-900">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary transition-colors">verified_user</span>
                    <span className="font-mono text-[11px] font-bold text-slate-muted group-hover:text-primary transition-colors">02</span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-sm text-navy-900">Robust Approval</div>
                    <div className="font-body text-xs text-slate-body mt-0.5 leading-relaxed">Multi-tier authorization &amp; audit-logged policy controls</div>
                  </div>
                </div>
                {/* 03 */}
                <div className="p-4 rounded-xl bg-white border border-slate-border shadow-xs hover:border-primary/60 transition-all group flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 text-navy-900">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary transition-colors">campaign</span>
                    <span className="font-mono text-[11px] font-bold text-slate-muted group-hover:text-primary transition-colors">03</span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-sm text-navy-900">Ad &amp; Content Mgmt</div>
                    <div className="font-body text-xs text-slate-body mt-0.5 leading-relaxed">Dynamic digital boards &amp; automated daypart campaigns</div>
                  </div>
                </div>
                {/* 04 */}
                <div className="p-4 rounded-xl bg-white border border-slate-border shadow-xs hover:border-primary/60 transition-all group flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 text-navy-900">
                    <span className="material-symbols-outlined text-[22px] group-hover:text-primary transition-colors">speed</span>
                    <span className="font-mono text-[11px] font-bold text-slate-muted group-hover:text-primary transition-colors">04</span>
                  </div>
                  <div>
                    <div className="font-headline font-bold text-sm text-navy-900">Optimized Flow &amp; CX</div>
                    <div className="font-body text-xs text-slate-body mt-0.5 leading-relaxed">Frictionless guest journey &amp; pacing synchrony SLAs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============ RIGHT PANEL: Staff Authentication Terminal (Crisp White Theme) ============ */}
          <div className="lg:col-span-6 xl:col-span-5 bg-white p-6 lg:p-8 xl:p-10 flex flex-col justify-between relative lg:overflow-y-auto">
            <div className="max-w-md w-full mx-auto my-auto py-1">
              {/* Terminal Welcome Header */}
              <div className="space-y-1 mb-3.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-surface border border-slate-border text-navy-900 font-mono text-[11px] font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px] text-primary-dark">shield_person</span>
                  <span>Staff Portal Authentication</span>
                </div>
                <h2 className="font-headline font-bold text-2xl sm:text-3xl text-navy-900 tracking-tight">Staff Console Sign-In</h2>
                <p className="font-body text-xs sm:text-sm text-slate-body">
                  Restricted to authorized restaurant group operations personnel, kitchen leads, and system
                  administrators.
                </p>
              </div>

              {/* Enterprise Single Sign-On (SSO) Stack — decorative, no backend */}
              <div className="space-y-2 mb-3.5">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Corporate SSO is not enabled in this build — use corporate email + staff passcode."
                  className="w-full group px-4 py-3 rounded-lg bg-white border border-slate-border text-navy-900 font-body text-xs sm:text-sm font-semibold flex items-center justify-between transition-all duration-150 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-border"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-navy-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"></path>
                    </svg>
                    <span>Sign in with Corporate SSO (Okta SAML 2.0)</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-muted">arrow_forward</span>
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Google Workspace SSO is not enabled in this build — use corporate email + staff passcode."
                  className="w-full group px-4 py-3 rounded-lg bg-white border border-slate-border text-navy-900 font-body text-xs sm:text-sm font-semibold flex items-center justify-between transition-all duration-150 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-slate-border"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M12 5c1.54 0 2.92.54 4.01 1.43l3.01-3.01C17.2 1.76 14.77 1 12 1 7.42 1 3.53 3.59 1.6 7.37l3.66 2.84C6.14 7.29 8.83 5 12 5z" fill="#EA4335"></path>
                      <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.71-4.93 3.71-8.7z" fill="#4285F4"></path>
                      <path d="M5.26 14.21A7.05 7.05 0 0 1 4.88 12c0-.77.14-1.52.38-2.21L1.6 6.95C.58 8.98 0 10.42 0 12s.58 3.02 1.6 5.05l3.66-2.84z" fill="#FBBC05"></path>
                      <path d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.73-2.44 1.16-4.22 1.16-3.17 0-5.86-2.29-6.74-5.21L1.6 16.05C3.53 19.83 7.42 22.42 12 22.42z" fill="#34A853"></path>
                    </svg>
                    <span>Sign in with Staff Google Workspace</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-muted">arrow_forward</span>
                </button>
              </div>

              {/* Crisp Divider */}
              <div className="relative flex items-center my-3.5">
                <div className="w-full h-px bg-slate-border"></div>
                <span className="px-3 bg-white font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-muted shrink-0">
                  or corporate credentials
                </span>
                <div className="w-full h-px bg-slate-border"></div>
              </div>

              {/* Compliance Notice Banner */}
              <div className="mb-3.5 p-2.5 rounded-lg bg-slate-surface border border-slate-border text-slate-body font-body text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-dark shrink-0 mt-0.5">policy</span>
                <span>
                  <strong>Notice:</strong> Unauthorized access attempts are monitored and cryptographically
                  logged under SOC-2 policies.
                </span>
              </div>

              {/* Auth error (existing behavior preserved) */}
              {error && (
                <div
                  role="alert"
                  className="mb-3.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Credentials Form — the only real auth path */}
              <form className="space-y-2.5" onSubmit={handleSubmit}>
                {/* Venue Station ID / Employee ID — decorative field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-body text-xs font-semibold text-navy-900" htmlFor="org-code">
                      Venue Station ID / Employee ID
                    </label>
                    {/* Decorative "Lookup Station" — no backend */}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Station lookup is not enabled in this build."
                      className="font-mono text-xs font-semibold text-primary-dark disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:no-underline hover:underline"
                    >
                      Lookup Station
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-muted pointer-events-none">badge</span>
                    <input
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-border text-navy-900 placeholder:text-slate-muted font-body text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 shadow-2xs transition-all disabled:cursor-not-allowed disabled:bg-slate-surface-subtle disabled:text-slate-muted"
                      id="org-code"
                      placeholder="EMP-4029 / VENUE-08"
                      type="text"
                      disabled
                      aria-disabled="true"
                      tabIndex={-1}
                    />
                  </div>
                </div>

                {/* Corporate Work Email — real */}
                <div className="space-y-1.5">
                  <label className="font-body text-xs font-semibold text-navy-900" htmlFor="work-email">
                    Corporate Work Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-muted pointer-events-none">mail</span>
                    <input
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-border text-navy-900 placeholder:text-slate-muted font-body text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 shadow-2xs transition-all"
                      id="work-email"
                      placeholder="staff.ops@hospitalitygroup.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Staff Passcode — real */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-body text-xs font-semibold text-navy-900" htmlFor="password-field">
                      Staff Passcode
                    </label>
                    <a className="font-body text-xs font-medium text-slate-muted hover:text-navy-900 transition-colors" href="#">
                      Forgot passcode?
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-muted pointer-events-none">lock</span>
                    <input
                      className="w-full pl-10 pr-10 py-2 rounded-lg bg-white border border-slate-border text-navy-900 placeholder:text-slate-muted font-body text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900 shadow-2xs transition-all"
                      id="password-field"
                      placeholder="••••••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      aria-label={showPassword ? 'Hide passcode visibility' : 'Toggle passcode visibility'}
                      className="absolute right-3 text-slate-muted hover:text-navy-900 flex items-center justify-center p-1 transition-colors"
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Remember terminal */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      className="w-4 h-4 rounded border-slate-border text-navy-900 focus:ring-navy-900 cursor-pointer"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="font-body text-xs text-slate-body">Remember authorized terminal for 30 days</span>
                  </label>
                </div>

                {/* Primary Gold Button with Navy Text — real submit */}
                <button
                  className="w-full py-2.5 px-6 rounded-lg bg-primary hover:bg-[#c49f2b] text-navy-900 font-headline font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 mt-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-sm disabled:active:scale-100"
                  id="submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span>Access Staff Command Center</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                {/* Hardware Key / FIDO2 Passkey — decorative, no backend */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="FIDO2 passkeys are not enabled in this build — use corporate email + staff passcode."
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-surface border border-slate-border text-navy-900 font-body text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-surface"
                >
                  <span className="material-symbols-outlined text-[17px] text-navy-900">key</span>
                  <span>Security Hardware Key / FIDO2 Passkey</span>
                </button>
              </form>

              {/* Status Toast for Interactive Feedback (driven by real auth state) */}
              {isSubmitting && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-body text-xs flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                  <span>Initiating cryptographic identity handshake...</span>
                </div>
              )}
            </div>

            {/* Footer & Compliance Guarantee Section */}
            <div className="pt-3.5 border-t border-slate-border space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-muted font-mono text-[11px] uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-navy-900 font-medium">Systems Operational (0.12ms)</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span>SOC2 Type II</span>
                  <span>•</span>
                  <span>PCI-DSS 4.0</span>
                  <span>•</span>
                  <span>AES-256</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between text-slate-muted font-body text-xs pt-1 gap-2">
                <span>© 2025 OMNIOPS.ai Inc. All Rights Reserved.</span>
                <div className="flex items-center gap-3 font-medium">
                  <a className="hover:text-navy-900 transition-colors" href="#">
                    Documentation
                  </a>
                  <span>•</span>
                  <a className="hover:text-navy-900 transition-colors" href="#">
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a className="hover:text-navy-900 transition-colors" href="#">
                    Support Desk
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}