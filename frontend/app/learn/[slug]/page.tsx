import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/seo/JsonLd'
import { articleOgImage, articlePath, seoArticleMap, seoArticles } from '@/lib/seo/articles'
import { breadcrumbSchema, medicalArticleSchema } from '@/lib/seo/schema'
import { absoluteUrl } from '@/lib/seo/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return seoArticles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = seoArticleMap.get(slug)
  if (!article) return {}

  const path = articlePath(article)
  const image = articleOgImage(article)

  return {
    title: article.metaTitle,
    description: article.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: article.metaTitle,
      description: article.description,
      url: absoluteUrl(path),
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle,
      description: article.description,
      images: [image],
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = seoArticleMap.get(slug)
  if (!article) notFound()

  const path = articlePath(article)
  const image = articleOgImage(article)
  const relatedArticles = article.related
    .map((relatedSlug) => seoArticleMap.get(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#0F172A]">
      <JsonLd
        data={medicalArticleSchema({
          path,
          headline: article.title,
          description: article.description,
          image,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          author: article.author,
          reviewer: article.reviewer,
        })}
      />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }, { name: article.title, path }])} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: article.faqs.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }}
      />

      <article>
        <header className="border-b border-[#0D9488]/15 bg-white/80 backdrop-blur-md px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Link href="/learn" className="text-sm font-bold text-[#0D9488] hover:text-[#0F766E] font-sora">← Learning center</Link>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#0D9488] sm:mt-10 sm:tracking-[0.22em] font-sora">{article.category}</p>
            <h1 className="mt-4 break-words font-sora text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-base font-normal leading-7 text-[#475569] sm:mt-6 sm:text-lg sm:leading-8">{article.summary}</p>
            <dl className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm font-bold text-[#40516A] sm:grid-cols-2 sm:p-5">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4] font-sora">Reviewed by</dt>
                <dd className="mt-1 text-[#0F172A]">{article.reviewer}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4] font-sora">Last reviewed</dt>
                <dd className="mt-1 text-[#0F172A]">{article.reviewedAt}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4] font-sora">Author</dt>
                <dd className="mt-1 text-[#0F172A]">{article.author}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4] font-sora">Reading time</dt>
                <dd className="mt-1 text-[#0F172A]">{article.readingMinutes} minutes</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 bg-slate-50/50">
          <div className="mx-auto grid max-w-4xl gap-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-950 sm:p-5">
              This article is for general education only and does not replace consultation with a qualified medical professional.
            </div>

            {article.sections.map((section) => (
              <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                <h2 className="break-words font-sora text-xl font-bold text-[#0F172A] sm:text-2xl">{section.heading}</h2>
                <div className="mt-4 grid gap-4 text-base font-normal leading-7 text-[#475569]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="font-sora text-xl font-bold text-[#0F172A] sm:text-2xl">Questions patients often ask</h2>
              <div className="mt-5 grid gap-4">
                {article.faqs.map((item) => (
                  <div key={item.question} className="rounded-xl bg-[#F8FAFC] border border-slate-100 p-4">
                    <h3 className="font-bold text-[#0F172A] font-sora">{item.question}</h3>
                    <p className="mt-2 text-sm font-normal leading-6 text-[#475569]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="font-sora text-xl font-bold text-[#0F172A] sm:text-2xl">Sources</h2>
              <ul className="mt-4 grid gap-3">
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noreferrer" target="_blank" className="break-words font-semibold text-[#0D9488] hover:text-[#0F766E] underline-offset-4 hover:underline">
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <nav className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Related guides">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8896A4] font-sora">Related guides</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {relatedArticles.map((related) => (
                  <Link key={related.slug} href={articlePath(related)} className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">
                    {related.title}
                  </Link>
                ))}
              </div>
            </nav>
            <section className="rounded-2xl bg-[#0B1120] p-6 text-white sm:p-8 border border-[#0D9488]/20 shadow-xl">
              <h2 className="font-sora text-xl font-bold sm:text-2xl">Considering doctor-led weight-management care?</h2>
              <p className="mt-3 text-sm text-white/70 leading-relaxed max-w-xl">
                Start with our confidential assessment so a clinician can review your metabolic baseline and health history.
              </p>
              <Link href="/assessment" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-[#0D9488] hover:bg-[#097A70] px-6 py-3.5 text-center text-sm font-bold font-sora text-white sm:w-auto shadow-md transition-all">
                Start Assessment
              </Link>
            </section>
          </div>
        </section>
      </article>
    </main>
  )
}
