'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function RealResults() {
  const outcomes = [
    {
      img: "/images/outcome_1.png",
      title: "Sustainable Fat Loss",
      desc: "Our patients lose an average of 15-20% of their body weight in the first year."
    },
    {
      img: "/images/outcome_2.png",
      title: "Improved Metabolic Health",
      desc: "Significant improvements in A1C, cholesterol, and overall energy levels."
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
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  }

  return (
    <section id="outcomes" className="py-24 relative overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-sora text-[#0F172A] mb-4">
            Expected <span className="teal-gradient-text">Outcomes</span>
          </h2>
          <p className="text-[#475569] text-lg max-w-2xl mx-auto">
            Real, clinical results from our comprehensive metabolic programs.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
        >
          {outcomes.map((outcome, idx) => (
            <motion.div key={idx} variants={itemVariants} className="group relative rounded-3xl overflow-hidden glass-card shadow-lg hover:shadow-2xl transition-shadow duration-500">
              <div className="aspect-[4/5] relative w-full">
                <Image 
                  src={outcome.img} 
                  alt={outcome.title} 
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/20 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="w-10 h-1 bg-[#D46E53] mb-4 rounded-full"></div>
                <h3 className="text-2xl font-bold text-white mb-2 font-sora">{outcome.title}</h3>
                <p className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  {outcome.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}

