'use client'

import React from 'react'
import GradientCarousel, { CarouselItem } from '@/components/ui/gradient-carousel'
import { Sparkles, ShieldCheck, HeartPulse, Stethoscope, Apple } from 'lucide-react'

const CARE_FEATURES: CarouselItem[] = [
  {
    id: 1,
    badge: 'Doctor-Led Care',
    title: 'Personalized GLP-1 & Metabolic Care',
    subtitle: 'Evidence-based protocols tailored to your unique metabolic profile.',
    description: 'Direct consultations with licensed physicians, precision dosing, and regular health assessments.',
    tag: 'Clinical Care',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 2,
    badge: 'Nutrition Guidance',
    title: 'Tailored Clinical Meal Plans',
    subtitle: 'Balanced nutrition built around your tastes and lifestyle.',
    description: 'One-on-one sessions with certified dietitians to ensure optimal macros, gut health, and energy levels.',
    tag: 'Nutrition',
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 3,
    badge: 'Smart Tracking',
    title: 'Biometric & Health Insights',
    subtitle: 'Continuous monitoring of body composition and key biomarkers.',
    description: 'Track your weight trend, glycemic index, and vital signs in real time with our unified patient portal.',
    tag: 'Technology',
    image: 'https://images.unsplash.com/photo-1510519138161-584459eb1b37?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 4,
    badge: '1-on-1 Support',
    title: 'Dedicated Provider Team',
    subtitle: 'Seamless communication with your doctors and coaches.',
    description: 'In-app chat, monthly check-ins, and proactive adjustments to your personalized wellness journey.',
    tag: 'Coaching',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 5,
    badge: 'Proven Outcomes',
    title: 'Sustainable Long-Term Results',
    subtitle: 'Empowering you to live healthier, longer, and with full vitality.',
    description: 'Over 85% of members maintain healthy weight loss and improved cardio-metabolic health after 12 months.',
    tag: 'Results',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop'
  }
]

export default function GradientCarouselShowcase() {
  return (
    <section className="relative py-16 md:py-24 bg-slate-950 text-white overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Care Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Comprehensive <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Weight & Wellness Care</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base md:text-lg leading-relaxed">
            Explore how 8liv combines doctor-led medical protocols, personalized nutrition, and smart biometrics in one seamless 3D carousel.
          </p>
        </div>

        {/* 3D Gradient Carousel */}
        <GradientCarousel
          items={CARE_FEATURES}
          autoPlay={true}
          autoPlayInterval={4500}
          cardWidth={340}
          cardHeight={460}
          className="shadow-2xl border border-white/10"
        />

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Medical Oversight</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Licensed medical doctors prescribe and oversee all treatments safely.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Customized Nutrition</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Registered dietitians craft meals suited to your taste and metabolic targets.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Continuous Vital Tracking</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time portal updates track your progress every single week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
