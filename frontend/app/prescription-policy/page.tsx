import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft, Clock, FileText, Mail, AlertTriangle, Stethoscope } from 'lucide-react'
import {
  CONSENT_VERSION,
  CONSENT_EFFECTIVE_DATE,
  COMPANY_DETAILS,
  PRESCRIPTION_SECTIONS,
} from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Prescription Policy | 8liv',
  description: 'Statutory Prescription Policy under Telemedicine Practice Guidelines 2020 for 8liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function PrescriptionPolicyPage() {
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
            <span>Part 5 · Version {CONSENT_VERSION}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Document Header */}
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-wider uppercase text-[#00A884]">
            Part 5 · Clinical Governance Policy
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Prescription Policy
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
            <span className="text-slate-600">Standard: Telemedicine Practice Guidelines 2020</span>
          </div>
        </div>

        {/* Clear Policy Preamble */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-sm text-slate-700 leading-relaxed">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs uppercase tracking-wider">
            <Stethoscope className="w-4 h-4" />
            <span>Independent Medical Discretion</span>
          </div>
          <p>
            Prescriptions issued on 8liv are authored strictly by licensed, registered medical practitioners (RMPs) based on their independent clinical evaluation. <strong>8liv is not a pharmacy and does not sell, stock, dispense, or deliver medications.</strong>
          </p>
          <p className="text-xs text-slate-500">
            Patients are entirely free to fill their digital prescriptions at any licensed retail or online pharmacy of their personal preference.
          </p>
        </div>

        {/* 9 Numbered Prescription Sections */}
        <div className="space-y-6">
          {PRESCRIPTION_SECTIONS.map((section) => (
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

        {/* Prescription Questions or Concerns */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Questions or Clinical Inquiries</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you have any questions or adverse concerns regarding an issued prescription, please contact your consulting doctor through the 8liv portal first, or reach our compliance team:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-white/90">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a href={`mailto:${COMPANY_DETAILS.grievanceOfficer.email}`} className="hover:underline">
                {COMPANY_DETAILS.grievanceOfficer.email}
              </a>
            </div>
            <span className="text-slate-600">·</span>
            <span>Emergency medical assistance: Call 112 immediately</span>
          </div>
        </div>

        {/* Quick Links to Other Parts */}
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <span>Other Statutory Policies:</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-[#00A884] hover:underline">
              Part 1: Terms of Service &rarr;
            </Link>
            <Link href="/privacy" className="text-[#00A884] hover:underline">
              Part 2: Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
