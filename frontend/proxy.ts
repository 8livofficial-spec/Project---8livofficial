import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canonicalPath, isPrivatePath, isPublicNoIndexPath, siteConfig, trackingParams } from '@/lib/seo/site';

function withSeoPrivacyHeaders(response: NextResponse, pathname: string) {
  if (isPrivatePath(pathname) || isPublicNoIndexPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  }
  if (isPrivatePath(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  }
  return response
}

function normalizeWwwAlias(host: string) {
  return host.toLowerCase().replace(/^www\./, '')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass API routes completely from SEO canonicalization and redirects
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const canonical = canonicalPath(pathname)
  const hasTrackingParams = trackingParams.some((param) => request.nextUrl.searchParams.has(param))

  if (canonical !== pathname || hasTrackingParams) {
    const url = request.nextUrl.clone()
    url.pathname = canonical
    trackingParams.forEach((param) => url.searchParams.delete(param))
    return NextResponse.redirect(url, 301)
  }

  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) {
    const canonicalHost = new URL(siteConfig.url).host
    const requestHost = request.nextUrl.host
    const isWwwAlias = normalizeWwwAlias(requestHost) === normalizeWwwAlias(canonicalHost)
    if (requestHost !== canonicalHost && !isWwwAlias && !requestHost.includes('localhost')) {
      const url = new URL(request.url)
      url.protocol = 'https:'
      url.host = canonicalHost
      return NextResponse.redirect(url, 301)
    }
  }

  // Only protect /admin, /doctor, /patient and /pharmacy routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/doctor') || pathname.startsWith('/patient') || pathname.startsWith('/pharmacy')) {
    // Public exception: /pharmacy/accept-invitation is a token-secured onboarding route
    if (pathname.startsWith('/pharmacy/accept-invitation')) {
      return withSeoPrivacyHeaders(NextResponse.next(), pathname);
    }

    // Get the role from the cookie we set during login
    const cookieHeader = request.headers.get('cookie') || '';
    const roleMatch = cookieHeader.match(/user_role=([^;]+)/);
    const userRole = roleMatch ? decodeURIComponent(roleMatch[1]) : null;
    const normalizedRole = userRole?.toUpperCase();

    // If no role cookie exists, redirect to login
    if (!userRole) {
      const redirectPath = pathname.startsWith('/doctor')
        ? '/?role=doctor'
        : pathname.startsWith('/pharmacy')
        ? '/login?role=pharmacy'
        : '/';
      const loginUrl = new URL(redirectPath, request.url);
      return withSeoPrivacyHeaders(NextResponse.redirect(loginUrl), pathname);
    }

    // Route Protection Logic
    if (pathname.startsWith('/admin') && normalizedRole !== 'ADMIN') {
      const isPharmacy = Boolean(normalizedRole && ['PHARMACY', 'PHARMACY_STAFF', 'PHARMACY_ADMIN'].includes(normalizedRole));
      const unauthorizedUrl = new URL(isPharmacy ? '/pharmacy' : '/', request.url);
      return withSeoPrivacyHeaders(NextResponse.redirect(unauthorizedUrl), pathname);
    }

    if (pathname.startsWith('/doctor') && normalizedRole !== 'DOCTOR') {
      const unauthorizedUrl = new URL('/', request.url);
      return withSeoPrivacyHeaders(NextResponse.redirect(unauthorizedUrl), pathname);
    }

    if (pathname.startsWith('/patient') && normalizedRole !== 'PATIENT') {
      const unauthorizedUrl = new URL('/', request.url);
      return withSeoPrivacyHeaders(NextResponse.redirect(unauthorizedUrl), pathname);
    }

    if (pathname.startsWith('/pharmacy')) {
      const isPharmacyRole = Boolean(normalizedRole && ['PHARMACY', 'PHARMACY_STAFF', 'PHARMACY_ADMIN'].includes(normalizedRole));
      if (isPharmacyRole || normalizedRole === 'ADMIN') {
        return withSeoPrivacyHeaders(NextResponse.next(), pathname);
      }
      const unauthorizedUrl = new URL('/login?role=pharmacy', request.url);
      return withSeoPrivacyHeaders(NextResponse.redirect(unauthorizedUrl), pathname);
    }
  }

  return withSeoPrivacyHeaders(NextResponse.next(), pathname);
}

// Define which paths the middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg|brand-logo.svg|brand-logo-light.svg|brand-mark.svg|images/.*).*)',
  ],
};
