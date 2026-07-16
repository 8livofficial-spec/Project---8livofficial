import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Dumbbell, HeartPulse, Salad, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl } from '@/lib/seo/site'
import { webPageSchema } from '@/lib/seo/schema'

const title = '8liv Membership Plans'
const description = 'Compare 8liv membership options for doctor-led weight-management care, nutrition support, fitness guidance and ongoing follow-up.'

const planCards = [
  {
    name: 'Silver',
    price: 'Rs 999',
    label: 'Medical foundation',
    description: 'For patients who need doctor-led weight-management care, eligibility review, and essential follow-up.',
    features: ['Online doctor consultation', 'Treatment eligibility review', 'Prescription coordination when appropriate', 'Basic support workflows'],
    href: '/assessment?plan=silver',
  },
  {
    name: 'Gold',
    price: 'Rs 1,999',
    label: 'Complete care team',
    description: 'For patients who want medical review plus nutrition guidance, fitness planning, and closer progress support.',
    features: ['Everything in Silver', 'Dietitian and nutrition guidance', 'Fitness coaching support', 'Priority care coordination'],
    href: '/assessment?plan=gold',
    featured: true,
  },
]

const nutritionSteps = [
  {
    icon: Stethoscope,
    title: 'Doctor context first',
    text: 'Nutrition guidance is shaped around health history, medicines, symptoms, and doctor review instead of generic diet charts.',
  },
  {
    icon: Salad,
    title: 'Indian meals, practical targets',
    text: 'Plans focus on repeatable meal structure, protein, hydration, timing, and food preferences that work at home.',
  },
  {
    icon: Dumbbell,
    title: 'Lifestyle follow-through',
    text: 'Gold care connects nutrition with movement goals, adherence checks, and progress updates inside the patient portal.',
  },
]

const compareRows = [
  ['Doctor consultation', 'Included', 'Included'],
  ['Nutrition support', 'Basic guidance', 'Dedicated support'],
  ['Fitness coaching', 'Not included', 'Included'],
  ['Care coordination', 'Standard', 'Priority'],
]

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/plans',
  },
  openGraph: {
    title,
    description,
    url: absoluteUrl('/plans'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/images/nutrition_indian.png'),
        width: 1200,
        height: 630,
        alt: '8liv nutrition and membership plans for doctor-led weight management care',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [absoluteUrl('/images/nutrition_indian.png')],
  },
}

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#0F172A]">
      <JsonLd data={webPageSchema('/plans', title, description)} />
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-14 pt-32 sm:px-6 sm:pb-18 sm:pt-36 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#D46E53]">Nutrition plans and membership</p>
            <h1 className="max-w-3xl font-sora text-4xl font-bold leading-[1.08] text-[#0F172A] sm:text-5xl lg:text-6xl">
              Choose a care plan built around medical review and daily food habits.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">
              8liv combines online doctor-led weight-management care with practical nutrition support, fitness guidance, and follow-up workflows for Indian routines.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#1E293B] sm:w-auto">
                Start assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#compare" className="inline-flex w-full items-center justify-center rounded-full border border-[#D46E53]/25 bg-white px-6 py-4 text-sm font-bold text-[#0F172A] transition hover:border-[#D46E53]/50 sm:w-auto">
                Compare plans
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[1.75rem] shadow-[0_24px_80px_rgba(15,23,42,0.16)] ring-1 ring-[#D46E53]/20 sm:rounded-[2rem]">
              <Image
                src="/images/nutrition_indian.png"
                alt="Balanced Indian nutrition support with 8liv care plans"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 92vw, 560px"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-2">
            {planCards.map((plan) => (
              <article key={plan.name} className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${plan.featured ? 'border-[#D46E53]/45 ring-1 ring-[#D46E53]/25' : 'border-[#0F172A]/10'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D46E53]">{plan.label}</p>
                    <h2 className="mt-2 font-sora text-3xl font-bold">{plan.name}</h2>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-sora text-3xl font-bold">{plan.price}</p>
                    <p className="text-sm font-semibold text-[#64748B]">per month</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-[#475569]">{plan.description}</p>
                <ul className="mt-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-semibold text-[#1E293B]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D46E53]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold transition sm:w-auto ${plan.featured ? 'bg-[#D46E53] text-white hover:bg-[#C45D43]' : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'}`}>
                  Choose {plan.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#0F172A]/10 bg-white shadow-sm">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] bg-[#0F172A] px-4 py-4 text-xs font-black uppercase tracking-[0.16em] text-white sm:px-6">
              <span>Support</span>
              <span className="text-center">Silver</span>
              <span className="text-center">Gold</span>
            </div>
            {compareRows.map(([feature, silver, gold]) => (
              <div key={feature} className="grid grid-cols-[1.2fr_0.9fr_0.9fr] border-t border-[#0F172A]/8 px-4 py-4 text-sm sm:px-6">
                <span className="font-bold text-[#0F172A]">{feature}</span>
                <span className="text-center text-[#475569]">{silver}</span>
                <span className="text-center font-semibold text-[#D46E53]">{gold}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#D46E53]">How nutrition support works</p>
            <h2 className="font-sora text-3xl font-bold leading-tight sm:text-4xl">Global care standards, adapted for Indian meals and routines.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {nutritionSteps.map(({ icon: Icon, title: itemTitle, text }) => (
              <div key={itemTitle} className="rounded-2xl border border-[#0F172A]/10 bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D46E53]/12 text-[#D46E53]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-sora text-lg font-bold">{itemTitle}</h3>
                <p className="mt-3 text-sm leading-7 text-[#475569]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl bg-[#0F172A] p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6 text-[#D46E53]" />
            </div>
            <div>
              <h2 className="font-sora text-2xl font-bold">Not sure which plan fits?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Start with the assessment. The care flow can guide the next step based on your health context and goals.
              </p>
            </div>
          </div>
          <Link href="/assessment" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-bold text-[#0F172A] transition hover:bg-[#F9F6F0] sm:w-auto">
            Check eligibility
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
