import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { Shield, Clock, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { CONSENT_VERSION, CONSENT_EFFECTIVE_DATE, TERMS_OF_SERVICE } from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Terms of Service | 8liv Health',
  description: 'Statutory Terms of Service for the 8liv telehealth and clinical care platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 selection:bg-[#00A884]/20 selection:text-[#11241A]">
      {/* Top Emergency Notice */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs font-semibold text-amber-900 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>This service is not for emergencies. In a medical emergency, call 112 immediately.</span>
      </div>

      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#00A884] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to 8liv</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Standard · {CONSENT_VERSION}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        {/* Document Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#00A884] font-mono">
            <Shield className="w-4 h-4" />
            <span>Statutory Legal Document · Part 1</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Terms of Service
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Effective: {CONSENT_EFFECTIVE_DATE} (October 18, 2026)
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Document Version: {CONSENT_VERSION}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono">
              Legally Enforced
            </span>
          </div>
        </div>

        {/* Platform Clarification Notice */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-[#00A884]" />
            <span>Platform Definition &amp; Regulatory Status</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            8liv operates strictly as a digital telehealth software platform connecting patients with registered medical practitioners, clinical dieticians, and certified fitness coaches. <strong>8liv is not a pharmacy and does not manufacture, sell, distribute, or deliver pharmaceutical drugs or prescription medications.</strong>
          </p>
        </div>

        {/* Full Document Body */}
        <article className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              1. Acceptance of Terms &amp; Scope
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              By accessing or using www.8liv.in, mobile portals, or any associated telehealth software services (collectively, the &ldquo;Platform&rdquo;), you enter into a legally binding agreement governed by these Terms of Service. These terms sit in conjunction with our Privacy Policy, Prescription Policy, and Informed Consent to Treatment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              2. Nature of Telemedicine Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              8liv provides encrypted video, audio, and asynchronous consultation infrastructure to facilitate clinical evaluation by qualified, registered medical practitioners (RMPs). Medical decision-making, diagnosis, eligibility determination for GLP-1 and metabolic programs, and issuance of prescriptions remain entirely within the independent clinical discretion of the treating physician.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              3. Eligibility &amp; Minor Accounts
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              You must be at least 18 years of age to register independently. For individuals under 18 years of age, account registration, health data submission, and consultation consent must be completed by a parent or verified legal guardian through mobile OTP authentication.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              4. Emergency Care Disclaimer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              8liv telehealth services are designed solely for scheduled, non-emergency metabolic and lifestyle healthcare. If you experience severe symptoms, chest pain, shortness of breath, severe allergic reactions, or acute medical distress, you must immediately call 112 or visit the nearest emergency department.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              5. Prescriptions &amp; Fulfillment
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Prescriptions issued through the platform are signed digitally by independent licensed doctors. Patients retain full freedom of choice to fulfill prescriptions at any licensed physical or online pharmacy of their choosing. 8liv does not supply, dispense, or deliver medications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              6. Fees, Cancellations &amp; Rescheduling
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Consultation fees are paid prior to appointment confirmation. Appointments may be rescheduled or cancelled through the patient portal subject to our standard cancellation window. Completed doctor consultations are non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              7. Governing Law &amp; Jurisdiction
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              These terms are governed by the laws of India, including the Information Technology Act, 2000, the Telemedicine Practice Guidelines, 2020, and the Digital Personal Data Protection Act, 2023. Courts in Bengaluru, India shall have exclusive jurisdiction.
            </p>
          </section>
        </article>

        {/* Version Archive Table (Statutory Requirement) */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-[#11241A] uppercase tracking-wider">
            Version Archive &amp; Audit Trail
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Effective Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Key Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                <tr className="bg-emerald-50/40">
                  <td className="px-4 py-3 font-bold text-emerald-800 font-mono">v4.0</td>
                  <td className="px-4 py-3">October 18, 2026</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3">4-step statutory consent gates, explicit non-pharmacy status, minor OTP guard</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-400">v3.2</td>
                  <td className="px-4 py-3 text-slate-400">July 14, 2026</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                      Archived
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">Telemedicine consultation scheduling updates</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-400">v2.0</td>
                  <td className="px-4 py-3 text-slate-400">January 10, 2026</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                      Archived
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">Initial telehealth platform launch terms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Legal Links */}
        <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© 2026 8liv Health Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#00A884]">Privacy Policy</Link>
            <Link href="/prescription-policy" className="hover:text-[#00A884]">Prescription Policy</Link>
            <Link href="/patient/consultation" className="hover:text-[#00A884]">Book Consultation</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
