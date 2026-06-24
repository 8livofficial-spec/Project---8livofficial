'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, User, Scale, Activity, ShieldCheck, Pill, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type EligibilityStatus = 'ELIGIBLE' | 'REVIEW_REQUIRED' | 'NOT_ELIGIBLE'
type RadioField = 'has_mtc_men2' | 'is_pregnant_nursing' | 'has_pancreatitis' | 'has_active_cancer' | 'has_severe_gi_disease'

type PatientStatus = {
  assessmentStatus?: string
  eligibilityStatus?: string
  consultationPaymentStatus?: string
  appointmentStatus?: string
  consultationStatus?: string
  membershipStatus?: string
  firstConsultationCompleted?: boolean
  bookingId?: string | null
}

function validatePasswordStrength(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/\d/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return null
}

function getPatientJourneyTarget(status: PatientStatus) {
  if (status.membershipStatus === 'ACTIVE' && status.firstConsultationCompleted === true) return '/patient'
  if (status.assessmentStatus !== 'COMPLETED') return '/assessment'
  if (status.eligibilityStatus !== 'ELIGIBLE' && status.eligibilityStatus !== 'REVIEW_REQUIRED') return '/assessment'
  if (status.consultationPaymentStatus !== 'PAID') return '/consultation-payment'
  if (status.appointmentStatus !== 'SCHEDULED') return '/appointments/select-slot'
  if (status.consultationStatus !== 'COMPLETED') {
    return status.bookingId ? `/patient/appointments/${status.bookingId}` : '/patient/appointments'
  }
  if (status.membershipStatus === 'NOT_SELECTED') return '/plans'
  if (status.membershipStatus === 'ACTIVE') return '/patient'
  return '/membership-payment'
}

const hardRejectionOptions = [
  'End-stage kidney disease',
  'Dialysis treatment',
  'End-stage liver disease',
  'Liver cirrhosis',
  'Active cancer treatment',
  'Cancer-free for less than 5 years',
  'Gastroparesis',
  'Intestinal blockage',
  'Inflammatory bowel disease',
  'Current suicidal thoughts',
  'Previous suicide attempt',
  'Current alcohol dependence',
  'Opioid dependence',
  'Substance use disorder',
  'Type 1 Diabetes',
  'Personal history of thyroid cancer',
  'Family history of thyroid cancer',
  'Opiate medications used within the last 3 months',
  'Opiate street drugs used within the last 3 months',
]

const reviewConditionOptions = [
  'Hypertension',
  'Sleep apnea',
  'Type 2 diabetes',
  'PCOS',
  'Depression',
  'Fatty liver disease',
  'Kidney disease',
  'Coronary artery disease',
  'Previous heart attack',
  'Previous stroke',
  'Asthma',
  'Congestive heart failure',
  'Hospitalization within last year',
  'Seizure history',
  'Glaucoma',
  'Gallbladder disease',
  'Pancreatitis history',
  'HIV',
  'High cholesterol',
  'High triglycerides',
  'None of the above',
]

