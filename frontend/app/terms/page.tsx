import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import LegalNavbar from '@/components/legal/LegalNavbar'
import {
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  COMPANY_DETAILS,
  TERMS_SECTIONS,
} from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Terms and Conditions | 8Liv',
  description: 'Statutory Patient Terms and Conditions for 8Liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#00A884]/20 selection:text-[#11241A]">
      {/* Minimal Header identical to inspiration */}
      <LegalNavbar />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4.5 sm:px-6 md:px-8 pb-28 pt-10 sm:pt-16">
        {/* Centered Page Title */}
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 text-center tracking-tight mb-8 sm:mb-14">
          Terms and Conditions
        </h1>

        {/* Content Flow */}
        <div className="space-y-6 text-[16px] sm:text-[17px] md:text-lg text-slate-800 leading-[1.8] sm:leading-[1.85]">
          {/* Last Updated */}
          <p className="font-bold text-slate-900 text-[16px] sm:text-[17px] md:text-lg">
            Last updated: March 31, 2026
          </p>

          {/* Emergency Disclaimer */}
          <p className="text-slate-800">
            8Liv is contemplated for specific non-emergency medical conditions and concerns. If you believe you are experiencing a medical emergency, please dial 112 or contact your local emergency medical provider immediately.
          </p>

          {/* User Agreement Preamble */}
          <p className="text-slate-800">
            This User Agreement (collectively with 8Liv&apos;s Privacy Policy and Informed Consent) applies to your use of all sites (together with the Sites, the &ldquo;Services&rdquo;) offered by 8Liv and our affiliated brands and products. The terms &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo; and &ldquo;8Liv&rdquo; refer to {COMPANY_DETAILS.legalName}, a corporation located at {COMPANY_DETAILS.registeredOffice}.
          </p>

          <p className="text-slate-800">
            Please read this User Agreement carefully as it sets forth the legally binding terms and conditions for your use of our Services.
          </p>

          <p className="text-slate-950 font-semibold uppercase tracking-wide pt-2 text-[15px] sm:text-[16px] md:text-[17px] leading-[1.8]">
            THIS USER AGREEMENT CONTAINS IMPORTANT STATUTORY PROVISIONS GOVERNING TELEHEALTH CLINICAL PROTOCOLS, MANDATORY DISPUTE RESOLUTION, INFORMED CONSENT, AND LIMITATION OF LIABILITY. BY ACCESSING OR USING THE SERVICES, YOU EXPRESSLY AGREE TO BE BOUND BY AND ABIDE BY THIS AGREEMENT, INCLUDING THE MANDATORY DISCLOSURES AND POLICIES INCORPORATED HEREIN.
          </p>

          {/* Clauses / Sections */}
          <div className="pt-6 sm:pt-8 space-y-10 sm:space-y-12">
            {TERMS_SECTIONS.map((section, idx) => (
              <section key={section.number} id={`section-${section.number}`} className="space-y-3.5">
                <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {idx + 1}. {section.title}
                </h2>
                <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8] sm:leading-[1.85]">
                  {section.content}
                </p>
              </section>
            ))}

            {/* Grievance Redressal Section */}
            <section className="space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                15. Grievance Redressal & Compliance Officer
              </h2>
              <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8]">
                In accordance with the Information Technology Act, 2000, the Consumer Protection (E-Commerce) Rules, 2020, and the Telemedicine Practice Guidelines, you may contact our designated Grievance Officer:
              </p>
              <div className="space-y-2.5 text-[15px] sm:text-[16px] md:text-[17px] text-slate-800 pl-4 border-l-2 border-slate-300 my-4">
                <p>
                  <strong className="text-slate-950">Officer Name:</strong> {COMPANY_DETAILS.grievanceOfficer.name}
                </p>
                <p>
                  <strong className="text-slate-950">Entity:</strong> {COMPANY_DETAILS.legalName}
                </p>
                <p>
                  <strong className="text-slate-950">Email:</strong>{' '}
                  <a href={`mailto:${COMPANY_DETAILS.grievanceOfficer.email}`} className="text-[#00A884] hover:underline font-medium">
                    {COMPANY_DETAILS.grievanceOfficer.email}
                  </a>
                </p>
                <p>
                  <strong className="text-slate-950">Telephone:</strong>{' '}
                  <a href={`tel:${COMPANY_DETAILS.grievanceOfficer.phoneTerms}`} className="text-[#00A884] hover:underline font-medium">
                    +91 {COMPANY_DETAILS.grievanceOfficer.phoneTerms}
                  </a>
                </p>
                <p>
                  <strong className="text-slate-950">Registered Office:</strong> {COMPANY_DETAILS.registeredOffice}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 pt-2">
                We acknowledge each grievance within {COMPANY_DETAILS.grievanceOfficer.acknowledgmentHours} hours and aim to resolve all complaints within {COMPANY_DETAILS.grievanceOfficer.resolutionDays} days from receipt.
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
            <p>© {new Date().getFullYear()} {COMPANY_DETAILS.legalName}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/prescription-policy" className="hover:text-slate-900 transition-colors">
                Prescription Policy
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
