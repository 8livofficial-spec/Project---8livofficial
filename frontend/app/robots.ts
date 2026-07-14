import type { MetadataRoute } from 'next'
import { isPreviewLikeHost, privateRoutePrefixes, siteConfig } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = new URL(siteConfig.url)
  const disallowAll = process.env.NODE_ENV !== 'production'
    || process.env.VERCEL_ENV === 'preview'
    || isPreviewLikeHost(siteUrl.hostname)

  if (disallowAll) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: `${siteConfig.url}/sitemap.xml`,
      host: siteConfig.url,
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/_next/static/',
        '/images/',
        '/brand-logo.svg',
        '/brand-logo-light.svg',
        '/brand-mark.svg',
      ],
      disallow: [
        ...privateRoutePrefixes.map((prefix) => `${prefix}/`),
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/verification-pending',
        '/assessment',
        '/appointments/',
        '/consultation-payment',
        '/membership-payment',
        '/payment',
        '/checkout',
        '/booking',
        '/consultation',
        '/video/',
        '/*?utm_source=',
        '/*?utm_medium=',
        '/*?utm_campaign=',
        '/*?ref=',
        '/*?session=',
        '/*?redirect=',
        '/*?callbackUrl=',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