export default function AssessmentPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [step, setStep] = useState(1)
  const [resumeNotice, setResumeNotice] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [stepError, setStepError] = useState('')
  const [stepSaving, setStepSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [formData, setFormData] = useState({
    // Step 1: Contact
    first_name: '',
    last_name: '',
    age: '',
    phone_number: '',
    address: '',
    agree_terms: false,
    
    // Step 2: Vitals
    height_cm: '',
    weight_kg: '',
    goal_weight_kg: '',
    blood_pressure_range: '',
    resting_heart_rate: '',
    gender: 'female',
    
    // Step 3: Absolute Contraindications
    has_mtc_men2: '',
    is_pregnant_nursing: '',
    has_pancreatitis: '',
    has_active_cancer: '',
    has_severe_gi_disease: '',
    hard_rejections: [] as string[],

    // Step 4: Comorbidities
    comorbidities: [] as string[],
    review_conditions: [] as string[],
    
    // Step 5: Prior Meds
    medication_history_choice: '',

    // Account Creation
    email: '',
    password: ''
  })

  useEffect(() => {
    const checkRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        let role = 'patient'
        const match = document.cookie.match(/user_role=([^;]+)/)
        if (match) {
          role = match[1]
        } else {
          if (session.user.email === '8livofficial@gmail.com') {
            role = 'admin'
          } else {
            const { data: docProfile } = await supabase
              .from('doctor_profiles')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle()
            if (docProfile) {
              role = 'doctor'
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle()
              role = profile?.role || session.user.user_metadata?.role || 'patient'
            }
          }
          document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`
        }

        if (role === 'admin') {
          router.replace('/admin')
        } else if (role === 'doctor') {
          router.replace('/doctor/dashboard')
        } else {
          const res = await fetch(`/api/patient/status?patientId=${session.user.id}`)
          if (!res.ok) {
            setCheckingAuth(false)
            return
          }
          const statusData = await res.json()
          const targetPath = getPatientJourneyTarget(statusData)
          if (targetPath !== '/assessment') {
            router.replace(targetPath)
            return
          }
          setCurrentUserId(session.user.id)
          if (statusData.assessmentProgress && statusData.assessmentProgress > 1) {
            setStep(Math.min(Number(statusData.assessmentProgress), 5))
            setResumeNotice("Welcome back! We've restored your progress. Continue where you left off.")
          }
          const draftForm = statusData.assessment?.medical_history?.draft_form
          if (draftForm && typeof draftForm === 'object') {
            setFormData(prev => ({ ...prev, ...draftForm }))
          }
          setCheckingAuth(false)
        }
      } else {
        setCheckingAuth(false)
      }
    }
    checkRedirect()
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center text-[#D46E53]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const passwordError = validatePasswordStrength(formData.password)
      if (passwordError) throw new Error(passwordError)

      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
        })
      })
      const signupData = await signupResponse.json()
      if (!signupResponse.ok) throw new Error(signupData.error || 'Failed to create account.')

      const userId = signupData.userId

      // 2. Call our secure backend API to bypass RLS and insert health data
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, formData })
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit health assessment securely.')
      }

      await supabase.auth.signOut()
      window.location.href = `/verification-pending?email=${encodeURIComponent(formData.email)}`

    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred during submission.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleRadioChange = (field: RadioField, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxArray = (field: 'comorbidities' | 'hard_rejections' | 'review_conditions', value: string) => {
    setFormData(prev => {
      const arr = prev[field]
      if (value === 'None of the above') {
        return { ...prev, [field]: arr.includes(value) ? [] : [value] }
      }
      const next = arr.filter(i => i !== 'None of the above')
      if (next.includes(value)) return { ...prev, [field]: next.filter(i => i !== value) }
      return { ...prev, [field]: [...next, value] }
    })
  }

  const validateStep1 = () => {
    if (!formData.first_name || !formData.last_name || !formData.age || !formData.phone_number) {
      setStepError('Please fill out all required contact fields.')
      return false
    }
    if (!formData.agree_terms) {
      setStepError('You must agree to the terms and privacy policy.')
      return false
    }
    setStepError('')
    return true
  }

  const validateStep2 = () => {
    if (!formData.height_cm || !formData.weight_kg || !formData.goal_weight_kg || !formData.blood_pressure_range || !formData.resting_heart_rate) {
      setStepError('Please enter your vitals.')
      return false
    }
    setStepError('')
    return true
  }

  const validateStep3 = () => {
    const isPregnancyRequired = formData.gender === 'female'
    const hasPregnancyAnswer = !isPregnancyRequired || formData.is_pregnant_nursing
    
    if (!formData.has_mtc_men2 || !hasPregnancyAnswer || !formData.has_pancreatitis || !formData.has_active_cancer || !formData.has_severe_gi_disease) {
      setStepError('Please answer all medical history questions.')
      return false
    }
    setStepError('')
    return true
  }

  const saveConfirmedStep = async (confirmedStep: number) => {
    if (!currentUserId) return confirmedStep + 1

    setStepSaving(true)
    try {
      const response = await fetch('/api/assessment/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUserId,
          step: confirmedStep,
          formData,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save progress.')
      return Number(data.nextStep || confirmedStep + 1)
    } finally {
      setStepSaving(false)
    }
  }

  const nextStep = async () => {
    if (stepSaving) return
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setStepError('')
    try {
      const next = await saveConfirmedStep(step)
      setStep(next)
    } catch (error) {
      setStepError(error instanceof Error ? error.message : 'Unable to save progress.')
    }
  }
  
  const prevStep = () => setStep(prev => prev - 1)

  // Reusable Classes
  const inputCls = "w-full bg-[#F9F6F0] border-2 border-[#D46E53]/10 text-[#0F172A] rounded-2xl px-5 py-4 focus:outline-none focus:border-[#D46E53] focus:ring-4 focus:ring-[#D46E53]/20 transition-all font-medium placeholder:text-[#475569]/50"
  const labelCls = "block text-sm font-bold text-[#0F172A] mb-2 uppercase tracking-wide"
  const btnPrimaryCls = "flex-1 bg-[#D46E53] text-white font-semibold rounded-full px-8 py-4 shadow-lg shadow-[#D46E53]/20 hover:bg-[#A84A33] transition-colors flex items-center justify-center gap-2 group"
  const btnSecondaryCls = "px-8 py-4 rounded-full font-semibold text-[#475569] bg-white border-2 border-[#D46E53]/10 hover:bg-[#F9F6F0] hover:text-[#0F172A] transition-all flex items-center gap-2 group"

  const renderRadioGroup = (field: RadioField, question: string) => (
    <div className="bg-[#F9F6F0]/50 p-5 rounded-2xl border border-[#D46E53]/10">
      <p className="font-semibold text-[#0F172A] mb-4">{question}</p>
      <div className="flex gap-4">
        <label className={`flex-1 flex items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all ${formData[field] === 'yes' ? 'border-[#D46E53] bg-[#D46E53]/5 text-[#D46E53]' : 'border-slate-200 hover:border-[#D46E53]/30 text-[#475569]'}`}>
          <input type="radio" name={field} value="yes" checked={formData[field] === 'yes'} onChange={() => handleRadioChange(field, 'yes')} className="hidden" />
          <span className="font-bold">Yes</span>
        </label>
        <label className={`flex-1 flex items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all ${formData[field] === 'no' ? 'border-[#D46E53] bg-[#D46E53]/5 text-[#D46E53]' : 'border-slate-200 hover:border-[#D46E53]/30 text-[#475569]'}`}>
          <input type="radio" name={field} value="no" checked={formData[field] === 'no'} onChange={() => handleRadioChange(field, 'no')} className="hidden" />
          <span className="font-bold">No</span>
        </label>
      </div>
    </div>
  )

  const evaluateFormEligibility = () => {
    const heightM = Number(formData.height_cm) / 100
    const weightKg = Number(formData.weight_kg)
    const bmi = heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0
    const age = Number(formData.age)
    const hasAbsoluteContraindication = [
      formData.has_mtc_men2,
      formData.has_severe_gi_disease,
      formData.has_active_cancer,
      formData.gender === 'female' ? formData.is_pregnant_nursing : 'no',
    ].includes('yes') || formData.hard_rejections.length > 0

    if (hasAbsoluteContraindication) {
      return {
        status: 'NOT_ELIGIBLE' as EligibilityStatus,
        bmi,
        title: "We're Sorry",
        message: 'Based on your responses, our medical team cannot safely recommend this program at this time.',
      }
    }

    if (!Number.isFinite(age) || age < 18 || bmi < 25) {
      return {
        status: 'NOT_ELIGIBLE' as EligibilityStatus,
        bmi,
        title: "We're Sorry",
        message: 'Based on your responses, our medical team cannot safely recommend this program at this time.',
      }
    }

    const needsDoctorReview = (
      bmi < 27 ||
      formData.has_pancreatitis === 'yes' ||
      formData.review_conditions.some(condition => condition !== 'None of the above') ||
      formData.comorbidities.some(condition => condition !== 'None of the above') ||
      formData.blood_pressure_range.includes('Stage') ||
      formData.resting_heart_rate !== '60-100 bpm'
    )

    if (needsDoctorReview) {
      return {
        status: 'REVIEW_REQUIRED' as EligibilityStatus,
        bmi,
        title: 'Doctor Review Required',
        message: 'Your responses require review by our medical team before treatment recommendations can be provided. You can continue to create your account and book your consultation.',
      }
    }

    return {
      status: 'ELIGIBLE' as EligibilityStatus,
      bmi,
      title: "You're Approved!",
      message: 'Congratulations! You appear to be a strong candidate for our medical weight loss program. Create your account below to secure your consultation.',
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto relative z-10">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-[#475569] mb-2 uppercase tracking-widest">
            <span>Step {step} of 6</span>
            <span className="text-[#D46E53]">{Math.round((step / 6) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#A84A33] to-[#D46E53]"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {resumeNotice && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {resumeNotice}
          </div>
        )}

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-[#D46E53]/10 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Contact Info */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#D46E53]/10 flex items-center justify-center text-[#D46E53]">
                    <User className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A]">Contact Info</h2>
                </div>
                <p className="text-[#475569] mb-8 font-medium text-lg">How can you be reached? Our medical teams use email and text for member communication.</p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelCls}>First Name</label><input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={inputCls} placeholder="First Name"/></div>
                    <div><label className={labelCls}>Last Name</label><input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={inputCls} placeholder="Last Name"/></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelCls}>Age</label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className={inputCls} placeholder="35"/></div>
                    <div><label className={labelCls}>Phone Number</label><input type="tel" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className={inputCls} placeholder="+91 9090909090"/></div>
                  </div>
                  <div><label className={labelCls}>Address</label><textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className={inputCls} placeholder="Address 10/7 Avenue Street..."></textarea></div>

                  <div className="bg-[#D46E53]/5 p-6 rounded-3xl border border-[#D46E53]/10">
                    <label className="flex items-start space-x-4 cursor-pointer group">
                      <input type="checkbox" name="agree_terms" checked={formData.agree_terms} onChange={handleInputChange} className="mt-1 w-5 h-5 text-[#D46E53] rounded border-slate-300"/>
                      <span className="text-sm text-[#475569] font-medium leading-relaxed">I understand that my information is never shared, is protected by HIPAA, and I agree to the terms and privacy policy.</span>
                    </label>
                  </div>

                  {stepError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> {stepError}</p>}

                  <div className="flex gap-4 mt-10">
                    <Link href="/" className={btnSecondaryCls}><ArrowLeft className="w-5 h-5"/> Cancel</Link>
                    <button onClick={nextStep} disabled={stepSaving} className={btnPrimaryCls}>{stepSaving ? 'Saving...' : 'Continue'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Vitals */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#D46E53]/10 flex items-center justify-center text-[#D46E53]">
                    <Scale className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A]">Vitals & Goals</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelCls}>Height (cm)</label><input type="number" name="height_cm" value={formData.height_cm} onChange={handleInputChange} className={inputCls} placeholder="170"/></div>
                    <div><label className={labelCls}>Current Weight (kg)</label><input type="number" name="weight_kg" value={formData.weight_kg} onChange={handleInputChange} className={inputCls} placeholder="85"/></div>
                  </div>
                  <div><label className={labelCls}>Goal Weight (kg)</label><input type="number" name="goal_weight_kg" value={formData.goal_weight_kg} onChange={handleInputChange} className={inputCls} placeholder="70"/></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelCls}>Blood Pressure</label>
                      <select name="blood_pressure_range" value={formData.blood_pressure_range} onChange={handleInputChange} className={inputCls}>
                        <option value="">Select range</option>
                        <option value="Normal">Normal</option>
                        <option value="Elevated">Elevated</option>
                        <option value="Stage 1 Hypertension">Stage 1 Hypertension</option>
                        <option value="Stage 2 Hypertension">Stage 2 Hypertension</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Resting Heart Rate</label>
                      <select name="resting_heart_rate" value={formData.resting_heart_rate} onChange={handleInputChange} className={inputCls}>
                        <option value="">Select range</option>
                        <option value="60-100 bpm">60-100 bpm</option>
                        <option value="Below 60 bpm">Below 60 bpm</option>
                        <option value="Above 100 bpm">Above 100 bpm</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={labelCls}>Biological Sex</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputCls}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>

                  {stepError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> {stepError}</p>}

                  <div className="flex gap-4 mt-10">
                    <button onClick={prevStep} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                    <button onClick={nextStep} disabled={stepSaving} className={btnPrimaryCls}>{stepSaving ? 'Saving...' : 'Continue'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Absolute Contraindications */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A]">Clinical Safety</h2>
                </div>
                <p className="text-[#475569] mb-8 font-medium text-lg">GLP-1 medications require strict safety checks. Please answer the following truthfully.</p>

                <div className="space-y-4">
                  {renderRadioGroup('has_mtc_men2', 'Do you or a family member have a history of Medullary Thyroid Carcinoma (MTC) or Multiple Endocrine Neoplasia syndrome type 2 (MEN 2)?')}
                  {renderRadioGroup('has_pancreatitis', 'Have you ever been diagnosed with pancreatitis?')}
                  {renderRadioGroup('has_severe_gi_disease', 'Do you have a severe gastrointestinal disease (such as severe gastroparesis or inflammatory bowel disease)?')}
                  {renderRadioGroup('has_active_cancer', 'Do you have active cancer, or are you currently undergoing chemotherapy/radiotherapy?')}
                  {formData.gender === 'female' && renderRadioGroup('is_pregnant_nursing', 'Are you pregnant, planning to become pregnant in the next 2 months, or currently breastfeeding?')}
                  <div className="bg-[#F9F6F0]/50 p-5 rounded-2xl border border-[#D46E53]/10">
                    <p className="font-semibold text-[#0F172A] mb-4">Select any additional safety exclusions that apply.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {hardRejectionOptions.map(condition => (
                        <label key={condition} className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.hard_rejections.includes(condition) ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-[#D46E53]/30'}`}>
                          <input type="checkbox" checked={formData.hard_rejections.includes(condition)} onChange={() => handleCheckboxArray('hard_rejections', condition)} className="hidden"/>
                          <span className={`text-sm font-semibold ${formData.hard_rejections.includes(condition) ? 'text-rose-600' : 'text-[#475569]'}`}>{condition}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {stepError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 mt-6 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> {stepError}</p>}

                <div className="flex gap-4 mt-10">
                  <button onClick={prevStep} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button onClick={nextStep} disabled={stepSaving} className={btnPrimaryCls}>{stepSaving ? 'Saving...' : 'Continue'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Comorbidities & General Health */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#D46E53]/10 flex items-center justify-center text-[#D46E53]">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A]">Health History</h2>
                </div>

                <div className="space-y-6">
                  <p className="font-bold text-[#0F172A] mb-4">Do you have any of the following conditions? (Select all that apply)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviewConditionOptions.map(cond => (
                      <label key={cond} className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.review_conditions.includes(cond) ? 'border-[#D46E53] bg-[#D46E53]/5' : 'border-[#D46E53]/10 hover:border-[#D46E53]/30'}`}>
                        <input type="checkbox" checked={formData.review_conditions.includes(cond)} onChange={() => handleCheckboxArray('review_conditions', cond)} className="hidden"/>
                        <span className={`font-semibold ${formData.review_conditions.includes(cond) ? 'text-[#D46E53]' : 'text-[#475569]'}`}>{cond}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button onClick={prevStep} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                    <button onClick={nextStep} disabled={stepSaving} className={btnPrimaryCls}>{stepSaving ? 'Saving...' : 'Continue'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Prior Medication */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#D46E53]/10 flex items-center justify-center text-[#D46E53]">
                    <Pill className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold font-sora text-[#0F172A]">Prior Medication</h2>
                </div>

                <div className="space-y-6">
                  <p className="font-bold text-[#0F172A] mb-4">Have you previously taken GLP-1 medications? (Ozempic, Wegovy, Mounjaro, etc.)</p>
                  
                  <div className="space-y-4">
                    {['Yes, currently taking', 'Yes, but stopped', 'No, never taken'].map(choice => (
                      <label key={choice} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.medication_history_choice === choice ? 'border-[#D46E53] bg-[#D46E53]/5' : 'border-[#D46E53]/10 hover:border-[#D46E53]/30'}`}>
                        <input type="radio" name="medication_history_choice" value={choice} checked={formData.medication_history_choice === choice} onChange={handleInputChange} className="hidden"/>
                        <span className={`font-semibold ${formData.medication_history_choice === choice ? 'text-[#D46E53]' : 'text-[#475569]'}`}>{choice}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button onClick={prevStep} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                    <button onClick={nextStep} disabled={stepSaving} className={btnPrimaryCls}>{stepSaving ? 'Saving...' : 'Complete Assessment'} <CheckCircle2 className="w-5 h-5"/></button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Eligibility Processing & Result */}
            {step === 6 && (
              <motion.div key="step6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                {(() => {
                  const eligibility = evaluateFormEligibility()

                  if (eligibility.status === 'NOT_ELIGIBLE') {
                    return (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2 className="w-12 h-12 text-rose-500 hidden" />
                          <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-4xl font-bold font-sora text-[#0F172A] mb-4">{eligibility.title}</h2>
                        <p className="text-xl text-[#475569] mb-10 max-w-lg mx-auto">
                          {eligibility.message}
                        </p>
                        <Link href="/" className="inline-block bg-[#0F172A] text-white font-bold rounded-full px-12 py-5 text-lg hover:bg-[#1E293B] hover:shadow-xl transition-all">
                          Return Home
                        </Link>
                      </div>
                    )
                  }

                  return (
                    <div className="text-center py-12">
                      <div className={`w-24 h-24 ${eligibility.status === 'REVIEW_REQUIRED' ? 'bg-amber-100' : 'bg-[#D46E53]/10'} rounded-full flex items-center justify-center mx-auto mb-8 relative`}>
                        <div className={`absolute inset-0 ${eligibility.status === 'REVIEW_REQUIRED' ? 'bg-amber-200/50' : 'bg-[#D46E53]/20'} rounded-full animate-ping`}></div>
                        <ShieldCheck className={`w-12 h-12 ${eligibility.status === 'REVIEW_REQUIRED' ? 'text-amber-600' : 'text-[#D46E53]'} relative z-10`} />
                      </div>
                      <h2 className="text-4xl font-bold font-sora text-[#0F172A] mb-4">{eligibility.title}</h2>
                      <p className="text-lg text-[#475569] mb-10 max-w-lg mx-auto">
                        {eligibility.message}
                      </p>
                      
                      <form onSubmit={handleAssessmentSubmit} className="max-w-sm mx-auto space-y-4 text-left bg-[#F9F6F0] p-6 rounded-[2rem] border border-[#D46E53]/10">
                        <div>
                          <label className="block text-sm font-bold text-[#0F172A] mb-2 pl-2">Email Address</label>
                          <input 
                            type="email" 
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="name@example.com" 
                            className="w-full bg-white border border-[#D46E53]/20 text-[#0F172A] rounded-2xl px-5 py-4 focus:outline-none focus:border-[#D46E53] focus:ring-4 focus:ring-[#D46E53]/20" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-[#0F172A] mb-2 pl-2">Password</label>
                          <input 
                            type="password" 
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="••••••••" 
                            className="w-full bg-white border border-[#D46E53]/20 text-[#0F172A] rounded-2xl px-5 py-4 focus:outline-none focus:border-[#D46E53] focus:ring-4 focus:ring-[#D46E53]/20" 
                          />
                        </div>
                        
                        {submitError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> {submitError}</p>}

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="w-full bg-[#0F172A] text-white font-bold rounded-2xl px-8 py-4 mt-4 hover:bg-[#1E293B] hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          {isSubmitting ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            'Create Account & Continue'
                          )}
                        </button>
                      </form>
                    </div>
                  )
                })()}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
