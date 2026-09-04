import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Dumbbell, HeartPulse, Salad, ShieldCheck, Sparkles, Stethoscope, Clock, Zap } from 'lucide-react'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl } from '@/lib/seo/site'
import { webPageSchema } from '@/lib/seo/schema'

import { getActiveTreatmentPlans, computePlanPricing } from '@/lib/subscriptionService'

const title = '8liv Care & Treatment Programs'
const description = 'Choose an 8liv doctor-led treatment program. Duration-based care programs with included consultations, personal nutrition, fitness support, and monthly treatment cycles.'

const nutritionSteps = [
  {
    icon: Stethoscope,
    title: 'Doctor-led review first',
    text: 'Every treatment program begins with an ₹499 initial clinical consultation. Your doctor designs a medical strategy specific to your health history.',
  },
  {
    icon: Salad,
    title: 'Indian meals, practical targets',
    text: 'Nutrition guidance is tailored to your real home routine—practical protein targets, regional food choices, and sustainable habits.',
  },
  {
    icon: Dumbbell,
    title: 'Full multi-disciplinary team',
    text: 'All program subscribers receive complete access to their dedicated doctor, dietitian, and fitness coach inside the 8LIV patient portal.',
  },
]

const compareRows = [
  ['Doctor clinical review', 'Included each cycle', 'Included each cycle', 'Included each cycle', 'Included each cycle'],
  ['Follow-up consultations', '₹0 (Included)', '₹0 (Included)', '₹0 (Included)', '₹0 (Included)'],
  ['Dedicated dietitian', 'Included', 'Included', 'Included', 'Included'],
  ['Fitness coach support', 'Included', 'Included', 'Included', 'Included'],
  ['Bulk savings discount', 'Configured', 'Configured', 'Configured', 'Instant Discount'],
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
  },
}

export default async function PlansPage() {
  const dbPlans = await getActiveTreatmentPlans()
  const durationPrograms = dbPlans.map((p) => {
    const calc = computePlanPricing(p.base_price, p.discount_percentage, p.duration_months)
    return {
      durationMonths: p.duration_months,
      name: p.name,
      price: `₹${calc.finalPrice.toLocaleString('en-IN')}`,
      monthlyEquivalent: `₹${calc.monthlyEquivalent.toLocaleString('en-IN')} / mo`,
      discountLabel: calc.discountPercentage > 0 ? `${calc.discountPercentage}% OFF (Saves ₹${calc.discountAmount.toLocaleString('en-IN')})` : null,
      label: calc.discountPercentage > 0 ? `${calc.discountPercentage}% OFF Bulk Protocol` : (p.duration_months === 1 ? 'Single Cycle Starter' : `${p.duration_months} Month Program`),
      description: p.description || `${p.duration_months} monthly treatment cycles with comprehensive doctor review, personalized dietary protocol, and lifestyle onboarding.`,
      features: p.features && p.features.length > 0 ? p.features : [
        `${p.duration_months} Treatment ${p.duration_months === 1 ? 'Cycle' : 'Cycles'} provisioned`,
        'Included doctor follow-ups each cycle (₹0)',
        'Personalized nutrition & diet guidance',
        'Fitness coach movement plan',
        'Prescription & pharmacy coordination',
      ],
      href: `/assessment?duration=${p.duration_months}`,
      featured: calc.discountPercentage > 0,
    }
  })
  return (
    <main className="min-h-screen bg-[#F9F6F0] text-[#0F172A]">
      <JsonLd data={webPageSchema('/plans', title, description)} />
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-14 pt-32 sm:px-6 sm:pb-18 sm:pt-36 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D46E53]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#D46E53] mb-4">
              <Zap className="h-3.5 w-3.5" />
              Duration-Based Care Programs
            </div>
            <h1 className="max-w-3xl font-sora text-4xl font-bold leading-[1.08] text-[#0F172A] sm:text-5xl lg:text-6xl">
              Doctor-led treatment programs designed for sustainable health.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">
              Start with a ₹499 clinical evaluation by an authorized physician. Following your assessment, select your treatment duration. All active programs provision monthly treatment cycles with included follow-ups and complete care-team support.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#1E293B] sm:w-auto">
                Start Medical Assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#programs" className="inline-flex w-full items-center justify-center rounded-full border border-[#D46E53]/25 bg-white px-6 py-4 text-sm font-bold text-[#0F172A] transition hover:border-[#D46E53]/50 sm:w-auto">
                Compare Programs
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

      {/* Program Cards Grid */}
      <section id="programs" className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-sora text-3xl font-bold">Select Your Treatment Duration</h2>
            <p className="mt-3 text-sm text-[#475569]">
              Every month is structured as an individual treatment cycle. Prescriptions are clinical records authorized sequentially by your doctor.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {durationPrograms.map((prog) => (
              <article
                key={prog.durationMonths}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                  prog.featured
                    ? 'border-[#D46E53] ring-2 ring-[#D46E53]/30'
                    : 'border-[#0F172A]/10'
                }`}
              >
                {prog.discountLabel && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D46E53] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                    {prog.discountLabel}
                  </div>
                )}

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D46E53]">
                    {prog.label}
                  </p>
                  <h3 className="mt-2 font-sora text-2xl font-bold text-[#0F172A]">{prog.name}</h3>

                  <div className="mt-4 border-b border-[#0F172A]/8 pb-4">
                    <p className="font-sora text-3xl font-black text-[#0F172A]">{prog.price}</p>
                    <p className="text-xs font-bold text-[#64748B] mt-0.5">{prog.monthlyEquivalent}</p>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[#475569]">{prog.description}</p>

                  <ul className="mt-5 space-y-2.5">
                    {prog.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs font-semibold text-[#1E293B]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D46E53]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={prog.href}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition ${
                    prog.featured
                      ? 'bg-[#D46E53] text-white hover:bg-[#C45D43]'
                      : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'
                  }`}
                >
                  Select {prog.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Flow Section */}
      <section className="px-4 py-14 sm:px-6 lg:px-8 bg-white border-y border-[#0F172A]/8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#D46E53]">
              Canonical Care Journey
            </p>
            <h2 className="font-sora text-3xl font-bold leading-tight sm:text-4xl">
              Medical rigour with continuous clinical oversight.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {nutritionSteps.map(({ icon: Icon, title: itemTitle, text }) => (
              <div key={itemTitle} className="rounded-2xl border border-[#0F172A]/10 bg-[#F9F6F0]/50 p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D46E53]/12 text-[#D46E53]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-sora text-lg font-bold text-[#0F172A]">{itemTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-[#475569]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment CTA */}
      <section className="px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl bg-[#0F172A] p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6 text-[#D46E53]" />
            </div>
            <div>
              <h2 className="font-sora text-2xl font-bold">Step 1: Check Clinical Eligibility</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Complete the preliminary medical assessment, book your ₹499 initial doctor consultation, and select your care program.
              </p>
            </div>
          </div>
          <Link
            href="/assessment"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-bold text-[#0F172A] transition hover:bg-[#F9F6F0] sm:w-auto"
          >
            Start Assessment
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
