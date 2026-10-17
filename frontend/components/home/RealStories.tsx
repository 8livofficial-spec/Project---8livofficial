import React from 'react'
import Link from 'next/link'
import { ArrowRight, Activity, HeartPulse, Sparkles, CheckCircle2 } from 'lucide-react'
import KineticText from '@/components/ui/KineticText'
import ScrollRevealBox from '@/components/ui/ScrollRevealBox'

const marqueeItems = [
  {
    type: 'metric',
    highlight: '15% - 22%',
    title: 'Average Body Weight Loss',
    detail: 'Clinically validated GLP-1 therapy',
    icon: <Activity className="w-5 h-5 text-[#00A884]" />,
  },
  {
    type: 'photo',
    image: '/images/burnex/review_1.jpg',
    caption: 'Energy & Confidence Restored',
  },
  {
    type: 'metric',
    highlight: '94%',
    title: 'Patient Retention at 6 Months',
    detail: 'Doctor, Dietitian & Gym Coach support',
    icon: <HeartPulse className="w-5 h-5 text-[#00A884]" />,
  },
  {
    type: 'photo',
    image: '/images/burnex/hero_model_center.jpg',
    caption: 'Muscle Preservation & Fitness',
  },
  {
    type: 'metric',
    highlight: 'Zero Rebound',
    title: 'Metabolic Set-Point Reset',
    detail: 'Safe hormonal calibration',
    icon: <Sparkles className="w-5 h-5 text-[#00A884]" />,
  },
  {
    type: 'photo',
    image: '/images/burnex/review_3.jpg',
    caption: 'Vitality in Everyday Life',
  },
  {
    type: 'metric',
    highlight: '100% Indian Diet',
    title: 'Adaptive Home Nutrition',
    detail: 'Roti, dal, sabzi & regional meals',
    icon: <CheckCircle2 className="w-5 h-5 text-[#00A884]" />,
  },
  {
    type: 'photo',
    image: '/images/burnex/review_4.jpg',
    caption: 'Sustainable Daily Routines',
  },
]

export default function RealStories() {
  return (
    <section
      id="testimonials"
      aria-label="Transformations & Clinical Milestones"
      className="py-20 sm:py-24 lg:py-28 bg-[#FAFBF9] border-b border-slate-200/80 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        
        {/* Centered Header */}
        <div className="text-center max-w-2xl mx-auto">
          <KineticText
            as="h2"
            className="font-sans text-[28px] xs:text-[34px] sm:text-4xl lg:text-5xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-5"
          >
            Real Transformations, Backed by Science
          </KineticText>
          <ScrollRevealBox variant="fade-up" delay={0.2}>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-3.5 sm:py-4 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>See Treatment Options</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </ScrollRevealBox>
        </div>

      </div>

      {/* ========================================================= */}
      {/* INFINITE CAROUSEL MOVEMENT                                */}
      {/* ========================================================= */}
      <div className="relative w-full overflow-hidden py-4 mb-8">
        {/* Soft edge gradient fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#FAFBF9] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#FAFBF9] to-transparent z-10" />

        <div className="infinite-marquee-track flex gap-6">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <div
              key={idx}
              className="w-[280px] sm:w-[320px] rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between p-5 shrink-0"
            >
              {item.type === 'photo' ? (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.caption || 'Transformation'}
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs sm:text-sm font-sans font-bold drop-shadow-sm">
                    {item.caption}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-between py-2">
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <span className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] block mb-1">
                      {item.highlight}
                    </span>
                    <h4 className="font-sans font-bold text-sm sm:text-base text-slate-800 mb-1">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-sans mt-3 pt-3 border-t border-slate-100">
                    {item.detail}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* FULL-WIDTH CINEMATIC OUTDOOR BANNER (CLIP-INSET REVEAL)   */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <ScrollRevealBox variant="clip-inset" delay={0.15} duration={0.9} className="relative rounded-[2.5rem] overflow-hidden aspect-[16/8] sm:aspect-[16/7] shadow-2xl flex items-center justify-center text-center p-6 sm:p-10 group">
          <img
            src="/images/burnex/couple_banner.jpg"
            alt="Active couple smiling outdoors"
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.4] saturate-[1.2] group-hover:scale-103 transition-transform duration-700 ease-out"
          />
          <div className="relative z-10 max-w-2xl mx-auto text-white">
            <h3 className="font-sans text-[26px] xs:text-[32px] sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4 drop-shadow-md">
              Transform Your Body,<br />
              Transform Your Life
            </h3>
            <p className="font-sans text-sm sm:text-base text-slate-100 mb-8 max-w-lg mx-auto">
              Join thousands who&apos;ve achieved their weight loss goals with our physician-guided personalized plans
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-sm sm:text-base shadow-xl hover:shadow-[0_0_30px_rgba(0,168,132,0.6)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Free Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </ScrollRevealBox>
      </div>

    </section>
  )
}

