'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, RefreshCw, PhoneOff } from 'lucide-react'
import dynamic from 'next/dynamic'

const StreamConsultationCall = dynamic(
  () => import('@/components/video/StreamConsultationCall'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] items-center justify-center text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-[#C4622D]" />
      </div>
    ),
  }
)

function VideoRoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('id') || ''

  if (!appointmentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D101C] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-300" />
          <h1 className="mb-2 text-lg font-bold">Missing consultation ID</h1>
          <p className="text-sm text-white/70">Please return to your consultations and join again.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0B0F19] text-white select-none">
      <header className="bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 py-3 flex items-center justify-between text-white shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-logo-official.png"
              alt="8Liv Health"
              className="h-7 w-auto object-contain brightness-105"
            />
          </div>
          <div className="h-5 w-px bg-white/15" />
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">Clinical Consultation</h3>
        </div>

        <button
          onClick={() => router.back()}
          className="bg-white/10 hover:bg-rose-600/90 text-slate-200 hover:text-white font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs transition-all border border-white/10 hover:border-rose-500/30 cursor-pointer shadow-xs"
          title="Leave Consultation"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>End Call</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 relative bg-[#0B0F19]">
        <StreamConsultationCall appointmentId={appointmentId} onLeave={() => router.back()} />
      </div>
    </main>
  )
}

export default function VideoRoomPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#0D101C] text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-[#C4622D]" />
      </main>
    }>
      <VideoRoomContent />
    </Suspense>
  )
}
