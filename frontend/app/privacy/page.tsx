import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft, Clock, FileText, Mail, Phone, Lock, AlertTriangle } from 'lucide-react'
import {
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  COMPANY_DETAILS,
  PRIVACY_DATA_TABLE,
  PRIVACY_SECTIONS,
} from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Privacy Policy | 8liv',
  description: 'Statutory Privacy Policy & Data Fiduciary Disclosure under DPDPA 2023 for 8liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 selection:bg-[#00A884]/20 selection:text-[#11241A]">
      {/* Top Emergency Notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs font-medium text-amber-900 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
        <span>This service is not for emergencies. In a medical emergency, immediately call 112 or visit the nearest hospital.</span>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#00A884] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to 8liv</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
            <span>Part 2 · Version {CONSENT_VERSION}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Document Header */}
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-wider uppercase text-[#00A884]">
            Part 2 · Statutory Privacy Disclosure
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last updated: {CONSENT_EFFECTIVE_DATE}
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Document Version: {CONSENT_VERSION}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">Standard: DPDPA 2023 Compliant</span>
          </div>
        </div>

        {/* Fiduciary Preamble */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>{COMPANY_DETAILS.legalName}</strong> (&ldquo;8liv&rdquo;) is the <strong>Data Fiduciary</strong> for the personal and clinical data described in this policy.
          </p>
          <p className="text-xs text-slate-500">
            This policy outlines what data we collect, our statutory legal grounds for processing, who accesses it, how long records are maintained, and your legal rights to inspect, correct, and withdraw consent.
          </p>
        </div>

        {/* Data We Collect Matrix Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#11241A] tracking-tight">
              1. Data We Collect Matrix
            </h2>
            <span className="text-xs text-slate-500">Statutory Inventory</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Data Type</th>
                    <th className="py-3 px-4 w-2/5">Examples</th>
                    <th className="py-3 px-4">Why We Collect &amp; Use It</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {PRIVACY_DATA_TABLE.map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 align-top">
                        {row.type}
                      </td>
                      <td className="py-3.5 px-4 text-xs sm:text-sm leading-relaxed align-top">
                        {row.examples}
                      </td>
                      <td className="py-3.5 px-4 text-xs sm:text-sm leading-relaxed text-slate-500 align-top">
                        {row.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 10 Numbered Privacy Policy Sections */}
        <div className="space-y-6">
          {PRIVACY_SECTIONS.slice(1).map((section) => (
            <section
              key={section.number}
              id={`section-${section.number}`}
              className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 scroll-mt-24 transition-colors hover:border-slate-300"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  {section.number}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#11241A] tracking-tight">
                  {section.title}
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed pl-0 sm:pl-9">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Data Protection / Grievance Officer Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Data Protection &amp; Redressal</span>
            </div>
            <h3 className="text-base font-bold text-white">Data Protection / Grievance Officer</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For inquiries regarding data inspection, correction, consent withdrawal, or privacy grievances, reach out directly:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-white/90">
              <span className="font-semibold text-emerald-400">Officer:</span>
              <span>{COMPANY_DETAILS.grievanceOfficer.name}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="font-semibold text-emerald-400">Entity:</span>
              <span>{COMPANY_DETAILS.legalName}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a href={`mailto:${COMPANY_DETAILS.grievanceOfficer.email}`} className="hover:underline">
                {COMPANY_DETAILS.grievanceOfficer.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a href={`tel:${COMPANY_DETAILS.grievanceOfficer.phonePrivacy}`} className="hover:underline">
                +91 {COMPANY_DETAILS.grievanceOfficer.phonePrivacy}
              </a>
            </div>
          </div>

          <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
            If we do not resolve your concern to your satisfaction, you retain the statutory right to escalate to the Data Protection Board of India once operational.
          </p>
        </div>

        {/* Quick Links to Other Parts */}
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <span>Other Statutory Policies:</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[#00A884] hover:underline">
              Part 1: Terms of Service &rarr;
            </Link>
            <Link href="/prescription-policy" className="text-[#00A884] hover:underline">
              Part 5: Prescription Policy &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
