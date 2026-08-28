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

      <section className="border-b border-[#0D9488]/15 bg-white/80 backdrop-blur-md px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-bold text-[#0D9488] hover:text-[#0F766E] font-sora">← 8liv</Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#0D9488] sm:mt-10 sm:tracking-[0.22em] font-sora">{page.eyebrow}</p>
          <h1 className="mt-4 break-words font-sora text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-5xl">{page.h1}</h1>
          <p className="mt-5 max-w-3xl text-base font-normal leading-7 text-[#475569] sm:mt-6 sm:text-lg sm:leading-8">{page.intro}</p>
          {page.cta ? (
            <Link href={page.cta.href} className="mt-8 inline-flex w-full justify-center rounded-2xl bg-[#0D9488] hover:bg-[#097A70] px-6 py-3.5 text-center text-sm font-bold font-sora text-white sm:w-auto shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
              {page.cta.label}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 bg-slate-50/50">
        <div className="mx-auto grid max-w-4xl gap-6">
          {page.sections.map((section) => (
            <article key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="break-words font-sora text-xl font-bold text-[#0F172A] sm:text-2xl">{section.heading}</h2>
              <p className="mt-4 text-base font-normal leading-7 text-[#475569]">{section.body}</p>
              {section.bullets?.length ? (
                <ul className="mt-5 grid gap-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-xl bg-[#F8FAFC] border border-slate-100 px-4 py-3 text-sm font-semibold text-[#0F172A]">{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}

          {page.faq ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <h2 className="font-sora text-xl font-bold text-[#0F172A] sm:text-2xl">Questions and answers</h2>
              <div className="mt-5 grid gap-4">
                {page.faq.map((item) => (
                  <div key={item.question} className="rounded-xl bg-[#F8FAFC] border border-slate-100 p-4">
                    <h3 className="font-bold text-[#0F172A] font-sora">{item.question}</h3>
                    <p className="mt-2 text-sm font-normal leading-6 text-[#475569]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <nav className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6" aria-label="Related public pages">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8896A4] font-sora">Continue exploring</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/medical-weight-management" className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">Medical weight management</Link>
              <Link href="/online-doctor-consultation" className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">Online doctor consultation</Link>
              <Link href="/faq" className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">FAQ</Link>
              <Link href="/learn" className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">Learning center</Link>
              <Link href="/contact" className="rounded-full bg-[#F8FAFC] hover:bg-[#0D9488]/10 hover:text-[#0F766E] border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0F172A] transition-all font-sora">Contact</Link>
            </div>
          </nav>
        </div>
      </section>
    </main>
  )
}
