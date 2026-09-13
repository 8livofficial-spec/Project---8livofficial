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
import { supabase } from '@/lib/supabaseClient'
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
} from './AssessmentIllustrations'

export type FunnelStage =
  | 'screener'
  | 'results'
  | 'transition'
  | 'intake_contact'
  | 'intake_vitals'
  | 'intake_safety'
  | 'intake_history'
  | 'intake_medication'
  | 'intake_account'

export interface UnifiedAssessmentFunnelProps {
  initialStage?: FunnelStage
  standaloneMode?: boolean // true if rendered inside a standalone modal or page
  onComplete?: () => void
  className?: string
}

const STORAGE_KEY = '8liv_assessment_draft_v2'

export default function UnifiedAssessmentFunnel({
  initialStage = 'screener',
  standaloneMode = false,
  onComplete,
  className = '',
}: UnifiedAssessmentFunnelProps) {
  const router = useRouter()

  // Main stage of the funnel
  const [stage, setStage] = useState<FunnelStage>(initialStage)

  // Mobile screener sub-step (1 to 5)
  const [screenerStep, setScreenerStep] = useState<number>(1)

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

  // Silent session restore & auto-save (NO draft save badge displayed on screen)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.screenerInputs) setScreenerInputs(parsed.screenerInputs)
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }))
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

  // Silent save whenever values change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ screenerInputs, formData, stage })
      )
    } catch {
      // Silent error
    }
  }, [screenerInputs, formData, stage])

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

  // Auto-advance on gender selection for mobile screener
  const handleGenderSelect = (gender: BiologicalGender) => {
    setScreenerInputs((prev) => ({ ...prev, gender }))
    setFormData((prev) => ({ ...prev, gender }))
    if (isMobile) {
      setTimeout(() => {
        setScreenerStep(2)
      }, 250)
    }
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
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.first_name,
            lastName: formData.last_name,
          }),
        })
        const signupData = await signupRes.json()
        if (!signupRes.ok) {
          throw new Error(signupData.error || 'Failed to create account.')
        }
        userId = signupData.userId
      }

      // Submit complete assessment payload
      const response = await fetch('/api/assessment', {
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

      const result = await response.json()
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
        const target = result.status === 'NOT_ELIGIBLE' ? '/not-eligible' : '/consultation-payment'
        window.location.href = target
        return
      }

      // If newly registered, redirect to verification
      await supabase.auth.signOut()
      window.location.href = `/verification-pending?email=${encodeURIComponent(formData.email)}`
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred during submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* =========================================================================
     RENDERERS
     ========================================================================= */

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <div className="w-full max-w-[460px] md:max-w-[760px] lg:max-w-[980px]">
        
        {/* ===================================================================
            SCREEN 1: SCREENER (Mobile 1-question view / Desktop 2-column grid)
            =================================================================== */}
        {stage === 'screener' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            
            {/* Screener Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                {isMobile ? (
                  /* 5 Progress Dots with current step label */
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      {[1, 2, 3, 4, 5].map((stepNum) => (
                        <button
                          key={stepNum}
                          type="button"
                          onClick={() => setScreenerStep(stepNum)}
                          aria-label={`Go to step ${stepNum}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            screenerStep === stepNum
                              ? 'w-7 bg-[#00A884]'
                              : screenerStep > stepNum
                              ? 'w-3.5 bg-slate-400'
                              : 'w-3.5 bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-[#00A884]">
                      {screenerStep === 1 && 'Step 1 of 5: Biological gender'}
                      {screenerStep === 2 && 'Step 2 of 5: Your age'}
                      {screenerStep === 3 && 'Step 3 of 5: Your height'}
                      {screenerStep === 4 && 'Step 4 of 5: Your weight'}
                      {screenerStep === 5 && 'Step 5 of 5: Waist measurement'}
                    </span>
                  </div>
                ) : (
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Step 1 of 1 · Metabolic check-in
                  </span>
                )}

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
                  Tell us about you
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Takes less than a minute.
                </p>
              </div>

              <div className="hidden sm:block shrink-0">
                <ScreenerWelcomeIllustration className="w-20 h-20 sm:w-24 sm:h-24" />
              </div>
            </div>

            {/* Mobile View: 1 Question Per View */}
            {isMobile ? (
              <div className="space-y-6">
                {/* Step 1: Biological Gender */}
                {screenerStep === 1 && (
                  <div className="py-2">
                    <label className="text-sm font-semibold text-slate-900 block mb-1">
                      Select your biological gender
                    </label>
                    <p className="text-xs text-slate-500 mb-4">
                      Used to set clinical reference ranges for body-fat distribution.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleGenderSelect('female')}
                        className={`p-5 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 cursor-pointer ${
                          screenerInputs.gender === 'female'
                            ? 'bg-emerald-50/70 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <GenderFemaleIllustration className="w-20 h-20" />
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">Female</span>
                          <span className="text-[11px] text-slate-500">Biological female</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenderSelect('male')}
                        className={`p-5 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 cursor-pointer ${
                          screenerInputs.gender === 'male'
                            ? 'bg-emerald-50/70 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <GenderMaleIllustration className="w-20 h-20" />
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">Male</span>
                          <span className="text-[11px] text-slate-500">Biological male</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Age */}
                {screenerStep === 2 && (
                  <div className="py-2">
                    <div className="flex items-center gap-4 mb-5">
                      <AgeIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
                      <div>
                        <label htmlFor={ageId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Your age
                        </label>
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {screenerInputs.age} <span className="text-sm sm:text-base font-normal text-slate-500">years old</span>
                        </span>
                      </div>
                    </div>
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
                      className="w-full h-10 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>18 yrs</span>
                      <span>85 yrs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(3)}
                      className="mt-6 w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Step 3: Height */}
                {screenerStep === 3 && (
                  <div className="py-2">
                    <div className="flex items-center gap-4 mb-5">
                      <HeightIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
                      <div>
                        <label htmlFor={heightId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Your height
                        </label>
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {heightFormatted.dualLabel}
                        </span>
                      </div>
                    </div>
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
                      className="w-full h-10 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>130 cm (4&apos;3&quot;)</span>
                      <span>220 cm (7&apos;3&quot;)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(4)}
                      className="mt-6 w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Step 4: Weight */}
                {screenerStep === 4 && (
                  <div className="py-2">
                    <div className="flex items-center gap-4 mb-5">
                      <WeightIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
                      <div>
                        <label htmlFor={weightId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Current weight
                        </label>
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {weightFormatted.dualLabel}
                        </span>
                      </div>
                    </div>
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
                      className="w-full h-10 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>35 kg (77 lbs)</span>
                      <span>200 kg (441 lbs)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenerStep(5)}
                      className="mt-6 w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Step 5: Waist */}
                {screenerStep === 5 && (
                  <div className="py-2">
                    <div className="flex items-center gap-4 mb-5">
                      <WaistIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
                      <div>
                        <label htmlFor={waistId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Waist circumference
                        </label>
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {waistFormatted.dualLabel}
                        </span>
                      </div>
                    </div>
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
                      className="w-full h-10 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>45 cm (18&quot;)</span>
                      <span>160 cm (63&quot;)</span>
                    </div>
                    {/* Inline measurement tip */}
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <span>Measure around your belly button, standing relaxed.</span>
                    </div>

                    {/* Final CTA for screener */}
                    <button
                      type="button"
                      onClick={() => setStage('results')}
                      className="mt-6 w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                    >
                      See my results
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop View: 2-Column Grid Layout */
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gender */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold text-slate-900 block">
                          Biological gender
                        </label>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Required</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Used to establish accurate fat distribution benchmarks.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleGenderSelect('female')}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          screenerInputs.gender === 'female'
                            ? 'bg-white border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <GenderFemaleIllustration className="w-14 h-14 shrink-0" />
                        <div className="text-left">
                          <span className="text-sm font-bold text-slate-900 block">Female</span>
                          <span className="text-[11px] text-slate-500">Biological</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenderSelect('male')}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          screenerInputs.gender === 'male'
                            ? 'bg-white border-[#00A884] ring-2 ring-[#00A884]/20 shadow-xs'
                            : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <GenderMaleIllustration className="w-14 h-14 shrink-0" />
                        <div className="text-left">
                          <span className="text-sm font-bold text-slate-900 block">Male</span>
                          <span className="text-[11px] text-slate-500">Biological</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Age */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AgeIllustration className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
                        <div>
                          <label htmlFor={ageId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                            Age
                          </label>
                          <span className="text-base font-bold text-slate-900">
                            {screenerInputs.age} yrs
                          </span>
                        </div>
                      </div>
                    </div>
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
                      className="w-full h-8 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-[7px]"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>18 yrs</span>
                      <span>85 yrs</span>
                    </div>
                  </div>

                  {/* Height */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <HeightIllustration className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
                        <div>
                          <label htmlFor={heightId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                            Height
                          </label>
                          <span className="text-base font-bold text-slate-900">
                            {heightFormatted.dualLabel}
                          </span>
                        </div>
                      </div>
                    </div>
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
                      className="w-full h-8 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-[7px]"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>130 cm (4&apos;3&quot;)</span>
                      <span>220 cm (7&apos;3&quot;)</span>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <WeightIllustration className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
                        <div>
                          <label htmlFor={weightId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                            Weight
                          </label>
                          <span className="text-base font-bold text-slate-900">
                            {weightFormatted.dualLabel}
                          </span>
                        </div>
                      </div>
                    </div>
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
                      className="w-full h-8 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-[7px]"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>35 kg (77 lbs)</span>
                      <span>200 kg (441 lbs)</span>
                    </div>
                  </div>

                  {/* Waist Circumference */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <WaistIllustration className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
                        <div>
                          <label htmlFor={waistId} className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                            Waist circumference
                          </label>
                          <span className="text-base font-bold text-slate-900">
                            {waistFormatted.dualLabel}
                          </span>
                        </div>
                      </div>
                    </div>
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
                      className="w-full h-8 bg-transparent cursor-pointer appearance-none focus:outline-none [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-slate-200 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-[7px]"
                    />
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>Measure around your belly button, standing relaxed.</span>
                    </div>
                  </div>
                </div>


                {/* Bottom CTA for Desktop */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Takes under 1 minute</span>
                  <button
                    type="button"
                    onClick={() => setStage('results')}
                    className="min-h-[48px] px-8 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                  >
                    See my results
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            SCREEN 2: RESULTS (Sequenced Staggered Reveal)
            =================================================================== */}
        {stage === 'results' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            {/* Back link */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setStage('screener')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change my answers
              </button>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="block text-xs font-normal text-slate-500 mb-1.5">
                  Your body check
                </span>
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
                  Here&apos;s what we found
                </h1>
              </div>
              <DoctorConsultationIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
            </div>

            {/* 1. BMI Donut Card (Step 1 reveal) */}
            <div
              className={`transition-all duration-500 ${
                resultsRevealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              } ${results.bmi.cardBgClass} border ${results.bmi.cardBorderClass} rounded-2xl p-5 mb-4 flex items-center gap-4 sm:gap-5`}
            >
              {/* Donut Chart */}
              <div className="relative w-[78px] h-[78px] shrink-0 flex items-center justify-center">
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
                  <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {results.bmi.score}
                  </span>
                </div>
              </div>

              {/* Lead Headline first, score secondary */}
              <div>
                <h2 className={`text-base sm:text-lg font-bold leading-snug ${results.bmi.textColorClass}`}>
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
              } bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-slate-700 rotate-45" />
                  <span className="text-sm font-semibold text-slate-900">Waist size</span>
                </div>
                {/* Never color alone: icon + text + badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium border ${results.waistRisk.badgeBgClass} ${results.waistRisk.badgeTextClass} ${results.waistRisk.badgeBorderClass}`}
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
              <div className="flex items-center justify-between text-sm py-4 border-t border-b border-slate-200 mb-4">
                <span className="text-slate-500 text-xs sm:text-sm">A healthy weight for your height</span>
                <span className="text-slate-900 font-bold text-sm sm:text-base">
                  {results.healthyWeight.formattedKg}
                </span>
              </div>

              {/* Visible disclaimer */}
              <div className="flex items-start gap-2.5 mb-6 text-xs sm:text-sm text-slate-500 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <p>
                  This is general info, not a diagnosis. A doctor will review your results before suggesting any treatment.
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
                className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm sm:text-base hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Talk to a doctor about this</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            TRANSITION SCREEN (New: Carries score forward, steps & time, privacy)
            =================================================================== */}
        {stage === 'transition' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all text-center">
            <AssessmentBrandHeader />
            <div className="flex justify-center mb-5">
              <DoctorConsultationIllustration className="w-28 h-28 sm:w-36 sm:h-36" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
              Assessment complete
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              Based on your score, here&apos;s what&apos;s next
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-lg mx-auto">
              Your body mass ratio of <strong>{results.bmi.score}</strong> indicates that a personalized medical weight plan can help restore your metabolic set-point.
            </p>

            {/* Steps & Time Estimate Card */}
            <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00A884]/10 text-[#00A884] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">5 short sections · ~3 minutes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Quickly covers your health vitals, safety checks, and medical history.</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>100% confidential & encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>No payment required for health profile</span>
                </div>
              </div>
            </div>

            {/* Single Continue CTA, no other actions */}
            <button
              type="button"
              onClick={startIntakeFromTransition}
              className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm sm:text-base hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}


        {/* ===================================================================
            SCREEN 3: FULL INTAKE - CONTACT DETAILS
            (Separate rows, live phone formatting, pincode-first address)
            =================================================================== */}
        {stage === 'intake_contact' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
                  Section 1 of 5 · Contact details
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                  Who is this consultation for?
                </h1>
                <p className="text-sm text-slate-500">
                  Your doctor will use these details to address your prescription dossier.
                </p>
              </div>
              <PrescriptionDeliveryIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
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
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used by our licensed physician for your scheduled video/audio visit.
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
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
                  />
                  {isValidPincode(formData.pincode) && (
                    <Check className="w-4 h-4 text-emerald-600 absolute right-4 top-4" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Used only for prescription delivery if medication is prescribed.
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
                        className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                          className="w-full min-h-[44px] px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-slate-50"
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
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#00A884] focus:ring-[#00A884]"
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I consent to telehealth consultations and agree to 8Liv&apos;s Terms of Care and Medical Privacy Policy.
                  </span>
                </label>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-4"
              >
                <span>Save & continue to vitals</span>
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
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <button
              type="button"
              onClick={() => setStage('intake_contact')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
                  Section 2 of 5 · Vitals & Goals
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                  Body telemetry & targets
                </h1>
                <p className="text-sm text-slate-500">
                  Confirmed values help your clinical team prescribe appropriate starting dosages.
                </p>
              </div>
              <VitalsTelemetryIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
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
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
                />
              </div>

              {/* Blood Pressure: allows "I don't know" */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Blood pressure reading (if known)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'normal', label: 'Normal (<120/80)' },
                    { value: 'stage1', label: 'Elevated (120–139)' },
                    { value: 'stage2', label: 'High (140+)' },
                    { value: 'unknown', label: "I don't know" },
                  ].map((bp) => (
                    <button
                      key={bp.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, blood_pressure_range: bp.value }))}
                      className={`min-h-[44px] p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        formData.blood_pressure_range === bp.value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {bp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resting Heart Rate: allows "I don't know" */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Resting heart rate (if known)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'normal', label: 'Normal (60–100 bpm)' },
                    { value: 'below60', label: 'Below 60 bpm' },
                    { value: 'above100', label: 'Above 100 bpm' },
                    { value: 'unknown', label: "I don't know" },
                  ].map((hr) => (
                    <button
                      key={hr.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, resting_heart_rate: hr.value }))}
                      className={`min-h-[44px] p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        formData.resting_heart_rate === hr.value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hr.label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-4"
              >
                <span>Save & continue to safety checks</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================
            SCREEN 5: FULL INTAKE - SAFETY CHECKS (Yes/No rows with "why we ask")
            =================================================================== */}
        {stage === 'intake_safety' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <button
              type="button"
              onClick={() => setStage('intake_vitals')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
                  Section 3 of 5 · Medical safety checks
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                  Important health conditions
                </h1>
                <p className="text-sm text-slate-500">
                  Our physicians cross-verify these items to ensure total treatment safety.
                </p>
              </div>
              <SafetyShieldIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
            </div>

            <div className="space-y-4">
              {SENSITIVE_SAFETY_QUESTIONS.filter(
                (q) => !q.femaleOnly || formData.gender === 'female'
              ).map((q) => {
                const currentVal = formData[q.id]
                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                      {q.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      {q.whyWeAsk}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, [q.id]: 'no' }))}
                        className={`min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          currentVal === 'no'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, [q.id]: 'yes' }))}
                        className={`min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          currentVal === 'yes'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
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
              className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-6"
            >
              <span>Save & continue to health history</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 6: FULL INTAKE - HEALTH HISTORY (Multi-select chips)
            =================================================================== */}
        {stage === 'intake_history' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <button
              type="button"
              onClick={() => setStage('intake_safety')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
                  Section 4 of 5 · Health history
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                  Any diagnosed conditions?
                </h1>
                <p className="text-sm text-slate-500">
                  Select all that apply. This helps your clinician customize supportive diet and medication guidance.
                </p>
              </div>
              <HealthHistoryIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
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
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{item}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                syncProgressSilent('intake_medication', 4)
                setStage('intake_medication')
              }}
              className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue to medication history</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7A: PRIOR MEDICATION HISTORY
            =================================================================== */}
        {stage === 'intake_medication' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <button
              type="button"
              onClick={() => setStage('intake_history')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
              Section 5 of 5 · Medication background
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
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
                    className={`w-full min-h-[52px] p-4 rounded-xl text-left text-xs sm:text-sm font-medium border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
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
              className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue to account setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7B: ACCOUNT CREATION & SUBMIT
            =================================================================== */}
        {stage === 'intake_account' && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 sm:p-8 md:p-10 text-slate-900 shadow-sm transition-all">
            <AssessmentBrandHeader />
            <button
              type="button"
              onClick={() => setStage('intake_medication')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider block mb-1">
                  Final step · Confidential account
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug mb-2">
                  Save your health profile
                </h1>
                <p className="text-sm text-slate-500">
                  Create your secure portal login to view your physician&apos;s recommendations and schedule your consultation.
                </p>
              </div>
              <AccountSecurityIllustration className="w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
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
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                    className="w-full min-h-[48px] px-4 pr-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-[#00A884] focus:outline-none"
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
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-4"
              >
                {isSubmitting ? (
                  <span>Saving your assessment...</span>
                ) : (
                  <>
                    <span>Complete assessment</span>
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
