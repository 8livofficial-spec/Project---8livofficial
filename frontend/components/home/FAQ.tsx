'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { HelpCircle, ArrowRight, CheckCircle2, MessageCircleQuestion, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import AnimatedList from '@/components/ui/AnimatedList'
import ScrollReveal from '@/components/ui/ScrollReveal'

const faqs = [
  {
    question: 'What is 8Liv and how does it work?',
    answer:
      '8Liv is an online medical metabolic health clinic. We connect you with board-certified physicians, clinical dietitians, and dedicated health coaches—all from home. We combine 1-on-1 doctor video consultations, personalized Indian meal plans, and ongoing clinical monitoring with doorstep delivery of medications if prescribed.',
  },
  {
    question: 'How does the 3-minute health assessment work?',
    answer:
      'Our confidential online assessment gathers basic information about your health history, previous weight attempts, routine, and lifestyle. This helps our medical team evaluate whether you qualify for metabolic treatment before your doctor consultation. Completing the assessment is 100% confidential with zero obligation.',
  },
  {
    question: 'Who is the 8Liv program designed for?',
    answer:
      'The 8Liv program is designed for adults struggling with stubborn weight, sluggish metabolism, pre-diabetes, insulin resistance, or PCOS who want evidence-based, doctor-supervised medical care rather than unsustainable crash diets. A licensed doctor reviews every patient individually before recommending any treatment.',
  },
  {
    question: 'What role do GLP-1 medications play in weight loss?',
    answer:
      'GLP-1 receptor agonists are modern, clinically approved prescription medications that regulate natural hunger hormones and quiet continuous food noise. When clinically appropriate, a doctor may prescribe them to help reset your metabolic set-point. Medication is always paired with high-protein nutrition and movement for long-term health.',
  },
  {
    question: 'How does Indian meal planning work? Do I have to starve?',
    answer:
      'Never. Our registered clinical dietitians adapt your meal blueprint around authentic Indian home cooking—incorporating paneer, dal, household spices, and family dinners. We do not rely on punitive calorie restriction or generic Western meal templates.',
  },
  {
    question: 'Will I regain the weight once I stop treatment?',
    answer:
      'Our clinical focus is preventing the rebound effect by locking in a healthy metabolic set-point. Through muscle-preserving movement guidance from your personal fitness coach and gradual dietary stabilization, your body adapts to maintain its new, lower weight permanently.',
  },
  {
    question: 'How are medications delivered to my home?',
    answer:
      'Prescriptions approved by your 8liv doctor are fulfilled by our verified partner licensed pharmacies and shipped in discreet, temperature-controlled cold-chain packaging straight to your doorstep across India.',
  },
  {
    question: 'Is my personal and medical data kept private?',
    answer:
      'Yes, 100%. All consultations, medical notes, and personal data are strictly confidential and protected with enterprise-grade encryption. We never share your health records with third parties without your explicit permission.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Start by completing the free 3-minute health assessment at 8liv.in/assessment. Our medical team will review your profile and match you with a doctor for your video consultation. Everything happens online—no waiting rooms or clinic commutes.',
  },
]

export default function FAQ() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mobileExpandedIndex, setMobileExpandedIndex] = useState<number | null>(0)
  const activeFaq = faqs[selectedIndex] ?? faqs[0]

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setMobileExpandedIndex(prev => (prev === index ? null : index))
  }

  return (
    <section id="faq" className="py-14 sm:py-20 lg:py-24 bg-[#FAFAF9] text-slate-900 border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#0F766E] text-xs font-semibold uppercase tracking-wider mb-3 font-sora">
            <HelpCircle className="w-3.5 h-3.5 text-[#00A884]" />
            <span>COMMON QUESTIONS</span>
          </div>

          <ScrollReveal
            baseOpacity={0}
            enableBlur={true}
            baseRotation={3}
            blurStrength={6}
            containerClassName="max-w-3xl mx-auto mb-3"
            textClassName="font-sora text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight text-center"
          >
            Everything you need to know about 8liv clinical care.
          </ScrollReveal>

          <p className="text-xs sm:text-base text-slate-600 font-light max-w-xl mx-auto leading-relaxed">
            Have questions about doctor consultations, GLP-1 medications, diet plans, or safety? Select any question or use arrow keys to browse.
          </p>
        </div>

        {/* Interactive Master-Detail FAQ Layout using AnimatedList */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* AnimatedList Column */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center justify-between px-1 mb-2 text-xs text-slate-500 font-medium">
              <span>Frequently Asked Questions</span>
              <span className="hidden lg:inline-block text-[11px] text-[#00A884] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-sora">
                Use ↑ / ↓ arrow keys
              </span>
            </div>

            <AnimatedList
              items={faqs.map(f => f.question)}
              selectedIndex={selectedIndex}
              onItemSelect={(_item, index) => handleSelect(index)}
              showGradients={true}
              gradientColor="#FAFAF9"
              enableArrowNavigation={true}
              displayScrollbar={true}
              renderItem={(question, index, isSelected) => {
                const isMobileOpen = mobileExpandedIndex === index

                return (
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 text-left cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? 'bg-white border-[#00A884] shadow-md ring-2 ring-[#00A884]/20'
                        : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md transition-colors ${
                            isSelected
                              ? 'bg-[#00A884] text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <p
                          className={`font-sora text-xs sm:text-sm font-semibold leading-snug m-0 transition-colors ${
                            isSelected ? 'text-[#0F766E]' : 'text-slate-900'
                          }`}
                        >
                          {question}
                        </p>
                      </div>

                      {/* Mobile Chevron toggle indicator */}
                      <span
                        className={`lg:hidden shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
                          isMobileOpen ? 'rotate-180 text-[#00A884] bg-emerald-50' : 'text-slate-400'
                        }`}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </div>

                    {/* Smooth mobile expandable accordion answer */}
                    <AnimatePresence initial={false}>
                      {isMobileOpen && (
                        <motion.div
                          key="mobile-answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden lg:hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-light leading-relaxed">
                            {faqs[index].answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }}
            />
          </div>

          {/* Dedicated Answer Showcase Card (Desktop) */}
          <div className="hidden lg:block lg:col-span-6 sticky top-24">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00A884] font-sora bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Question {String(selectedIndex + 1).padStart(2, '0')} of {String(faqs.length).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 size={14} className="text-[#00A884]" />
                  <span>Clinical Team Verified</span>
                </div>
              </div>

              {/* Ultra smooth cross-fade when question changes */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <h3 className="font-sora text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-snug">
                    {activeFaq.question}
                  </h3>

                  <div className="text-sm sm:text-base text-slate-600 font-light leading-relaxed mb-8">
                    {activeFaq.answer}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MessageCircleQuestion size={16} className="text-[#00A884]" />
                  <span>Need personalized advice?</span>
                </div>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00A884] hover:bg-[#0F766E] text-white font-sora font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Check Eligibility</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

