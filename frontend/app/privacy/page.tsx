import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import LegalNavbar from '@/components/legal/LegalNavbar'
import {
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  COMPANY_DETAILS,
  PRIVACY_DATA_TABLE,
  PRIVACY_SECTIONS,
} from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Privacy Policy | 8Liv',
  description: 'Statutory Privacy Policy & Data Fiduciary Disclosure under DPDPA 2023 for 8Liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#00A884]/20 selection:text-[#11241A]">
      <LegalNavbar />

      <main className="max-w-4xl mx-auto px-4.5 sm:px-6 md:px-8 pb-28 pt-10 sm:pt-16">
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 text-center tracking-tight mb-8 sm:mb-14">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-[16px] sm:text-[17px] md:text-lg text-slate-800 leading-[1.8] sm:leading-[1.85]">
          <p className="font-bold text-slate-900 text-[16px] sm:text-[17px] md:text-lg">
            Last updated: March 31, 2026
          </p>

          <p className="text-slate-800">
            <strong>{COMPANY_DETAILS.legalName}</strong> (&ldquo;8Liv&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is the Data Fiduciary for the personal and clinical data collected through our applications and website at {COMPANY_DETAILS.website}. We are committed to safeguarding your personal health data and complying with the Digital Personal Data Protection Act (DPDPA), 2023, Information Technology Act, 2000, and Indian Telemedicine Practice Guidelines.
          </p>

          <p className="text-slate-800">
            This Privacy Policy outlines how your data is collected, processed, stored, and protected when you access our clinical consultations, lab integrations, nutrition calibration, and wellness services.
          </p>

          {/* Section 1: Data Matrix */}
          <div className="pt-6 space-y-4">
            <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              1. Categories of Data Collected
            </h2>
            <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8]">
              We collect and process the following categories of personal and sensitive medical data strictly for clinical and operational purposes:
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold text-xs sm:text-sm">
                  <tr>
                    <th className="py-3.5 px-4 w-1/4">Data Category</th>
                    <th className="py-3.5 px-4 w-2/5">Examples</th>
                    <th className="py-3.5 px-4">Processing Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {PRIVACY_DATA_TABLE.map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-950 align-top">
                        {row.type}
                      </td>
                      <td className="py-4 px-4 text-sm sm:text-base leading-relaxed align-top">
                        {row.examples}
                      </td>
                      <td className="py-4 px-4 text-sm sm:text-base leading-relaxed text-slate-600 align-top">
                        {row.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remaining Sections */}
          <div className="pt-8 space-y-10 sm:space-y-12">
            {PRIVACY_SECTIONS.slice(1).map((section, idx) => (
              <section key={section.number} id={`section-${section.number}`} className="space-y-3.5">
                <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {idx + 2}. {section.title}
                </h2>
                <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8] sm:leading-[1.85]">
                  {section.content}
                </p>
              </section>
            ))}

            {/* Data Protection Officer */}
            <section className="space-y-4 pt-6 border-t border-slate-200">
              <h2 className="text-[20px] xs:text-[22px] sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Data Protection Officer & Privacy Inquiries
              </h2>
              <p className="text-slate-800 text-[16px] sm:text-[17px] md:text-lg leading-[1.8]">
                For statutory inquiries regarding data inspection, correction, consent withdrawal, or privacy grievances, reach out directly to our Data Protection Officer:
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
                  <a href={`tel:${COMPANY_DETAILS.grievanceOfficer.phonePrivacy}`} className="text-[#00A884] hover:underline font-medium">
                    +91 {COMPANY_DETAILS.grievanceOfficer.phonePrivacy}
                  </a>
                </p>
                <p>
                  <strong className="text-slate-950">Office:</strong> {COMPANY_DETAILS.registeredOffice}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 pt-2">
                If an inquiry or complaint is not addressed satisfactorily, you retain the statutory right to escalate your grievance to the Data Protection Board of India.
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
            <p>© {new Date().getFullYear()} {COMPANY_DETAILS.legalName}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms and Conditions
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
