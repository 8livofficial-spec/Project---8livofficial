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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    if (request.nextUrl.host !== canonicalHost && !request.nextUrl.host.includes('localhost')) {
      const url = new URL(request.url)
      url.protocol = 'https:'
      url.host = canonicalHost
      return NextResponse.redirect(url, 301)
    }
  }

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
      return withSeoPrivacyHeaders(NextResponse.redirect(loginUrl), pathname);
    }

    // Route Protection Logic
    if (pathname.startsWith('/admin') && normalizedRole !== 'ADMIN') {
      const unauthorizedUrl = new URL('/', request.url);
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
      if (normalizedRole === 'ADMIN') {
        return withSeoPrivacyHeaders(NextResponse.redirect(new URL('/admin/pharmacy-orders', request.url)), pathname);
      }
      return withSeoPrivacyHeaders(NextResponse.redirect(new URL('/', request.url)), pathname);
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
