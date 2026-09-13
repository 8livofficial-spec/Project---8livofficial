import type { Metadata } from 'next'
import UnifiedAssessmentFunnel from '@/components/assessment/UnifiedAssessmentFunnel'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Metabolic Assessment | 8Liv',
  description: 'Understand your body balance, healthy weight ranges, and waist measurements with personalized medical insights.',
}

export default function MetabolicAssessmentPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-[460px] md:max-w-[760px] lg:max-w-[980px] mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to 8Liv
        </Link>
        <span className="text-xs text-slate-400 font-medium">8Liv Clinical Telehealth</span>
      </div>

      <UnifiedAssessmentFunnel />
    </main>
  )
}
