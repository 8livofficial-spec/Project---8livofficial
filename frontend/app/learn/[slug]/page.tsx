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
        <header className="border-b border-[#D46E53]/10 bg-white/70 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Link href="/learn" className="text-sm font-black text-[#C4622D]">Learning center</Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#C4622D] sm:mt-10 sm:tracking-[0.22em]">{article.category}</p>
            <h1 className="mt-4 break-words font-sora text-3xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[#475569] sm:mt-6 sm:text-lg sm:leading-8">{article.summary}</p>
            <dl className="mt-8 grid gap-3 rounded-lg border border-[#D46E53]/10 bg-[#F5F0EB] p-4 text-sm font-bold text-[#40516A] sm:grid-cols-2 sm:p-5">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4]">Reviewed by</dt>
                <dd className="mt-1">{article.reviewer}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4]">Last reviewed</dt>
                <dd className="mt-1">{article.reviewedAt}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4]">Author</dt>
                <dd className="mt-1">{article.author}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#8896A4]">Reading time</dt>
                <dd className="mt-1">{article.readingMinutes} minutes</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto grid max-w-4xl gap-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 sm:p-5">
              This article is for general education only and does not replace consultation with a qualified medical professional.
            </div>

            {article.sections.map((section) => (
              <section key={section.heading} className="rounded-lg border border-[#D46E53]/10 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="break-words font-sora text-xl font-black text-[#0F172A] sm:text-2xl">{section.heading}</h2>
                <div className="mt-4 grid gap-4 text-base font-semibold leading-7 text-[#475569]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-lg border border-[#D46E53]/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-sora text-xl font-black text-[#0F172A] sm:text-2xl">Questions patients often ask</h2>
              <div className="mt-5 grid gap-4">
                {article.faqs.map((item) => (
                  <div key={item.question} className="rounded-lg bg-[#F5F0EB] p-4">
                    <h3 className="font-black text-[#0F172A]">{item.question}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#D46E53]/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-sora text-xl font-black text-[#0F172A] sm:text-2xl">Sources</h2>
              <ul className="mt-4 grid gap-3">
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noreferrer" target="_blank" className="break-words font-bold text-[#C4622D] underline-offset-4 hover:underline">
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <nav className="rounded-lg border border-[#D46E53]/10 bg-white p-5 shadow-sm sm:p-6" aria-label="Related guides">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#8896A4]">Related guides</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {relatedArticles.map((related) => (
                  <Link key={related.slug} href={articlePath(related)} className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">
                    {related.title}
                  </Link>
                ))}
              </div>
            </nav>

            <section className="rounded-lg bg-[#0F172A] p-5 text-white sm:p-6">
              <h2 className="font-sora text-xl font-black sm:text-2xl">Considering doctor-led weight-management care?</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
                Start with a secure assessment so a clinician can review whether online consultation is appropriate.
              </p>
              <Link href="/assessment" className="mt-5 inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#0F172A] sm:w-auto">
                Start assessment
              </Link>
            </section>
          </div>
        </section>
      </article>
    </main>
  )
}
