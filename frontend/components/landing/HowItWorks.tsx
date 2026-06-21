'use client'

import React from 'react'
import { ClipboardList, Stethoscope, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HowItWorks() {
  const steps = [
    {
      icon: <ClipboardList className="w-8 h-8 text-[#D46E53]" />,
      title: "1. Assessment",
      desc: "Complete a quick medical intake to help our board-certified doctors understand your metabolic history."
    },
    {
      icon: <Stethoscope className="w-8 h-8 text-[#D46E53]" />,
      title: "2. Consultation",
      desc: "Meet with your clinician to design a personalized treatment plan and prescribe GLP-1 medication if appropriate."
    },
    {
      icon: <TrendingDown className="w-8 h-8 text-[#D46E53]" />,
      title: "3. Transformation",
      desc: "Receive medication at your door, log your progress in the app, and get ongoing coaching to ensure results."
    }
  ]

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  return (
    <section id="how-it-works" className="py-16 md:py-24 relative overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-sora text-[#0F172A] mb-4">
            How it <span className="teal-gradient-text">Works</span>
          </h2>
          <p className="text-[#475569] text-lg max-w-2xl mx-auto">
            Three simple steps to unlock your metabolic health.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8 relative"
        >
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-transparent via-[#D46E53]/30 to-transparent -z-10" />

          {steps.map((step, idx) => (
            <motion.div key={idx} variants={itemVariants} className="relative group">
              <div className="glass-card p-6 sm:p-8 rounded-3xl h-full border border-[#D46E53]/10 hover:border-[#D46E53]/30 transition-colors shadow-lg hover:shadow-xl bg-white/60">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D46E53]/10 to-[#A84A33]/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3 font-sora">{step.title}</h3>
                <p className="text-[#475569] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}

