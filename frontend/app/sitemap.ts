import type { MetadataRoute } from 'next'
import { articlePath, seoArticles } from '@/lib/seo/articles'
import { sitemapEntry } from '@/lib/seo/site'
import { pagePath, publicPages } from '@/lib/seo/publicPages'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    sitemapEntry('/', {
      lastModified: new Date('2026-07-14'),
      changeFrequency: 'weekly',
      priority: 1,
    }),
    sitemapEntry('/plans', {
      lastModified: new Date('2026-07-14'),
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
    sitemapEntry('/learn', {
      lastModified: new Date('2026-07-14'),
      changeFrequency: 'weekly',
      priority: 0.75,
    }),
    ...publicPages.map((page) => sitemapEntry(pagePath(page), {
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...seoArticles.map((article) => sitemapEntry(articlePath(article), {
      lastModified: new Date(article.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ]
}
