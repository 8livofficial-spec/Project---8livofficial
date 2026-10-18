import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { Shield, Clock, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Lock } from 'lucide-react'
import { CONSENT_VERSION, CONSENT_EFFECTIVE_DATE } from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Privacy Policy | 8liv Health',
  description: 'Statutory Privacy Policy and Data Notice for 8liv telehealth and clinical care operations.',
}

export default function PrivacyPage() {
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
            <span>Statutory Legal Document · Part 2 &amp; Part 4</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Privacy Policy &amp; Data Notice
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
              DPDP Act &amp; DISHA Compliant
            </span>
          </div>
        </div>

        {/* Clinical Data Notice Summary Box */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Lock className="w-4 h-4 text-[#00A884]" />
            <span>Data Notice Summary (Part 4)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-0.5">Who is collecting your data?</strong>
              8liv Health Platform (www.8liv.in), a clinical telehealth technology platform.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-0.5">What is collected?</strong>
              Contact information, date of birth, biometric indicators, lab diagnostics, and consultation records.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-0.5">Who has access?</strong>
              Exclusively your dedicated care team: your assigned physician, clinical dietician, and fitness coach.
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="text-slate-900 block mb-0.5">Your consent rights:</strong>
              Inspect, download, or withdraw optional and required consents under Account Settings &gt; Privacy.
            </div>
          </div>
        </div>

        {/* Full Privacy Policy Text */}
        <article className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We collect information provided directly by you during intake assessments, booking, payment, and clinical video consultations. This includes identity details (name, email, mobile number, date of birth), health metrics (height, weight, waist circumference, medical history, allergies, existing medications, and blood lab reports), as well as consultation transcripts, clinical notes, and physician-signed digital prescriptions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              2. Minor Patients &amp; Guardian Consent
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For any patient under 18 years of age, 8liv requires the explicit, verified consent of a parent or legal guardian. Guardian identity and mobile number are verified via cryptographic WhatsApp/SMS one-time password (OTP) before any medical or personal data is collected or stored.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              3. Purpose of Processing &amp; Care Team Sharing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your health data is processed solely to: (a) evaluate your clinical suitability for doctor-supervised metabolic programs; (b) conduct encrypted video consultations with registered medical practitioners; and (c) coordinate multidisciplinary care between your doctor, clinical dietician, and trainer. We do not sell or rent patient health data under any circumstances.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              4. Storage, Cryptography &amp; Append-Only Audit Records
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              All health records and consent acceptances are stored with end-to-end encryption in transit (TLS 1.3) and at rest (AES-256). All consent actions (Gates 1, 2, 3, and withdrawals) are recorded in an append-only audit trail capturing version, timestamp, SHA-256 document content hash, IP address, user agent, and OTP verification state. Records are never deleted or modified.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              5. Consent Withdrawal &amp; Data Rights
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              In accordance with the Digital Personal Data Protection Act, you have the right to withdraw your consent at any time. You can view your active consents and execute withdrawals directly from your patient portal under <strong>Account Settings &gt; Privacy</strong>. Withdrawing treatment consent will terminate active telehealth sessions and pause care plan coordination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              6. Data Protection Officer (DPO) Contact
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For inquiries regarding personal data processing or to exercise legal data rights, contact our Data Protection Officer at <strong>dpo@8liv.in</strong> or via written notice to 8liv Health Legal Department, Bengaluru, Karnataka, India.
            </p>
          </section>
        </article>

        {/* Version Archive Table */}
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
                  <th className="px-4 py-3">Scope</th>
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
                  <td className="px-4 py-3">Statutory 4-step consent tracking, append-only audit trail, minor OTP verification</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-400">v3.2</td>
                  <td className="px-4 py-3 text-slate-400">July 14, 2026</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                      Archived
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">Previous telehealth intake privacy terms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Legal Links */}
        <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© 2026 8liv Health Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[#00A884]">Terms of Service</Link>
            <Link href="/prescription-policy" className="hover:text-[#00A884]">Prescription Policy</Link>
            <Link href="/patient/settings" className="hover:text-[#00A884]">Manage Privacy Settings</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
