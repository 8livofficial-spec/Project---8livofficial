import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema'
import { absoluteUrl } from '@/lib/seo/site'
import { pagePath, publicPageMap, publicPageOgImage, publicPages } from '@/lib/seo/publicPages'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return publicPages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = publicPageMap.get(slug)
  if (!page) return {}
  const path = pagePath(page)
  const image = publicPageOgImage(page)

  return {
    title: page.metaTitle,
    description: page.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.description,
      url: absoluteUrl(path),
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.description,
      images: [image],
    },
  }
}

export default async function PublicSeoPage({ params }: PageProps) {
  const { slug } = await params
  const page = publicPageMap.get(slug)
  if (!page) notFound()

  const path = pagePath(page)

  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#0F172A]">
      <JsonLd data={webPageSchema(path, page.metaTitle, page.description)} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: page.title, path }])} />
      {page.faq ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faq.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }}
        />
      ) : null}

      <section className="border-b border-[#D46E53]/10 bg-white/70 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-black text-[#C4622D]">8liv</Link>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-[#C4622D]">{page.eyebrow}</p>
          <h1 className="mt-4 font-sora text-4xl font-black tracking-tight text-[#0F172A] sm:text-5xl">{page.h1}</h1>
          <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-[#475569]">{page.intro}</p>
          {page.cta ? (
            <Link href={page.cta.href} className="mt-8 inline-flex rounded-full bg-[#0F172A] px-6 py-3 text-sm font-black text-white">
              {page.cta.label}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-6">
          {page.sections.map((section) => (
            <article key={section.heading} className="rounded-lg border border-[#D46E53]/10 bg-white p-6 shadow-sm">
              <h2 className="font-sora text-2xl font-black text-[#0F172A]">{section.heading}</h2>
              <p className="mt-4 text-base font-semibold leading-7 text-[#475569]">{section.body}</p>
              {section.bullets?.length ? (
                <ul className="mt-5 grid gap-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-lg bg-[#F5F0EB] px-4 py-3 text-sm font-bold text-[#40516A]">{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          {page.faq ? (
            <section className="rounded-lg border border-[#D46E53]/10 bg-white p-6 shadow-sm">
              <h2 className="font-sora text-2xl font-black text-[#0F172A]">Questions and answers</h2>
              <div className="mt-5 grid gap-4">
                {page.faq.map((item) => (
                  <div key={item.question} className="rounded-lg bg-[#F5F0EB] p-4">
                    <h3 className="font-black text-[#0F172A]">{item.question}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <nav className="rounded-lg border border-[#D46E53]/10 bg-white p-6 shadow-sm" aria-label="Related public pages">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#8896A4]">Continue exploring</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/medical-weight-management" className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">Medical weight management</Link>
              <Link href="/online-doctor-consultation" className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">Online doctor consultation</Link>
              <Link href="/faq" className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">FAQ</Link>
              <Link href="/learn" className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">Learning center</Link>
              <Link href="/contact" className="rounded-full bg-[#F5F0EB] px-4 py-2 text-sm font-bold text-[#40516A]">Contact</Link>
            </div>
          </nav>
        </div>
      </section>
    </main>
  )
}
