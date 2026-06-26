'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, RefreshCw } from 'lucide-react'
import StreamConsultationCall from '@/components/video/StreamConsultationCall'

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
    <main className="flex min-h-screen flex-col bg-[#0D101C] text-white">
      <div className="border-b border-white/10 bg-[#1A1F36] px-4 py-3">
        <p className="text-sm font-black uppercase tracking-wider text-[#C4622D]">8Liv Secure Video</p>
      </div>
      <div className="min-h-0 flex-1">
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
