import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft, Clock, FileText, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react'
import { CONSENT_VERSION, CONSENT_EFFECTIVE_DATE, COMPANY_DETAILS, TERMS_SECTIONS } from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Patient Terms of Service | 8liv',
  description: 'Statutory Patient Terms of Service for 8liv, operated by LONGLIV PRIVATE LIMITED.',
}

export default function TermsPage() {
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
            <span>Part 1 · Version {CONSENT_VERSION}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Document Header */}
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-wider uppercase text-[#00A884]">
            Part 1 · Statutory Legal Document
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Patient Terms of Service
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
            <span className="text-slate-600">Governing Law: India</span>
          </div>
        </div>

        {/* Corporate Identity Preamble */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            These terms are between you and <strong>{COMPANY_DETAILS.legalName}</strong> (&ldquo;8liv&rdquo;, &ldquo;we&rdquo;), registered office at {COMPANY_DETAILS.registeredOffice}. Website: <a href="https://www.8liv.in" className="text-[#00A884] font-medium hover:underline">www.8liv.in</a>.
          </p>
          <p className="text-xs text-slate-500">
            By accessing or using the platform, you acknowledge and agree to these Terms of Service in conjunction with our Privacy Policy, Prescription Policy, and Informed Consent to Treatment.
          </p>
        </div>

        {/* 14 Numbered Clauses */}
        <div className="space-y-6">
          {TERMS_SECTIONS.map((section) => (
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

        {/* Grievance Redressal Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950 text-white space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-emerald-300">Grievance Redressal</h3>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              In accordance with the Consumer Protection (E-Commerce) Rules and Telemedicine regulations, you may contact our designated Grievance Officer:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-white/90">
              <span className="font-semibold text-emerald-400">Officer:</span>
              <span>{COMPANY_DETAILS.grievanceOfficer.name}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a href={`mailto:${COMPANY_DETAILS.grievanceOfficer.email}`} className="hover:underline">
                {COMPANY_DETAILS.grievanceOfficer.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <a href={`tel:${COMPANY_DETAILS.grievanceOfficer.phoneTerms}`} className="hover:underline">
                +91 {COMPANY_DETAILS.grievanceOfficer.phoneTerms}
              </a>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{COMPANY_DETAILS.jurisdiction}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-300/80 pt-2 border-t border-emerald-800">
            We acknowledge each grievance within {COMPANY_DETAILS.grievanceOfficer.acknowledgmentHours} hours and aim to resolve it within one month.
          </p>
        </div>

        {/* Quick Links to Other Parts */}
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <span>Other Statutory Policies:</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[#00A884] hover:underline">
              Part 2: Privacy Policy &rarr;
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
