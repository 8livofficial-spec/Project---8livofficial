'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Calendar, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryId = searchParams.get('id')
  const { assessment, reloadData, loading } = usePatientData()
  const [phase, setPhase] = useState<'pre-check' | 'call' | 'post-summary'>('pre-check')

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  // Device Check States
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [checkingDevices, setCheckingDevices] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [doctorName, setDoctorName] = useState('Assigned Doctor')
  const [doctorRole, setDoctorRole] = useState('Physician Specialist')

  // Dynamic room URL resolution
  const [roomUrl, setRoomUrl] = useState('')

  useEffect(() => {
    if (queryId?.startsWith('https://')) {
      setRoomUrl(queryId)
    } else if (assessment?.room_url?.startsWith('https://')) {
      setRoomUrl(assessment.room_url)
    } else {
      setRoomUrl('')
    }
  }, [queryId, assessment?.room_url])

  useEffect(() => {
    if (!roomUrl && !queryId) return;

    const resolveConsultationDetails = async () => {
      try {
        const res = await fetch('/api/patient/consultation-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomUrl: roomUrl || null, queryId: queryId || null })
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
  }, [roomUrl, queryId]);

  // Pre-call Device Permission logic
  useEffect(() => {
    if (phase === 'pre-check') {
      requestDevicePermissions()
    } else {
      stopCameraStream()
    }
    return () => {
      stopCameraStream()
    }
  }, [phase])

  const requestDevicePermissions = async () => {
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
      // Attempt camera only
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = videoStream
        setHasCameraPermission(true)
        setHasMicPermission(false)
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream
        }
      } catch (camErr) {
        setHasCameraPermission(false)
        // Attempt mic only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = audioStream
          setHasMicPermission(true)
          setHasCameraPermission(false)
        } catch (micErr) {
          setHasMicPermission(false)
          setHasCameraPermission(false)
        }
      }
    } finally {
      setCheckingDevices(false)
    }
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, roomUrl })
        });
        if (reloadData) {
          reloadData();
        }
      }
    } catch (err) {
      console.error("Failed to conclude consultation:", err);
    }
  };

  return (
    <div className="h-full min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center p-2 sm:p-6 text-[#1A1F36]">
      {/* ────────────────── PHASE 1: PRE-CALL CHECK ────────────────── */}
      {phase === 'pre-check' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(26,31,54,0.06)] border border-[#1A1F36]/6 flex flex-col items-center space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C4622D] bg-[#C4622D]/8 px-3 py-1 rounded-full">
              Clinic Entry Check
            </span>
            <h2 className="text-2xl font-bold font-sora text-[#1A1F36] mt-2">Ready to join your consultation?</h2>
            <p className="text-xs text-[#8896A4] font-medium max-w-md mx-auto">
              Please test your microphone and camera settings below to ensure a smooth call experience with your assigned clinician.
            </p>
          </div>

          {/* Video Preview Feed */}
          <div className="relative w-full aspect-video max-w-lg bg-[#1A1F36] rounded-2xl overflow-hidden border border-[#1A1F36]/10 flex items-center justify-center">
            {hasCameraPermission ? (
              <video
                ref={videoRef}
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

            {/* Quick Controls overlay on bottom */}
            {hasCameraPermission && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <button
                  onClick={toggleMic}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    micEnabled ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-red-500/80 text-white hover:bg-red-600'
                  }`}
                  title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    cameraEnabled ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-red-500/80 text-white hover:bg-red-600'
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
            <div className="bg-[#F5F0EB] p-4 rounded-2xl flex items-center gap-3 border border-[#1A1F36]/5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCameraPermission ? 'bg-[#5C7A6B]/10 text-[#5C7A6B]' : 'bg-amber-500/10 text-amber-600'}`}>
                {hasCameraPermission ? <CheckCircle className="w-4.5 h-4.5" /> : <AlertCircle className="w-4.5 h-4.5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold font-sora">Camera</h4>
                <p className="text-[9px] text-[#8896A4] font-medium">{hasCameraPermission ? 'Connected' : 'Permission needed'}</p>
              </div>
            </div>

            <div className="bg-[#F5F0EB] p-4 rounded-2xl flex items-center gap-3 border border-[#1A1F36]/5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasMicPermission ? 'bg-[#5C7A6B]/10 text-[#5C7A6B]' : 'bg-amber-500/10 text-amber-600'}`}>
                {hasMicPermission ? <CheckCircle className="w-4.5 h-4.5" /> : <AlertCircle className="w-4.5 h-4.5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold font-sora">Microphone</h4>
                <p className="text-[9px] text-[#8896A4] font-medium">{hasMicPermission ? 'Connected' : 'Permission needed'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
            <button
              onClick={requestDevicePermissions}
              className="flex-1 bg-white hover:bg-[#F5F0EB] border border-[#1A1F36]/15 font-bold uppercase tracking-wider text-xs rounded-full py-3.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retest Devices
            </button>
            <button
              onClick={joinCall}
              className="flex-2 bg-[#C4622D] hover:bg-[#A8522A] text-white font-bold uppercase tracking-wider text-xs rounded-full py-3.5 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C4622D]/15 cursor-pointer"
            >
              <Video className="w-4 h-4" /> Enter Consultation Call
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── PHASE 2: LIVE CALL VIEWPORT ────────────────── */}
      {phase === 'call' && (
        <div className="w-full h-[calc(100vh-12rem)] flex flex-col bg-[#1A1F36] rounded-3xl overflow-hidden border border-white/5 relative">
          
          {/* Header Controls Overlay */}
          <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C4622D] text-white font-black text-xs flex items-center justify-center">
                {doctorName.split(' ').pop()?.[0] || 'D'}
              </div>
              <div>
                <h3 className="text-xs font-bold font-sora">{doctorName}</h3>
                <p className="text-[9px] text-white/60 font-semibold">{doctorRole} • Live Clinic</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] bg-red-500 text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> Live Call
              </span>
              <button
                onClick={leaveCall}
                className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer"
                title="Leave Consultation"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Jitsi Meet iframe embed */}
          <div className="flex-1 w-full bg-[#111422]">
            <iframe
              src={roomUrl}
              allow="camera; microphone; display-capture; autoplay"
              className="w-full h-full border-none"
              title="Jitsi Consultation Call"
            />
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
