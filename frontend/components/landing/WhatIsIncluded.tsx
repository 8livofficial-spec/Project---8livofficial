'use client'

import React from 'react'
import { Activity, Apple, CalendarCheck, Pill, ShieldCheck, Smartphone } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function WhatIsIncluded() {
  const features = [
    {
      icon: <Pill className="h-6 w-6 text-[#D46E53]" />,
      title: 'Doctor-led treatment decisions',
      description: 'Prescription pathways are reviewed by licensed clinicians and recommended only when medically appropriate.',
    },
    {
      icon: <Activity className="h-6 w-6 text-[#D46E53]" />,
      title: 'Structured monthly care',
      description: 'Your subscription unlocks one month of care access, follow-ups, progress tracking, and renewal reminders before expiry.',
    },
    {
      icon: <Smartphone className="h-6 w-6 text-[#D46E53]" />,
      title: 'Connected patient portal',
      description: 'Consultations, care plans, prescriptions, progress logs, and notifications stay in one secure dashboard.',
    },
    {
      icon: <Apple className="h-6 w-6 text-[#D46E53]" />,
      title: 'Nutrition and lifestyle support',
      description: 'Gold members receive multidisciplinary support across diet, fitness, and sustainable habit formation.',
    },
  ]

  const phases = [
    { label: 'Clinical intake', value: 'Eligibility, risk flags, and goals reviewed' },
    { label: 'Doctor consult', value: 'Video visit with prescription decision if suitable' },
    { label: 'Monthly care cycle', value: 'Plan updates, progress tracking, renewal reminders' },
  ]

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  }

  return (
    <section id="program" className="relative overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D46E53]/15 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">
              <ShieldCheck className="h-4 w-4" />
              Clinically governed care
            </div>
            <h2 className="mb-6 font-sora text-3xl font-bold text-[#0F172A] sm:text-4xl md:text-5xl">
              A medical weight-loss program built like a <span className="teal-gradient-text">care system</span>
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-[#475569]">
              8Liv separates monthly subscription access from the longer clinical journey. Members renew monthly while their care plan adapts to age, BMI, medical history, progress, and provider review.
            </p>

            <motion.div
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              className="space-y-6"
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={itemVariants} className="flex gap-4 group">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#D46E53]/20 bg-[#D46E53]/10 transition-colors duration-300 group-hover:bg-[#D46E53]">
                    {React.cloneElement(feature.icon, { className: 'h-6 w-6 transition-colors duration-300 group-hover:text-white' })}
                  </div>
                  <div>
                    <h4 className="mb-1 font-sora text-xl font-bold text-[#0F172A]">{feature.title}</h4>
                    <p className="text-[#475569]">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-10 grid gap-3">
              {phases.map((phase) => (
                <div key={phase.label} className="rounded-2xl border border-[#D46E53]/10 bg-white/70 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C4622D]">{phase.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#475569]">{phase.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute inset-0 scale-105 rounded-3xl bg-gradient-to-tr from-[#D46E53]/10 to-transparent -rotate-6" />
            <div className="relative z-10 rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl sm:p-8">
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F9F6F0] p-4">
                  <CalendarCheck className="mb-3 h-5 w-5 text-[#D46E53]" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Access cycle</p>
                  <p className="mt-1 text-lg font-black text-[#0F172A]">1 month</p>
                </div>
                <div className="rounded-2xl bg-[#F9F6F0] p-4">
                  <ShieldCheck className="mb-3 h-5 w-5 text-[#D46E53]" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">Review cadence</p>
                  <p className="mt-1 text-lg font-black text-[#0F172A]">Ongoing</p>
                </div>
              </div>
              <div className="flex w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                <Image
                  src="/8liv_program_illustration.png"
                  alt="8Liv program elements including medication, coaching, nutrition, and progress tracking"
                  width={900}
                  height={700}
                  className="h-auto w-full rounded-xl object-contain transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 84vw, 520px"
                  quality={72}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

