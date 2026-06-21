'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function CTABanner() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#D46E53]/5 via-[#F9F6F0] to-[#D46E53]/10" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-card p-6 sm:p-12 md:p-16 rounded-[3rem] border border-[#D46E53]/20 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D46E53]/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D46E53]/10 rounded-full blur-[80px]" />
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold font-sora text-[#0F172A] mb-6 relative z-10 leading-tight"
          >
            Ready to change your <br className="hidden md:block"/>
            <span className="teal-gradient-text">metabolic health?</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-[#475569] text-xl mb-10 max-w-2xl mx-auto relative z-10"
          >
            Join thousands of patients who have finally found a sustainable path to weight loss. Take our 5-minute assessment to see if you qualify.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center relative z-10"
          >
            <a href="/assessment">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#A84A33] to-[#D46E53] text-white font-semibold rounded-full px-10 py-4 shadow-lg shadow-[#D46E53]/20 text-lg inline-block text-center cursor-pointer"
              >
                Start Your Assessment
              </motion.div>
            </a>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}

