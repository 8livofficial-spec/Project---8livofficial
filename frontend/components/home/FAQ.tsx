'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import AnimatedList from '@/components/ui/AnimatedList'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

const faqs = [
  {
    question: 'What is 8LIV and how does it work?',
    answer:
      '8Liv is a doctor-led telehealth platform connecting you with registered physicians, clinical dietitians, and dedicated fitness coaches. Following an online clinical assessment, you meet 1-on-1 with a physician via video consultation. Your doctor designs a medical strategy specific to your health history, prescribes treatments if clinically indicated, and pairs your care with Indian metabolic meal planning and progressive fitness coaching.',
  },
  {
    question: 'Who is the programme designed for?',
    answer:
      'The 8Liv programme is designed for adults struggling with stubborn weight, sluggish metabolism, pre-diabetes, insulin resistance, or PCOS who want evidence-based, doctor-supervised medical care rather than crash diets. A licensed doctor reviews every patient individually before recommending any treatment protocol.',
  },
  {
    question: 'Will I be given a prescription?',
    answer:
      'Not automatically. Your doctor decides after a full consultation whether any medicine is appropriate, and may decide it is not. If a medicine is prescribed, you receive a signed e-prescription from the physician. We don’t sell any medicines, you have to buy it from a registered pharmacy. And we don’t charge for the medicines.',
  },
  {
    question: 'How does Indian meal planning work?',
    answer:
      'Our registered clinical dietitians adapt your meal blueprint around authentic Indian home cooking—incorporating roti, dal, sabzi, paneer, regional dishes, and family dinners. We focus on continuous metabolic satiety, practical protein targets, and blood sugar stability with zero starvation.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Every journey begins with an initial clinical doctor consultation for ₹350. Following evaluation, you can choose from structured care plans: the 1-Month Trial Plan at ₹1,470 (including 3 consultations: doctor, dietitian, and fitness coach), 3-Month Metabolic Reset at ₹4,900, or 5-Month Transformation at ₹8,225 (+ 18% statutory GST at checkout). 8Liv does not sell or mark up medicines—you purchase prescribed medications independently at your preferred licensed pharmacy.',
  },
  {
    question: 'What happens after treatment?',
    answer:
      'After completing your active treatment duration, you transition into our structured metabolic maintenance and weight regain defense protocol. Your clinical dietitian and coach help you sustain healthy metabolic setpoints, preserve lean muscle, and transition off treatments safely under physician supervision.',
  },
  {
    question: 'How is my health data protected?',
    answer:
      'Your medical records and personal data are strictly protected under the Digital Personal Data Protection Act (DPDPA), 2023 and Indian Telemedicine Practice Guidelines. Data is encrypted in transit and at rest. We never sell your data or share it with third-party pharmacies. Access is strictly restricted to your assigned care team of treating doctors, dietitians, and coaches.',
  },
  {
    question: 'How do refunds work?',
    answer:
      'A full refund is automatically issued if a consultation is cancelled by 8Liv or the physician. Free rescheduling is permitted up to 72 hours before your scheduled appointment. Once a clinical consultation has taken place or customized nutrition blueprints have been delivered, fees are non-refundable. Approved refunds are credited back to your original payment method within 3 working days.',
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
              <div className="px-1 mb-2 text-xs sm:text-sm text-slate-600 font-medium">
                <span>Frequently Asked Questions</span>
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
                          ? 'bg-[#EAF7F2] border-2 border-[#00A884] shadow-xs'
                          : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p
                            className={`font-sans text-sm sm:text-base font-semibold leading-snug m-0 transition-colors ${
                              isSelected ? 'text-[#0B2616] font-bold' : 'text-slate-800'
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
                            <div className="mt-3.5 pt-3.5 border-t border-slate-150 flex flex-col gap-3">
                              <p className="text-sm sm:text-base text-slate-700 font-normal leading-relaxed">
                                {faqs[index].answer}
                              </p>
                              <div className="pt-2 flex flex-col gap-2">
                                <Link
                                  href="/assessment"
                                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm shadow-sm transition-all"
                                >
                                  Book a doctor consultation
                                </Link>
                                <span className="text-xs text-slate-500 italic">
                                  Your doctor decides whether treatment is right for you.
                                </span>
                              </div>
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
              <div className="bg-[#F3F8F5] rounded-3xl p-8 sm:p-9 border border-[#DCE8E1] shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                {/* Ultra smooth cross-fade when question changes */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex flex-col justify-between h-full"
                  >
                    <div>
                      {/* Step index badge: QUESTION 0X OF 08 */}
                      <span className="inline-block text-[#00A884] font-bold text-xs tracking-wider uppercase mb-3">
                        QUESTION {String(selectedIndex + 1).padStart(2, '0')} OF {String(faqs.length).padStart(2, '0')}
                      </span>

                      <h3 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] mb-5 leading-tight tracking-tight">
                        {activeFaq.question}
                      </h3>

                      <p className="text-base sm:text-[17px] text-slate-700 font-normal leading-relaxed">
                        {activeFaq.answer}
                      </p>
                    </div>

                    {/* Book a doctor consultation button + disclaimer */}
                    <div className="pt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <Link
                        href="/assessment"
                        className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        Book a doctor consultation
                      </Link>
                      <span className="text-xs sm:text-sm text-slate-500 italic">
                        Your doctor decides whether treatment is right for you.
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </ScrollRevealBox>
      </div>
    </section>
  )
}

