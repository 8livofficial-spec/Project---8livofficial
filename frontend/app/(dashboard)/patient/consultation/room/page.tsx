'use client'

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Calendar, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import StreamConsultationCall from '@/components/video/StreamConsultationCall'

export default function ConsultationRoomPage() {
  return (
    <Suspense fallback={
      <div className="h-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C4622D]" />
          <p className="text-xs text-[#8896A4] font-semibold">Loading consultation room...</p>
        </div>
      </div>
    }>
      <ConsultationRoomContent />
    </Suspense>
  )
}

function ConsultationRoomContent() {
  const searchParams = useSearchParams()
  const queryId = searchParams.get('id')
  const { assessment, reloadData, loading } = usePatientData()
  const [phase, setPhase] = useState<'pre-check' | 'call' | 'post-summary'>('pre-check')
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [checkingDevices, setCheckingDevices] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [doctorName, setDoctorName] = useState('Assigned Doctor')
  const [doctorRole, setDoctorRole] = useState('Physician Specialist')

  const appointmentId = queryId || ''

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const requestDevicePermissions = useCallback(async () => {
    setCheckingDevices(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setHasCameraPermission(true)
      setHasMicPermission(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.warn("Could not obtain full media devices:", err)
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = videoStream
        setHasCameraPermission(true)
        setHasMicPermission(false)
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream
        }
      } catch {
        setHasCameraPermission(false)
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = audioStream
          setHasMicPermission(true)
          setHasCameraPermission(false)
        } catch {
          setHasMicPermission(false)
          setHasCameraPermission(false)
        }
      }
    } finally {
      setCheckingDevices(false)
    }
  }, [])

  useEffect(() => {
    if (!queryId) return;

    const resolveConsultationDetails = async () => {
      try {
        const res = await fetch('/api/patient/consultation-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryId })
        });
        const data = await res.json();
        if (data.success) {
          setDoctorName(data.providerName);
          setDoctorRole(data.providerRole);
        }
      } catch (err) {
        console.error("Failed to load dynamic host details:", err);
      }
    };

    resolveConsultationDetails();
  }, [queryId]);

  // Pre-call Device Permission logic
  useEffect(() => {
    if (phase === 'pre-check') {
      const timer = window.setTimeout(() => {
        void requestDevicePermissions()
      }, 0)
      return () => {
        window.clearTimeout(timer)
        stopCameraStream()
      }
    } else {
      stopCameraStream()
    }
    return () => {
      stopCameraStream()
    }
  }, [phase, requestDevicePermissions, stopCameraStream])

  // Ensure preview video element attaches stream immediately and plays
  useEffect(() => {
    if (phase === 'pre-check' && hasCameraPermission && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
      videoRef.current.play().catch((e) => console.warn('Autoplay prevented:', e))
    }
  }, [hasCameraPermission, phase])

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setCameraEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setMicEnabled(audioTrack.enabled)
      }
    }
  }

  const joinCall = () => {
    stopCameraStream()
    setPhase('call')
  }

  const leaveCall = async () => {
    setPhase('post-summary');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const patientId = session?.user?.id || assessment?.patient_id;

      if (patientId) {
        await fetch('/api/patient/conclude-consultation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ patientId, appointmentId })
        });
        if (reloadData) {
          reloadData();
        }
      }
    } catch (err) {
      console.error("Failed to conclude consultation:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`w-full ${phase === 'call' ? 'h-[calc(100vh-6rem)] p-1 sm:p-2' : 'min-h-[calc(100vh-10rem)] p-2 sm:p-6'} flex flex-col items-center justify-center text-[#1A1F36]`}>
      {/* ────────────────── PHASE 1: PRE-CALL CHECK ────────────────── */}
      {phase === 'pre-check' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8 flex flex-col items-center space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0D9488] bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Clinic Entry Check
            </span>
            <h2 className="text-2xl font-bold font-sora text-[#1A1F36] mt-2">Ready to join your consultation?</h2>
            <p className="text-xs text-[#8896A4] font-medium max-w-md mx-auto">
              Please test your microphone and camera settings below to ensure a smooth call experience with your assigned clinician.
            </p>
          </div>

          {/* Video Preview Feed */}
          <div className="relative w-full aspect-video max-w-lg bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl flex items-center justify-center">
            {hasCameraPermission ? (
              <video
                ref={(el) => {
                  (videoRef as any).current = el
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current
                    el.play().catch(() => {})
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto text-[#8896A4]">
                  <CameraOff className="w-6 h-6" />
                </div>
                <p className="text-xs text-white/70 font-semibold">
                  {checkingDevices ? "Initializing camera feed..." : "Camera feed not available"}
                </p>
                <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                  Please allow camera permissions in your browser to check your video source.
                </p>
              </div>
            )}

            {/* Quick Status overlay on top */}
            {hasCameraPermission && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HD Video Preview</span>
              </div>
            )}

            {/* Quick Controls overlay on bottom */}
            {hasCameraPermission && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-lg">
                <button
                  onClick={toggleMic}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    micEnabled ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                  title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    cameraEnabled ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                  title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Status Row */}
          <div className="w-full max-w-lg grid grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] p-4 rounded-2xl flex items-center gap-3 border border-slate-200/80">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hasCameraPermission ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {hasCameraPermission ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold font-sora">Camera</h4>
                <p className="text-[10px] text-[#8896A4] font-medium">{hasCameraPermission ? 'Connected' : 'Permission needed'}</p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-2xl flex items-center gap-3 border border-slate-200/80">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hasMicPermission ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {hasMicPermission ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold font-sora">Microphone</h4>
                <p className="text-[10px] text-[#8896A4] font-medium">{hasMicPermission ? 'Connected' : 'Permission needed'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
            <button
              onClick={requestDevicePermissions}
              className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 font-bold uppercase tracking-wider text-xs rounded-full py-3.5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retest Devices
            </button>
            <button
              onClick={joinCall}
              className="flex-2 bg-gradient-to-r from-[#0D9488] to-[#10B981] hover:from-[#0F766E] hover:to-[#0D9488] text-white font-bold uppercase tracking-wider text-xs rounded-full py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0D9488]/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Video className="w-4 h-4" /> Enter Consultation Call
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── PHASE 2: LIVE CALL VIEWPORT ────────────────── */}
      {phase === 'call' && (
        <div className="w-full h-full min-h-[calc(100vh-6rem)] flex flex-col bg-[#0A0D18] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
          
          {/* Header Controls Overlay */}
          <div className="bg-[#0B0F1D]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between text-white select-none shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0D9488] to-[#10B981] text-white font-black text-sm flex items-center justify-center shadow-lg shadow-[#0D9488]/30">
                {doctorName.split(' ').pop()?.[0] || 'D'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-sora text-white">{doctorName}</h3>
                  <span className="text-[10px] text-[#2DD4BF] font-bold bg-[#0D9488]/20 px-2.5 py-0.5 rounded-full border border-[#0D9488]/30">
                    {doctorRole}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>256-Bit Encrypted Telehealth Call</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> Live Session
              </span>
              <button
                onClick={leaveCall}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs transition-all shadow-md cursor-pointer"
                title="Leave Consultation"
              >
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            </div>
          </div>

          <div className="flex-1 w-full bg-[#0A0D18] relative overflow-hidden">
            {appointmentId ? (
              <StreamConsultationCall appointmentId={appointmentId} onLeave={leaveCall} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-white">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-300" />
                  <p className="text-sm font-semibold">Missing consultation identifier. Please return to appointments and join again.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── PHASE 3: POST-CALL SUMMARY ────────────────── */}
      {phase === 'post-summary' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(26,31,54,0.06)] border border-[#1A1F36]/6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-[#5C7A6B]/10 rounded-full flex items-center justify-center text-[#5C7A6B]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#5C7A6B] bg-[#5C7A6B]/8 px-3 py-1 rounded-full">
                Session Completed
              </span>
              <h2 className="text-2xl font-bold font-sora text-[#1A1F36] mt-3">Consultation Concluded</h2>
              <p className="text-xs text-[#8896A4] font-medium max-w-md mt-1">
                Your medical session with {doctorName} has ended. Any prescription modifications or lifestyle plans discussed have been updated in your dashboard.
              </p>
            </div>
          </div>

          <hr className="border-[#1A1F36]/8" />

          {/* Next Actions */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm font-sora text-[#1A1F36]">Recommended Next Steps</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F5F0EB] border border-[#1A1F36]/5 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-[#C4622D]">
                  <FileText className="w-4 h-4" />
                  <h4 className="text-xs font-bold font-sora">Verify Prescriptions</h4>
                </div>
                <p className="text-[10px] text-[#8896A4] font-medium leading-relaxed">
                  Review updated GLP-1 dosage parameters, refill schedules, or clinician guidelines left by your physician.
                </p>
                <Link
                  href="/patient/prescriptions"
                  className="inline-block text-[10px] font-extrabold uppercase text-[#C4622D] hover:underline tracking-wider mt-1.5"
                >
                  Go to Prescriptions →
                </Link>
              </div>

              <div className="p-4 bg-[#F5F0EB] border border-[#1A1F36]/5 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-[#5C7A6B]">
                  <Calendar className="w-4 h-4" />
                  <h4 className="text-xs font-bold font-sora">Schedule Next Slot</h4>
                </div>
                <p className="text-[10px] text-[#8896A4] font-medium leading-relaxed">
                  Avoid plan gaps by scheduling your follow-up progress review or diet check-in early.
                </p>
                <Link
                  href="/patient/consultation"
                  className="inline-block text-[10px] font-extrabold uppercase text-[#5C7A6B] hover:underline tracking-wider mt-1.5"
                >
                  Book Next Slot →
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/patient"
              className="bg-[#1A1F36] hover:bg-[#C4622D] text-white font-bold uppercase tracking-wider text-xs rounded-full px-8 py-3.5 transition-all cursor-pointer shadow-sm"
            >
              Return to Overview Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
