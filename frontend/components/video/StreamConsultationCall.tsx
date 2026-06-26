'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-sdk'
import '@stream-io/video-react-sdk/dist/css/styles.css'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type VideoTokenResponse = {
  apiKey: string
  userId: string
  userName: string
  userToken: string
  callId: string
  callType: string
  appointmentId: string
}

type Props = {
  appointmentId: string
  onLeave: () => void
}

export default function StreamConsultationCall({ appointmentId, onLeave }: Props) {
  const [tokenData, setTokenData] = useState<VideoTokenResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadToken() {
      setLoading(true)
      setError('')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Your session expired. Please sign in again.')
        const res = await fetch('/api/video/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ appointmentId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to prepare secure video session.')
        if (active) setTokenData(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to prepare secure video session.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadToken()
    return () => {
      active = false
    }
  }, [appointmentId])

  const client = useMemo(() => {
    if (!tokenData) return null
    return new StreamVideoClient({
      apiKey: tokenData.apiKey,
      user: {
        id: tokenData.userId,
        name: tokenData.userName,
      },
      token: tokenData.userToken,
    })
  }, [tokenData])

  const call = useMemo(() => {
    if (!client || !tokenData) return null
    return client.call(tokenData.callType, tokenData.callId)
  }, [client, tokenData])

  useEffect(() => {
    if (!call) return
    let active = true
    let joined = false
    const activeCall = call

    async function joinCall() {
      try {
        await activeCall.join({ create: true })
        joined = true
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to join the video session.')
      }
    }

    void joinCall()
    return () => {
      active = false
      if (!joined) return
      void activeCall.leave().catch((err) => {
        const message = err instanceof Error ? err.message : String(err || '')
        if (!message.toLowerCase().includes('already been left')) {
          console.warn('Failed to leave Stream call cleanly:', err)
        }
      })
    }
  }, [call])

  useEffect(() => {
    return () => {
      void client?.disconnectUser()
    }
  }, [client])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#C4622D]" />
          <p className="text-sm font-semibold">Preparing secure Stream video session...</p>
        </div>
      </div>
    )
  }

  if (error || !client || !call) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-300" />
          <h3 className="mb-2 font-bold">Unable to join consultation</h3>
          <p className="text-sm text-white/80">{error || 'Video session is unavailable.'}</p>
        </div>
      </div>
    )
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="str-video__call-layout flex h-full flex-col bg-[#111422]">
          <div className="min-h-0 flex-1">
            <SpeakerLayout />
          </div>
          <div className="border-t border-white/10 bg-black/40 p-3">
            <CallControls onLeave={onLeave} />
          </div>
        </div>
      </StreamCall>
    </StreamVideo>
  )
}
