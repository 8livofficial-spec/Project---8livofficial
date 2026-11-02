import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import LegalNavbar from '@/components/legal/LegalNavbar'
import {
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  COMPANY_DETAILS,
  PRESCRIPTION_SECTIONS,
} from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Prescription Policy | 8Liv',
  description: 'Statutory Prescription Policy under Telemedicine Practice Guidelines 2020 for 8Liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function PrescriptionPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#00A884]/20 selection:text-[#11241A]">
      <LegalNavbar />

      <main className="max-w-4xl mx-auto px-4.5 sm:px-6 md:px-8 pb-28 pt-10 sm:pt-16">
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 text-center tracking-tight mb-8 sm:mb-14">
          Prescription Policy
        </h1>

        <div className="space-y-6 text-[16px] sm:text-[17px] md:text-lg text-slate-800 leading-[1.8] sm:leading-[1.85]">
          <p className="font-bold text-slate-900 text-[16px] sm:text-[17px] md:text-lg">
            Last updated: March 31, 2026
          </p>

          <p className="text-slate-800">
            This Prescription Policy sets forth the clinical governance, regulatory protocols, and patient autonomy standards governing electronic prescriptions authored through 8Liv, operated by <strong>{COMPANY_DETAILS.legalName}</strong>.
          </p>

          <p className="text-slate-950 font-semibold">
            8Liv is a telehealth technology platform and does NOT operate a pharmacy, dispense medicines, or deliver medications. All prescriptions issued on 8Liv are authored solely by registered medical practitioners based on independent clinical judgment and can be fulfilled at any licensed pharmacy of the patient&apos;s choice.
          </p>

          {/* Clauses / Sections */}
          <div className="pt-8 space-y-10 sm:space-y-12">
            {PRESCRIPTION_SECTIONS.map((section, idx) => (
              <section key={section.number} id={`section-${section.number}`} className="space-y-3.5">
                <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {idx + 1}. {section.title}
                </h2>
                <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8] sm:leading-[1.85]">
                  {section.content}
                </p>
              </section>
            ))}

            {/* Questions & Clinical Support */}
            <section className="space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Prescription Support &amp; Clinical Inquiries
              </h2>
              <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8]">
                If you have questions regarding your digital e-prescription or experience unexpected adverse effects, contact your treating doctor through the 8Liv portal immediately, or reach our clinical governance team:
              </p>
              <div className="space-y-2.5 text-[15px] sm:text-[16px] md:text-[17px] text-slate-800 pl-4 border-l-2 border-slate-300 my-4">
                <p>
                  <strong className="text-slate-950">Email:</strong>{' '}
                  <a href={`mailto:${COMPANY_DETAILS.grievanceOfficer.email}`} className="text-[#00A884] hover:underline font-medium">
                    {COMPANY_DETAILS.grievanceOfficer.email}
                  </a>
                </p>
                <p>
                  <strong className="text-slate-950">Clinical Support:</strong> Available through the patient portal 24/7
                </p>
                <p>
                  <strong className="text-slate-950">Emergency Care:</strong> If you experience life-threatening symptoms, immediately dial 112 or visit the nearest emergency medical facility.
                </p>
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
            <p>© {new Date().getFullYear()} {COMPANY_DETAILS.legalName}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms and Conditions
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/" className="hover:text-slate-900 transition-colors">
                Return to 8Liv
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
