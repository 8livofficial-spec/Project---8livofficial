'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotEligiblePage() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center px-6 py-20">
      <div className="max-w-xl rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="mb-4 font-sora text-3xl font-bold text-[#0F172A]">Assessment completed</h1>
        <p className="mb-8 text-[#475569]">
          Based on your responses, our medical team cannot safely recommend this program at this time.
          You do not need to retake the assessment unless you explicitly choose to start over.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-[#0F172A] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1E293B]"
          >
            Return home
          </Link>
          <Link
            href="/assessment?retake=true"
            className="rounded-full border border-[#D46E53]/20 px-6 py-3 font-semibold text-[#D46E53] transition-colors hover:bg-[#D46E53]/5"
          >
            Retake assessment
          </Link>
        </div>
      </div>
    </div>
  )
}
