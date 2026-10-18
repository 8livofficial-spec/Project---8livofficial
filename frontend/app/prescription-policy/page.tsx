import React from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import { Shield, Clock, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Stethoscope, AlertCircle } from 'lucide-react'
import { CONSENT_VERSION, CONSENT_EFFECTIVE_DATE } from '@/lib/consent/constants'

export const metadata: Metadata = {
  title: 'Prescription Policy | 8liv Health',
  description: 'Official Prescription Policy and statutory non-pharmacy declaration for 8liv telehealth consultations.',
}

export default function PrescriptionPolicyPage() {
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
            <Stethoscope className="w-4 h-4" />
            <span>Statutory Legal Document · Part 5</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#11241A] tracking-tight">
            Prescription Policy
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
              Drugs &amp; Cosmetics Act Compliant
            </span>
          </div>
        </div>

        {/* Regulatory Non-Pharmacy Declaration Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-emerald-950 text-white shadow-md space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Shield className="w-4 h-4" />
            <span>Mandatory Statutory Clarification</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">
            8liv is a Clinical Telehealth Software Platform — Not a Pharmacy
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            8liv does not supply, sell, dispense, compound, package, or deliver pharmaceutical drugs or prescription medications. All prescriptions generated through 8liv consultations are digital e-prescriptions issued directly by independent Registered Medical Practitioners (RMPs). <strong>You may fulfill your prescription at any registered physical or online retail pharmacy of your choice.</strong>
          </p>
        </div>

        {/* Full Prescription Policy Text */}
        <article className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              1. Independent Physician Discretion
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Booking a consultation or enrolling in an 8liv metabolic health program does not guarantee the issuance of a prescription. The decision to prescribe any medication (including GLP-1 receptor agonists, peptide therapies, or adjunct metabolic drugs) rests solely with the consulting doctor based on their clinical assessment, medical history review, and applicable clinical guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              2. Digital Signed E-Prescriptions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              When clinically appropriate, the consulting doctor will generate an official e-prescription conforming to the Telemedicine Practice Guidelines, 2020. Every prescription features:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-1.5 pt-1">
              <li>Doctor&apos;s full name, medical registration number, and state medical council.</li>
              <li>Patient name, age, gender, and clinical diagnosis/purpose.</li>
              <li>Generic drug name, specific dosage, dosage form, administration route, and duration.</li>
              <li>Cryptographic digital signature or secure digital validation token.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              3. Independent Fulfillment Freedom
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Patients receive a downloadable, tamper-verifiable PDF copy of their signed e-prescription in their secure patient portal under <strong>Prescriptions</strong>. 8liv does not restrict, steer, or require fulfillment through any specific pharmacy partner. Patients can present this e-prescription to any licensed pharmacist in India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              4. Prohibited Medications (Schedule X)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              In accordance with Indian Telemedicine Practice Guidelines, doctors on the 8liv platform will never prescribe Schedule X drugs, habit-forming narcotics, psychotropic substances, or other restricted compounds via telehealth.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#11241A] tracking-tight">
              5. Adverse Effects &amp; Patient Obligations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Patients agree to strictly follow all dosing directions, read manufacturer package inserts, and report any adverse effects or contraindications to their physician immediately via portal messaging or follow-up consultation. In acute distress, call 112 immediately.
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
                  <th className="px-4 py-3">Regulatory Scope</th>
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
                  <td className="px-4 py-3">Explicit non-pharmacy declaration, independent patient fulfillment, Drugs &amp; Cosmetics compliance</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-slate-400">v3.2</td>
                  <td className="px-4 py-3 text-slate-400">July 14, 2026</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                      Archived
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">Previous telehealth e-prescription protocol</td>
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
            <Link href="/privacy" className="hover:text-[#00A884]">Privacy Policy</Link>
            <Link href="/patient/prescriptions" className="hover:text-[#00A884]">View Prescriptions</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
