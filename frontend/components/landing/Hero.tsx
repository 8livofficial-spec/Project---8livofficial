'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Globe2, ShieldCheck, Stethoscope } from 'lucide-react'

const trustSignals = [
  { label: 'Clinician-led reviews', icon: Stethoscope },
  { label: 'Encrypted health records', icon: ShieldCheck },
  { label: 'Online care access', icon: Globe2 },
]

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-transparent pb-12 pt-28 sm:pt-32 md:pb-0 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          
          {/* Left Column: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D46E53]/15 bg-white/75 px-4 py-2 text-sm font-semibold text-[#A84A33] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#D46E53]" />
              Doctor-led online metabolic care
            </div>

            <h1 className="mb-6 font-sora text-4xl font-bold leading-[1.05] text-[#0F172A] sm:text-5xl md:text-6xl lg:text-7xl">
              Medical weight-loss care, built for a <span className="teal-gradient-text">global standard.</span>
            </h1>
            
            <p className="mb-9 max-w-xl text-lg leading-relaxed text-[#475569] sm:text-xl">
              Complete a secure health assessment, consult a clinician online, and follow a personalized treatment plan with documented review and ongoing support.
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mb-9 flex flex-col items-center gap-4 sm:flex-row"
            >
              <a 
                href="/assessment"
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-8 py-4 font-semibold text-white transition-all hover:bg-[#1E293B] hover:shadow-lg sm:w-auto"
              >
                Start Assessment
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="/assessment" className="flex w-full items-center justify-center rounded-full border border-[#D46E53]/10 bg-white/65 px-8 py-4 font-semibold text-[#0F172A] transition-colors hover:bg-white/90 sm:w-auto">
                See if you qualify
              </a>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustSignals.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#D46E53]/10 bg-white/70 px-4 py-3 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D46E53]/10 text-[#D46E53]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-[#334155]">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative flex items-center justify-center"
          >
            {/* Main Image Container */}
            <div className="group relative mx-auto aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#0F172A]/10 bg-white shadow-2xl sm:aspect-[16/9] lg:aspect-[16/10]">
              <Image 
                src="/images/hero_consultation.png" 
                alt="Doctor-Led Telemedicine Care" 
                fill
                className="object-cover object-center transition-transform duration-[2s] group-hover:scale-[1.03]"
                priority
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 640px, 720px"
                quality={82}
              />
              <div className="absolute inset-x-0 bottom-0 bg-[#0F172A]/88 px-5 py-4 text-white backdrop-blur-md sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/70">Secure consultation</p>
                    <p className="font-sora text-xl font-bold">Care plan reviewed online</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

