'use client'

import React from 'react'
import { Pill, Activity, Smartphone, Apple } from 'lucide-react'
import { motion } from 'framer-motion'

export default function WhatIsIncluded() {
  const features = [
    {
      icon: <Pill className="w-6 h-6 text-[#D46E53]" />,
      title: "GLP-1 Medication",
      description: "CDSCO & FSSAI -approved medications like Wegovy® or Ozempic®, shipped directly to your door."
    },
    {
      icon: <Activity className="w-6 h-6 text-[#D46E53]" />,
      title: "100% Online Consultation",
      description: "Meet with board-certified doctors via secure video from anywhere in India."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-[#D46E53]" />,
      title: "1:1 Coaching App",
      description: "Daily access to your dedicated care team right from your phone."
    },
    {
      icon: <Apple className="w-6 h-6 text-[#D46E53]" />,
      title: "Nutrition Plan",
      description: "A customized eating protocol designed around the foods you love."
    }
  ]

  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  }

  return (
    <section id="program" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-sora text-[#0F172A] mb-6">
              Everything You Need to <span className="teal-gradient-text">Succeed</span>
            </h2>
            <p className="text-[#475569] text-lg mb-10 leading-relaxed">
              We don't just prescribe medication. We provide a complete metabolic reset with ongoing support, tracking, and personalized nutrition.
            </p>

            <motion.div 
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-6"
            >
              {features.map((feature, idx) => (
                <motion.div key={idx} variants={itemVariants} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D46E53]/10 flex items-center justify-center border border-[#D46E53]/20 group-hover:bg-[#D46E53] group-hover:text-white transition-colors duration-300">
                    {React.cloneElement(feature.icon, { className: "w-6 h-6 transition-colors duration-300 group-hover:text-white" })}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#0F172A] mb-1 font-sora">{feature.title}</h4>
                    <p className="text-[#475569]">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D46E53]/10 to-transparent rounded-3xl -rotate-6 scale-105"></div>
            <div className="bg-white p-8 rounded-3xl relative z-10 shadow-2xl border border-gray-100">
              <div className="w-full rounded-2xl overflow-hidden shadow-sm bg-white flex items-center justify-center p-4">
                <img src="/8liv_program_illustration.png" alt="8liv Program Elements - Medication, Coaching, Nutrition" className="w-full h-auto object-contain transform hover:scale-105 transition-transform duration-500 rounded-xl" />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

