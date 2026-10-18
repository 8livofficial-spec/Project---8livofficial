'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export default function NotEligiblePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/consultation-payment')
  }, [router])

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center px-6 py-20">
      <div className="max-w-xl rounded-[2rem] border border-emerald-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#00A884]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mb-4 font-sora text-3xl font-bold text-[#0F172A]">Assessment submitted</h1>
        <p className="mb-8 text-[#475569]">
          Your clinical health intake has been recorded. Proceed to book your licensed physician consultation.
        </p>
        <div className="flex justify-center">
          <Link
            href="/consultation-payment"
            className="rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] px-8 py-3.5 font-bold text-white shadow-md transition-all hover:shadow-lg flex items-center gap-2"
          >
            <span>Proceed to Doctor Consultation</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
