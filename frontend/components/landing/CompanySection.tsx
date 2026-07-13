'use client'

import React from 'react'
import { Building2, ClipboardCheck, LockKeyhole, MessageSquareText, Stethoscope, Truck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CompanySection() {
  const pillars = [
    {
      icon: <Stethoscope className="h-5 w-5" />,
      title: 'Licensed clinical oversight',
      description: 'Every treatment pathway is reviewed through doctor-led workflows, eligibility checks, and documented consultation history.',
    },
    {
      icon: <LockKeyhole className="h-5 w-5" />,
      title: 'Secure digital operations',
      description: 'Patient records, prescriptions, notifications, and care-team access are organized in protected role-based portals.',
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: 'End-to-end fulfillment',
      description: 'Care decisions connect to pharmacy operations, prescription orders, delivery tracking, and patient follow-up.',
    },
  ]

  const metrics = [
    { value: '100%', label: 'online intake and care coordination' },
    { value: '24/7', label: 'patient portal access' },
    { value: '1 mo', label: 'clear subscription validity' },
  ]

  return (
    <section id="company" className="relative overflow-hidden bg-white/55 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D46E53]/15 bg-[#F9F6F0] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">
              <Building2 className="h-4 w-4" />
              Company
            </div>
            <h2 className="mb-6 font-sora text-3xl font-bold text-[#0F172A] sm:text-4xl md:text-5xl">
              Built for modern metabolic care, not one-time transactions.
            </h2>
            <p className="text-lg leading-relaxed text-[#475569]">
              8Liv is designed as a care infrastructure company: clinical intake, provider decisioning, pharmacy workflows, subscription access, and patient engagement all work together in one operating model.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.value} className="rounded-2xl border border-[#D46E53]/10 bg-white p-5 shadow-sm">
                  <p className="font-sora text-2xl font-black text-[#0F172A]">{metric.value}</p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-[#64748B]">{metric.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="rounded-[2rem] border border-[#D46E53]/10 bg-[#F9F6F0] p-5 shadow-xl sm:p-6"
          >
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#D46E53]/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Care operating system</p>
                  <h3 className="mt-2 font-sora text-2xl font-black text-[#0F172A]">Clinical, pharmacy, and patient teams in sync</h3>
                </div>
                <ClipboardCheck className="h-8 w-8 shrink-0 text-[#D46E53]" />
              </div>

              <div className="space-y-4">
                {pillars.map((pillar) => (
                  <div key={pillar.title} className="flex gap-4 rounded-2xl border border-[#D46E53]/10 bg-[#F9F6F0]/70 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#D46E53] shadow-sm">
                      {pillar.icon}
                    </div>
                    <div>
                      <h4 className="font-sora text-base font-black text-[#0F172A]">{pillar.title}</h4>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[#64748B]">{pillar.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#0F172A] p-5 text-white">
                <div className="flex items-center gap-3">
                  <MessageSquareText className="h-5 w-5 text-[#F4B79D]" />
                  <p className="text-sm font-bold">Every member journey is coordinated through documented clinical decisions, secure records, and accountable follow-up workflows.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
