import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import { articlePath, seoArticles } from '@/lib/seo/articles'
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema'
import { absoluteUrl } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Weight Management Learning Center',
  description: 'Read medically reviewed 8liv guides about online doctor-led weight management, consultation preparation, nutrition support and follow-up care.',
  alternates: {
    canonical: '/learn',
  },
  openGraph: {
    title: 'Weight Management Learning Center',
    description: 'Medically reviewed guides about online doctor-led weight management and consultation preparation.',
    url: absoluteUrl('/learn'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/images/hero_indian.png'),
        width: 1200,
        height: 630,
        alt: '8liv weight management learning center',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weight Management Learning Center',
    description: 'Medically reviewed guides about online doctor-led weight management and consultation preparation.',
    images: [absoluteUrl('/images/hero_indian.png')],
  },
}

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#0F172A]">
      <JsonLd data={webPageSchema('/learn', 'Weight Management Learning Center', metadata.description || '')} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }])} />

      <section className="border-b border-[#D46E53]/10 bg-white/70 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm font-black text-[#C4622D]">8liv</Link>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-[#C4622D]">Learning center</p>
          <h1 className="mt-4 font-sora text-4xl font-black tracking-tight text-[#0F172A] sm:text-5xl">
            Medical weight-management guides
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-[#475569]">
            Evidence-aware, medically reviewed education for patients considering online doctor-led weight-management care.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {seoArticles.map((article) => (
            <article key={article.slug} className="rounded-lg border border-[#D46E53]/10 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">{article.category}</p>
              <h2 className="mt-3 font-sora text-2xl font-black leading-tight text-[#0F172A]">
                <Link href={articlePath(article)}>{article.title}</Link>
              </h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">{article.summary}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-[#64748B]">
                <span>{article.readingMinutes} min read</span>
                <span>Reviewed {article.reviewedAt}</span>
              </div>
              <Link href={articlePath(article)} className="mt-6 inline-flex rounded-full bg-[#0F172A] px-5 py-3 text-sm font-black text-white">
                Read guide
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
