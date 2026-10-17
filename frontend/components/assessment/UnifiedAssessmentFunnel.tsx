'use client'

import React, { useState, useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BiologicalGender,
  AssessmentInputs,
  convertUnits,
  computeAssessment,
  formatPhoneNumberLive,
  isValidPincode,
  validatePasswordStrength,
  COMMON_COMORBIDITY_OPTIONS,
  SENSITIVE_SAFETY_QUESTIONS,
  PRIOR_MEDICATION_OPTIONS,
} from '@/lib/metabolicAssessment'
import { supabase, syncSupabaseAuthCookie } from '@/lib/supabaseClient'
import {
  Info,
  Calendar,
  Ruler,
  Weight,
  ArrowUpRight,
  ArrowLeft,
  MoveVertical,
  CircleDot,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  ChevronRight,
  User,
  MapPin,
  Heart,
  Activity,
  UploadCloud,
  CheckCircle,
  Minus,
  Plus,
} from 'lucide-react'
import {
  ScreenerWelcomeIllustration,
  GenderFemaleIllustration,
  GenderMaleIllustration,
  AgeIllustration,
  HeightIllustration,
  WeightIllustration,
  WaistIllustration,
  DoctorConsultationIllustration,
  PrescriptionDeliveryIllustration,
  VitalsTelemetryIllustration,
  SafetyShieldIllustration,
  HealthHistoryIllustration,
  AccountSecurityIllustration,
  AssessmentBrandHeader,
  BiologicalGenderHeaderIcon,
  LabWorkIllustration,
} from './AssessmentIllustrations'

export type FunnelStage =
  | 'screener'
  | 'results'
  | 'transition'
  | 'intake_contact'
  | 'intake_vitals'
  | 'intake_safety'
  | 'intake_history'
  | 'intake_lab'
  | 'intake_medication'
  | 'intake_account'

export interface UnifiedAssessmentFunnelProps {
  initialStage?: FunnelStage
  standaloneMode?: boolean // true if rendered inside a standalone modal or page
  onComplete?: () => void
  className?: string
}

const STORAGE_KEY = '8liv_assessment_draft_v2'
const SUBMIT_TIMEOUT_MS = 45000

async function fetchJsonWithTimeout(url: string, options: RequestInit, timeoutMs = SUBMIT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))
    return { response, data }
  } finally {
    window.clearTimeout(timeout)
  }
}

