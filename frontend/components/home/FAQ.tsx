'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, MessageCircleQuestion, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import AnimatedList from '@/components/ui/AnimatedList'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

const faqs = [
  {
    question: 'What is 8Liv and how does it work?',
    answer:
      '8Liv is a digital healthcare platform connecting you with licensed physicians, clinical dietitians, and dedicated fitness coaches through telehealth. We combine 1-on-1 doctor video consultations, personalized Indian meal plans, ongoing metabolic lab monitoring, and certified digital prescriptions when clinically appropriate.',
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
    question: 'How are prescriptions and medications handled?',
    answer:
      'When clinically appropriate, your licensed 8Liv physician issues an authenticated digital prescription. You can conveniently fulfill your prescription at any registered or licensed pharmacy of your choice across India.',
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
    <section id="faq" className="py-16 sm:py-20 lg:py-28 bg-[#FAFBF9] text-slate-900 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Kinetic Typography */}
        <div className="text-center mb-12 sm:mb-16">
          <KineticText
            as="h2"
            className="font-sans text-[26px] xs:text-[32px] sm:text-4xl md:text-5xl font-extrabold text-[#0B2616] tracking-tight leading-tight text-center max-w-3xl mx-auto mb-4"
          >
            Everything you need to know about 8Liv clinical care
          </KineticText>

          <ScrollRevealBox variant="fade-up" delay={0.15}>
            <p className="text-base sm:text-lg text-slate-600 font-normal max-w-xl mx-auto leading-relaxed">
              Have questions about doctor consultations, GLP-1 medications, Indian diet plans, or safety? Select any question to learn more.
            </p>
          </ScrollRevealBox>
        </div>

        {/* Interactive Master-Detail FAQ Layout using AnimatedList */}
        <ScrollRevealBox variant="fade-up" delay={0.25} className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
            {/* AnimatedList Column */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between px-1 mb-2 text-xs sm:text-sm text-slate-600 font-medium">
                <span>Frequently Asked Questions</span>
                <span className="hidden lg:inline-block text-xs text-[#065F46] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-sora font-medium">
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
                      className={`p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? 'bg-white border-[#00A884] shadow-md ring-2 ring-[#00A884]/20'
                          : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs sm:text-sm font-mono font-bold px-2.5 py-0.5 rounded-md transition-colors ${
                              isSelected
                                ? 'bg-[#0F766E] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <p
                            className={`font-sora text-sm sm:text-base font-semibold leading-snug m-0 transition-colors ${
                              isSelected ? 'text-[#0F766E]' : 'text-slate-900'
                            }`}
                          >
                            {question}
                          </p>
                        </div>

                        {/* Mobile Chevron toggle indicator */}
                        <span
                          className={`lg:hidden shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${
                            isMobileOpen ? 'rotate-180 text-[#0F766E] bg-emerald-50' : 'text-slate-500'
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
                            <div className="mt-3 pt-3 border-t border-slate-100 text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-[#065F46] font-sora bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Question {String(selectedIndex + 1).padStart(2, '0')} of {String(faqs.length).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <CheckCircle2 size={14} className="text-[#0F766E]" />
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
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <MessageCircleQuestion size={16} className="text-[#0F766E]" />
                    <span>Need personalized advice?</span>
                  </div>
                  <Link
                    href="/assessment"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F766E] hover:bg-[#0D655E] text-white font-sora font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <span>Check Eligibility</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ScrollRevealBox>
      </div>
    </section>
  )
}

