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
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

import InCallProtocolsDrawer from './InCallProtocolsDrawer'

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

function CustomCallControls({
  onLeave,
  onToggleProtocols,
  showProtocols,
}: {
  onLeave: () => void
  onToggleProtocols: () => void
  showProtocols: boolean
}) {
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
    <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-slate-950/80 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      {/* Microphone Toggle Button */}
      <button
        type="button"
        onClick={toggleMic}
        title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
          isMicMuted
            ? 'bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/20'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        <span className="hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera Toggle Button */}
      <button
        type="button"
        onClick={toggleCam}
        title={isCamMuted ? 'Turn on camera' : 'Turn off camera'}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
          isCamMuted
            ? 'bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/20'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        {isCamMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        <span className="hidden sm:inline">{isCamMuted ? 'Start Video' : 'Stop Video'}</span>
      </button>

      <div className="w-px h-6 bg-white/15 mx-1" />

      {/* Care Protocols Drawer Toggle Button */}
      <button
        type="button"
        onClick={onToggleProtocols}
        title={showProtocols ? 'Hide care protocols drawer' : 'Open care protocols & instructions'}
        className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
          showProtocols
            ? 'bg-[#00A884] text-white shadow-emerald-500/20 ring-1 ring-emerald-400/40'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
        <span>Protocols &amp; Rx</span>
      </button>

      <div className="w-px h-6 bg-white/15 mx-1 hidden sm:block" />

      {/* End Call Button */}
      <button
        type="button"
        onClick={onLeave}
        title="Leave consultation call"
        className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
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
  const [showProtocolsDrawer, setShowProtocolsDrawer] = useState(false)

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
        if (!res.ok) {
          if (data.requiresGate3Consent && data.consentUrl) {
            window.location.href = data.consentUrl
            return
          }
          throw new Error(data.error || 'Unable to prepare secure video session.')
        }
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
        <div className="str-video str-video__theme-dark str-video__call-layout flex h-full w-full flex-col bg-[#0A0D18] text-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(0,168,132,0.1),_transparent_70%)] z-0" />
          <div className="min-h-0 flex-1 relative w-full h-full z-10 flex">
            <div className="flex-1 w-full h-full relative">
              <SpeakerLayout />
            </div>
            <InCallProtocolsDrawer
              isOpen={showProtocolsDrawer}
              onClose={() => setShowProtocolsDrawer(false)}
            />
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#0B0F1D]/80 backdrop-blur-xl p-3.5 flex items-center justify-center z-20">
            <CustomCallControls
              onLeave={onLeave}
              onToggleProtocols={() => setShowProtocolsDrawer((prev) => !prev)}
              showProtocols={showProtocolsDrawer}
            />
          </div>
        </div>
      </StreamCall>
    </StreamVideo>
  )
}
