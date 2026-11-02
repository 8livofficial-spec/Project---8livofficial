'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  SpeakerLayout,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
  useCall,
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
  patientId?: string
  providerRole?: string
  participantRole?: string
}

type Props = {
  appointmentId: string
  patientId?: string
  onLeave: () => void
  onSessionReady?: (meta: { providerRole?: string; participantRole?: string }) => void
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
  const call = useCall()
  const { useMicrophoneState, useCameraState } = useCallStateHooks()
  const { microphone, isMute: isMicMuted } = useMicrophoneState()
  const { camera, isMute: isCamMuted } = useCameraState()
  const [leaving, setLeaving] = useState(false)

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

  const handleEndCall = async () => {
    if (leaving) return
    setLeaving(true)
    try {
      await call?.leave()
    } catch (e) {
      console.warn('Stream call leave error:', e)
    }
    onLeave()
  }

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2 rounded-full bg-slate-900/90 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
      {/* Microphone Toggle (Round Control) */}
      <button
        type="button"
        onClick={toggleMic}
        title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
          isMicMuted
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        {isMicMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      {/* Camera Toggle (Round Control) */}
      <button
        type="button"
        onClick={toggleCam}
        title={isCamMuted ? 'Turn on camera' : 'Turn off camera'}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
          isCamMuted
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        {isCamMuted ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      <div className="w-px h-5 bg-white/15 mx-0.5" />

      {/* Care Protocols Drawer Toggle Button */}
      <button
        type="button"
        onClick={onToggleProtocols}
        title={showProtocols ? 'Hide care protocols drawer' : 'Open care protocols & instructions'}
        className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm ${
          showProtocols
            ? 'bg-[#00A884] text-white shadow-emerald-500/25 ring-1 ring-emerald-400/40'
            : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
        <span className="hidden sm:inline">Protocols &amp; Rx</span>
        <span className="sm:hidden">Rx</span>
      </button>

      <div className="w-px h-5 bg-white/15 mx-0.5" />

      {/* End Call Button */}
      <button
        type="button"
        onClick={handleEndCall}
        disabled={leaving}
        title="Leave and conclude consultation call"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
      >
        {leaving ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>
    </div>
  )
}

export default function StreamConsultationCall({ appointmentId, patientId, onLeave, onSessionReady }: Props) {
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
        if (active) {
          setTokenData(data)
          onSessionReady?.({
            providerRole: data.providerRole,
            participantRole: data.participantRole,
          })
        }
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
        <div className="str-video str-video__theme-dark str-video__call-layout flex h-full w-full flex-col bg-[#0B0F19] text-white relative overflow-hidden">
          <div className="min-h-0 flex-1 relative w-full h-full z-10 flex p-2 sm:p-4 pb-20 sm:pb-24">
            <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0F1422]">
              <SpeakerLayout />
            </div>
            <InCallProtocolsDrawer
              isOpen={showProtocolsDrawer}
              patientId={patientId || tokenData?.patientId}
              onClose={() => setShowProtocolsDrawer(false)}
            />
          </div>

          {/* Floating Call Controls Dock */}
          <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <CustomCallControls
              onLeave={onLeave}
              onToggleProtocols={() => setShowProtocolsDrawer((prev) => !prev)}
              showProtocols={showProtocolsDrawer}
            />
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
              .str-video {
                --str-video__primary-color: #00A884 !important;
                --str-video__avatar--background-color: #0d9488 !important;
              }
              .str-video__speaker-layout__wrapper {
                height: 100% !important;
                width: 100% !important;
                max-height: 100% !important;
                background: transparent !important;
              }
              .str-video__speaker-layout {
                height: 100% !important;
                width: 100% !important;
                flex: 1 1 0% !important;
                background: transparent !important;
                padding: 0 !important;
              }
              .str-video__participant-view {
                height: 100% !important;
                width: 100% !important;
                border-radius: 1.25rem !important;
                background: #0F1422 !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                overflow: hidden !important;
              }
              .str-video__participant-view--speaking {
                border-color: #00A884 !important;
                box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.35) !important;
              }
              .str-video__avatar,
              .str-video__avatar--initials-fallback,
              .str-video__avatar-fallback {
                background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #059669 100%) !important;
                background-color: #0d9488 !important;
                border: 2px solid rgba(255, 255, 255, 0.25) !important;
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.6) !important;
                color: #ffffff !important;
                font-family: inherit !important;
                font-weight: 700 !important;
              }
              .str-video__participant-details {
                background: rgba(11, 15, 25, 0.8) !important;
                backdrop-filter: blur(12px) !important;
                border-radius: 9999px !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                padding: 5px 12px !important;
                font-size: 11px !important;
                font-weight: 600 !important;
              }
              .str-video__generic-menu {
                background: rgba(15, 20, 34, 0.95) !important;
                backdrop-filter: blur(16px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 0.75rem !important;
              }
            `
          }} />
        </div>
      </StreamCall>
    </StreamVideo>
  )
}
