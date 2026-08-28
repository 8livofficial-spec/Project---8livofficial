'use client'

import React, { useState, useRef } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

gsap.registerPlugin(ScrollTrigger)

const faqs = [
  {
    question: 'What is 8Liv?',
    answer:
      '8Liv is an online metabolic health platform that connects you with board-certified doctors, clinical dietitians, and a dedicated care team — all from home. We combine doctor-led consultations, personalized nutrition guidance, and ongoing clinical monitoring to support your long-term metabolic health.',
  },
  {
    question: 'How does the health assessment work?',
    answer:
      'Our confidential 3-minute health assessment gathers information about your health history, lifestyle, goals, and metabolic background. This helps our clinical team review your eligibility and understand your needs before your first doctor consultation. There is no commitment required to complete the assessment.',
  },
  {
    question: 'Who is the 8Liv program for?',
    answer:
      'The 8Liv program is designed for adults who want clinically supported metabolic health care — including those working on weight management, energy regulation, blood sugar balance, and sustainable lifestyle change. A physician reviews each individual case to confirm appropriateness before recommending any treatment pathway.',
  },
  {
    question: 'How does clinical care work on 8Liv?',
    answer:
      'After your assessment, you are scheduled for a 1-on-1 video consultation with a licensed physician who reviews your health profile, discusses your goals, and determines whether a treatment plan is appropriate. Your care plan may include nutrition guidance, lifestyle recommendations, and — only when medically indicated — prescription medication. Ongoing follow-ups are scheduled to monitor your progress.',
  },
  {
    question: 'What role can GLP-1 medication play?',
    answer:
      'GLP-1 receptor agonists are prescription medications that work by regulating hunger signals and metabolic processes. They may be considered as part of a medically supervised care plan when a physician determines they are clinically appropriate based on your BMI, health history, and safety criteria. Medication is never the sole component of care — it is integrated with nutrition and lifestyle support throughout.',
  },
  {
    question: 'How does nutrition support work?',
    answer:
      'Our clinical dietitians design personalised nutrition guidance adapted to your food culture, household routine, and health targets. Plans incorporate Indian dietary preferences and do not rely on punitive calorie restriction or generic templates. Your dietitian is accessible for regular check-ins and adjustments.',
  },
  {
    question: 'Is my health information kept private?',
    answer:
      'Yes. Your consultation notes, health history, and personal data are protected with strict medical-grade data practices. We do not share your information with third parties outside your care team without your explicit consent.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Start by completing our confidential health assessment at 8liv.in/assessment. It takes approximately 3 minutes. Once submitted, our team reviews your responses and schedules your initial physician consultation. Everything happens online — no clinic visits required.',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!bodyRef.current) return
    if (!open) {
      // Open
      bodyRef.current.style.height = '0px'
      bodyRef.current.style.opacity = '0'
      bodyRef.current.style.overflow = 'hidden'
      bodyRef.current.style.display = 'block'
      const targetHeight = bodyRef.current.scrollHeight
      gsap.to(bodyRef.current, {
        height: targetHeight,
        opacity: 1,
        duration: 0.42,
        ease: 'power3.out',
        onComplete: () => {
          if (bodyRef.current) {
            bodyRef.current.style.height = 'auto'
            bodyRef.current.style.overflow = 'visible'
          }
        },
      })
    } else {
      // Close
      const currentHeight = bodyRef.current.scrollHeight
      bodyRef.current.style.height = `${currentHeight}px`
      bodyRef.current.style.overflow = 'hidden'
      gsap.to(bodyRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.32,
        ease: 'power2.in',
      })
    }
    setOpen(!open)
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        open
          ? 'bg-white border-[#D46E53]/30 shadow-md shadow-[#D46E53]/5'
          : 'bg-[#F9F6F0]/60 border-[#D46E53]/12 hover:bg-white hover:border-[#D46E53]/25 hover:shadow-sm'
      }`}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
        aria-expanded={open}
        aria-controls={`faq-answer-${index}`}
        id={`faq-question-${index}`}
      >
        <span
          className={`font-sora text-base font-semibold leading-snug transition-colors duration-200 ${
            open ? 'text-[#A84A33]' : 'text-[#0F172A]'
          }`}
        >
          {faq.question}
        </span>
        <span
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            open
              ? 'bg-[#D46E53]/15 text-[#A84A33] rotate-180'
              : 'bg-white border border-[#D46E53]/20 text-[#64748B]'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      <div
        ref={bodyRef}
        id={`faq-answer-${index}`}
        role="region"
        aria-labelledby={`faq-question-${index}`}
        style={{ display: open ? 'block' : 'none', height: open ? 'auto' : '0px' }}
      >
        <div className="px-6 pb-6 pt-1">
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FAQ() {
  const headerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const sectionRef = useScrollAnimation<HTMLElement>((section) => {
    if (!headerRef.current || !listRef.current) return

    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true,
        },
      }
    )

    gsap.fromTo(
      listRef.current.children,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: listRef.current,
          start: 'top 80%',
          once: true,
        },
      }
    )
  })

  return (
    <section
      ref={sectionRef}
      id="faq"
      className="py-20 sm:py-28 relative overflow-hidden bg-[#F9F6F0]"
    >
      {/* Ambient light */}
      <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[400px] bg-[#D46E53]/6 rounded-full blur-[140px] -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div ref={headerRef} className="text-center mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D46E53]/20 mb-4 shadow-sm">
            <HelpCircle className="w-3.5 h-3.5 text-[#D46E53]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A84A33] font-sora">
              Common Questions
            </span>
          </div>

          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight mb-5">
            Answers to help you{' '}
            <span className="teal-gradient-text">get started.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto">
            If you have a question that isn&apos;t answered here, email us at{' '}
            <a
              href="mailto:8livofficial@gmail.com"
              className="text-[#A84A33] font-medium hover:underline"
            >
              8livofficial@gmail.com
            </a>
            .
          </p>
        </div>

        {/* FAQ List */}
        <div ref={listRef} className="space-y-3">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} faq={faq} index={idx} />
          ))}
        </div>

      </div>
    </section>
  )
}
