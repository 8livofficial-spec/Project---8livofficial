'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-transparent pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-sora leading-[1.1] text-[#0F172A] mb-6">
              Transform your <br/>
              <span className="teal-gradient-text">health</span> <br/>
              from home.
            </h1>
            
            <p className="text-xl text-[#475569] mb-10 leading-relaxed max-w-lg">
              Connect with board-certified doctors for 100% online metabolic consultations and personalized weight loss protocols.
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 items-center mb-12"
            >
              <a 
                href="/assessment"
                className="w-full sm:w-auto bg-[#0F172A] text-white font-semibold rounded-full px-8 py-4 flex items-center justify-center gap-2 hover:bg-[#1E293B] hover:shadow-lg transition-all group"
              >
                Start Assessment
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="w-full sm:w-auto bg-white/50 text-[#0F172A] font-semibold rounded-full px-8 py-4 flex items-center justify-center hover:bg-white/80 transition-colors border border-[#D46E53]/10">
                See if you qualify
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column: Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative lg:h-[700px] flex items-center justify-center"
          >
            {/* Main Image Container */}
            <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-[#D46E53]/20 group">
              <Image 
                src="/images/hero_indian.png" 
                alt="Premium Wellness Care" 
                fill
                className="object-cover transition-transform duration-[2s] group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-transparent to-transparent opacity-80 mix-blend-multiply" />
              
            </div>

            {/* Decorative element replacing the floating cards */}
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-tr from-[#D46E53]/10 to-[#A84A33]/5 rounded-full blur-[80px] -z-10" />
            <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-[#D46E53]/5 to-[#A84A33]/10 rounded-full blur-[100px] -z-10" />

          </motion.div>

        </div>
      </div>
    </section>
  )
}