function IntakeProgressBar({ currentStep, title }: { currentStep: number; title: string }) {
  return (
    <div className="mb-7 pb-5 border-b border-stone-100">
      <div className="flex items-center justify-between text-xs font-mono font-medium text-slate-400 mb-2.5">
        <span className="text-[#00A884] font-semibold tracking-wider">Stage 0{currentStep} of 07</span>
        <span className="text-slate-500 font-sans font-medium">{title}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <div
            key={s}
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              currentStep >= s
                ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70]'
                : 'bg-slate-200/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function UnifiedAssessmentFunnel({
  initialStage = 'screener',
  standaloneMode = false,
  onComplete,
  className = '',
}: UnifiedAssessmentFunnelProps) {
  const router = useRouter()
  const topAnchorRef = useRef<HTMLDivElement>(null)

  // Main stage of the funnel
  const [stage, setStage] = useState<FunnelStage>(initialStage)

  // Mobile screener sub-step (1 to 5)
  const [screenerStep, setScreenerStep] = useState<number>(1)

  // Smooth scroll to card top on stage or screener step transition
  useEffect(() => {
    if (topAnchorRef.current) {
      const rect = topAnchorRef.current.getBoundingClientRect()
      if (rect.top < 0 || rect.top > 160) {
        topAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [stage, screenerStep])

  // Screener inputs
  const [screenerInputs, setScreenerInputs] = useState<AssessmentInputs>({
    gender: 'female',
    age: 32,
    heightCm: 165,
    weightKg: 76,
    waistCm: 88,
  })

  // Full clinical intake inputs
  const [formData, setFormData] = useState({
    // Contact
    first_name: '',
    last_name: '',
    phone_number: '',
    pincode: '',
    street_address: '',
    city: '',
    state: '',
    agree_terms: false,

    // Vitals
    height_cm: '165',
    weight_kg: '76',
    goal_weight_kg: '65',
    gender: 'female' as BiologicalGender,
    age: '32',
    waist_cm: '88',
    blood_pressure_range: 'normal', // 'normal' | 'stage1' | 'stage2' | 'unknown'
    resting_heart_rate: 'normal',   // 'normal' | 'below60' | 'above100' | 'unknown'

    // Safety
    has_mtc_men2: 'no',
    is_pregnant_nursing: 'no',
    has_pancreatitis: 'no',
    has_active_cancer: 'no',
    has_severe_gi_disease: 'no',
    hard_rejections: [] as string[],

    // History
    comorbidities: [] as string[],
    review_conditions: [] as string[],

    // Medication
    medication_history_choice: 'never_used',

    // Lab Work
    lab_preference: 'none' as 'none' | 'upload' | 'third_party' | 'skip',
    lab_report_url: '',

    // Account
    email: '',
    password: '',
  })

  // UI / Interaction states
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [resultsRevealStep, setResultsRevealStep] = useState<number>(0)
  
  // Lab upload state
  const [isUploadingLab, setIsUploadingLab] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Accessible unique IDs
  const ageId = useId()
  const heightId = useId()
  const weightId = useId()
  const waistId = useId()
  const goalWeightId = useId()

  // Track mobile viewport vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Silent progress restore & auto-save (NO draft save badge displayed on screen)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.stage && initialStage === 'screener') setStage(parsed.stage)
      }
    } catch {
      // Ignore session storage errors
    }

    // Check user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        if (session.user.email) {
          setFormData((prev) => ({ ...prev, email: session.user.email || '' }))
        }
      }
    })
  }, [initialStage])

  // Save only non-sensitive progress metadata
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ stage }))
    } catch {
      // Silent error
    }
  }, [stage])

  // Results screen sequential reveal stagger
  useEffect(() => {
    if (stage === 'results') {
      setResultsRevealStep(1)
      const timer1 = setTimeout(() => setResultsRevealStep(2), 250)
      const timer2 = setTimeout(() => setResultsRevealStep(3), 500)
      const timer3 = setTimeout(() => setResultsRevealStep(4), 750)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    } else {
      setResultsRevealStep(0)
    }
  }, [stage])

  // Computed live units
  const heightFormatted = convertUnits(screenerInputs.heightCm, 'height')
  const weightFormatted = convertUnits(screenerInputs.weightKg, 'weight')
  const waistFormatted = convertUnits(screenerInputs.waistCm, 'waist')
  const results = computeAssessment(screenerInputs)

  // Handle gender selection with smooth feedback and auto-advance
  const handleGenderSelect = (gender: BiologicalGender) => {
    setScreenerInputs((prev) => ({ ...prev, gender }))
    setFormData((prev) => ({ ...prev, gender }))
    setTimeout(() => {
      setScreenerStep(2)
    }, 240)
  }

  // Prepopulate Vitals from Screener when moving to Intake
  const startIntakeFromTransition = () => {
    setFormData((prev) => ({
      ...prev,
      height_cm: prev.height_cm || String(screenerInputs.heightCm),
      weight_kg: prev.weight_kg || String(screenerInputs.weightKg),
      waist_cm: prev.waist_cm || String(screenerInputs.waistCm),
      age: prev.age || String(screenerInputs.age),
      gender: screenerInputs.gender,
    }))
    setStage('intake_contact')
  }

  // Handle Lab Report Upload
  const handleLabUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLab(true)
    setUploadError('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `lab_reports/${fileName}`

      // Upload to supabase storage bucket 'patient-documents'
      const { error } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file)

      if (error) throw error

      // Generate a signed URL for secure, time-limited clinical review
      const { data: signedData, error: signError } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7)

      const secureUrl = (!signError && signedData?.signedUrl) ? signedData.signedUrl : filePath
      setFormData(prev => ({ ...prev, lab_report_url: secureUrl }))
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload file.')
    } finally {
      setIsUploadingLab(false)
    }
  }

  // Handle phone auto-formatting live
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumberLive(e.target.value)
    setFormData((prev) => ({ ...prev, phone_number: formatted }))
  }

  // Handle Pincode input with auto-expansion
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setFormData((prev) => ({
      ...prev,
      pincode: val,
      // If valid 6 digits and city/state are empty, offer default
      city: prev.city || (val.length === 6 ? 'Bangalore' : ''),
      state: prev.state || (val.length === 6 ? 'Karnataka' : ''),
    }))
  }

  // History chips toggle
  const toggleComorbidity = (condition: string) => {
    setFormData((prev) => {
      if (condition === 'None of the above') {
        return {
          ...prev,
          comorbidities: prev.comorbidities.includes(condition) ? [] : [condition],
        }
      }
      const filtered = prev.comorbidities.filter((c) => c !== 'None of the above')
      if (filtered.includes(condition)) {
        return { ...prev, comorbidities: filtered.filter((c) => c !== condition) }
      }
      return { ...prev, comorbidities: [...filtered, condition] }
    })
  }

  // Silent backend progress sync (NO UI badge)
  const syncProgressSilent = async (nextStage: FunnelStage, stepNum: number) => {
    if (!currentUserId) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch('/api/assessment/progress', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          patientId: currentUserId,
          step: stepNum,
          formData: {
            ...formData,
            waist_cm: screenerInputs.waistCm,
          },
        }),
      })
    } catch {
      // Silent error: do not disrupt user experience
    }
  }

  // Final Intake Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const passwordError = validatePasswordStrength(formData.password)
      if (passwordError) throw new Error(passwordError)

      const { data: { session } } = await supabase.auth.getSession()
      let userId = session?.user.id || currentUserId
      const accessToken = session?.access_token || null

      // If user is not yet logged in, sign up first
      if (!userId) {
        const { response: signupRes, data: signupData } = await fetchJsonWithTimeout('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.first_name,
            lastName: formData.last_name,
          }),
        })
        if (!signupRes.ok) {
          throw new Error(signupData.error || 'Failed to create account.')
        }
        userId = signupData.userId
      }

      // Submit complete assessment payload
      const { response, data: result } = await fetchJsonWithTimeout('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          userId,
          formData: {
            ...formData,
            waist_cm: screenerInputs.waistCm,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(result.error || 'Unable to submit assessment.')
      }

      // Clear session draft
      sessionStorage.removeItem(STORAGE_KEY)

      if (onComplete) {
        onComplete()
        return
      }

      if (accessToken) {
        syncSupabaseAuthCookie(session)
        const target = result.status === 'NOT_ELIGIBLE' ? '/not-eligible' : '/consultation-payment'
        window.location.href = target
        return
      }

      // If newly registered, redirect to verification
      await supabase.auth.signOut()
      syncSupabaseAuthCookie(null)
      window.location.href = `/verification-pending?email=${encodeURIComponent(formData.email)}`
    } catch (err) {
      setFormError(err instanceof DOMException && err.name === 'AbortError'
        ? 'This is taking longer than expected. Please check your connection and try again.'
        : err instanceof Error ? err.message : 'An error occurred during submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* =========================================================================
     RENDERERS
     ========================================================================= */

  return (
    <div ref={topAnchorRef} className={`w-full flex justify-center ${className}`}>
      <div className="w-full max-w-[580px]">
        
        {/* ===================================================================
            SCREEN 1: SCREENER (Mobile 1-question view / Desktop 2-column grid)
            =================================================================== */}
        {stage === 'screener' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all">
            <AssessmentBrandHeader />
            
            {/* Minimalist Hairline Step Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-mono font-medium text-slate-400 mb-2.5">
                <span className="text-[#00A884] font-semibold">Step 0{screenerStep} of 05</span>
                <span>
                  {screenerStep === 1 && 'Biological Profile'}
                  {screenerStep === 2 && 'Age Verification'}
                  {screenerStep === 3 && 'Height Stature'}
                  {screenerStep === 4 && 'Current Weight'}
                  {screenerStep === 5 && 'Waist Measurement'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1.5">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      screenerStep >= stepNum
                        ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70]'
                        : 'bg-slate-200/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 1 Question Per View with Smooth Funnel Animations */}
            <div>
              {/* Step 1: Biological Gender */}
              {screenerStep === 1 && (
                <div key="step-1" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    What is your biological sex?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Prescription metabolic models and visceral adiposity thresholds differ biologically between male and female physiology.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button
                      type="button"
                      onClick={() => handleGenderSelect('female')}
                      className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col items-center text-center gap-4 cursor-pointer relative group ${
                        screenerInputs.gender === 'female'
                          ? 'bg-emerald-50/70 border-[#00A884] ring-2 ring-[#00A884]/25 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-xs'
                      }`}
                    >
                      {screenerInputs.gender === 'female' && (
                        <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <GenderFemaleIllustration className="w-20 h-20 sm:w-24 sm:h-24 transition-transform group-hover:scale-105" />
                      <div>
                        <span className="font-sans text-lg font-bold text-[#11241A] block mb-0.5">Female</span>
                        <span className="font-sans text-xs text-slate-500 font-medium">Biological female</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenderSelect('male')}
                      className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col items-center text-center gap-4 cursor-pointer relative group ${
                        screenerInputs.gender === 'male'
                          ? 'bg-emerald-50/70 border-[#00A884] ring-2 ring-[#00A884]/25 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-xs'
                      }`}
                    >
                      {screenerInputs.gender === 'male' && (
                        <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <GenderMaleIllustration className="w-20 h-20 sm:w-24 sm:h-24 transition-transform group-hover:scale-105" />
                      <div>
                        <span className="font-sans text-lg font-bold text-[#11241A] block mb-0.5">Male</span>
                        <span className="font-sans text-xs text-slate-500 font-medium">Biological male</span>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setScreenerStep(2)}
                    className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Age */}
              {screenerStep === 2 && (
                <div key="step-2" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    How old are you?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Adult GLP-1 weight management therapies require patients to be 18 years or older.
                  </p>

                  {/* Luxury Biometric Counter */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, age: Math.max(18, p.age - 1) }))}
                      disabled={screenerInputs.age <= 18}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Decrease age"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[150px]">
                      <div className="font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums">
                        {screenerInputs.age}
                      </div>
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1">
                        years of age
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, age: Math.min(85, p.age + 1) }))}
                      disabled={screenerInputs.age >= 85}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Increase age"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((screenerInputs.age - 18) / (85 - 18)) * 100
                      return (
                        <input
                          id={ageId}
                          type="range"
                          min={18}
                          max={85}
                          step={1}
                          inputMode="numeric"
                          value={screenerInputs.age}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, age: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                        />
                      )
                    })()}
                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                      <span>18 yrs</span>
                      <span>85 yrs</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setScreenerStep(1)}
                      className="min-h-[50px] px-6 rounded-full border border-slate-200 text-slate-700 font-sans font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(3)}
                      className="flex-1 min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Height */}
              {screenerStep === 3 && (
                <div key="step-3" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    What is your height?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Used to determine baseline body surface area and calculate your clinical metabolic ratio.
                  </p>

                  {/* Luxury Biometric Counter */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, heightCm: Math.max(130, p.heightCm - 1) }))}
                      disabled={screenerInputs.heightCm <= 130}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Decrease height"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px]">
                      <div className="font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums">
                        {screenerInputs.heightCm}
                      </div>
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1">
                        cm · {heightFormatted.imperialLabel}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, heightCm: Math.min(220, p.heightCm + 1) }))}
                      disabled={screenerInputs.heightCm >= 220}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Increase height"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((screenerInputs.heightCm - 130) / (220 - 130)) * 100
                      return (
                        <input
                          id={heightId}
                          type="range"
                          min={130}
                          max={220}
                          step={1}
                          inputMode="numeric"
                          value={screenerInputs.heightCm}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, heightCm: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                        />
                      )
                    })()}
                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                      <span>130 cm (4&apos;3&quot;)</span>
                      <span>220 cm (7&apos;3&quot;)</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setScreenerStep(2)}
                      className="min-h-[50px] px-6 rounded-full border border-slate-200 text-slate-700 font-sans font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(4)}
                      className="flex-1 min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Weight */}
              {screenerStep === 4 && (
                <div key="step-4" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    What is your current weight?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Prescription titrations are calibrated against your starting weight to guarantee safety and efficacy.
                  </p>

                  {/* Luxury Biometric Counter */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, weightKg: Math.max(35, p.weightKg - 1) }))}
                      disabled={screenerInputs.weightKg <= 35}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Decrease weight"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px]">
                      <div className="font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums">
                        {screenerInputs.weightKg}
                      </div>
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1">
                        kg · {weightFormatted.imperialLabel}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, weightKg: Math.min(200, p.weightKg + 1) }))}
                      disabled={screenerInputs.weightKg >= 200}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Increase weight"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((screenerInputs.weightKg - 35) / (200 - 35)) * 100
                      return (
                        <input
                          id={weightId}
                          type="range"
                          min={35}
                          max={200}
                          step={1}
                          inputMode="numeric"
                          value={screenerInputs.weightKg}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, weightKg: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                        />
                      )
                    })()}
                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                      <span>35 kg (77 lbs)</span>
                      <span>200 kg (441 lbs)</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setScreenerStep(3)}
                      className="min-h-[50px] px-6 rounded-full border border-slate-200 text-slate-700 font-sans font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(5)}
                      className="flex-1 min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Waist */}
              {screenerStep === 5 && (
                <div key="step-5" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    What is your waist measurement?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Waist-to-height ratio is the clinical gold standard for assessing visceral fat and metabolic syndrome risk.
                  </p>

                  {/* Luxury Biometric Counter */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, waistCm: Math.max(45, p.waistCm - 1) }))}
                      disabled={screenerInputs.waistCm <= 45}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Decrease waist"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px]">
                      <div className="font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums">
                        {screenerInputs.waistCm}
                      </div>
                      <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1">
                        cm · {waistFormatted.imperialLabel}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, waistCm: Math.min(160, p.waistCm + 1) }))}
                      disabled={screenerInputs.waistCm >= 160}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                      aria-label="Increase waist"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((screenerInputs.waistCm - 45) / (160 - 45)) * 100
                      return (
                        <input
                          id={waistId}
                          type="range"
                          min={45}
                          max={160}
                          step={1}
                          inputMode="numeric"
                          value={screenerInputs.waistCm}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, waistCm: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                        />
                      )
                    })()}
                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                      <span>45 cm (18&quot;)</span>
                      <span>160 cm (63&quot;)</span>
                    </div>
                  </div>

                  {/* Inline measurement tip */}
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 mt-4 p-4 bg-emerald-50/40 border border-emerald-100/80 rounded-2xl font-sans">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#00A884]" />
                    <span>Clinical protocol: Measure at the narrowest point or around your navel while standing relaxed.</span>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setScreenerStep(4)}
                      className="min-h-[50px] px-6 rounded-full border border-slate-200 text-slate-700 font-sans font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage('results')}
                      className="flex-1 min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00A884]/25 hover:shadow-xl active:scale-[0.99] transition-all"
                    >
                      <span>Calculate Clinical Results</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            SCREEN 2: RESULTS (Sequenced Staggered Reveal)
            =================================================================== */}
        {stage === 'results' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            {/* Back link */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setStage('screener')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change my answers
              </button>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="block text-xs font-mono font-semibold text-[#00A884] uppercase tracking-wider mb-1.5">
                  Clinical Body Analysis
                </span>
                <h1 className="font-sans text-2xl sm:text-[30px] font-extrabold text-[#11241A] tracking-tight leading-snug">
                  Here&apos;s what our assessment found
                </h1>
              </div>
              <DoctorConsultationIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
            </div>

            {/* 1. BMI Donut Card (Step 1 reveal) */}
            <div
              className={`transition-all duration-500 ${
                resultsRevealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              } ${results.bmi.cardBgClass} border ${results.bmi.cardBorderClass} rounded-2xl p-5 sm:p-6 mb-4 flex items-center gap-4 sm:gap-6 shadow-xs`}
            >
              {/* Donut Chart */}
              <div className="relative w-[80px] h-[80px] shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="38" fill="none" stroke={results.bmi.trackColorHex} strokeWidth="11" />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={results.bmi.colorHex}
                    strokeWidth="11"
                    strokeDasharray={239}
                    strokeDashoffset={
                      239 - 239 * Math.max(0.15, Math.min(0.95, (results.bmi.score - 14) / 26))
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-sans text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    {results.bmi.score}
                  </span>
                </div>
              </div>

              {/* Lead Headline first, score secondary */}
              <div>
                <h2 className={`font-sans text-base sm:text-lg font-bold leading-snug ${results.bmi.textColorClass}`}>
                  {results.bmi.headline}
                </h2>
                <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${results.bmi.subtextColorClass}`}>
                  {results.bmi.summary}
                </p>
              </div>
            </div>

            {/* 2. Waist Size Card with Color + Icon + Text badge (Step 2 reveal) */}
            <div
              className={`transition-all duration-500 delay-100 ${
                resultsRevealStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              } bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 sm:p-6 mb-4 shadow-xs`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-slate-700 rotate-45" />
                  <span className="font-sans text-sm font-bold text-slate-900">Waist measurement</span>
                </div>
                {/* Never color alone: icon + text + badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${results.waistRisk.badgeBgClass} ${results.waistRisk.badgeTextClass} ${results.waistRisk.badgeBorderClass}`}
                >
                  {results.waistRisk.statusTag === 'On track' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{results.waistRisk.statusTag}</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                {results.waistRisk.description}
              </p>
            </div>

            {/* 3. Healthy Reference Range & Disclaimer (Step 3 reveal) */}
            <div
              className={`transition-all duration-500 delay-200 ${
                resultsRevealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              <div className="flex items-center justify-between text-sm py-4 border-t border-b border-slate-200/80 mb-4">
                <span className="text-slate-500 text-xs sm:text-sm font-medium">Estimated reference range for height</span>
                <span className="font-sans text-[#11241A] font-extrabold text-sm sm:text-base">
                  {results.healthyWeight.formattedKg}
                </span>
              </div>

              {/* Visible disclaimer */}
              <div className="flex items-start gap-2.5 mb-6 text-xs sm:text-sm text-slate-500 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <p>
                  This is clinical screening information, not a standalone prescription. An assigned physician reviews every biomarker before recommending an evidence-based care protocol.
                </p>
              </div>
            </div>

            {/* 4. Primary CTA to Transition Screen (Step 4 reveal) */}
            <div
              className={`transition-all duration-500 delay-300 ${
                resultsRevealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              <button
                type="button"
                onClick={() => setStage('transition')}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]"
              >
                <span>Review Next Clinical Steps</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            TRANSITION SCREEN (New: Carries score forward, steps & time, privacy)
            =================================================================== */}
        {stage === 'transition' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all text-center animate-funnel-step">
            <AssessmentBrandHeader />
            <div className="flex justify-center mb-5">
              <DoctorConsultationIllustration className="w-24 h-24 sm:w-28 sm:h-28" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#00A884] text-xs font-mono font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
              Assessment Complete
            </span>

            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug">
              Based on your score, here&apos;s what&apos;s next
            </h1>
            <p className="font-sans text-sm text-slate-600 mt-2 leading-relaxed max-w-lg mx-auto">
              Your body mass ratio of <strong>{results.bmi.score}</strong> indicates that a personalized metabolic weight management protocol can help restore metabolic balance.
            </p>

            {/* Steps & Time Estimate Card */}
            <div className="my-6 p-5 sm:p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 space-y-4 text-left shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00A884]/10 text-[#00A884] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-sans text-sm font-bold text-[#11241A]">5 short sections · ~3 minutes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Quickly covers your health vitals, safety checks, and medical history.</p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-100/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span className="font-medium">100% confidential & encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span className="font-medium">No initial payment required</span>
                </div>
              </div>
            </div>

            {/* Single Continue CTA */}
            <button
              type="button"
              onClick={startIntakeFromTransition}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]"
            >
              <span>Continue to Clinical Intake</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}


        {/* ===================================================================
            SCREEN 3: FULL INTAKE - CONTACT DETAILS
            (Separate rows, live phone formatting, pincode-first address)
            =================================================================== */}
        {stage === 'intake_contact' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={1} title="Patient Profile" />
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Who is this consultation for?
                </h1>
                <p className="text-sm text-slate-500">
                  Your doctor will use these details to address your clinical prescription dossier.
                </p>
              </div>
              <PrescriptionDeliveryIllustration className="w-18 h-18 sm:w-22 sm:h-22 shrink-0" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setFormError('')
                if (!formData.first_name || !formData.last_name) {
                  setFormError('Please provide your full legal name.')
                  return
                }
                if (!formData.phone_number || formData.phone_number.length < 10) {
                  setFormError('Please enter a valid mobile number with country code.')
                  return
                }
                if (!isValidPincode(formData.pincode)) {
                  setFormError('Please enter a valid 6-digit PIN code.')
                  return
                }
                if (!formData.agree_terms) {
                  setFormError('Please agree to the medical terms and privacy policy to continue.')
                  return
                }
                syncProgressSilent('intake_vitals', 1)
                setStage('intake_vitals')
              }}
              className="space-y-4"
            >
              {/* Separate rows for first & last name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">First name</label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  placeholder="Your first name"
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Last name</label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  placeholder="Your last name"
                  value={formData.last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Phone auto-formats live */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Mobile number</label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone_number}
                  onChange={handlePhoneChange}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used by our licensed physician for your scheduled telehealth visit.
                </span>
              </div>

              {/* Pincode-first address with auto-expansion */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Delivery PIN code</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="Enter 6-digit PIN code"
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                  {isValidPincode(formData.pincode) && (
                    <Check className="w-4 h-4 text-[#00A884] absolute right-4 top-4" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Used only for prescription fulfillment if medication is prescribed.
                </span>

                {/* Expands once 6 digits entered */}
                {isValidPincode(formData.pincode) && (
                  <div className="mt-3 space-y-3 animate-in fade-in duration-300">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">Street address / Apartment</label>
                      <input
                        type="text"
                        placeholder="House / Flat / Street address"
                        value={formData.street_address}
                        onChange={(e) => setFormData((prev) => ({ ...prev, street_address: e.target.value }))}
                        className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                          className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#11241A] bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                          className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#11241A] bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms agreement */}
              <div className="pt-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agree_terms}
                    onChange={(e) => setFormData((prev) => ({ ...prev, agree_terms: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#00A884] focus:ring-[#00A884] accent-[#00A884]"
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I consent to telehealth consultations and agree to 8Liv&apos;s Terms of Care and Medical Privacy Policy.
                  </span>
                </label>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] mt-6"
              >
                <span>Save & Continue to Vitals</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================
            SCREEN 4: FULL INTAKE - VITALS & GOALS
            (Pre-filled from screener; if not available, prompts patient;
             allows "I don't know" for BP and HR)
            =================================================================== */}
        {stage === 'intake_vitals' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={2} title="Clinical Vitals & Targets" />
            <button
              type="button"
              onClick={() => setStage('intake_contact')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Body telemetry & targets
                </h1>
                <p className="text-sm text-slate-500">
                  Confirmed values help our clinical team calibrate appropriate protocol titration.
                </p>
              </div>
              <VitalsTelemetryIllustration className="w-18 h-18 sm:w-22 sm:h-22 shrink-0" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setFormError('')
                if (!formData.height_cm || !formData.weight_kg || !formData.goal_weight_kg) {
                  setFormError('Please enter your height, current weight, and goal weight.')
                  return
                }
                syncProgressSilent('intake_safety', 2)
                setStage('intake_safety')
              }}
              className="space-y-5"
            >
              {/* If height/weight are missing, prompt patient clearly */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Height (cm)</label>
                  <input
                    type="number"
                    min={120}
                    max={230}
                    required
                    value={formData.height_cm}
                    onChange={(e) => setFormData((prev) => ({ ...prev, height_cm: e.target.value }))}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Current weight (kg)</label>
                  <input
                    type="number"
                    min={35}
                    max={250}
                    required
                    value={formData.weight_kg}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight_kg: e.target.value }))}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={goalWeightId} className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Goal target weight (kg)
                </label>
                <input
                  id={goalWeightId}
                  type="number"
                  min={35}
                  max={250}
                  required
                  placeholder="e.g. 65"
                  value={formData.goal_weight_kg}
                  onChange={(e) => setFormData((prev) => ({ ...prev, goal_weight_kg: e.target.value }))}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Blood Pressure: allows "I don't know" */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Blood pressure reading (if known)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { value: 'normal', label: 'Normal (<120/80)' },
                    { value: 'stage1', label: 'Elevated (120–139)' },
                    { value: 'stage2', label: 'High (140+)' },
                    { value: 'unknown', label: "I don't know" },
                  ].map((bp) => {
                    const isSelected = formData.blood_pressure_range === bp.value
                    return (
                      <button
                        key={bp.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, blood_pressure_range: bp.value }))}
                        className={`min-h-[46px] p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 text-[#11241A] font-bold border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {bp.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Resting Heart Rate: allows "I don't know" */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Resting heart rate (if known)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { value: 'normal', label: 'Normal (60–100 bpm)' },
                    { value: 'below60', label: 'Below 60 bpm' },
                    { value: 'above100', label: 'Above 100 bpm' },
                    { value: 'unknown', label: "I don't know" },
                  ].map((hr) => {
                    const isSelected = formData.resting_heart_rate === hr.value
                    return (
                      <button
                        key={hr.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, resting_heart_rate: hr.value }))}
                        className={`min-h-[46px] p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 text-[#11241A] font-bold border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {hr.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] mt-6"
              >
                <span>Save & Continue to Safety Checks</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================
            SCREEN 5: FULL INTAKE - SAFETY CHECKS (Yes/No rows with "why we ask")
            =================================================================== */}
        {stage === 'intake_safety' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={3} title="Safety Contraindications" />
            <button
              type="button"
              onClick={() => setStage('intake_vitals')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Important health conditions
                </h1>
                <p className="text-sm text-slate-500">
                  Our physicians cross-verify these items to ensure total treatment safety.
                </p>
              </div>
              <SafetyShieldIllustration className="w-18 h-18 sm:w-22 sm:h-22 shrink-0" />
            </div>

            <div className="space-y-4">
              {SENSITIVE_SAFETY_QUESTIONS.filter(
                (q) => !q.femaleOnly || formData.gender === 'female'
              ).map((q) => {
                const currentVal = formData[q.id]
                return (
                  <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-xs">
                    <p className="font-sans text-xs sm:text-sm font-bold text-slate-900 mb-1.5">
                      {q.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3.5 leading-relaxed">
                      {q.whyWeAsk}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, [q.id]: 'no' }))}
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentVal === 'no'
                            ? 'bg-[#11241A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, [q.id]: 'yes' }))}
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentVal === 'yes'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                syncProgressSilent('intake_history', 3)
                setStage('intake_history')
              }}
              className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] mt-6"
            >
              <span>Save & Continue to Diagnostic History</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 6: FULL INTAKE - HEALTH HISTORY (Multi-select chips)
            =================================================================== */}
        {stage === 'intake_history' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={4} title="Diagnosed Conditions" />
            <button
              type="button"
              onClick={() => setStage('intake_safety')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Any diagnosed conditions?
                </h1>
                <p className="text-sm text-slate-500">
                  Select all that apply. This helps your clinician customize supportive diet and medication guidance.
                </p>
              </div>
              <HealthHistoryIllustration className="w-18 h-18 sm:w-22 sm:h-22 shrink-0" />
            </div>

            {/* Multi-select chips */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {COMMON_COMORBIDITY_OPTIONS.map((item) => {
                const isSelected = formData.comorbidities.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleComorbidity(item)}
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 text-[#11241A] font-bold border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                        : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-[#00A884]" />}
                    <span>{item}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                syncProgressSilent('intake_lab', 4)
                setStage('intake_lab')
              }}
              className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]"
            >
              <span>Continue to Lab Work</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7: LAB WORK / BLOOD REPORT (NEW)
            =================================================================== */}
        {stage === 'intake_lab' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={5} title="Diagnostic Blood Work" />
            <button
              type="button"
              onClick={() => setStage('intake_history')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex justify-center mb-6">
              <LabWorkIllustration className="w-18 h-18 sm:w-20 sm:h-20" />
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2 text-center">
              Blood Work & Lab Report
            </h1>
            <p className="font-sans text-sm text-slate-500 mb-8 text-center max-w-md mx-auto">
              For our clinical team to calibrate safe, effective metabolic dosing, we recommend providing a recent blood report or requesting a doorstep sample collection.
            </p>

            <div className="space-y-4 mb-8">
              {/* Option 1: Upload */}
              <div 
                className={`p-5 rounded-2xl border transition-all ${
                  formData.lab_preference === 'upload' ? 'bg-emerald-50/60 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, lab_preference: 'upload' }))}
                  className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                >
                  <div>
                    <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block mb-0.5">I have a recent blood report</span>
                    <span className="font-sans text-xs text-slate-500">Upload your PDF or image file directly for doctor review.</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'upload' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'upload' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
                
                {formData.lab_preference === 'upload' && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    <div className="border-2 border-dashed border-emerald-300 bg-white/80 rounded-2xl p-6 text-center hover:bg-emerald-50/30 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleLabUpload}
                        disabled={isUploadingLab}
                      />
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        {isUploadingLab ? (
                          <>
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#00A884] animate-spin mb-2" />
                            <span className="text-sm font-semibold text-slate-700">Uploading to encrypted vault...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-[#00A884] mb-2" />
                            <span className="font-sans text-sm font-bold text-slate-800 text-center px-4">
                              {formData.lab_report_url ? 'Report uploaded successfully. Tap to replace.' : 'Tap to select PDF, JPG or PNG'}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">Encrypted and strictly confidential</span>
                          </>
                        )}
                      </div>
                    </div>
                    {uploadError && <p className="text-red-500 text-xs mt-2 text-center">{uploadError}</p>}
                  </div>
                )}
              </div>

              {/* Option 2: 3rd Party */}
              <div 
                className={`p-5 rounded-2xl border transition-all ${
                  formData.lab_preference === 'third_party' ? 'bg-emerald-50/60 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, lab_preference: 'third_party' }))}
                  className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                >
                  <div>
                    <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block mb-0.5">I need a blood test</span>
                    <span className="font-sans text-xs text-slate-500">We&apos;ll arrange a home collection via certified lab partners.</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'third_party' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'third_party' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                {formData.lab_preference === 'third_party' && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    <div className="bg-emerald-50/70 p-4 rounded-xl flex items-start gap-3 border border-emerald-200/60">
                      <CheckCircle className="w-5 h-5 text-[#00A884] shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        <strong className="text-slate-900">Doorstep sample collection:</strong> Our medical coordinator will schedule a certified phlebotomist to collect your sample at home. Results will be uploaded directly to your clinical record.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Skip */}
              <div 
                className={`p-5 rounded-2xl border transition-all ${
                  formData.lab_preference === 'skip' ? 'bg-emerald-50/60 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, lab_preference: 'skip' }))}
                  className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                >
                  <div>
                    <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block mb-0.5">Skip for now</span>
                    <span className="font-sans text-xs text-slate-500">I will provide my report during my doctor consultation.</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'skip' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'skip' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={formData.lab_preference === 'none'}
              onClick={() => {
                syncProgressSilent('intake_medication', 4)
                setStage('intake_medication')
              }}
              className={`w-full min-h-[50px] rounded-full font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                formData.lab_preference !== 'none'
                  ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Continue to Medication History</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7A: PRIOR MEDICATION HISTORY
            =================================================================== */}
        {stage === 'intake_medication' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={6} title="Medication History" />
            <button
              type="button"
              onClick={() => setStage('intake_lab')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
              Prior weight loss medication
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Have you tried GLP-1 or other metabolic medications before?
            </p>

            <div className="space-y-3 mb-8">
              {PRIOR_MEDICATION_OPTIONS.map((opt) => {
                const isSelected = formData.medication_history_choice === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, medication_history_choice: opt.value }))}
                    className={`w-full min-h-[52px] p-4 rounded-2xl text-left text-xs sm:text-sm font-medium border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 text-[#11241A] font-bold border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                        : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-[#00A884]" />}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                syncProgressSilent('intake_account', 5)
                setStage('intake_account')
              }}
              className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]"
            >
              <span>Continue to Account Setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7B: ACCOUNT CREATION & SUBMIT
            =================================================================== */}
        {stage === 'intake_account' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={7} title="Confidential Health Profile" />
            <button
              type="button"
              onClick={() => setStage('intake_medication')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Save your health profile
                </h1>
                <p className="text-sm text-slate-500">
                  Create your secure portal login to view your physician&apos;s recommendations and schedule your consultation.
                </p>
              </div>
              <AccountSecurityIllustration className="w-18 h-18 sm:w-22 sm:h-22 shrink-0" />
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Create a password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full min-h-[50px] px-4 pr-11 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must include 8+ characters, uppercase, lowercase, number, and special character.
                </span>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] disabled:opacity-50 text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] mt-6"
              >
                {isSubmitting ? (
                  <span>Saving your assessment...</span>
                ) : (
                  <>
                    <span>Complete Clinical Assessment</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
