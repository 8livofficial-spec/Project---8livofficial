import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.defaultTitle,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: siteConfig.url,
    scope: siteConfig.url,
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#0A0A0F',
    categories: ['health', 'medical', 'fitness'],
    icons: [
      {
        src: '/brand-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
