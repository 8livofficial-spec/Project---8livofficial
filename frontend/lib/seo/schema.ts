import { absoluteUrl, siteConfig } from './site'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    alternateName: siteConfig.alternateNames,
    url: siteConfig.url,
    logo: absoluteUrl('/brand-logo.svg'),
    description: siteConfig.description,
    medicalSpecialty: ['Weight management', 'Telemedicine'],
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.alternateNames,
    url: siteConfig.url,
    publisher: {
      '@id': `${siteConfig.url}/#organization`,
    },
  }
}

export function webPageSchema(path: string, name: string, description: string) {
  const url = absoluteUrl(path)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: {
      '@id': `${siteConfig.url}/#website`,
    },
    publisher: {
      '@id': `${siteConfig.url}/#organization`,
    },
  }
}

export function medicalArticleSchema(input: {
  path: string
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified: string
  author: string
  reviewer: string
}) {
  const url = absoluteUrl(input.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.headline,
    description: input.description,
    isPartOf: {
      '@id': `${siteConfig.url}/#website`,
    },
    publisher: {
      '@id': `${siteConfig.url}/#organization`,
    },
    reviewedBy: {
      '@type': 'Organization',
      name: input.reviewer,
    },
    mainEntity: {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: input.headline,
      description: input.description,
      image: input.image,
      datePublished: input.datePublished,
      dateModified: input.dateModified,
      author: {
        '@type': 'Organization',
        name: input.author,
      },
      publisher: {
        '@id': `${siteConfig.url}/#organization`,
      },
    },
  }
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
