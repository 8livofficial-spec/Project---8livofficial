'use client'

import React from 'react'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MealNutrition() {
  const benefits = [
    "Culturally tailored meal plans",
    "High-protein vegetarian options",
    "No restrictive diets or calorie counting",
    "Designed to preserve lean muscle"
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
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  }

  return (
    <section className="py-24 relative overflow-hidden bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Images */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D46E53]/10 to-transparent rounded-[2.5rem] -rotate-3 scale-105"></div>
            
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="glass-card p-3 animate-float ring-1 ring-[#D46E53]/20 rounded-3xl shadow-xl"
              >
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Image 
                    src="/images/meal_indian.png" 
                    alt="Healthy Indian meal" 
                    width={400} 
                    height={500} 
                    className="w-full h-64 object-cover"
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="glass-card p-3 animate-float ring-1 ring-[#D46E53]/20 rounded-3xl mt-12 shadow-xl" 
                style={{ animationDelay: '1s' }}
              >
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Image 
                    src="/images/nutrition_indian.png" 
                    alt="Healthy nutrition lifestyle" 
                    width={400} 
                    height={500} 
                    className="w-full h-64 object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-sora text-[#0F172A] mb-6">
              Eat What You <span className="teal-gradient-text">Love</span>
            </h2>
            <p className="text-[#475569] text-lg mb-10 leading-relaxed">
              We don't believe in starvation. Your dedicated dietitian will build a protocol that incorporates your favorite foods while optimizing for metabolic health and fat loss.
            </p>

            <motion.ul 
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-4 mb-10"
            >
              {benefits.map((benefit, idx) => (
                <motion.li key={idx} variants={itemVariants} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#D46E53]" />
                  <span className="text-[#0F172A] font-medium">{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#A84A33] to-[#D46E53] text-white font-semibold rounded-full px-8 py-4 shadow-lg flex items-center gap-2"
            >
              Explore Nutrition Plans
            </motion.button>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

