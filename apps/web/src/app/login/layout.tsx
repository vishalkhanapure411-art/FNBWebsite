import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Console Sign-In | OMNIOPS.ai',
};

/**
 * Fonts for the auth screens only (kept out of the global layout so the rest of
 * the app keeps its existing font loading behavior). Google Fonts are referenced
 * via <link> exactly like the `1. login/code.html` mockup, plus the Material
 * Symbols Outlined icon font used across the mockup UI. Fonts degrade to the
 * sans-serif fallbacks in tailwind.config.js if the CDN is unreachable.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        rel="stylesheet"
      />
      {children}
    </>
  );
}