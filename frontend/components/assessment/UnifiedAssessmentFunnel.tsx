'use client'

import React, { useState, useEffect, useId, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BiologicalGender,
  AssessmentInputs,
  convertUnits,
  computeAssessment,
  formatPhoneNumberLive,
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
  Stethoscope,
  Star,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Phone,
  RefreshCw,
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
  PatientProfileIllustration,
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

const SCREENER_STEPS = [
  { id: 1, label: 'Sex', fullTitle: 'Biological Profile', description: 'Metabolic baseline' },
  { id: 2, label: 'Age', fullTitle: 'Age Verification', description: 'Adult clinical eligibility' },
  { id: 3, label: 'Height', fullTitle: 'Height Stature', description: 'Body surface area' },
  { id: 4, label: 'Weight', fullTitle: 'Current Weight', description: 'Dosage calibration' },
  { id: 5, label: 'Waist', fullTitle: 'Waist Measurement', description: 'Visceral fat ratio' },
]



const INTAKE_STEPS = [
  { step: 1, label: 'Profile' },
  { step: 2, label: 'Vitals' },
  { step: 3, label: 'Safety' },
  { step: 4, label: 'History' },
  { step: 5, label: 'Meds' },
  { step: 6, label: 'Lab' },
  { step: 7, label: 'Account' },
]

function IntakeProgressBar({ currentStep, title }: { currentStep: number; title: string }) {
  return (
    <div className="mb-7 pb-4 border-b border-slate-100 select-none">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2.5">
        {INTAKE_STEPS.map((s) => {
          const isPast = s.step < currentStep
          const isCurrent = s.step === currentStep
          return (
            <div
              key={s.step}
              className={`flex flex-col items-center py-1.5 px-0.5 rounded-lg transition-all text-center ${
                isCurrent
                  ? 'bg-emerald-50/80 text-[#00A884] font-bold'
                  : isPast
                  ? 'bg-slate-50 text-slate-700'
                  : 'bg-transparent text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1">
                {isPast ? (
                  <span className="w-3 h-3 rounded-full bg-[#00A884] text-white flex items-center justify-center text-[8px] font-bold">
                    ✓
                  </span>
                ) : (
                  <span
                    className={`w-3 h-3 rounded-full flex items-center justify-center text-[9px] font-mono ${
                      isCurrent ? 'bg-[#00A884] text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s.step}
                  </span>
                )}
                <span className="text-[10px] sm:text-[11px] truncate hidden md:inline">{s.label}</span>
              </div>
              <div className="w-full h-1 mt-1 rounded-full overflow-hidden bg-slate-200/70">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPast || isCurrent ? 'bg-[#00A884]' : 'bg-transparent'
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          Section {currentStep} of 7
        </span>
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

  // Screener inputs (start empty so inputs display placeholders, not pre-filled numbers)
  const [screenerInputs, setScreenerInputs] = useState<AssessmentInputs>({
    gender: '',
    age: 0,
    heightCm: 0,
    weightKg: 0,
    waistCm: 0,
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

    // Vitals (empty strings with placeholders)
    height_cm: '',
    weight_kg: '',
    goal_weight_kg: '',
    gender: '' as unknown as BiologicalGender,
    age: '',
    waist_cm: '',
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
    lab_report_date: '',
    lab_report_within_7_days: false,
    lab_collection_address: '',
    lab_collection_city: '',
    lab_collection_pincode: '',

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
  
  // Waist unit toggle ('in' vs 'cm') with raw string tracking (starts empty to display placeholder)
  const [waistUnit, setWaistUnit] = useState<'in' | 'cm'>('in')
  const [waistRaw, setWaistRaw] = useState<string>('')
  const [isUploadingLab, setIsUploadingLab] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [labDateError, setLabDateError] = useState('')

  // Gate 1: Statutory Data & Privacy Consents
  const [gate1Consents, setGate1Consents] = useState({
    health_data: false,
    care_team_sharing: false,
    comms: false,
    research: false,
  })

  // Date of Birth & Age Restriction (18+ only per government regulations)
  const [patientDob, setPatientDob] = useState('')
  const [isUnder18, setIsUnder18] = useState(false)
  const [dobError, setDobError] = useState('')

  // Patient WhatsApp OTP Verification
  const [patientOtp, setPatientOtp] = useState('')
  const [patientOtpSent, setPatientOtpSent] = useState(false)
  const [patientOtpVerified, setPatientOtpVerified] = useState(false)
  const [isSendingPatientOtp, setIsSendingPatientOtp] = useState(false)
  const [isVerifyingPatientOtp, setIsVerifyingPatientOtp] = useState(false)
  const [patientOtpError, setPatientOtpError] = useState('')
  const [patientOtpCooldown, setPatientOtpCooldown] = useState(0)

  useEffect(() => {
    if (patientOtpCooldown <= 0) return
    const timer = setInterval(() => setPatientOtpCooldown((p) => Math.max(0, p - 1)), 1000)
    return () => clearInterval(timer)
  }, [patientOtpCooldown])

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPatientDob(val)
    if (!val) {
      setIsUnder18(false)
      setDobError('')
      return
    }
    const birthDate = new Date(val)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    if (age < 18) {
      setIsUnder18(true)
      setDobError('Must be 18 or older to proceed.')
    } else {
      setIsUnder18(false)
      setDobError('')
    }
    setFormData((prev) => ({ ...prev, age: String(Math.max(1, age)) }))
  }

  const handleSendPatientOtp = async () => {
    const rawDigits = (formData.phone_number || '').replace(/\D/g, '')
    if (rawDigits.length < 10) {
      setPatientOtpError('Please enter a valid 10-digit mobile number with country code (e.g. +91 98765 43210).')
      return
    }
    if (isUnder18) {
      setPatientOtpError('Treatment is strictly restricted to patients aged 18 and older.')
      return
    }
    setPatientOtpError('')
    setIsSendingPatientOtp(true)
    try {
      const res = await fetch('/api/auth/whatsapp/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phone_number,
          purpose: 'SIGNUP',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch WhatsApp verification code.')
      setPatientOtpSent(true)
      setPatientOtpCooldown(60)
    } catch (err: any) {
      setPatientOtpError(err.message || 'Unable to send WhatsApp OTP.')
    } finally {
      setIsSendingPatientOtp(false)
    }
  }

  const handleVerifyPatientOtp = async () => {
    if (patientOtp.length !== 6) {
      setPatientOtpError('Enter the 6-digit code received on WhatsApp.')
      return null
    }
    setPatientOtpError('')
    setIsVerifyingPatientOtp(true)
    try {
      const res = await fetch('/api/auth/whatsapp/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phone_number,
          otp: patientOtp,
          purpose: 'SIGNUP',
          email: formData.email || undefined,
          firstName: formData.first_name || 'Patient',
          lastName: formData.last_name || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code.')
      setPatientOtpVerified(true)
      
      // Establish session
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        syncSupabaseAuthCookie(data.session)
      }
      return data
    } catch (err: any) {
      setPatientOtpError(err.message || 'OTP verification failed.')
      throw err
    } finally {
      setIsVerifyingPatientOtp(false)
    }
  }

  // Google Places Autocomplete refs
  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteInstanceRef = useRef<any>(null)

  // Accessible unique IDs
  const ageId = useId()
  const heightId = useId()
  const weightId = useId()
  const waistId = useId()
  const goalWeightId = useId()

  // Google Places Autocomplete for doorstep sample collection
  useEffect(() => {
    if (formData.lab_preference !== 'third_party') return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDMBnA2Ud3NySBkP9CrcttVXa5yS_AHmuE'

    const initAutocomplete = () => {
      const g = typeof window !== 'undefined' ? (window as any).google : null
      if (!addressInputRef.current || !g?.maps?.places?.Autocomplete) return

      if (autocompleteInstanceRef.current && g.maps.event?.clearInstanceListeners) {
        g.maps.event.clearInstanceListeners(autocompleteInstanceRef.current)
      }

      try {
        const autocomplete = new g.maps.places.Autocomplete(addressInputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address', 'name'],
          types: ['geocode', 'establishment'],
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (!place) return

          let postalCode = ''
          let city = ''

          if (place.address_components) {
            for (const comp of place.address_components) {
              const types = comp.types || []
              if (types.includes('postal_code')) {
                postalCode = comp.long_name || comp.short_name
              }
              if (types.includes('locality')) {
                city = comp.long_name
              } else if (!city && types.includes('administrative_area_level_2')) {
                city = comp.long_name
              } else if (!city && types.includes('sublocality_level_1')) {
                city = comp.long_name
              }
            }
          }

          const formatted = place.formatted_address || place.name || addressInputRef.current?.value || ''

          setFormData((prev) => ({
            ...prev,
            lab_collection_address: formatted,
            lab_collection_city: city || prev.lab_collection_city,
            lab_collection_pincode: postalCode || prev.lab_collection_pincode,
          }))
        })

        autocompleteInstanceRef.current = autocomplete
      } catch (err) {
        console.warn('Google Places autocomplete init warning:', err)
      }
    }

    if (typeof window !== 'undefined') {
      const g = (window as any).google
      if (g?.maps?.places?.Autocomplete) {
        const t = setTimeout(initAutocomplete, 50)
        return () => clearTimeout(t)
      } else {
        const scriptId = 'google-maps-places-sdk'
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement
        if (!existingScript) {
          const script = document.createElement('script')
          script.id = scriptId
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
          script.async = true
          script.defer = true
          script.onload = () => {
            setTimeout(initAutocomplete, 50)
          }
          document.head.appendChild(script)
        } else {
          existingScript.addEventListener('load', () => setTimeout(initAutocomplete, 50))
        }
      }
    }

    return () => {
      const g = typeof window !== 'undefined' ? (window as any).google : null
      if (autocompleteInstanceRef.current && g?.maps?.event?.clearInstanceListeners) {
        g.maps.event.clearInstanceListeners(autocompleteInstanceRef.current)
      }
    }
  }, [formData.lab_preference])

  // Track mobile viewport vs desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Silent progress restore & auto-save (restores entered vitals & inputs across page reloads/navigations)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.stage && initialStage === 'screener') setStage(parsed.stage)
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }))
        if (parsed.screenerInputs) setScreenerInputs((prev) => ({ ...prev, ...parsed.screenerInputs }))
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

  // Save progress metadata and input state to prevent data loss on refresh/navigation
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stage,
          formData,
          screenerInputs,
        })
      )
    } catch {
      // Silent error
    }
  }, [stage, formData, screenerInputs])

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

  // Computed live units (safeguarded against empty inputs during direct typing)
  const safeAge = screenerInputs.age > 0 ? Math.max(18, Math.min(85, screenerInputs.age)) : 30
  const safeHeight = screenerInputs.heightCm > 0 ? Math.max(130, Math.min(220, screenerInputs.heightCm)) : 165
  const safeWeight = screenerInputs.weightKg > 0 ? Math.max(35, Math.min(200, screenerInputs.weightKg)) : 70
  const safeWaist = screenerInputs.waistCm > 0 ? Math.max(45, Math.min(160, screenerInputs.waistCm)) : 86

  const heightFormatted = convertUnits(safeHeight, 'height')
  const weightFormatted = convertUnits(safeWeight, 'weight')
  const waistFormatted = convertUnits(safeWaist, 'waist')
  const results = computeAssessment({
    gender: screenerInputs.gender || 'female',
    age: safeAge,
    heightCm: safeHeight,
    weightKg: safeWeight,
    waistCm: safeWaist,
  })

  // Handle gender selection with smooth feedback and auto-advance
  const handleGenderSelect = (gender: BiologicalGender) => {
    setScreenerInputs((prev) => ({ ...prev, gender }))
    setFormData((prev) => ({ ...prev, gender }))
    setTimeout(() => {
      setScreenerStep(2)
    }, 240)
  }

  // Prepopulate Vitals from Screener when moving to Intake (keep empty if screener was 0)
  const startIntakeFromTransition = () => {
    setFormData((prev) => ({
      ...prev,
      height_cm: prev.height_cm || (screenerInputs.heightCm > 0 ? String(screenerInputs.heightCm) : ''),
      weight_kg: prev.weight_kg || (screenerInputs.weightKg > 0 ? String(screenerInputs.weightKg) : ''),
      waist_cm: prev.waist_cm || (screenerInputs.waistCm > 0 ? String(screenerInputs.waistCm) : ''),
      age: prev.age || (screenerInputs.age > 0 ? String(screenerInputs.age) : ''),
      gender: (screenerInputs.gender || prev.gender) as BiologicalGender,
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
      if (isUnder18) {
        throw new Error('Treatment is strictly restricted to patients aged 18 and older as per clinical guidelines and government regulations.')
      }

      if (!formData.phone_number || formData.phone_number.replace(/\D/g, '').length < 10) {
        throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).')
      }

      // Gate 1: Statutory Consent Validation
      if (!gate1Consents.health_data || !gate1Consents.care_team_sharing) {
        throw new Error('Please review and check the required health data and care team sharing consent checkboxes.')
      }

      const { data: { session } } = await supabase.auth.getSession()
      let userId = session?.user.id || currentUserId
      let accessToken = session?.access_token || null

      // If user is not yet authenticated, verify via WhatsApp OTP
      if (!userId) {
        if (!patientOtpVerified) {
          if (!patientOtpSent) {
            await handleSendPatientOtp()
            setFormError('A 6-digit verification code has been sent to your WhatsApp. Please enter the code below to complete onboarding.')
            setIsSubmitting(false)
            return
          }
          if (patientOtp.length !== 6) {
            throw new Error('Please enter the 6-digit WhatsApp verification code.')
          }
          const verifiedData = await handleVerifyPatientOtp()
          if (!verifiedData) {
            throw new Error('Failed to verify OTP. Please try again.')
          }
          userId = verifiedData.userId || verifiedData.user?.id
          accessToken = verifiedData.session?.access_token || null
        }
      }

      if (!userId) {
        throw new Error('Unable to authenticate account. Please verify via WhatsApp OTP.')
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
            first_name: formData.first_name || (formData.email ? formData.email.split('@')[0] : 'Patient'),
            age: formData.age || (screenerInputs.age > 0 ? String(screenerInputs.age) : '30'),
            height_cm: formData.height_cm || (screenerInputs.heightCm > 0 ? String(screenerInputs.heightCm) : '165'),
            weight_kg: formData.weight_kg || (screenerInputs.weightKg > 0 ? String(screenerInputs.weightKg) : '70'),
            waist_cm: screenerInputs.waistCm || formData.waist_cm || '86',
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

      // Direct transition to consultation payment (No email verification or Gmail redirect)
      window.location.href = '/consultation-payment'
    } catch (err: any) {
      setFormError(err instanceof DOMException && err.name === 'AbortError'
        ? 'This is taking longer than expected. Please check your connection and try again.'
        : err.message || 'Unable to submit assessment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dynamic stage container max-width to ensure optimal responsive layout on mobile, tablet, and desktop
  const stageContainerClass = useMemo(() => {
    switch (stage) {
      case 'screener':
        return 'max-w-[580px] md:max-w-[680px]'
      case 'results':
        return 'max-w-[580px] md:max-w-[840px] lg:max-w-[920px]'
      case 'transition':
        return 'max-w-[580px] md:max-w-[880px] lg:max-w-[960px]'
      case 'intake_contact':
      case 'intake_vitals':
      case 'intake_safety':
      case 'intake_history':
      case 'intake_lab':
      case 'intake_medication':
      case 'intake_account':
        return 'max-w-[580px] md:max-w-[760px]'
      default:
        return 'max-w-[580px] md:max-w-[680px]'
    }
  }, [stage])

  /* =========================================================================
     RENDERERS
     ========================================================================= */

  return (
    <div ref={topAnchorRef} className={`w-full flex justify-center ${className}`}>
      <div className={`w-full ${stageContainerClass} transition-all duration-300 ease-out`}>
        
        {/* ===================================================================
            SCREEN 1: SCREENER (Mobile 1-question view / Desktop 2-column grid)
            =================================================================== */}
        {stage === 'screener' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all">
            <AssessmentBrandHeader />
            
            {/* Interactive Clinical Biometric Step Navigator */}
            <div className="mb-8 select-none">
              {/* 5 Interactive Step Segments */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3">
                {SCREENER_STEPS.map((s) => {
                  const isPast = s.id < screenerStep
                  const isCurrent = s.id === screenerStep
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScreenerStep(s.id)}
                      className={`group flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                        isCurrent
                          ? 'bg-emerald-50/90 text-[#00A884] ring-1 ring-[#00A884]/40 shadow-xs'
                          : isPast
                          ? 'bg-slate-50 hover:bg-emerald-50/50 text-slate-700 hover:text-[#00A884] border border-slate-200/60'
                          : 'bg-stone-50/50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-100'
                      }`}
                      aria-label={`Jump to ${s.fullTitle}`}
                      title={`Click to jump to ${s.fullTitle}`}
                    >
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {isPast ? (
                          <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#00A884] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            ✓
                          </span>
                        ) : (
                          <span
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                              isCurrent
                                ? 'bg-[#00A884] text-white shadow-xs'
                                : 'bg-slate-200/80 text-slate-500 group-hover:bg-slate-300'
                            }`}
                          >
                            {s.id}
                          </span>
                        )}
                        <span className="text-[11px] sm:text-xs font-sans font-semibold tracking-tight truncate">
                          {s.label}
                        </span>
                      </div>

                      {/* Interactive hairline segment track */}
                      <div className="w-full h-1 mt-1.5 rounded-full overflow-hidden bg-slate-200/70">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isPast || isCurrent
                              ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70]'
                              : 'bg-transparent'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Active Step Context Headline */}
              <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
                  <span className="font-semibold text-slate-800">
                    {SCREENER_STEPS[screenerStep - 1].fullTitle}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">
                    · {SCREENER_STEPS[screenerStep - 1].description}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-400">
                  {screenerStep} of 5
                </span>
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
                      className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col items-center text-center gap-3.5 cursor-pointer relative group ${
                        screenerInputs.gender === 'female'
                          ? 'bg-emerald-50/60 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-xs'
                      }`}
                    >
                      <div className="absolute top-4 right-4">
                        {screenerInputs.gender === 'female' ? (
                          <div className="w-5 h-5 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-slate-300 transition-colors" />
                        )}
                      </div>

                      <GenderFemaleIllustration className="w-16 h-16 sm:w-18 sm:h-18" />

                      <div>
                        <span className="font-sans text-lg font-bold text-slate-900 block mb-0.5">Female</span>
                        <span className="font-sans text-xs text-slate-500 font-medium">Biological female physiology</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenderSelect('male')}
                      className={`p-6 sm:p-7 rounded-2xl border transition-all flex flex-col items-center text-center gap-3.5 cursor-pointer relative group ${
                        screenerInputs.gender === 'male'
                          ? 'bg-emerald-50/60 border-[#00A884] ring-2 ring-[#00A884]/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-xs'
                      }`}
                    >
                      <div className="absolute top-4 right-4">
                        {screenerInputs.gender === 'male' ? (
                          <div className="w-5 h-5 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-slate-300 transition-colors" />
                        )}
                      </div>

                      <GenderMaleIllustration className="w-16 h-16 sm:w-18 sm:h-18" />

                      <div>
                        <span className="font-sans text-lg font-bold text-slate-900 block mb-0.5">Male</span>
                        <span className="font-sans text-xs text-slate-500 font-medium">Biological male physiology</span>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!screenerInputs.gender}
                    onClick={() => {
                      if (screenerInputs.gender) setScreenerStep(2)
                    }}
                    className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] disabled:opacity-50 disabled:pointer-events-none text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
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

                  {/* Luxury Biometric Counter with Direct Accessible Manual Entry */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, age: Math.max(18, (p.age || 30) - 1) }))}
                      disabled={screenerInputs.age > 0 && screenerInputs.age <= 18}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Decrease age by 1 year"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[160px] flex flex-col items-center">
                      <input
                        id={ageId}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={18}
                        max={85}
                        placeholder="30"
                        value={screenerInputs.age === 0 ? '' : screenerInputs.age}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                          if (!isNaN(val)) {
                            setScreenerInputs((prev) => ({ ...prev, age: val }))
                          }
                        }}
                        onBlur={() => {
                          if (screenerInputs.age > 0) {
                            setScreenerInputs((prev) => ({
                              ...prev,
                              age: Math.max(18, Math.min(85, prev.age)),
                            }))
                          }
                        }}
                        aria-label="Enter age in years"
                        className="w-32 sm:w-40 text-center font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-[#00A884] focus:outline-none transition-all p-0 placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer focus:cursor-text"
                      />
                      <label htmlFor={ageId} className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1 cursor-pointer">
                        {screenerInputs.age === 0 ? 'years of age' : `${screenerInputs.age} years of age`}
                      </label>
                      {screenerInputs.age > 0 && screenerInputs.age < 18 && (
                        <p className="text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 mt-2 font-semibold text-center">
                          Must be 18 or older to proceed.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, age: Math.min(85, (p.age || 30) + 1) }))}
                      disabled={screenerInputs.age >= 85}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Increase age by 1 year"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((safeAge - 18) / (85 - 18)) * 100
                      return (
                        <input
                          type="range"
                          min={18}
                          max={85}
                          step={1}
                          inputMode="numeric"
                          value={safeAge}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, age: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                          aria-label="Age slider control"
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
                      onClick={() => {
                        setScreenerInputs((prev) => ({
                          ...prev,
                          age: prev.age > 0 ? Math.max(18, Math.min(85, prev.age)) : 30,
                        }))
                        setScreenerStep(3)
                      }}
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

                  {/* Luxury Biometric Counter with Direct Accessible Manual Entry */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, heightCm: Math.max(130, (p.heightCm || 165) - 1) }))}
                      disabled={screenerInputs.heightCm > 0 && screenerInputs.heightCm <= 130}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Decrease height by 1 cm"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px] flex flex-col items-center">
                      <input
                        id={heightId}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={130}
                        max={220}
                        placeholder="165"
                        value={screenerInputs.heightCm === 0 ? '' : screenerInputs.heightCm}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                          if (!isNaN(val)) {
                            setScreenerInputs((prev) => ({ ...prev, heightCm: val }))
                          }
                        }}
                        onBlur={() => {
                          if (screenerInputs.heightCm > 0) {
                            setScreenerInputs((prev) => ({
                              ...prev,
                              heightCm: Math.max(130, Math.min(220, prev.heightCm)),
                            }))
                          }
                        }}
                        aria-label="Enter height in centimeters"
                        className="w-32 sm:w-44 text-center font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-[#00A884] focus:outline-none transition-all p-0 placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer focus:cursor-text"
                      />
                      <label htmlFor={heightId} className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1 cursor-pointer">
                        {screenerInputs.heightCm === 0 ? 'centimeters (cm)' : `cm · ${heightFormatted.imperialLabel}`}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, heightCm: Math.min(220, (p.heightCm || 165) + 1) }))}
                      disabled={screenerInputs.heightCm >= 220}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Increase height by 1 cm"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((safeHeight - 130) / (220 - 130)) * 100
                      return (
                        <input
                          type="range"
                          min={130}
                          max={220}
                          step={1}
                          inputMode="numeric"
                          value={safeHeight}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, heightCm: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                          aria-label="Height slider control"
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
                      onClick={() => {
                        setScreenerInputs((prev) => ({
                          ...prev,
                          heightCm: prev.heightCm > 0 ? Math.max(130, Math.min(220, prev.heightCm)) : 165,
                        }))
                        setScreenerStep(4)
                      }}
                      className="flex-1 min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Weight (Exclusively KG, No LBS, Direct Editable Number) */}
              {screenerStep === 4 && (
                <div key="step-4" className="animate-funnel-step">
                  <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#11241A] tracking-tight leading-tight mb-2">
                    What is your current weight?
                  </h1>
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Prescription titrations are calibrated against your starting weight to guarantee safety and efficacy.
                  </p>

                  {/* Luxury Biometric Counter with Direct Accessible Manual Entry */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, weightKg: Math.max(35, (p.weightKg || 70) - 1) }))}
                      disabled={screenerInputs.weightKg > 0 && screenerInputs.weightKg <= 35}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Decrease weight by 1 kg"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px] flex flex-col items-center">
                      <input
                        id={weightId}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={35}
                        max={200}
                        placeholder="70"
                        value={screenerInputs.weightKg === 0 ? '' : screenerInputs.weightKg}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                          if (!isNaN(val)) {
                            setScreenerInputs((prev) => ({ ...prev, weightKg: val }))
                          }
                        }}
                        onBlur={() => {
                          if (screenerInputs.weightKg > 0) {
                            setScreenerInputs((prev) => ({
                              ...prev,
                              weightKg: Math.max(35, Math.min(200, prev.weightKg)),
                            }))
                          }
                        }}
                        aria-label="Enter weight in kilograms"
                        className="w-32 sm:w-44 text-center font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-[#00A884] focus:outline-none transition-all p-0 placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer focus:cursor-text"
                      />
                      <label htmlFor={weightId} className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1 cursor-pointer">
                        {screenerInputs.weightKg === 0 ? 'kilograms (kg)' : `${screenerInputs.weightKg} kg`}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreenerInputs((p) => ({ ...p, weightKg: Math.min(200, (p.weightKg || 70) + 1) }))}
                      disabled={screenerInputs.weightKg >= 200}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label="Increase weight by 1 kg"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider (Strictly KG) */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      const percent = ((safeWeight - 35) / (200 - 35)) * 100
                      return (
                        <input
                          type="range"
                          min={35}
                          max={200}
                          step={1}
                          inputMode="numeric"
                          value={safeWeight}
                          onChange={(e) =>
                            setScreenerInputs((prev) => ({ ...prev, weightKg: Number(e.target.value) }))
                          }
                          style={{
                            background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                          }}
                          className="luxury-slider"
                          aria-label="Weight slider control"
                        />
                      )
                    })()}
                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                      <span>35 kg</span>
                      <span>200 kg</span>
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
                      onClick={() => {
                        setScreenerInputs((prev) => ({
                          ...prev,
                          weightKg: prev.weightKg > 0 ? Math.max(35, Math.min(200, prev.weightKg)) : 70,
                        }))
                        setScreenerStep(5)
                      }}
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
                  <p className="font-sans text-sm sm:text-base text-slate-500 mb-6 max-w-lg leading-relaxed">
                    Waist-to-height ratio is the clinical gold standard for assessing visceral fat and metabolic syndrome risk.
                  </p>

                  {/* Unit Selector (Inches vs Centimeters) */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setWaistUnit('in')
                          if (screenerInputs.waistCm > 0) {
                            setWaistRaw(String(Math.round(screenerInputs.waistCm / 2.54)))
                          } else {
                            setWaistRaw('')
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                          waistUnit === 'in'
                            ? 'bg-white text-[#00A884] shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Inches (in)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWaistUnit('cm')
                          if (screenerInputs.waistCm > 0) {
                            setWaistRaw(String(screenerInputs.waistCm))
                          } else {
                            setWaistRaw('')
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                          waistUnit === 'cm'
                            ? 'bg-white text-[#00A884] shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Centimeters (cm)
                      </button>
                    </div>
                  </div>

                  {/* Luxury Biometric Counter with Direct Accessible Manual Entry */}
                  <div className="flex items-center justify-center gap-6 my-6 sm:my-8">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseInt(waistRaw, 10)
                        if (waistUnit === 'in') {
                          const current = isNaN(parsed) ? 34 : parsed
                          const nextVal = Math.max(18, current - 1)
                          setWaistRaw(String(nextVal))
                          setScreenerInputs((p) => ({ ...p, waistCm: Math.round(nextVal * 2.54) }))
                        } else {
                          const current = isNaN(parsed) ? 86 : parsed
                          const nextVal = Math.max(45, current - 1)
                          setWaistRaw(String(nextVal))
                          setScreenerInputs((p) => ({ ...p, waistCm: nextVal }))
                        }
                      }}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label={waistUnit === 'in' ? 'Decrease waist by 1 inch' : 'Decrease waist by 1 cm'}
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[170px] flex flex-col items-center">
                      <input
                        id={waistId}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={waistUnit === 'in' ? 18 : 45}
                        max={waistUnit === 'in' ? 65 : 165}
                        placeholder={waistUnit === 'in' ? '34' : '86'}
                        value={waistRaw}
                        onChange={(e) => {
                          const val = e.target.value
                          setWaistRaw(val)
                          const parsed = parseInt(val, 10)
                          if (!isNaN(parsed) && parsed > 0) {
                            if (waistUnit === 'in') {
                              setScreenerInputs((prev) => ({ ...prev, waistCm: Math.round(parsed * 2.54) }))
                            } else {
                              setScreenerInputs((prev) => ({ ...prev, waistCm: parsed }))
                            }
                          } else {
                            setScreenerInputs((prev) => ({ ...prev, waistCm: 0 }))
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(waistRaw, 10)
                          if (!isNaN(parsed) && parsed > 0) {
                            if (waistUnit === 'in') {
                              const clamped = Math.max(18, Math.min(65, parsed))
                              setWaistRaw(String(clamped))
                              setScreenerInputs((prev) => ({ ...prev, waistCm: Math.round(clamped * 2.54) }))
                            } else {
                              const clamped = Math.max(45, Math.min(165, parsed))
                              setWaistRaw(String(clamped))
                              setScreenerInputs((prev) => ({ ...prev, waistCm: clamped }))
                            }
                          }
                        }}
                        aria-label={waistUnit === 'in' ? 'Enter waist in inches' : 'Enter waist in centimeters'}
                        className="w-32 sm:w-44 text-center font-sans text-6xl sm:text-7xl font-extrabold text-[#11241A] tracking-tight tabular-nums bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-[#00A884] focus:outline-none transition-all p-0 placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer focus:cursor-text"
                      />
                      <label htmlFor={waistId} className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mt-1 cursor-pointer">
                        {waistRaw ? (
                          waistUnit === 'in'
                            ? `inches · ${Math.round((parseInt(waistRaw, 10) || 34) * 2.54)} cm`
                            : `cm · ${Math.round((parseInt(waistRaw, 10) || 86) / 2.54)}"`
                        ) : (
                          waistUnit === 'in' ? 'inches' : 'centimeters'
                        )}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseInt(waistRaw, 10)
                        if (waistUnit === 'in') {
                          const current = isNaN(parsed) ? 34 : parsed
                          const nextVal = Math.min(65, current + 1)
                          setWaistRaw(String(nextVal))
                          setScreenerInputs((p) => ({ ...p, waistCm: Math.round(nextVal * 2.54) }))
                        } else {
                          const current = isNaN(parsed) ? 86 : parsed
                          const nextVal = Math.min(165, current + 1)
                          setWaistRaw(String(nextVal))
                          setScreenerInputs((p) => ({ ...p, waistCm: nextVal }))
                        }
                      }}
                      className="w-12 h-12 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                      aria-label={waistUnit === 'in' ? 'Increase waist by 1 inch' : 'Increase waist by 1 cm'}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tactile Range Slider */}
                  <div className="px-2 py-4 mb-4">
                    {(() => {
                      if (waistUnit === 'in') {
                        const parsed = parseInt(waistRaw, 10)
                        const currentInches = !isNaN(parsed) && parsed > 0 ? parsed : 34
                        const clamped = Math.max(18, Math.min(65, currentInches))
                        const percent = ((clamped - 18) / (65 - 18)) * 100
                        return (
                          <>
                            <input
                              type="range"
                              min={18}
                              max={65}
                              step={1}
                              inputMode="numeric"
                              value={clamped}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setWaistRaw(String(val))
                                setScreenerInputs((prev) => ({ ...prev, waistCm: Math.round(val * 2.54) }))
                              }}
                              style={{
                                background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                              }}
                              className="luxury-slider"
                              aria-label="Waist slider in inches"
                            />
                            <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                              <span>18 in (45 cm)</span>
                              <span>65 in (165 cm)</span>
                            </div>
                          </>
                        )
                      } else {
                        const parsed = parseInt(waistRaw, 10)
                        const currentCm = !isNaN(parsed) && parsed > 0 ? parsed : 86
                        const clamped = Math.max(45, Math.min(165, currentCm))
                        const percent = ((clamped - 45) / (165 - 45)) * 100
                        return (
                          <>
                            <input
                              type="range"
                              min={45}
                              max={165}
                              step={1}
                              inputMode="numeric"
                              value={clamped}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setWaistRaw(String(val))
                                setScreenerInputs((prev) => ({ ...prev, waistCm: val }))
                              }}
                              style={{
                                background: `linear-gradient(to right, #00A884 0%, #00A884 ${percent}%, #E2E8F0 ${percent}%, #E2E8F0 100%)`,
                              }}
                              className="luxury-slider"
                              aria-label="Waist slider in centimeters"
                            />
                            <div className="flex justify-between text-xs font-mono text-slate-400 mt-2 font-medium">
                              <span>45 cm (18&quot;)</span>
                              <span>165 cm (65&quot;)</span>
                            </div>
                          </>
                        )
                      }
                    })()}
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
                      onClick={() => {
                        const parsed = parseInt(waistRaw, 10)
                        const defaultCm = 86
                        const finalCm = !isNaN(parsed) && parsed > 0
                          ? (waistUnit === 'in' ? Math.round(Math.max(18, Math.min(65, parsed)) * 2.54) : Math.max(45, Math.min(165, parsed)))
                          : defaultCm
                        setScreenerInputs((prev) => ({
                          gender: prev.gender || 'female',
                          age: prev.age > 0 ? prev.age : 30,
                          heightCm: prev.heightCm > 0 ? prev.heightCm : 165,
                          weightKg: prev.weightKg > 0 ? prev.weightKg : 70,
                          waistCm: prev.waistCm > 0 ? prev.waistCm : finalCm,
                        }))
                        setStage('results')
                      }}
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
              <DoctorConsultationIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
            </div>

            {/* Clinical Metric Cards: 2-column grid on tablet/desktop, stacked on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 1. BMI Donut Card (Step 1 reveal) */}
              <div
                className={`transition-all duration-500 ${
                  resultsRevealStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                } ${results.bmi.cardBgClass} border ${results.bmi.cardBorderClass} rounded-2xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 shadow-xs h-full`}
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
                } bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between`}
              >
                <div>
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
              </div>
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
            TRANSITION SCREEN (Luxury Clinical Concierge Eligibility Experience)
            =================================================================== */}
        {stage === 'transition' && (
          <div className="bg-white/95 backdrop-blur-2xl border border-stone-200/90 ring-1 ring-black/[0.03] rounded-[28px] sm:rounded-[36px] p-6 sm:p-9 md:p-11 text-slate-900 shadow-[0_30px_80px_-15px_rgba(11,36,26,0.08),0_10px_30px_-5px_rgba(11,36,26,0.04)] transition-all text-left animate-funnel-step">
            <AssessmentBrandHeader />

            {/* 1. Status Hero: Verified Clinical Qualification Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0A2617] via-[#061C10] to-[#030E07] border border-emerald-500/30 p-6 sm:p-7 text-white shadow-xl mb-6">
              {/* Ambient atmospheric glow flare */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#00A884]/25 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse" />
                    <span>Clinical Eligibility Confirmed</span>
                  </div>
                  <h1 className="font-sans text-2xl sm:text-[28px] font-extrabold text-white tracking-tight leading-snug">
                    You qualify for physician-supervised GLP-1 care
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-md">
                    Based on your Body Mass Index of <strong className="text-teal-300">{results.bmi.score}</strong> and metabolic telemetry, our medical board recommends a customized clinical weight management protocol.
                  </p>
                </div>

                {/* Metric Telemetry Pill */}
                <div className="shrink-0 flex sm:flex-col items-center justify-center px-4 py-3 sm:py-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">BMI Metric</span>
                  <span className="font-sans text-xl sm:text-2xl font-extrabold text-white tabular-nums">{results.bmi.score}</span>
                  <span className="text-[11px] text-teal-300 font-semibold">{results.bmi.headline}</span>
                </div>
              </div>
            </div>

            {/* 2. The 3-Step Concierge Care Pathway */}
            <div className="mb-6">
              <span className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Your Clinical Journey to Care
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Step 1 */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start gap-3 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors h-full">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    01
                  </div>
                  <div>
                    <h2 className="font-sans text-sm font-bold text-[#11241A] leading-snug">
                      Complete Health Intake · ~3 mins
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Confirm your vitals, lifestyle habits, and medical safety history for our physicians.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start gap-3 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors h-full">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    02
                  </div>
                  <div>
                    <h2 className="font-sans text-sm font-bold text-[#11241A] leading-snug">
                      1-on-1 Dedicated Doctor Telehealth
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Private video review with a licensed General Medicine / Endocrinology physician.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start gap-3 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors h-full">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[#00A884] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    03
                  </div>
                  <div>
                    <h2 className="font-sans text-sm font-bold text-[#11241A] leading-snug">
                      Prescription Protocol & Clinical Care Plan
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Custom GLP-1 titration and Indian meal plan coordinated by your dedicated physician.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Medical Reassurance Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6 text-xs text-slate-600">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/70">
                <Check className="w-4 h-4 text-[#00A884] shrink-0 stroke-[2.5]" />
                <span className="font-medium text-[11px] sm:text-xs">No upfront payment</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/70">
                <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">100% HIPAA Private</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/70">
                <Lock className="w-4 h-4 text-[#00A884] shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">Licensed Physicians</span>
              </div>
            </div>

            {/* 4. High-Conversion Primary CTA */}
            <div>
              <button
                type="button"
                onClick={startIntakeFromTransition}
                className="w-full min-h-[52px] py-4 px-8 rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-[#00A884]/25 hover:shadow-xl active:scale-[0.99] group"
              >
                <span>Continue to Confidential Intake</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                Takes ~3 minutes · No initial payment required · Free medical pre-screening
              </p>
            </div>
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
              <PatientProfileIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
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
                if (!formData.agree_terms) {
                  setFormError('Please agree to the medical terms and privacy policy to continue.')
                  return
                }
                syncProgressSilent('intake_vitals', 1)
                setStage('intake_vitals')
              }}
              className="space-y-4"
            >
              {/* First & Last name: 2 cols on tablet/desktop, stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">First name</label>
                  <input
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="e.g. Priya"
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
                    placeholder="e.g. Sharma"
                    value={formData.last_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                </div>
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
              <VitalsTelemetryIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
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
                    placeholder="e.g. 165"
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
                    placeholder="e.g. 70"
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
                  placeholder="e.g. 60"
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
              <SafetyShieldIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
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
              <HealthHistoryIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
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
                syncProgressSilent('intake_medication', 4)
                setStage('intake_medication')
              }}
              className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]"
            >
              <span>Continue to Medication History</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 5: PRIOR MEDICATION HISTORY
            =================================================================== */}
        {stage === 'intake_medication' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={5} title="Medication History" />
            <button
              type="button"
              onClick={() => setStage('intake_history')}
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
                syncProgressSilent('intake_lab', 5)
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
            SCREEN 6: LAB WORK / BLOOD REPORT (LAST CLINICAL STEP)
            =================================================================== */}
        {stage === 'intake_lab' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={6} title="Diagnostic Blood Work" />
            <button
              type="button"
              onClick={() => setStage('intake_medication')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex justify-center mb-6">
              <LabWorkIllustration className="w-16 h-16 sm:w-18 sm:h-18" />
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2 text-center">
              Blood Work &amp; Lab Report
            </h1>
            <p className="font-sans text-sm text-slate-500 mb-8 text-center max-w-md mx-auto">
              Please choose one of the three options below regarding your diagnostic lab work.
            </p>

            <div className="space-y-4 mb-8">
              {/* Option 1: I have a lab report (Max 7 days validity condition) */}
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
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block">I have a lab report</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                        7-day validity
                      </span>
                    </div>
                    <span className="font-sans text-xs text-slate-500 mt-0.5 block">Upload your recent blood test report (conducted within the last 7 days).</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'upload' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'upload' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
                
                {formData.lab_preference === 'upload' && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3.5">
                    {/* Clinical Rule Notice */}
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 leading-relaxed">
                        <strong className="font-bold block text-amber-950 mb-0.5">7-Day Recency Requirement:</strong>
                        To safely determine GLP-1 dosage and evaluate biomarkers, your lab report must be taken within the last 7 days. Reports older than 7 days cannot be accepted.
                      </div>
                    </div>

                    {/* Report Date Input */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Date when test was taken <span className="text-[#00A884]">*</span>
                      </label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        value={formData.lab_report_date}
                        onChange={(e) => {
                          const selected = e.target.value
                          if (!selected) {
                            setLabDateError('')
                            setFormData(prev => ({ ...prev, lab_report_date: '', lab_report_within_7_days: false }))
                            return
                          }
                          const testTime = new Date(selected).getTime()
                          const now = Date.now()
                          const diffDays = (now - testTime) / (24 * 60 * 60 * 1000)
                          if (diffDays > 7.05) {
                            setLabDateError('This report was taken more than 7 days ago. Only reports from the past 7 days are valid. You can request a doorstep test (Option 2) or proceed without a report.')
                            setFormData(prev => ({ ...prev, lab_report_date: selected, lab_report_within_7_days: false }))
                          } else {
                            setLabDateError('')
                            setFormData(prev => ({ ...prev, lab_report_date: selected, lab_report_within_7_days: true }))
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                      />
                      {labDateError && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg mt-1.5 border border-rose-200">{labDateError}</p>
                      )}
                    </div>

                    {/* File Upload Box */}
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

                    {/* Confirmation Checkbox */}
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1 bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <input
                        type="checkbox"
                        checked={formData.lab_report_within_7_days}
                        onChange={(e) => setFormData(p => ({ ...p, lab_report_within_7_days: e.target.checked }))}
                        className="w-4 h-4 mt-0.5 rounded text-[#00A884] border-slate-300 focus:ring-[#00A884] cursor-pointer"
                      />
                      <span className="leading-relaxed">
                        I confirm this blood report was conducted within the past 7 days and accurately reflects my current health markers.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Option 2: I don't have a report, get a lab report from 8live */}
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
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block">I don&apos;t have a report — Get a lab report from 8live</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300/80 inline-flex items-center gap-1 shrink-0">
                        <MapPin className="w-2.5 h-2.5 text-amber-700" /> Bangalore Only
                      </span>
                    </div>
                    <span className="font-sans text-xs text-slate-500">We&apos;ll arrange a certified home/doorstep collection via authorized lab partners.</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'third_party' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'third_party' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                {formData.lab_preference === 'third_party' && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3.5">
                    {/* Notice: Available Exclusively in Bangalore */}
                    <div className="bg-amber-50/90 border-2 border-amber-300/80 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3 text-amber-950 shadow-xs">
                      <div className="w-7 h-7 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-800" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs sm:text-sm text-amber-950 font-sora">
                            Available Exclusively in Bangalore
                          </h5>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200/90 text-amber-900 px-1.5 py-0.5 rounded">
                            Notice
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed font-sans">
                          Doorstep blood sample collection is currently serviced <strong>only within Bangalore (Bengaluru)</strong>. If your pickup location is outside Bangalore, you can proceed by uploading an existing report or simply selecting <strong>&ldquo;Proceed without a lab report&rdquo;</strong> below.
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 p-3.5 rounded-xl flex items-start gap-3 border border-emerald-200/60">
                      <CheckCircle className="w-4 h-4 text-[#00A884] shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        <strong className="text-slate-900">Doorstep sample collection:</strong> A certified phlebotomist from our partner lab will visit your Bangalore address for morning fasting blood collection.
                      </p>
                    </div>

                    {/* Collection Address Fields */}
                    <div className="space-y-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Home / Pickup Address (Bangalore) <span className="text-[#00A884]">*</span>
                          </label>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00A884] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                            <Sparkles className="w-2.5 h-2.5" /> Google Auto-fill
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            ref={addressInputRef}
                            type="text"
                            required
                            value={formData.lab_collection_address}
                            onChange={(e) => setFormData((p) => ({ ...p, lab_collection_address: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.preventDefault()
                            }}
                            placeholder="Start typing your apartment, building, or street in Bangalore..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all shadow-xs"
                          />
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            City <span className="text-[#00A884]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.lab_collection_city}
                            onChange={(e) => setFormData((p) => ({ ...p, lab_collection_city: e.target.value }))}
                            placeholder="Bangalore"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all"
                          />
                          {formData.lab_collection_city &&
                            !formData.lab_collection_city.toLowerCase().includes('bangalore') &&
                            !formData.lab_collection_city.toLowerCase().includes('bengaluru') && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 mt-1 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                              <span>Notice: Service is available only in Bangalore.</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            PIN Code <span className="text-[#00A884]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={formData.lab_collection_pincode}
                            onChange={(e) => setFormData((p) => ({ ...p, lab_collection_pincode: e.target.value.replace(/\D/g, '') }))}
                            placeholder="6-digit PIN (e.g. 560001)"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00A884] focus:ring-2 focus:ring-[#00A884]/20 transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 font-medium bg-white/70 rounded-xl p-2.5 border border-slate-200/60">
                        <span className="flex h-2 w-2 rounded-full bg-[#00A884] shrink-0" />
                        <span>Our clinical team will call you directly to schedule your doorstep sample collection.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Proceed without a lab report (Not needed right now) */}
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
                    <span className="font-sans text-sm sm:text-base font-bold text-slate-900 block mb-0.5">Proceed without a lab report</span>
                    <span className="font-sans text-xs text-slate-500">Not needed right now. You can proceed directly and discuss with your physician during consultation.</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${formData.lab_preference === 'skip' ? 'border-[#00A884] bg-[#00A884]' : 'border-slate-300'}`}>
                    {formData.lab_preference === 'skip' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={
                formData.lab_preference === 'none' ||
                (formData.lab_preference === 'upload' && (!formData.lab_report_url || !formData.lab_report_within_7_days || Boolean(labDateError))) ||
                (formData.lab_preference === 'third_party' &&
                  (!formData.lab_collection_address.trim() || formData.lab_collection_pincode.trim().length < 6))
              }
              onClick={() => {
                syncProgressSilent('intake_account', 6)
                setStage('intake_account')
              }}
              className={`w-full min-h-[50px] rounded-full font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                formData.lab_preference === 'skip' ||
                (formData.lab_preference === 'upload' && formData.lab_report_url && formData.lab_report_within_7_days && !labDateError) ||
                (formData.lab_preference === 'third_party' && formData.lab_collection_address.trim().length > 0 && formData.lab_collection_pincode.trim().length >= 6)
                  ? 'bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] text-white shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Continue to Account Setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            SCREEN 7: ACCOUNT CREATION & WHATSAPP OTP VERIFICATION
            =================================================================== */}
        {stage === 'intake_account' && (
          <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 text-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.02)] transition-all animate-funnel-step">
            <AssessmentBrandHeader />
            <IntakeProgressBar currentStep={7} title="Confidential Health Profile" />
            <button
              type="button"
              onClick={() => setStage('intake_lab')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#11241A] mb-5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#11241A] tracking-tight leading-snug mb-2">
                  Complete your clinical profile
                </h1>
                <p className="text-sm text-slate-500">
                  Verify your mobile number via WhatsApp OTP to securely save your profile and proceed to doctor consultation. No email verification required.
                </p>
              </div>
              <AccountSecurityIllustration className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {/* Mobile Number with WhatsApp OTP Send */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Mobile number <span className="text-[#00A884]">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <MessageSquare className="w-3 h-3 text-[#00A884]" /> WhatsApp Verification
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone_number}
                    onChange={handlePhoneChange}
                    disabled={patientOtpVerified}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs disabled:bg-slate-100"
                  />
                  {!patientOtpVerified && !currentUserId && (
                    <button
                      type="button"
                      onClick={handleSendPatientOtp}
                      disabled={isSendingPatientOtp || patientOtpCooldown > 0 || (formData.phone_number.replace(/\D/g, '').length < 10) || isUnder18}
                      className="shrink-0 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {patientOtpCooldown > 0 ? (
                        <span>{patientOtpCooldown}s</span>
                      ) : isSendingPatientOtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : patientOtpSent ? (
                        <span>Resend OTP</span>
                      ) : (
                        <span>Send WhatsApp OTP</span>
                      )}
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  A 6-digit verification code will be sent to your WhatsApp.
                </span>
              </div>

              {/* OTP Input box when sent */}
              {patientOtpSent && !patientOtpVerified && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5 animate-funnel-step">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 block">
                      Enter 6-digit WhatsApp Code
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium">Sent to WhatsApp</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="• • • • • •"
                      value={patientOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setPatientOtp(val)
                        if (val.length === 6) {
                          setTimeout(() => {
                            handleVerifyPatientOtp().catch(() => {})
                          }, 100)
                        }
                      }}
                      className="w-full sm:w-48 min-h-[46px] px-3.5 text-center font-mono text-lg tracking-widest font-extrabold rounded-xl border border-emerald-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyPatientOtp().catch(() => {})}
                      disabled={isVerifyingPatientOtp || patientOtp.length !== 6}
                      className="min-h-[46px] px-5 bg-[#00A884] hover:bg-[#009977] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isVerifyingPatientOtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify Code</span>
                      )}
                    </button>
                  </div>
                  {patientOtpError && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">{patientOtpError}</p>
                  )}
                </div>
              )}

              {/* Verified Badge */}
              {patientOtpVerified && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/80 p-3 rounded-2xl border border-emerald-300/60">
                  <CheckCircle2 className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>Mobile number verified via WhatsApp OTP</span>
                </div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">First name</label>
                  <input
                    type="text"
                    required
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
                    placeholder="Your last name"
                    value={formData.last_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Email Address (Optional / Secondary, NO VERIFICATION REQUIRED) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">No verification link needed</span>
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used only for appointment receipts and prescription copies. Verification is handled exclusively via your WhatsApp number.
                </span>
              </div>

              {/* Date of Birth (Strictly 18+ only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Date of birth <span className="text-[#00A884]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Must be 18+ years of age</span>
                </div>
                <input
                  type="date"
                  required
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  value={patientDob}
                  onChange={handleDobChange}
                  className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200/90 text-sm font-semibold text-[#11241A] bg-slate-50/70 focus:bg-white focus:border-[#00A884] focus:ring-4 focus:ring-[#00A884]/10 focus:outline-none transition-all shadow-xs"
                />
                {isUnder18 && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mt-2 font-semibold">
                    Must be 18 or older to proceed.
                  </p>
                )}
              </div>

              {/* Statutory Gate 1 Data Notice Summary Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00A884]">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Part 4: Data &amp; Privacy Notice</span>
                  </div>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A884] hover:underline"
                  >
                    <span>Full Policy</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="text-[12px] text-slate-600 space-y-1.5 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/70">
                  <p><strong className="text-slate-800">Who is asking:</strong> 8liv Health Platform (www.8liv.in).</p>
                  <p><strong className="text-slate-800">What we collect:</strong> Contact details, date of birth, metabolic vitals, lab reports, and clinical consultation records.</p>
                  <p><strong className="text-slate-800">Why we collect:</strong> Clinical evaluation, doctor-supervised telemedicine, and personalized nutrition &amp; workout protocols.</p>
                  <p><strong className="text-slate-800">Who sees it:</strong> Exclusively your assigned doctor, dietician, trainer, and authorized clinical operations staff.</p>
                  <p><strong className="text-slate-800">Retention:</strong> Encrypted and securely maintained for the duration of your care program in accordance with medical standards.</p>
                  <p><strong className="text-slate-800">Your rights:</strong> You may inspect, download, or withdraw consent at any time via Account Settings &gt; Privacy.</p>
                </div>

                {/* 4 Consent Checkboxes */}
                <div className="space-y-2 pt-1">
                  {/* 1. Required */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gate1Consents.health_data}
                      onChange={(e) => setGate1Consents((p) => ({ ...p, health_data: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#00A884] border-slate-300 focus:ring-[#00A884] cursor-pointer"
                    />
                    <div className="text-xs text-slate-700 leading-snug">
                      <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Required</span>
                      I consent to 8liv collecting and using my personal and health data for the purposes above.
                    </div>
                  </label>

                  {/* 2. Required */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gate1Consents.care_team_sharing}
                      onChange={(e) => setGate1Consents((p) => ({ ...p, care_team_sharing: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#00A884] border-slate-300 focus:ring-[#00A884] cursor-pointer"
                    />
                    <div className="text-xs text-slate-700 leading-snug">
                      <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Required</span>
                      I consent to my lab reports and health records being shared with my doctor, dietician and trainer for my care.
                    </div>
                  </label>

                  {/* 3. Optional */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gate1Consents.comms}
                      onChange={(e) => setGate1Consents((p) => ({ ...p, comms: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#00A884] border-slate-300 focus:ring-[#00A884] cursor-pointer"
                    />
                    <div className="text-xs text-slate-600 leading-snug">
                      <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">Optional</span>
                      I would like reminders and health tips by WhatsApp, SMS or email.
                    </div>
                  </label>

                  {/* 4. Optional */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gate1Consents.research}
                      onChange={(e) => setGate1Consents((p) => ({ ...p, research: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded text-[#00A884] border-slate-300 focus:ring-[#00A884] cursor-pointer"
                    />
                    <div className="text-xs text-slate-600 leading-snug">
                      <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">Optional</span>
                      I consent to my de-identified data being used to improve 8liv&apos;s services.
                    </div>
                  </label>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isUnder18 || !gate1Consents.health_data || !gate1Consents.care_team_sharing || (!currentUserId && !patientOtpVerified && patientOtp.length !== 6 && !patientOtpSent)}
                className="w-full min-h-[50px] rounded-full bg-gradient-to-r from-[#00A884] to-[#0A8F70] hover:from-[#009977] hover:to-[#087F63] disabled:opacity-50 text-white font-sans font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00A884]/25 hover:shadow-lg active:scale-[0.99] mt-6"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving your assessment...</span>
                  </>
                ) : !currentUserId && !patientOtpVerified && !patientOtpSent ? (
                  <>
                    <span>Verify via WhatsApp &amp; Complete</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : !currentUserId && !patientOtpVerified && patientOtpSent ? (
                  <>
                    <span>Verify OTP &amp; Complete Assessment</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
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
