import type { MetadataRoute } from 'next'

const fallbackSiteUrl = 'https://8liv.in'

function normalizeSiteUrl(value?: string | null) {
  const raw = (value || fallbackSiteUrl).trim().replace(/\/+$/, '')
  try {
    const url = new URL(raw)
    url.protocol = 'https:'
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return fallbackSiteUrl
  }
}

export const siteConfig = {
  name: '8liv',
  legalName: 'InfinityLiv',
  alternateNames: ['8liv.in', 'InfinityLiv', 'Infinity Liv', 'infinityliv', 'infinityliv.in', '8liv India', '8liv health', '8 live', '8live'],
  applicationName: '8liv | InfinityLiv',
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  defaultTitle: '8liv (InfinityLiv) | Online Doctor-Led Weight Management and Wellness Care',
  titleTemplate: '%s | 8liv InfinityLiv',
  description:
    '8liv (InfinityLiv) is India’s secure online healthcare platform for doctor-led weight management consultations, personalized nutrition support, fitness guidance and ongoing wellness care.',
  publisher: 'InfinityLiv',
  creator: 'InfinityLiv',
  category: 'Healthcare',
  keywords: [
    'InfinityLiv',
    'Infinity Liv',
    'infinityliv',
    'infinityliv.in',
    '8liv',
    '8liv.in',
    '8 liv',
    '8live',
    '8liv health',
    'online weight management consultation',
    'doctor-supervised weight management',
    'online doctor consultation',
    'nutrition support',
    'fitness coaching',
    'telemedicine weight management India',
  ],
  locale: 'en_IN',
  ogImage: '/images/hero_indian.png',
  socialHandle: '@8liv',
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.url}${normalizedPath === '/' ? '' : normalizedPath}`
}

export function canonicalPath(path = '/') {
  const cleanPath = path.split('?')[0].split('#')[0] || '/'
  if (cleanPath === '/') return '/'
  return cleanPath.replace(/\/+$/, '').toLowerCase()
}

export function isPreviewLikeHost(hostname: string) {
  const host = hostname.toLowerCase()
  return host.includes('vercel.app')
    || host.includes('localhost')
    || host.includes('127.0.0.1')
    || host.includes('ngrok')
    || host.includes('staging')
    || host.includes('preview')
}

export function shouldNoIndexEnvironment() {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV
  return env !== 'production'
}

export const publicIndexableRoutes = [
  '/',
  '/plans',
  '/learn',
  '/learn/how-online-medical-weight-management-works',
  '/learn/doctor-supervised-weight-loss',
  '/learn/what-to-expect-weight-loss-doctor-consultation',
  '/learn/medical-vs-lifestyle-weight-loss-programs',
  '/learn/when-to-speak-to-a-doctor-about-weight-gain',
  '/learn/nutrition-support-for-weight-management',
  '/about',
  '/how-it-works',
  '/medical-weight-management',
  '/online-doctor-consultation',
  '/nutrition-support',
  '/fitness-coaching',
  '/membership',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/telemedicine-policy',
  '/prescription-policy',
  '/editorial-policy',
  '/medical-review-policy',
  '/corrections-policy',
] as const

export const noindexPublicRoutes = [
  '/appointments/select-slot',
  '/assessment',
  '/consultation-payment',
  '/forgot-password',
  '/login',
  '/membership-payment',
  '/not-eligible',
  '/reset-password',
  '/verification-pending',
  '/verify-email',
  '/video/room',
] as const

export const privateRoutePrefixes = [
  '/admin',
  '/api',
  '/auth',
  '/patient',
  '/provider',
  '/doctor',
  '/dietitian',
  '/trainer',
  '/pharmacy',
  '/video',
  '/prescriptions',
  '/medicine-orders',
  '/messages',
  '/wallet',
  '/payouts',
  '/documents',
  '/internal',
  '/debug',
  '/test',
] as const

export const trackingParams = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'session',
  'redirect',
  'callbackUrl',
] as const

export function isPrivatePath(pathname: string) {
  const path = canonicalPath(pathname)
  return privateRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function isPublicNoIndexPath(pathname: string) {
  const path = canonicalPath(pathname)
  return noindexPublicRoutes.some((route) => path === route || path.startsWith(`${route}/`))
}

export function sitemapEntry(path: string, options?: Partial<MetadataRoute.Sitemap[number]>): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: options?.lastModified || new Date('2026-07-14'),
    changeFrequency: options?.changeFrequency || 'monthly',
    priority: options?.priority ?? 0.5,
  }
}
