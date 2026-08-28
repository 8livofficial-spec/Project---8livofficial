'use client'

import React from 'react'
import ScrollDissolveReveal, { DissolveStageItem } from '@/components/ui/scroll-dissolve-reveal'

const stages: DissolveStageItem[] = [
  {
    step: '01',
    badge: 'Understand Health Profile',
    title: 'Understand your metabolic baseline',
    description:
      'Complete a confidential metabolic intake covering your health history, previous weight attempts, routine, and biomarkers to identify eligibility and risk factors.',
    highlights: [
      'Comprehensive medical history screening',
      'Initial metabolic biology check',
      'Clinical safety verification',
    ],
    image: '/images/hero_indian.png',
    cardTag: 'Intake Completed',
  },
  {
    step: '02',
    badge: 'Consult Care Team',
    title: 'Meet your dedicated physician & care team',
    description:
      'Connect 1-on-1 with a board-certified physician over high-definition video to discuss your metabolic barriers, medical safety, and long-term health targets.',
    highlights: [
      '1-on-1 physician consultation',
      'Metabolic barrier evaluation',
      'Registered dietitian review',
    ],
    image: '/images/hero_wellness.png',
    cardTag: 'Doctor Consultation',
  },
  {
    step: '03',
    badge: 'Personalized Protocol',
    title: 'Tailored care & GLP-1 protocol',
    description:
      'Receive a custom care pathway combining personalized Indian meal guidance, physical activity guidelines, and GLP-1 medication if clinically indicated.',
    highlights: [
      'High-protein Indian meal pacing',
      'Discreet doorstep cold delivery',
      'Evidence-based prescriptions',
    ],
    image: '/images/meal_prep.png',
    cardTag: 'Custom Protocol Active',
  },
  {
    step: '04',
    badge: 'Continuous Governance',
    title: 'Ongoing progress & biomarker monitoring',
    description:
      'Track weight, energy levels, and habit consistency in the 8Liv portal. Your clinician and dietitian review your progress regularly and adjust your plan as your body adapts.',
    highlights: [
      'Adaptive titration monitoring',
      'Direct clinician chat support',
      'Milestone maintenance plans',
    ],
    image: '/images/outcome_1.png',
    cardTag: 'Ongoing Governance',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-white">
      <ScrollDissolveReveal
        items={stages}
        eyebrow="YOUR JOURNEY"
        mainTitle="Your journey,"
        mainTitleGradient="step by step."
        subtitle="A personalized path built around your body, your goals, and your progress."
      />
    </section>
  )
}

