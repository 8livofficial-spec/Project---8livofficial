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

      <section className="border-b border-[#D46E53]/10 bg-white/70 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm font-black text-[#C4622D]">8liv</Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#C4622D] sm:mt-10 sm:tracking-[0.22em]">Learning center</p>
          <h1 className="mt-4 break-words font-sora text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-5xl">
            Medical weight-management guides
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[#475569] sm:mt-6 sm:text-lg sm:leading-8">
            Evidence-aware, medically reviewed education for patients considering online doctor-led weight-management care.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {seoArticles.map((article) => (
            <article key={article.slug} className="rounded-lg border border-[#D46E53]/10 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C4622D] sm:tracking-[0.18em]">{article.category}</p>
              <h2 className="mt-3 break-words font-sora text-xl font-black leading-tight text-[#0F172A] sm:text-2xl">
                <Link href={articlePath(article)}>{article.title}</Link>
              </h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-[#475569]">{article.summary}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-[#64748B]">
                <span>{article.readingMinutes} min read</span>
                <span>Reviewed {article.reviewedAt}</span>
              </div>
              <Link href={articlePath(article)} className="mt-6 inline-flex w-full justify-center rounded-full bg-[#0F172A] px-5 py-3 text-center text-sm font-black text-white sm:w-auto">
                Read guide
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
