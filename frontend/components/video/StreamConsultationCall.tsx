'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import '@stream-io/video-react-sdk/dist/css/styles.css'
import {
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
} from 'lucide-react'
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

function CustomCallControls({ onLeave }: { onLeave: () => void }) {
  const { useMicrophoneState, useCameraState } = useCallStateHooks()
  const { microphone, isMute: isMicMuted } = useMicrophoneState()
  const { camera, isMute: isCamMuted } = useCameraState()

  const toggleMic = async () => {
    try {
      await microphone.toggle()
    } catch (e) {
      console.warn('Could not toggle mic:', e)
    }
  }

  const toggleCam = async () => {
    try {
      await camera.toggle()
    } catch (e) {
      console.warn('Could not toggle camera:', e)
    }
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 py-2.5 rounded-2xl bg-[#14192B]/95 border border-white/15 shadow-2xl backdrop-blur-md">
      {/* Microphone Toggle Button */}
      <button
        type="button"
        onClick={toggleMic}
        title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
          isMicMuted
            ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
            : 'bg-white/10 border border-white/15 text-white hover:bg-white/20'
        }`}
      >
        {isMicMuted ? (
          <>
            <MicOff className="w-4 h-4 text-red-400" />
            <span>Unmute</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Mute</span>
          </>
        )}
      </button>

      {/* Camera Toggle Button */}
      <button
        type="button"
        onClick={toggleCam}
        title={isCamMuted ? 'Turn on camera' : 'Turn off camera'}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
          isCamMuted
            ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
            : 'bg-white/10 border border-white/15 text-white hover:bg-white/20'
        }`}
      >
        {isCamMuted ? (
          <>
            <VideoOff className="w-4 h-4 text-red-400" />
            <span>Start Video</span>
          </>
        ) : (
          <>
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Stop Video</span>
          </>
        )}
      </button>

      <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

      {/* End Call Button */}
      <button
        type="button"
        onClick={onLeave}
        title="Leave consultation call"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
      >
        <PhoneOff className="w-4 h-4" />
        <span>End Call</span>
      </button>
    </div>
  )
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
        try {
          await activeCall.camera.enable()
          await activeCall.microphone.enable()
        } catch (mediaErr) {
          console.warn('Could not auto-enable camera/mic on join:', mediaErr)
        }
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
      <div className="flex h-full items-center justify-center text-white bg-[#0A0D18]">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#2DD4BF]" />
          <p className="text-sm font-semibold text-slate-300">Preparing secure 8LIV Stream video session...</p>
        </div>
      </div>
    )
  }

  if (error || !client || !call) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-white bg-[#0A0D18]">
        <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-300" />
          <h3 className="mb-2 font-bold text-base">Unable to join consultation</h3>
          <p className="text-sm text-white/80">{error || 'Video session is unavailable.'}</p>
        </div>
      </div>
    )
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="str-video str-video__theme-dark str-video__call-layout flex h-full w-full flex-col bg-[#0A0D18] text-white">
          <div className="min-h-0 flex-1 relative w-full h-full">
            <SpeakerLayout />
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#0B0F1D]/90 backdrop-blur-md p-3.5 flex items-center justify-center">
            <CustomCallControls onLeave={onLeave} />
          </div>
        </div>
      </StreamCall>
    </StreamVideo>
  )
}
