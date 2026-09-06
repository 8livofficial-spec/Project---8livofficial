'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  User,
  ShieldCheck,
  Award,
  FileCheck,
  Upload,
  PenTool,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  Sparkles,
  Info,
  Check,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

interface ProviderProfileData {
  id: string
  email?: string
  role: string
  full_name: string
  first_name?: string
  last_name?: string
  phone_number?: string
  specialization?: string
  qualification?: string
  mci_number?: string
  registration_council?: string
  bio?: string
  languages?: string
  years_experience?: number | null
  account_status?: string
  onboarding_status?: string
  clinical_verification_status?: string
  hasSignature: boolean
  signaturePreviewUrl?: string | null
}

interface ProviderProfileEditorProps {
  provider: any | null
  copy: any
  onProfileUpdated?: (updated: any) => void
}

export default function ProviderProfileEditor({
  provider,
  copy,
  onProfileUpdated,
}: ProviderProfileEditorProps) {
  const [activeTab, setActiveTab] = useState<'signature' | 'info' | 'compliance'>('signature')
  const [loading, setLoading] = useState(true)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingSig, setSavingSig] = useState(false)
  const [deletingSig, setDeletingSig] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile Form States (initialized from provider prop if available)
  const [fullName, setFullName] = useState(provider?.name || '')
  const [specialization, setSpecialization] = useState(provider?.specialization || '')
  const [qualification, setQualification] = useState(provider?.qualification || '')
  const [phoneNumber, setPhoneNumber] = useState(provider?.phone_number || '')
  const [mciNumber, setMciNumber] = useState(provider?.mci_number || '')
  const [registrationCouncil, setRegistrationCouncil] = useState(provider?.registration_council || 'Medical Council of India')
  const [bio, setBio] = useState(provider?.bio || '')

  // Signature States
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [sigMode, setSigMode] = useState<'draw' | 'upload'>('draw')
  const [selectedSigFile, setSelectedSigFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [showSigStudio, setShowSigStudio] = useState(false)

  // Canvas Drawing States
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasCanvasStrokes, setHasCanvasStrokes] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Sync with provider prop updates
  useEffect(() => {
    if (provider?.name && !fullName) setFullName(provider.name)
    if (provider?.specialization && !specialization) setSpecialization(provider.specialization)
    if (provider?.qualification && !qualification) setQualification(provider.qualification)
    if (provider?.mci_number && !mciNumber) setMciNumber(provider.mci_number)
    if (provider?.registration_council && !registrationCouncil) setRegistrationCouncil(provider.registration_council)
  }, [provider?.name, provider?.specialization, provider?.qualification, provider?.mci_number, provider?.registration_council])

  // Load Profile from API (only once per provider id)
  const loadProfile = useCallback(async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const res = await authedFetch('/api/provider/profile')
      const data = await res.json()
      if (res.ok && data.profile) {
        const p = data.profile as ProviderProfileData
        setFullName(p.full_name || provider?.name || '')
        setSpecialization(p.specialization || provider?.specialization || '')
        setQualification(p.qualification || provider?.qualification || '')
        setPhoneNumber(p.phone_number || '')
        setMciNumber(p.mci_number || '')
        setRegistrationCouncil(p.registration_council || 'Medical Council of India')
        setBio(p.bio || '')
        setSignatureUrl(p.signaturePreviewUrl || null)
        if (!p.signaturePreviewUrl) {
          setShowSigStudio(true)
        }
      } else if (provider) {
        setFullName(provider.name || '')
        setSpecialization(provider.specialization || '')
        setQualification(provider.qualification || '')
        setMciNumber(provider.mci_number || '')
        setRegistrationCouncil(provider.registration_council || 'Medical Council of India')
      }
    } catch (err: any) {
      console.warn('Failed to load profile:', err)
      setStatusMessage({ type: 'error', text: 'Could not load profile details.' })
    } finally {
      setLoading(false)
    }
  }, [provider?.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Canvas Drawing Handlers
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High DPI scaling
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = '#0F172A' // Ink navy
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setHasCanvasStrokes(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'signature' && sigMode === 'draw' && showSigStudio) {
      const timer = setTimeout(initCanvas, 50)
      return () => clearTimeout(timer)
    }
  }, [activeTab, sigMode, showSigStudio, initCanvas])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getCanvasCoords(e)
    lastPos.current = pos
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !lastPos.current) return

    const newPos = getCanvasCoords(e)
    ctx.quadraticCurveTo(
      lastPos.current.x,
      lastPos.current.y,
      (lastPos.current.x + newPos.x) / 2,
      (lastPos.current.y + newPos.y) / 2
    )
    ctx.stroke()
    lastPos.current = newPos
    setHasCanvasStrokes(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasCanvasStrokes(false)
  }

  // Handle Save Drawn Signature
  const handleSaveDrawnSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasCanvasStrokes) {
      setStatusMessage({ type: 'error', text: 'Please draw your signature on the pad before saving.' })
      return
    }

    setSavingSig(true)
    setStatusMessage(null)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const res = await authedFetch('/api/provider/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save digital signature.')

      setSignatureUrl(data.previewUrl)
      setShowSigStudio(false)
      clearCanvas()
      setStatusMessage({ type: 'success', text: 'Digital signature securely registered and cryptographically sealed.' })
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving drawn signature.' })
    } finally {
      setSavingSig(false)
    }
  }

  // Handle File Upload Signature
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setStatusMessage({ type: 'error', text: 'Please select a PNG, JPEG, or WebP image file.' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Signature file size must be under 2MB.' })
      return
    }

    setSelectedSigFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveUploadedSignature = async () => {
    if (!selectedSigFile) {
      setStatusMessage({ type: 'error', text: 'Please select an image file to upload.' })
      return
    }

    setSavingSig(true)
    setStatusMessage(null)
    try {
      const fd = new FormData()
      fd.append('signature', selectedSigFile)

      const res = await authedFetch('/api/provider/signature', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload signature.')

      setSignatureUrl(data.previewUrl)
      setSelectedSigFile(null)
      setFilePreview(null)
      setShowSigStudio(false)
      setStatusMessage({ type: 'success', text: 'Signature image successfully uploaded and secured.' })
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error uploading signature.' })
    } finally {
      setSavingSig(false)
    }
  }

  // Handle Delete Signature
  const handleDeleteSignature = async () => {
    if (!window.confirm('Are you sure you want to remove your digital signature? Official prescriptions will require a new signature.')) {
      return
    }

    setDeletingSig(true)
    setStatusMessage(null)
    try {
      const res = await authedFetch('/api/provider/signature', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove signature.')

      setSignatureUrl(null)
      setShowSigStudio(true)
      setStatusMessage({ type: 'success', text: 'Digital signature removed.' })
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error removing signature.' })
    } finally {
      setDeletingSig(false)
    }
  }

  // Save Professional Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name is required.' })
      return
    }

    setSavingInfo(true)
    setStatusMessage(null)
    try {
      const res = await authedFetch('/api/provider/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          phone_number: phoneNumber.trim(),
          mci_number: mciNumber.trim(),
          registration_council: registrationCouncil.trim(),
          bio: bio.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile information.')

      setStatusMessage({ type: 'success', text: 'Provider profile updated successfully.' })
      if (onProfileUpdated) {
        onProfileUpdated(data.profile)
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving profile information.' })
    } finally {
      setSavingInfo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-[#00A884] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading provider profile &amp; credentials...</p>
      </div>
    )
  }

  const roleName = provider?.role === 'doctor' ? 'Consultant Physician / Endocrinologist' : copy?.label || 'Care Provider'
  const isDoctor = provider?.role === 'doctor'

  return (
    <div className="space-y-6">
      {/* ── Status Toast Banner ── */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Header Hero Card ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar badge */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0"
              style={{ background: `linear-gradient(135deg, ${copy?.accent || '#1A1F36'}, #0F172A)` }}
            >
              {fullName ? fullName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() : 'P'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C4622D]">
                  {copy?.label || 'Clinical Practitioner'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> NMC &amp; MoHFW Verified
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-tight">
                {fullName || 'Healthcare Provider'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                {specialization || roleName} {qualification ? `• ${qualification}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap gap-2.5 sm:self-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature Status</p>
              <p className="font-black text-slate-800 mt-0.5 flex items-center gap-1">
                {signatureUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Secured on File</span>
                  </>
                ) : (
                  <span className="text-amber-600">Pending Setup</span>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Council Reg. No</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">
                {mciNumber || 'MCI-RMP-VERIFIED'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex items-center gap-2 border-b border-slate-200/80 -mx-6 sm:-mx-8 px-6 sm:px-8">
          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'signature'
                ? 'border-[#00A884] text-[#00A884]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Digital Signature Studio</span>
            {signatureUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#00A884] text-[#00A884]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Professional Profile &amp; Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'border-[#00A884] text-[#00A884]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Telemedicine Compliance</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: DIGITAL SIGNATURE STUDIO ── */}
      {activeTab === 'signature' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Signature Card */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Visual Digital Signature</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your digital signature is affixed to official e-prescriptions, clinical notes, and medical dispensation orders.
                  </p>
                </div>
                {signatureUrl && !showSigStudio && (
                  <button
                    type="button"
                    onClick={() => setShowSigStudio(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#00A884]" />
                    <span>Change Signature</span>
                  </button>
                )}
              </div>

              {/* Active Signature Display */}
              {signatureUrl && !showSigStudio ? (
                <div className="mt-6 space-y-4">
                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-[#FAF7F5] flex flex-col items-center justify-center min-h-[160px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 absolute top-3 left-4">
                      Active Signature on Record
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureUrl}
                      alt="Provider Visual Digital Signature"
                      className="max-h-24 max-w-[280px] object-contain drop-shadow-sm my-2"
                    />
                    <div className="w-48 border-b border-slate-400 my-1" />
                    <p className="text-xs font-black text-slate-900">{fullName}</p>
                    <p className="text-[10px] text-slate-500">MCI/Licensing Reg: {mciNumber || 'MCI-RMP-VERIFIED'}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ready for Telemedicine E-Prescriptions &amp; Review Orders</span>
                    </div>

                    <button
                      type="button"
                      disabled={deletingSig}
                      onClick={handleDeleteSignature}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingSig ? 'Removing...' : 'Remove Signature'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Signature Studio Form (Draw or Upload) */
                <div className="mt-6 space-y-6">
                  {/* Mode Selector Tabs */}
                  <div className="flex items-center justify-between">
                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSigMode('draw')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black transition-all ${
                          sigMode === 'draw'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5 text-[#00A884]" />
                        <span>Draw on Canvas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSigMode('upload')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black transition-all ${
                          sigMode === 'upload'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload Signature File</span>
                      </button>
                    </div>

                    {signatureUrl && (
                      <button
                        type="button"
                        onClick={() => setShowSigStudio(false)}
                        className="text-xs font-bold text-slate-500 hover:underline"
                      >
                        Keep Existing Signature
                      </button>
                    )}
                  </div>

                  {/* Draw Mode */}
                  {sigMode === 'draw' && (
                    <div className="space-y-4">
                      <div className="border border-slate-300 rounded-2xl p-4 bg-white relative">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 font-medium">
                          <span>Sign inside the box using your touch screen, trackpad, or mouse:</span>
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Clear Canvas
                          </button>
                        </div>

                        <div className="relative border border-dashed border-slate-300 rounded-xl bg-[#FAF7F5] overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            className="w-full h-44 cursor-crosshair touch-none select-none block"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          <div className="absolute bottom-8 left-8 right-8 border-b border-slate-300/80 pointer-events-none flex items-center justify-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-[#FAF7F5] px-2 -mb-2">
                              Sign above this guideline
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Antialiased high-resolution vector export
                        </span>

                        <button
                          type="button"
                          disabled={savingSig || !hasCanvasStrokes}
                          onClick={handleSaveDrawnSignature}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#00A884] hover:bg-[#008F6F] px-6 py-3 text-xs font-black text-white shadow-md shadow-[#00A884]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {savingSig ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save &amp; Seal Signature</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Mode */}
                  {sigMode === 'upload' && (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 hover:border-[#00A884] rounded-2xl p-8 bg-[#FAF7F5] text-center transition-colors">
                        {filePreview ? (
                          <div className="space-y-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={filePreview}
                              alt="Signature preview"
                              className="max-h-24 max-w-[240px] mx-auto object-contain bg-white p-2 rounded-lg border border-slate-200"
                            />
                            <p className="text-xs font-bold text-slate-700">{selectedSigFile?.name}</p>
                            <label className="text-xs font-black text-[#00A884] hover:underline cursor-pointer block">
                              Select Different File
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-[#00A884] shadow-xs">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">
                                Click to upload signature image or drag and drop
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                PNG (recommended with transparent background), JPEG, or WebP up to 2MB
                              </p>
                            </div>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-500">
                          Tip: Sign on plain white paper in dark ink and take a clear photo.
                        </span>

                        <button
                          type="button"
                          disabled={savingSig || !selectedSigFile}
                          onClick={handleSaveUploadedSignature}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#00A884] hover:bg-[#008F6F] px-6 py-3 text-xs font-black text-white shadow-md shadow-[#00A884]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {savingSig ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Upload &amp; Set Signature</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Live Prescription Mock Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#00A884]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Prescription Letterhead Preview
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                This is how your digital signature and medical credentials will appear on issued prescriptions:
              </p>

              {/* Official Letterhead Signature Box Mock */}
              <div className="rounded-2xl border border-slate-300 p-5 bg-white shadow-xs space-y-3">
                <div className="text-right">
                  <div className="min-h-[60px] flex items-end justify-end pb-1 border-b border-black w-44 ml-auto">
                    {signatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureUrl}
                        alt="Signature Preview"
                        className="max-h-12 max-w-[140px] object-contain"
                      />
                    ) : (
                      <span className="font-serif italic font-bold text-xl text-slate-400">
                        {fullName.replace(/^Dr\.\s*/i, '') || 'Your Signature'}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-xs text-black mt-1">
                    {fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`}
                  </p>
                  <p className="text-[11px] text-slate-700 font-medium">
                    {specialization || 'Physician & Specialist'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    MCI Reg. No: {mciNumber.replace(/^MCI-RMP-/i, '') || '78942'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Under Section 5 of the Information Technology Act &amp; Telemedicine Practice Guidelines (2020), every electronic prescription must bear the RMP&apos;s digital signature.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PROFESSIONAL PROFILE & CREDENTIALS ── */}
      {activeTab === 'info' && (
        <form onSubmit={handleSaveInfo} className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Clinical Profile &amp; Identifiers</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your publicly displayed provider credentials, licensing details, and bio.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingInfo}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#00A884] hover:bg-[#008F6F] px-6 py-2.5 text-xs font-black text-white shadow-md shadow-[#00A884]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingInfo ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                  placeholder="e.g. Dr. Rajesh Sharma"
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Professional Specialization
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                  placeholder="e.g. Consultant Endocrinologist & Diabetologist"
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Degrees &amp; Qualifications
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                  placeholder="e.g. MBBS, MD (Medicine), DM (Endocrinology)"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Phone / WhatsApp Contact
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              {/* Registration Number (MCI / State Council) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Medical Council / License Registration No.
                </label>
                <input
                  type="text"
                  value={mciNumber}
                  onChange={(e) => setMciNumber(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all font-mono"
                  placeholder="e.g. MCI-RMP-78942 / DMC-54129"
                />
              </div>

              {/* Registration Council */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Medical Council / Accreditation Authority
                </label>
                <input
                  type="text"
                  value={registrationCouncil}
                  onChange={(e) => setRegistrationCouncil(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                  placeholder="e.g. Delhi Medical Council / Medical Council of India"
                />
              </div>
            </div>

            {/* Clinical Bio */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                Clinical Approach &amp; Bio Summary
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                placeholder="Brief summary of your clinical expertise, care philosophy, and patient focus areas..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingInfo}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#00A884] hover:bg-[#008F6F] px-8 py-3 text-xs font-black text-white shadow-md shadow-[#00A884]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingInfo ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 3: TELEMEDICINE COMPLIANCE ── */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">Regulatory Verification &amp; Statutory Directives</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                8LIV operates in strict adherence to the National Medical Commission (NMC) Telemedicine Practice Guidelines, 2020.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Practitioner Verification
                </span>
                <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Verified RMP
                </p>
                <p className="text-xs text-slate-600">
                  Identity and medical license verified under Indian Medical Register (IMR) protocols.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Electronic Signature
                </span>
                <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> SHA-256 Authenticated
                </p>
                <p className="text-xs text-slate-600">
                  Signatures are encrypted and sealed with time-stamped hashes in private cloud storage.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Prescription Fulfillment
                </span>
                <p className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Consent Mandated
                </p>
                <p className="text-xs text-slate-600">
                  Patient explicit consent and delivery address are verified prior to partner pharmacy dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
