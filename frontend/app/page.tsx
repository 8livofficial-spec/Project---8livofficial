import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import HomePageClient from '@/components/landing/HomePageClient'
import { absoluteUrl, siteConfig } from '@/lib/seo/site'
import { organizationSchema, webPageSchema, websiteSchema } from '@/lib/seo/schema'

export const metadata: Metadata = {
  title: siteConfig.defaultTitle,
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    type: 'website',
    images: [
      {
        url: absoluteUrl(siteConfig.ogImage),
        width: 1200,
        height: 630,
        alt: '8liv online doctor-led weight management and wellness care',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImage)],
  },
}

export default function Home() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd
        data={webPageSchema(
          '/',
          '8liv.in Online Doctor-Led Weight Management and Wellness Care',
          siteConfig.description,
        )}
      />
      <HomePageClient />
    </>
  )
}
