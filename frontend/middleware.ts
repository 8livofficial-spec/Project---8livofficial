import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin, /doctor, /patient and /pharmacy routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/doctor') || pathname.startsWith('/patient') || pathname.startsWith('/pharmacy')) {
    // Get the role from the cookie we set during login
    const cookieHeader = request.headers.get('cookie') || '';
    const roleMatch = cookieHeader.match(/user_role=([^;]+)/);
    const userRole = roleMatch ? decodeURIComponent(roleMatch[1]) : null;
    const normalizedRole = userRole?.toUpperCase();

    // If no role cookie exists, redirect to home login
    if (!userRole) {
      const redirectPath = pathname.startsWith('/doctor') ? '/?role=doctor' : '/';
      const loginUrl = new URL(redirectPath, request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Route Protection Logic
    if (pathname.startsWith('/admin') && normalizedRole !== 'ADMIN') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    if (pathname.startsWith('/doctor') && normalizedRole !== 'DOCTOR') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    if (pathname.startsWith('/patient') && normalizedRole !== 'PATIENT') {
      const unauthorizedUrl = new URL('/', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    if (pathname.startsWith('/pharmacy')) {
      const pharmacyRoles = ['PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'ADMIN'];
      if (!normalizedRole || !pharmacyRoles.includes(normalizedRole)) {
        const unauthorizedUrl = new URL('/', request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
  }

  return NextResponse.next();
}

// Define which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/doctor/:path*', '/patient/:path*', '/pharmacy/:path*'],
};
