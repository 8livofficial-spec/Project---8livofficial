'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-transparent px-0 pb-12 pt-28 sm:pt-32 md:pb-0 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          
          {/* Left Column: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
          >
            <h1 className="mb-5 font-sora text-4xl font-bold leading-[1.08] text-[#0F172A] sm:text-5xl md:text-6xl lg:mb-6 lg:text-7xl">
              Transform your <br/>
              <span className="teal-gradient-text">health</span> <br/>
              from home.
            </h1>
            
            <p className="mx-auto mb-8 max-w-lg text-base leading-7 text-[#475569] sm:text-lg md:text-xl lg:mx-0 lg:mb-10">
              Connect with board-certified doctors for 100% online metabolic consultations and personalized weight loss protocols.
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mb-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:mb-12 lg:justify-start"
            >
              <Link 
                href="/assessment"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] px-6 py-4 text-center font-semibold text-white transition-all hover:bg-[#1E293B] hover:shadow-lg sm:w-auto sm:px-8"
              >
                Start Assessment
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/assessment" className="flex w-full items-center justify-center rounded-full border border-[#D46E53]/10 bg-white/50 px-6 py-4 text-center font-semibold text-[#0F172A] transition-colors hover:bg-white/80 sm:w-auto sm:px-8">
                See if you qualify
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column: Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative flex h-[330px] items-center justify-center sm:h-[450px] lg:h-[700px]"
          >
            {/* Main Image Container */}
            <div className="group relative mx-auto aspect-[3/4] w-full max-w-[min(82vw,24rem)] overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-[#D46E53]/20 sm:rounded-[2.5rem] lg:max-w-md">
              <Image 
                src="/images/hero_indian.png" 
                alt="Patient using 8liv for online doctor-led weight management care" 
                fill
                className="object-cover transition-transform duration-[2s] group-hover:scale-105"
                priority
                sizes="(max-width: 640px) 88vw, (max-width: 1024px) 420px, 520px"
                quality={78}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-transparent to-transparent opacity-80 mix-blend-multiply" />
            </div>

            {/* Decorative element replacing the floating cards */}
            <div className="hidden md:block absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-tr from-[#D46E53]/10 to-[#A84A33]/5 rounded-full blur-[80px] -z-10" />
            <div className="hidden md:block absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-[#D46E53]/5 to-[#A84A33]/10 rounded-full blur-[100px] -z-10" />
          </motion.div>

        </div>
      </div>
    </section>
  )
}

