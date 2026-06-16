import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin, /doctor and /patient routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/doctor') || pathname.startsWith('/patient')) {
    // Get the role from the cookie we set during login
    const cookieHeader = request.headers.get('cookie') || '';
    const roleMatch = cookieHeader.match(/user_role=([^;]+)/);
    const userRole = roleMatch ? roleMatch[1] : null;

    // If no role cookie exists, redirect to home login
    if (!userRole) {
      const redirectPath = pathname.startsWith('/doctor') ? '/?role=doctor' : '/';
      const loginUrl = new URL(redirectPath, request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Route Protection Logic
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    if (pathname.startsWith('/doctor') && userRole !== 'doctor') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    if (pathname.startsWith('/patient') && userRole !== 'patient') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}

// Define which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/doctor/:path*', '/patient/:path*'],
};
