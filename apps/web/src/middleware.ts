import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes.
 * Checks for the presence of an access token in localStorage (via cookie mirror)
 * or a cookie set during login.
 *
 * Note: Since middleware runs on the Edge, it cannot access localStorage directly.
 * We check for a simple session cookie that mirrors auth state.
 */

const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected) {
    // Check for auth cookie (set during login via client-side)
    const authCookie = request.cookies.get('omniops_auth');

    if (!authCookie || authCookie.value !== 'true') {
      // Also check for the access token directly (as fallback)
      const accessToken = request.cookies.get('omniops_access_token');
      if (!accessToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Redirect authenticated users from /login to /dashboard
  if (pathname === '/login') {
    const authCookie = request.cookies.get('omniops_auth');
    if (authCookie?.value === 'true') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
