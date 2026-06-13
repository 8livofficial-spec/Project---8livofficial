'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Scale, Pill, User, Activity,
  Apple, Dumbbell, Video, FileText, Home as HomeIcon, ShieldCheck, ChevronRight,
  Calendar, Bell, BellRing, Clock, X, LogOut, PhoneOff, Stethoscope
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const loadRazorpayScript = () => new Promise(resolve => {
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true); s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

// ── RingtonePlayer Utility (Web Audio API Synthesizer) ────────────────────────
class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  start() {
    if (typeof window === 'undefined') return;
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        this.ctx = ctx;
        const now = ctx.currentTime;

        const playTone = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + duration);
        };

        // Premium marimba-like chords (E5 -> A5 -> B5 -> E6)
        playTone(659.25, now, 0.4);
        playTone(880.00, now + 0.15, 0.4);
        playTone(987.77, now + 0.3, 0.4);
        playTone(1318.51, now + 0.45, 0.6);

        playTone(880.00, now + 0.9, 0.4);
        playTone(987.77, now + 1.05, 0.4);
        playTone(1318.51, now + 1.2, 0.6);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    };

    playChime();
    this.intervalId = setInterval(playChime, 2500);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputCls = 'w-full border border-slate-200 rounded-2xl p-4 bg-slate-50/50 outline-none transition-all duration-300 text-slate-900 placeholder-slate-400 font-medium hover:border-indigo-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:-translate-y-0.5 shadow-sm';
const labelCls = 'block text-sm font-bold text-slate-700 mb-2 tracking-wide';
const checkboxLabelCls = 'text-sm font-semibold text-slate-800 transition-colors duration-300 group-hover:text-indigo-900';
const btnPrimaryCls = 'flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-600/40 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 group';
const btnSecondaryCls = 'w-1/3 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 group';

// ── Image paths ───────────────────────────────────────────────────────────────
const IMG = {
  visual2: '/images/medical_supervision_visual2.png',
  visual3: '/images/medical_supervision_visual3.png',
  visual4: '/images/medical_supervision_visual4.png',
  visual5: '/images/medical_supervision_visual5.png',
  visual6: '/images/medical_supervision_visual6.png',
  visual7: '/images/medical_supervision_visual7.png',
  visual8: '/images/medical_supervision_visual8.png',
  visual9: '/images/medical_supervision_visual9.png',
  visual10: '/images/medical_supervision_visual10.png',
  visual11: '/images/medical_supervision_visual11.png',
  visual12: '/images/medical_supervision_visual12.png',
  slide1: '/images/medical_supervision_slide1.png',
  slide2: '/images/medical_supervision_slide2.png',
  slide3: '/images/medical_supervision_slide3.png',
  slide4: '/images/medical_supervision_slide4.png',
  slide5: '/images/medical_supervision_slide5.png',
};

const STEP_VISUALS: Record<number, { img: string; textColor: string; accentBg: string; badge: string; fact: string; factSub: string }> = {
  1: { img: IMG.visual4, textColor: 'text-amber-100', accentBg: 'from-amber-900/80 to-slate-900/90', badge: 'Contact Details', fact: 'Your data is 100% HIPAA Protected', factSub: 'Medical-grade encryption keeps your records private.' },
  2: { img: IMG.visual5, textColor: 'text-indigo-100', accentBg: 'from-indigo-900/80 to-violet-900/90', badge: 'Vitals & DOB', fact: "BMI alone doesn't tell the whole story", factSub: 'We factor height, weight, age & goal to craft your personal plan.' },
  3: { img: IMG.visual6, textColor: 'text-emerald-100', accentBg: 'from-emerald-900/80 to-teal-900/90', badge: 'Health Questionnaire', fact: '135 Million adults in India are affected by obesity', factSub: 'Medical screening ensures the safest treatment for your unique health profile.' },
  4: { img: IMG.visual7, textColor: 'text-violet-100', accentBg: 'from-violet-900/80 to-indigo-900/90', badge: 'Medication History', fact: 'GLP-1 medications reduce hunger signals', factSub: 'Modern obesity medications work with your biology, not against it.' },
  5: { img: IMG.visual10, textColor: 'text-rose-100', accentBg: 'from-rose-900/70 to-slate-900/90', badge: 'Assessment Result', fact: 'Medical supervision triples weight loss success', factSub: 'Doctor-guided programs outperform solo dieting every time.' },
  6: { img: IMG.visual11, textColor: 'text-amber-100', accentBg: 'from-amber-900/70 to-slate-900/90', badge: 'Your Membership', fact: 'Gold members lose 40% more weight on average', factSub: 'Dietician + Fitness Coach = the ultimate transformation combo.' },
  13: { img: IMG.visual2, textColor: 'text-sky-100', accentBg: 'from-sky-900/80 to-slate-900/90', badge: 'Doctor Consultation', fact: 'Your endocrinologist will prescribe the right medication', factSub: 'Personalised prescriptions based on your BMI, history & goals.' },
  14: { img: IMG.visual3, textColor: 'text-amber-100', accentBg: 'from-amber-900/80 to-orange-900/90', badge: 'Dietician Session', fact: 'Local food-based diet plans work 3× better', factSub: "We use your regional cuisine to build a chart you'll actually follow." },
  15: { img: IMG.visual2, textColor: 'text-emerald-100', accentBg: 'from-emerald-900/80 to-teal-900/90', badge: 'Fitness Coach', fact: '30 min of movement a day accelerates fat loss', factSub: 'Your coach will design a plan matched to your body & environment.' },
};

const SLIDESHOW_IMGS = [IMG.visual8, IMG.visual9, IMG.visual10, IMG.visual11];
const SLIDE_HEALTH_FACTS = [
  { title: 'Fight Hard', sub: 'Consistency beats perfection — every session counts.' },
  { title: 'Push Further', sub: 'Your body achieves what your mind believes.' },
  { title: 'Real Results', sub: 'Medical supervision accelerates every milestone.' },
  { title: 'Built for You', sub: 'Personalised plans. Proven outcomes.' },
];

const DASH_SLIDES = [
  { img: IMG.slide1, fontColor: 'text-slate-900', statColor: 'text-indigo-700', badgeBg: 'bg-slate-900/80', headlineShadow: false, headline: 'Every Rep Counts', stat: '500 kcal', statLabel: 'avg burned per session', sub: "Rowing engages 86% of your body's muscles. Low impact, maximum burn." },
  { img: IMG.slide2, fontColor: 'text-white', statColor: 'text-indigo-300', badgeBg: 'bg-white/15', headlineShadow: true, headline: 'Push Through', stat: '3×', statLabel: 'faster fat loss with coaching', sub: 'Medically supervised training outperforms solo effort every single time.' },
  { img: IMG.slide3, fontColor: 'text-white', statColor: 'text-amber-300', badgeBg: 'bg-white/15', headlineShadow: true, headline: 'Own Your Power', stat: '12–16 wks', statLabel: 'average goal timeline', sub: 'Consistency + medication + expert guidance = lasting transformation.' },
  { img: IMG.slide4, fontColor: 'text-white', statColor: 'text-emerald-300', badgeBg: 'bg-white/15', headlineShadow: true, headline: 'Pull Harder', stat: '0.5–1 kg', statLabel: 'safe weight loss per week', sub: 'Science-backed targets protect muscle while eliminating fat.' },
  { img: IMG.slide5, fontColor: 'text-slate-900', statColor: 'text-indigo-700', badgeBg: 'bg-slate-900/80', headlineShadow: false, headline: 'Lift to Succeed', stat: '135M+', statLabel: 'adults in India affected by obesity', sub: "You decided to change. That decision is the hardest lift you'll ever do." },
];

function StepImagePanel({ stepNum }: { stepNum: number }) {
  const v = STEP_VISUALS[stepNum];
  if (!v) return null;
  return (
    <div className="hidden lg:flex w-[340px] flex-shrink-0 flex-col relative rounded-[2.5rem] overflow-hidden shadow-2xl self-stretch min-h-[520px]">
      <img src={v.img} alt="health visual" className="absolute inset-0 w-full h-full object-cover object-center scale-105 animate-[slowZoom_20s_ease-in-out_infinite_alternate]"/>
      <div className={`absolute inset-0 bg-gradient-to-t ${v.accentBg}`}/>
      <div className="relative z-10 p-6">
        <span className="inline-block bg-white/15 backdrop-blur text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/20">{v.badge}</span>
      </div>
      <div className="relative z-10 mt-auto p-8">
        <p className={`text-2xl font-black leading-tight mb-3 ${v.textColor} animate-[fadeSlideUp_0.8s_ease-out_both]`}>{v.fact}</p>
        <p className={`text-sm font-semibold leading-relaxed opacity-80 ${v.textColor} animate-[fadeSlideUp_0.8s_ease-out_0.2s_both]`}>{v.factSub}</p>
      </div>
    </div>
  );
}

const HEALTH_CONDITIONS_ONE_LIST = [
  'End-stage kidney disease (on or about to be on dialysis)',
  'End-stage liver disease (cirrhosis)',
  'Current suicidal thoughts and/or prior suicidal attempt',
  'Cancer (active diagnosis, active treatment, or in remission < 5 years)',
  'Severe gastrointestinal condition (gastroparesis, blockage, inflammatory bowel disease)',
  'Current diagnosis of or treatment for alcohol, opioid, or substance use disorder/dependence',
  'None of the above',
];
const HEALTH_CONDITIONS_TWO_LIST = [
  'Untreated hypothyroidism','Gallbladder disease','Hypertension','Seizures','Glaucoma','Sleep apnea',
  'Type 2 diabetes (not on insulin)','Type 2 diabetes (on insulin)','Type 1 diabetes','Diabetic retinopathy',
  'Warfarin use','Pancreatitis','Thyroid cyst/nodule/cancer','Gout','High cholesterol','Depression',
  'Head injury','Brain/spinal cord tumor','Low sodium','Liver disease','Kidney disease','Tachycardia',
  'Coronary artery disease/stroke','Allergic to meds','Congestive heart failure','QT prolongation',
  'Hospitalization within 1 year','HIV','Acid reflux','Asthma','Urinary stress incontinence','PCOS',
  'Low testosterone','Osteoarthritis','Constipation','None of the above',
];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];
const MAX_FILE_SIZE_MB = 15;

// ── Types ─────────────────────────────────────────────────────────────────────
type PatientNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type PrescriptionData = {
  prescription_type: string | null;
  prescription_text: string | null;
  prescription_notes: string | null;
  status: string;
  booking_date: string;
  booking_time: string;
};

// ── Helper: is the booking time joinable (5min before → 30min after start) ────
function isCallTimeNow(dateStr: string, timeStr: string): boolean {
  // DEV BYPASS: Always true for mock slots during testing
  if (dateStr.startsWith('mock_') || timeStr === 'Consultation' || timeStr === 'Dietician' || timeStr === 'Fitness') return true;
  try {
    const target = parseBookingDateTime(dateStr, timeStr);
    if (!target) return true; // fallback: allow join
    const now = Date.now();
    const start = target.getTime();
    const FIVE_MIN = 5 * 60 * 1000;
    const THIRTY_MIN = 30 * 60 * 1000;
    // Allow joining from 5 minutes before start up to 30 minutes after start
    return now >= start - FIVE_MIN && now <= start + THIRTY_MIN;
  } catch { return true; }
}

// ── Helper: parse booking datetime for countdown ──────────────────────────────
function parseBookingDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    let isoDate = dateStr;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      isoDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return new Date(`${isoDate} ${timeStr}`);
  } catch { return null; }
}

// ── Helper: is the slot in the past ──────────────────────────────────────────
function isSlotInPast(dateStr: string, timeStr: string): boolean {
  if (dateStr.startsWith('mock_') || timeStr === 'Consultation' || timeStr === 'Dietician' || timeStr === 'Fitness') return false;
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  const target = parseBookingDateTime(dateStr, timeStr);
  if (!target) return false;
  return target.getTime() < Date.now();
}

// Helper component for elegant inputs, declared outside the main render function
// to prevent unmounting and focus loss on every state change/keystroke.
const ElegantInput = ({ id, label, type = "text", value, onChange, required = false, theme = "patient" }: any) => (
  <div className="relative pt-6 mb-6">
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className={`peer w-full bg-transparent border-b py-2 px-1 focus:outline-none transition-colors placeholder-transparent ${
        theme === 'doctor' 
          ? 'border-slate-300 text-slate-800 focus:border-emerald-600' 
          : 'border-slate-300 text-slate-800 focus:border-indigo-600'
      }`}
      placeholder=" "
    />
    <label 
      htmlFor={id} 
      className={`absolute left-1 top-1 text-sm transition-all peer-placeholder-shown:top-7 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-sm pointer-events-none ${
        theme === 'doctor' 
          ? 'text-slate-500 peer-focus:text-emerald-600' 
          : 'text-slate-500 peer-focus:text-indigo-600'
      }`}
    >
      {label}
    </label>
  </div>
);

export default function Home() {
  const router = useRouter();
  const [selectedAuthRole, setSelectedAuthRole] = useState<string>('patient');
  const [showRoleSelection, setShowRoleSelection] = useState(true);

  const redirectBasedOnRole = (role: string) => {
    // Set a secure cookie that the middleware will read
    document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    
    if (role === 'admin') {
      router.push('/admin');
    } else if (role === 'doctor') {
      router.push('/doctor/dashboard');
    } else {
      router.push('/'); // Patient stays on main page
    }
  };

  const handleSelectRole = (role: 'patient' | 'doctor') => {
    setSelectedAuthRole(role);
    setShowRoleSelection(false);
    setAuthError('');
    setAuthSuccessMsg('');
    setAuthEmail('');
    setAuthPassword('');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'doctor') {
        handleSelectRole('doctor');
      } else if (role === 'patient') {
        handleSelectRole('patient');
      }
    }
  }, []);

  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{ is_eligible: boolean; message: string; success_probability?: string; bmi?: number } | null>(null);
  const [stepError, setStepError] = useState('');
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const ringtonePlayerRef = useRef(new RingtonePlayer());
  const [isEditing, setIsEditing] = useState(false);
  const [hasLoggedWeightToday, setHasLoggedWeightToday] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [dashSlideIdx, setDashSlideIdx] = useState(0);

  // ── FIX 1: membership_tier + shipping_state tracked in state ─────────────
  // These are now read FROM DB on load and WRITTEN TO DB on payment success
  const [selectedMembership, setSelectedMembership] = useState('');
  const [shippingState, setShippingState] = useState('');

  // ── Doctor slots ──────────────────────────────────────────────────────────
  const [doctorSlots, setDoctorSlots] = useState<{ id: string; available_date: string; time_slot: string; doctor_id: string; doctor_name: string; is_locked_for_user?: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  // Derived: unique sorted dates that have available slots and are not fully in the past
  const availableDatesFromDB = [...new Set(
    doctorSlots
      .filter(s => !isSlotInPast(s.available_date, s.time_slot))
      .map(s => s.available_date)
  )].sort();

  // ── FIX 2: canJoinCallNow — true only if bookingDate+Time is "now" ────────
  const [canJoinCallNow, setCanJoinCallNow] = useState(false);
  const joinCheckRef = useRef<NodeJS.Timeout | null>(null);

  // ── Completed consultations count (for membership gating) ────────────────
  const [completedConsultations, setCompletedConsultations] = useState(0);

  // ── Toast reminder state ──────────────────────────────────────────────────
  const [reminderToast, setReminderToast] = useState<{ msg: string; color: string } | null>(null);
  const reminderTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifBell, setNotifBell] = useState(false);

  // ── Prescription from doctor ──────────────────────────────────────────────
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [newPrescriptionAlert, setNewPrescriptionAlert] = useState(false);
  const [prescriptionShake, setPrescriptionShake] = useState(false);

  // ── Countdown timer ───────────────────────────────────────────────────────
  const [callCountdown, setCallCountdown] = useState<string | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', full_name: '',
    age: '', phone_number: '', address: '',
    dob_month: '', dob_day: '', dob_year: '', agree_terms: false,
    height_cm: '', weight_kg: '', goal_weight_kg: '', gender: 'female',
    has_severe_conditions: false, other_conditions: [] as string[],
    health_conditions_one: [] as string[],
    health_conditions_two: [] as string[],
    recent_opiate_use: false, prior_weight_loss_surgery: false, takes_prescription_meds: false,
    blood_pressure_range: 'Normal', resting_heart_rate: 'Normal',
    prior_medication_type: 'none', prior_medication_details: '', last_dose_timeframe: '',
    starting_weight_kg: '', agrees_to_no_stacking: false,
    tried_weight_program: false, extra_medical_info: '', has_extra_info: false,
    glp1_image_url: '',
  });

  const [showIneligibleMsg, setShowIneligibleMsg] = useState(false);
  const [medicationHistoryChoice, setMedicationHistoryChoice] = useState<string>('');

  const [glp1Details, setGlp1Details] = useState('');
  const [lastDoseTimeframe, setLastDoseTimeframe] = useState('');
  const [medStartingWeight, setMedStartingWeight] = useState('');
  const [medicationPhoto, setMedicationPhoto] = useState<File | null>(null);

  const [otherMedDetails, setOtherMedDetails] = useState('');
  const [otherMedStartingWeight, setOtherMedStartingWeight] = useState('');

  const [stackingConsent, setStackingConsent] = useState('');

  const [triedWeightProgram, setTriedWeightProgram] = useState('');
  const [hasExtraInfo, setHasExtraInfo] = useState('');
  const [extraInfoText, setExtraInfoText] = useState('');

  const [summaryFirstName, setSummaryFirstName] = useState('');
  const [summaryLastName, setSummaryLastName] = useState('');

  const [glp1File, setGlp1File] = useState<File | null>(null);
  const [glp1UploadLoading, setGlp1UploadLoading] = useState(false);
  const [glp1UploadError, setGlp1UploadError] = useState('');
  const [glp1UploadSuccess, setGlp1UploadSuccess] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [logWeight, setLogWeight] = useState('');
  const [logCalories, setLogCalories] = useState('');
  const [weightData, setWeightData] = useState<any[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isSlotBooked, setIsSlotBooked] = useState(false);
  const [videoRoomUrl, setVideoRoomUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [localFood, setLocalFood] = useState('');
  const [workoutPreference, setWorkoutPreference] = useState('');

  // ── FIX 2b: Update canJoinCallNow every 30s once booking exists ───────────
  useEffect(() => {
    if (!bookingDate || !bookingTime) { setCanJoinCallNow(false); return; }
    const check = () => setCanJoinCallNow(isCallTimeNow(bookingDate, bookingTime));
    check();
    joinCheckRef.current = setInterval(check, 30000);
    return () => { if (joinCheckRef.current) clearInterval(joinCheckRef.current); };
  }, [bookingDate, bookingTime]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  const startCountdown = useCallback((dateStr: string, timeStr: string) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const target = parseBookingDateTime(dateStr, timeStr);
      if (!target) { setCallCountdown(null); return; }
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        const THIRTY_MIN = 30 * 60 * 1000;
        if (Math.abs(diff) > THIRTY_MIN) {
          setCallCountdown('Consultation time passed');
        } else {
          setCallCountdown('Your call is starting now! 🟢');
        }
        clearInterval(countdownRef.current!);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (days > 0) setCallCountdown(`${days}d ${h}h ${m}m`);
      else if (h > 0) setCallCountdown(`${h}h ${m}m ${s}s`);
      else setCallCountdown(`${m}m ${s}s`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    if (bookingDate && bookingTime && step === 12) startCountdown(bookingDate, bookingTime);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [bookingDate, bookingTime, step]);

  // ── Reminder toasts: schedule at 1h, 30m, 1m before call ─────────────────
  useEffect(() => {
    // Clear any existing reminder timers
    reminderTimersRef.current.forEach(t => clearTimeout(t));
    reminderTimersRef.current = [];
    setReminderToast(null);

    if (!bookingDate || !bookingTime) return;
    // Skip for mock/non-date slots
    if (bookingTime === 'Consultation' || bookingTime === 'Dietician' || bookingTime === 'Fitness') return;

    const target = parseBookingDateTime(bookingDate, bookingTime);
    if (!target) return;
    const now = Date.now();

    const showToast = (msg: string, color: string, duration = 8000) => {
      setReminderToast({ msg, color });
      setTimeout(() => setReminderToast(null), duration);
    };

    const reminders = [
      { ms: 60 * 60 * 1000, msg: '⏰ Reminder: Your doctor call is in 1 hour! Get ready.', color: 'bg-blue-600' },
      { ms: 30 * 60 * 1000, msg: '⏰ Reminder: Your doctor call is in 30 minutes! Please be prepared.', color: 'bg-indigo-600' },
      { ms: 1 * 60 * 1000, msg: '🔔 Your doctor call starts in 1 minute! Join Now!', color: 'bg-emerald-600' },
    ];

    reminders.forEach(({ ms, msg, color }) => {
      const delay = target.getTime() - ms - now;
      if (delay > 0) {
        const t = setTimeout(() => showToast(msg, color, 10000), delay);
        reminderTimersRef.current.push(t);
      }
    });

    return () => { reminderTimersRef.current.forEach(t => clearTimeout(t)); };
  }, [bookingDate, bookingTime]);



  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('patient_notifications')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(prev => {
        const unread = data.filter((n: PatientNotification) => !n.is_read).length;
        const prevUnread = prev.filter(n => !n.is_read).length;
        if (unread > prevUnread) { setNotifBell(true); setTimeout(() => setNotifBell(false), 3000); }
        return data;
      });
    }
  }, []);

  // ── Fetch prescription ────────────────────────────────────────────────────
  const fetchPrescription = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('doctor_consultations')
      .select('prescription_type, prescription_text, prescription_notes, status, booking_date, booking_time')
      .eq('patient_id', userId)
      .in('status', ['approved', 'rejected', 'attended', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      if (data.status === 'cancelled') {
        setBookingDate(prev => prev === data.booking_date ? '' : prev);
        setBookingTime(prev => prev === data.booking_time ? '' : prev);
        setIsSlotBooked(false);
        setCanJoinCallNow(false);
        setCallCountdown(null);
      }
      setPrescription(prev => {
        const isNewText = data.prescription_text && (!prev?.prescription_text || prev.prescription_text !== data.prescription_text);
        const isNewNotes = data.prescription_notes && (!prev?.prescription_notes || prev.prescription_notes !== data.prescription_notes);
        const isNewStatus = prev && data.status !== prev.status;
        
        if (isNewText || isNewNotes || isNewStatus) {
          setNewPrescriptionAlert(true);
          setPrescriptionShake(true);
          setTimeout(() => setPrescriptionShake(false), 1500);
          if (Notification.permission === 'granted') {
            const title = data.status === 'rejected' ? '8liv — Consultation Update' : (data.status === 'cancelled' ? '⚠️ Appointment Cancelled' : '8liv — Prescription Ready! 💊');
            const body = data.status === 'rejected' ? 'Your doctor has updated your consultation status. Click to view.' : (data.status === 'cancelled' ? 'Your doctor has cancelled the appointment.' : 'Your doctor has written a prescription. View it now.');
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        }
        return data;
      });
    }
  }, []);

  // ── Slideshow timers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 0) return;
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDESHOW_IMGS.length), 4000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 12) return;
    const t = setInterval(() => setDashSlideIdx(i => (i + 1) % DASH_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [step]);

  // ── Doctor slots when entering step 13 ────────────────────────────────────
  useEffect(() => {
    if (step !== 13) return;
    const fetchSlots = async (isInitial = false) => {
      if (isInitial) setSlotsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch ALL slots to determine buffer collisions
      const { data: allSlots } = await supabase
        .from('doctor_availability')
        .select('id, available_date, time_slot, doctor_id, is_booked')
        .gte('available_date', today)
        .order('available_date', { ascending: true })
        .order('time_slot', { ascending: true });

      let slots: any[] = [];
      if (allSlots) {
        const bookedSlots = allSlots.filter((s: any) => s.is_booked);
        const unbookedSlots = allSlots.filter((s: any) => !s.is_booked);
        const MIN_DIFF_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours

        slots = unbookedSlots.filter((unbooked: any) => {
          const unbookedTime = parseBookingDateTime(unbooked.available_date, unbooked.time_slot)?.getTime();
          if (!unbookedTime) return false;
          
          const doctorBookings = bookedSlots.filter((b: any) => b.doctor_id === unbooked.doctor_id);
          for (const booked of doctorBookings) {
            const bookedTime = parseBookingDateTime(booked.available_date, booked.time_slot)?.getTime();
            if (bookedTime) {
              if (Math.abs(unbookedTime - bookedTime) < MIN_DIFF_MS) {
                return false; // Collides with existing booking (within 2.5h)
              }
            }
          }
          return true;
        });
      }

      // Find if they have a primary doctor assigned (from previous calls)
      let primaryDocId: string | null = null;
      if (user) {
        try {
          const { data: pastCons } = await supabase
            .from('doctor_consultations')
            .select('doctor_id')
            .eq('patient_id', user.id)
            .in('status', ['approved', 'rejected', 'attended', 'scheduled'])
            .order('created_at', { ascending: false })
            .limit(1);
          if (pastCons && pastCons.length > 0) {
            primaryDocId = pastCons[0].doctor_id;
          }
        } catch (err) {
          console.error("Error fetching primary doctor:", err);
        }
      }

      if (slots && slots.length > 0) {
        // Fetch doctor names
        const doctorIds = [...new Set(slots.map((s: any) => s.doctor_id))];
        const { data: profiles } = await supabase
          .from('doctor_profiles')
          .select('doctor_id, full_name')
          .in('doctor_id', doctorIds);

        const profileMap: Record<string, string> = {};
        if (profiles) profiles.forEach((p: any) => { profileMap[p.doctor_id] = p.full_name || 'Dr. Expert'; });

        let mappedSlots = slots.map((s: any) => ({
          ...s,
          doctor_name: profileMap[s.doctor_id] || 'Dr. Expert',
          is_locked_for_user: primaryDocId ? s.doctor_id !== primaryDocId : false,
        }));

        setDoctorSlots(mappedSlots);
        // Auto-select the first available date
        if (!bookingDate || !mappedSlots.find((s: any) => s.available_date === bookingDate)) {
          setBookingDate(mappedSlots[0].available_date);
        }
      } else {
        // DEV BYPASS: No availability in DB, auto-populate mock slots for testing
        console.log("[DEV BYPASS] No availability found in DB. Auto-generating mock slots.");
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];
        
        let fallbackDocId = primaryDocId || 'mock_doc_id';
        let fallbackDocName = 'Dr. Hussain (Expert)';
        if (!primaryDocId && user) {
          try {
            const { data: realDocs } = await supabase
              .from('doctor_profiles')
              .select('doctor_id, full_name')
              .limit(1);
            if (realDocs && realDocs.length > 0) {
              fallbackDocId = realDocs[0].doctor_id;
              fallbackDocName = realDocs[0].full_name || 'Dr. Expert';
            } else {
              fallbackDocId = user.id; // fallback to patient's own ID
            }
          } catch (err) {
            console.error("Error fetching fallback doctor:", err);
            fallbackDocId = user.id;
          }
        }
        
        let mockSlots = [
          { id: 'mock_1', available_date: today, time_slot: '10:00 AM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
          { id: 'mock_2', available_date: today, time_slot: '02:00 PM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
          { id: 'mock_3', available_date: tomorrow, time_slot: '11:00 AM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
          { id: 'mock_4', available_date: tomorrow, time_slot: '03:00 PM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
          { id: 'mock_5', available_date: dayAfter, time_slot: '09:00 AM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
          { id: 'mock_6', available_date: dayAfter, time_slot: '04:00 PM', doctor_id: fallbackDocId, doctor_name: fallbackDocName },
        ];
        
        setDoctorSlots(mockSlots);
        if (!bookingDate || !mockSlots.find(s => s.available_date === bookingDate)) {
          setBookingDate(mockSlots[0].available_date);
        }
      }
      if (isInitial) setSlotsLoading(false);
    };
    fetchSlots(true);
    const slotsPoll = setInterval(() => fetchSlots(false), 5000);
    return () => clearInterval(slotsPoll);
  }, [step, user]);

  // ── Check Incoming Call ───────────────────────────────────────────────────
  const checkIncomingCall = useCallback(async (userId: string) => {
    try {
      const { data: consultation } = await supabase
        .from('doctor_consultations')
        .select('id, room_url, status, doctor_id')
        .eq('patient_id', userId)
        .eq('status', 'calling')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (consultation) {
        const { data: docProfile } = await supabase
          .from('doctor_profiles')
          .select('full_name')
          .eq('doctor_id', consultation.doctor_id)
          .maybeSingle();

        setIncomingCall({
          id: consultation.id,
          room_url: consultation.room_url,
          doctor_name: docProfile?.full_name || 'Dr. Expert',
        });
      } else {
        setIncomingCall(null);
      }
    } catch (e) {
      console.error("Failed to check incoming call", e);
    }
  }, []);

  // ── Polling for Incoming Calls every 2 seconds on dashboard ──────────────────
  useEffect(() => {
    if (!user || step !== 12) return;
    const checkCall = () => checkIncomingCall(user.id);
    checkCall();
    const callInterval = setInterval(checkCall, 2000);
    return () => clearInterval(callInterval);
  }, [user, step, checkIncomingCall]);

  // ── Ringtone control ──────────────────────────────────────────────────────
  useEffect(() => {
    if (incomingCall) {
      ringtonePlayerRef.current.start();
    } else {
      ringtonePlayerRef.current.stop();
    }
    return () => ringtonePlayerRef.current.stop();
  }, [incomingCall]);

  // ── Call Accept / Decline Handlers ────────────────────────────────────────
  const handleAcceptCall = async () => {
    if (!incomingCall || !user) return;
    ringtonePlayerRef.current.stop();
    
    // Update consultation status to 'attended' in DB
    await supabase
      .from('doctor_consultations')
      .update({ status: 'attended', updated_at: new Date().toISOString() })
      .eq('id', incomingCall.id);

    // Transition patient to active call screen
    setVideoRoomUrl(incomingCall.room_url);
    setCallActive(true);
    setStep(13);
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    ringtonePlayerRef.current.stop();

    // Revert consultation status to 'scheduled' so doctor can ring again if needed
    await supabase
      .from('doctor_consultations')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', incomingCall.id);

    setIncomingCall(null);
  };

  // ── Polling: notifications + prescription every 15 seconds on dashboard ───
  useEffect(() => {
    if (!user || step !== 12) return;
    fetchNotifications(user.id);
    fetchPrescription(user.id);
    const poll = setInterval(() => {
      fetchNotifications(user.id);
      fetchPrescription(user.id);
    }, 15000);
    return () => clearInterval(poll);
  }, [user, step]);

  // ── Push notifications permission ─────────────────────────────────────────
  useEffect(() => {
    if (step === 12 && 'Notification' in window) {
      if (Notification.permission === 'default') Notification.requestPermission();
      else if (Notification.permission === 'granted' && !hasLoggedWeightToday)
        new Notification('8liv Reminder 🌅', { body: "Don't forget to log your empty stomach weight!", icon: '/favicon.ico' });
    }
  }, [step, hasLoggedWeightToday]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  // ── FIX 1 + FIX 2: Load membership_tier and shipping_state from DB ────────
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;

      // Check role to avoid flashing the patient dashboard for non-patients
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = user.email === '8livofficial@gmail.com'
        ? 'admin'
        : (profile?.role || user.user_metadata?.role || 'patient');
      if (role !== 'patient') {
        redirectBasedOnRole(role);
        return;
      }

      const { data } = await supabase.from('health_assessments').select(`
        id, patient_id, first_name, last_name, full_name, age, phone_number, address,
        dob_month, dob_day, dob_year, agree_terms, height_cm, weight_kg, goal_weight_kg,
        tried_weight_program, extra_medical_info, prescription_type, is_eligible,
        medical_history, booking_date, booking_time, room_url, local_food,
        workout_preference, health_conditions_two, glp1_image_url,
        membership_tier, shipping_state, consultation_fee_paid, created_at
      `).eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).single();

      if (data) {
        setFormData(prev => ({
          ...prev,
          first_name: data.first_name || '', last_name: data.last_name || '',
          full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          age: data.age || '', phone_number: data.phone_number || '', address: data.address || '',
          dob_month: data.dob_month || '', dob_day: data.dob_day || '', dob_year: data.dob_year || '',
          agree_terms: data.agree_terms || false, height_cm: data.height_cm || '',
          weight_kg: data.weight_kg || '', goal_weight_kg: data.goal_weight_kg || '',
          gender: data.medical_history?.gender || 'female',
          health_conditions_one: data.medical_history?.has_severe_conditions ? ['Severe condition reported'] : [],
          has_severe_conditions: data.medical_history?.has_severe_conditions || false,
          recent_opiate_use: data.medical_history?.recent_opiate_use || false,
          prior_weight_loss_surgery: data.medical_history?.prior_weight_loss_surgery || false,
          takes_prescription_meds: data.medical_history?.takes_prescription_meds || false,
          blood_pressure_range: data.medical_history?.vitals?.bp || 'Normal',
          resting_heart_rate: data.medical_history?.vitals?.hr || 'Normal',
          prior_medication_type: data.medical_history?.medication_history?.type || 'none',
          prior_medication_details: data.medical_history?.medication_history?.details || '',
          last_dose_timeframe: data.medical_history?.medication_history?.last_dose || '',
          starting_weight_kg: data.medical_history?.medication_history?.starting_weight || '',
          agrees_to_no_stacking: data.medical_history?.medication_history?.agrees_to_no_stacking || false,
          tried_weight_program: data.tried_weight_program || false,
          extra_medical_info: data.extra_medical_info || '', has_extra_info: !!data.extra_medical_info,
          health_conditions_two: data.health_conditions_two || [], glp1_image_url: data.glp1_image_url || '',
        }));
        if (data.glp1_image_url) setGlp1UploadSuccess(true);
        if (data.booking_date) {
          setBookingDate(data.booking_date);
          setIsSlotBooked(true);
        }
        if (data.booking_time) setBookingTime(data.booking_time);
        if (data.room_url) setVideoRoomUrl(data.room_url);
        if (data.local_food) setLocalFood(data.local_food);
        if (data.workout_preference) setWorkoutPreference(data.workout_preference);

        // ── FIXED: Read membership_tier from DB. Always go to dashboard (step 8).
        // Step 6 (membership page) is only shown when patient ACTIVELY clicks
        // 'Purchase Membership' from the prescription approval banner.
        if (data.membership_tier) {
          setSelectedMembership(data.membership_tier);
          setShippingState(data.shipping_state || '');
        } else {
          setSelectedMembership('');
          setShippingState('');
        }

        // Initialize assessmentResult state from loaded DB eligibility if not null
        if (data.is_eligible !== null) {
          setAssessmentResult({
            is_eligible: data.is_eligible,
            message: data.is_eligible 
              ? "Congratulations! You are a strong candidate for medical weight loss treatment. Let's proceed to check your full eligibility."
              : "YOUR HEALTH IS MORE IMPORTANT FOR US TO CONTINUE THE PROCESS , WE ARE SORRY TO INFORM YOU THAT YOU WONT BE ABLE TO CONTINUE FURTHER.",
          });
        }

        // Load completed consultations count for membership gating
        const { data: completedData } = await supabase
          .from('doctor_consultations')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', user.id)
          .in('status', ['attended', 'approved', 'rejected']);
        setCompletedConsultations((completedData as any)?.length ?? 0);

        // Secure and logical routing:
        if (data.consultation_fee_paid) {
          if (!data.booking_date) {
            setStep(13); // Paid but not booked yet — take them to booking screen
          } else {
            setStep(12); // Paid and booked → dashboard
          }
        } else {
          // Has assessment record but not paid consultation fee yet -> go to Step 9 to pay
          setStep(9);
        }
      } else { setStep(0); }
      setIsProfileLoaded(true);
    };
    if (user) checkExistingProfile(); else setIsProfileLoaded(false);
  }, [user]);

  const fetchProgressData = async () => {
    if (!user) return;
    const { data } = await supabase.from('progress_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (data) {
      const startData = { day: 'Start', weight: parseFloat(formData.weight_kg as string) || 0 };
      const todayDate = new Date();
      const todayStr = `${todayDate.getDate()} ${todayDate.toLocaleString('default', { month: 'short' })}`;
      let loggedToday = false;
      const dbData = data.map((log: any) => {
        const dateObj = new Date(log.created_at);
        const fd = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
        if (fd === todayStr) loggedToday = true;
        return { day: fd, weight: parseFloat(log.weight_kg) };
      });
      setWeightData([startData, ...dbData]); setHasLoggedWeightToday(loggedToday);
    }
  };
  useEffect(() => { if (step === 12 && user) fetchProgressData(); }, [step, user]);

  // ── Notification helpers ──────────────────────────────────────────────────
  const markNotifRead = async (id: string) => {
    await supabase.from('patient_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };
  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('patient_notifications').update({ is_read: true }).eq('patient_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      if (isLoginView) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        
        // Fetch role from profiles table after login
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        // Overrides role to 'admin' if it is the Master Admin Email
        const role = data.user.email === '8livofficial@gmail.com'
          ? 'admin'
          : (profile?.role || data.user.user_metadata?.role || 'patient');

        // ── ROLE GUARD: Ensure the user logs in through the correct portal ──
        // Only enforce when role is known (skip for admin who can access everything)
        if (role !== 'admin') {
          const expectedRole = selectedAuthRole === 'doctor' ? 'doctor' : 'patient';
          if (role !== expectedRole) {
            // Wrong portal — sign them out and show a targeted alert
            await supabase.auth.signOut();
            const portalName = expectedRole === 'doctor' ? 'Doctor' : 'Member';
            const correctPortal = role === 'doctor' ? 'Doctor' : 'Member';
            setAuthError(
              `🚫 This is the ${portalName} portal. Your account belongs to the ${correctPortal} portal. Please use the "${correctPortal}" card on this page to log in.`
            );
            setAuthLoading(false);
            return;
          }
        }

        redirectBasedOnRole(role);

      } else {
        const randomHex = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
        const displayId = selectedAuthRole === 'doctor' ? `DOC-${randomHex}` : `MEM-${randomHex}`;

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { role: selectedAuthRole, display_id: displayId } // Pass role and ID to Supabase metadata
          }
        });
        if (error) throw error;
        
        // Insert the profile row with the correct role while user is still authenticated
        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            role: selectedAuthRole,
            display_id: displayId,
          });
          if (profileError) {
            console.warn('Profile insert failed (RLS policy may be missing):', profileError.message);
          }

          if (selectedAuthRole === 'doctor') {
            const { error: docProfileError } = await supabase.from('doctor_profiles').insert({
              doctor_id: signUpData.user.id,
              full_name: displayId, // Enforce confidentiality
            });
            if (docProfileError) {
              console.warn('Doctor profile insert failed:', docProfileError.message);
            }
            const { error: docWalletError } = await supabase.from('doctor_wallet').insert({
              doctor_id: signUpData.user.id,
              balance: 0,
              total_earned: 0,
              total_withdrawn: 0,
            });
            if (docWalletError) {
              console.warn('Doctor wallet insert failed:', docWalletError.message);
            }
          }
        }
        
        // CRITICAL: Supabase auto-signs-in on registration.
        // We must sign out immediately to force the user to log in manually.
        await supabase.auth.signOut();
        
        // Now switch to login view with success message
        setAuthPassword('');
        setIsLoginView(true);
        setAuthSuccessMsg('Account created successfully! Please log in with your credentials.');
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStep(0);
    setIsProfileLoaded(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
    setAuthSuccessMsg('');
    setIsLoginView(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData(p => ({ ...p, [name]: (e.target as HTMLInputElement).checked }));
    else setFormData(p => ({ ...p, [name]: value }));
  };

  const handleConditionOneToggle = (condition: string) => {
    setFormData(prev => {
      const c = prev.health_conditions_one;
      if (condition === 'None of the above') return { ...prev, health_conditions_one: ['None of the above'] };
      const wn = c.filter(x => x !== 'None of the above');
      return { ...prev, health_conditions_one: wn.includes(condition) ? wn.filter(x => x !== condition) : [...wn, condition] };
    });
  };
  const handleConditionToggle = (condition: string) => {
    setFormData(prev => {
      const c = prev.health_conditions_two;
      if (condition === 'None of the above') return { ...prev, health_conditions_two: ['None of the above'] };
      const wn = c.filter(x => x !== 'None of the above');
      return { ...prev, health_conditions_two: wn.includes(condition) ? wn.filter(x => x !== condition) : [...wn, condition] };
    });
  };

  const handleGlp1FileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const sz = file.size / (1024 * 1024);
    if (sz > MAX_FILE_SIZE_MB) { setGlp1UploadError(`File too large: ${sz.toFixed(1)} MB. Max ${MAX_FILE_SIZE_MB} MB.`); setGlp1File(null); e.target.value = ''; return; }
    setGlp1UploadError(''); setGlp1File(file);
  };
  const handleGlp1Upload = async () => {
    if (!glp1File || !user) return;
    setGlp1UploadLoading(true); setGlp1UploadError('');
    try {
      const ext = glp1File.name.split('.').pop();
      const path = `glp1/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('patient_uploads').upload(path, glp1File, { upsert: true });
      if (upErr) { setGlp1UploadError('Upload failed: ' + upErr.message); setGlp1UploadLoading(false); return; }
      const { data: urlData } = supabase.storage.from('patient_uploads').getPublicUrl(path);
      setFormData(p => ({ ...p, glp1_image_url: urlData.publicUrl })); setGlp1UploadSuccess(true);
    } catch (err: any) { setGlp1UploadError('Error: ' + err.message); }
    setGlp1UploadLoading(false);
  };

  const validateStep1 = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) { setStepError('Please enter your first and last name.'); return false; }
    if (!formData.age || !formData.phone_number || !formData.address) { setStepError('Please fill all fields.'); return false; }
    if (!formData.agree_terms) { setStepError('You must agree to the terms.'); return false; }
    setStepError(''); return true;
  };
  const validateStep2 = () => {
    const h = parseFloat(formData.height_cm), w = parseFloat(formData.weight_kg), g = parseFloat(formData.goal_weight_kg);
    if (!h || h < 50 || h > 250) { setStepError('Invalid height.'); return false; }
    if (!w || w < 20 || w > 400) { setStepError('Invalid weight.'); return false; }
    if (!g || g < 20 || g > 400) { setStepError('Invalid goal weight.'); return false; }
    if (!formData.dob_month || !formData.dob_day || !formData.dob_year) { setStepError('Date of birth is required.'); return false; }
    setWeightData([{ day: 'Start', weight: w }]); setStepError(''); return true;
  };
  const calculateTimeline = () => {
    const diff = Math.max(0, (parseFloat(formData.weight_kg as string) || 0) - (parseFloat(formData.goal_weight_kg as string) || 0));
    return { minWeeks: Math.ceil(diff / 1.0), maxWeeks: Math.ceil(diff / 0.5) };
  };

  const getProjectionData = () => {
    const currentWeight = parseFloat(formData.weight_kg) || parseFloat((formData as any).current_weight) || 0;
    const goalWeight = parseFloat(formData.goal_weight_kg) || parseFloat((formData as any).goal_weight) || 0;
    const weightToLose = currentWeight - goalWeight;
    
    if (weightToLose <= 0) return { minWeeks: 0, maxWeeks: 0 };
    
    // Assuming standard medical weight loss of 0.5kg to 1kg per week
    const minWeeks = Math.ceil(weightToLose / 1); 
    const maxWeeks = Math.ceil(weightToLose / 0.5); 
    
    return { minWeeks, maxWeeks };
  };

  const handleHealthStepNext = () => {
    const isH1Clear = formData.health_conditions_one.includes('None of the above');
    const isH2Clear = formData.health_conditions_two.includes('None of the above');
    const isBpNormal = formData.blood_pressure_range === 'Normal';
    const isHrNormal = formData.resting_heart_rate === 'Normal';

    if (isH1Clear && isH2Clear && isBpNormal && isHrNormal) {
      setShowIneligibleMsg(false);
      setStep(5);
    } else {
      setShowIneligibleMsg(true);
    }
  };

  const submitAssessment = async () => {
    setLoading(true);
    const hasSevere = formData.health_conditions_one.length > 0 && !formData.health_conditions_one.includes('None of the above');
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${API_URL}/api/assess`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user?.id,
          first_name: summaryFirstName || formData.first_name,
          last_name: summaryLastName || formData.last_name,
          full_name: `${summaryFirstName || formData.first_name} ${summaryLastName || formData.last_name}`.trim(),
          age: formData.age, phone_number: formData.phone_number, address: formData.address,
          dob_month: formData.dob_month, dob_day: formData.dob_day, dob_year: formData.dob_year, agree_terms: formData.agree_terms,
          height_cm: parseFloat(formData.height_cm) || 0, weight_kg: parseFloat(formData.weight_kg) || 0,
          goal_weight_kg: parseFloat(formData.goal_weight_kg) || 0,
          gender: formData.gender, has_severe_conditions: hasSevere, other_conditions: formData.other_conditions,
          health_conditions_two: formData.health_conditions_two, recent_opiate_use: formData.recent_opiate_use,
          prior_weight_loss_surgery: formData.prior_weight_loss_surgery, takes_prescription_meds: formData.takes_prescription_meds,
          blood_pressure_range: formData.blood_pressure_range, resting_heart_rate: formData.resting_heart_rate,
          prior_medication_type: formData.prior_medication_type, prior_medication_details: formData.prior_medication_details,
          last_dose_timeframe: formData.last_dose_timeframe, starting_weight_kg: parseFloat(formData.starting_weight_kg as string) || null,
          agrees_to_no_stacking: formData.agrees_to_no_stacking, tried_weight_program: formData.tried_weight_program,
          extra_medical_info: formData.extra_medical_info || null, glp1_image_url: formData.glp1_image_url || null,
          shipping_state: shippingState,
        }),
      });
      const result = await res.json(); setAssessmentResult(result); setStep(9);
    } catch { alert('Failed to connect to backend.'); }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const hasSevere = formData.health_conditions_one.length > 0 && !formData.health_conditions_one.includes('None of the above');
    const { error } = await supabase.from('health_assessments').update({
      first_name: formData.first_name, last_name: formData.last_name,
      full_name: `${formData.first_name} ${formData.last_name}`.trim(),
      age: formData.age, phone_number: formData.phone_number, address: formData.address,
      dob_month: formData.dob_month, dob_day: formData.dob_day, dob_year: formData.dob_year, agree_terms: formData.agree_terms,
      height_cm: parseFloat(formData.height_cm as any), weight_kg: parseFloat(formData.weight_kg as any),
      goal_weight_kg: parseFloat(formData.goal_weight_kg as any),
      tried_weight_program: formData.tried_weight_program, extra_medical_info: formData.extra_medical_info,
      health_conditions_two: formData.health_conditions_two, glp1_image_url: formData.glp1_image_url || null,
      shipping_state: shippingState,
      updated_at: new Date().toISOString(),
      medical_history: {
        gender: formData.gender, has_severe_conditions: hasSevere, other_conditions: formData.other_conditions,
        recent_opiate_use: formData.recent_opiate_use, prior_weight_loss_surgery: formData.prior_weight_loss_surgery,
        takes_prescription_meds: formData.takes_prescription_meds,
        vitals: { bp: formData.blood_pressure_range, hr: formData.resting_heart_rate },
        medication_history: {
          type: formData.prior_medication_type, details: formData.prior_medication_details,
          last_dose: formData.last_dose_timeframe, starting_weight: parseFloat(formData.starting_weight_kg as any) || null,
          agrees_to_no_stacking: formData.agrees_to_no_stacking,
        },
      }
    }).eq('patient_id', user.id);
    if (!error) { alert('Profile Updated! ✅'); setStep(12); setIsEditing(false); } else { alert('DB error: ' + error.message); }
    setLoading(false);
  };

  // ── FIX: handleConsultationPayment for booking the doctor ─────────────────
  const handleConsultationPayment = async () => {
    setPaymentLoading(true);
    try {
      console.log("[DEV BYPASS] Consultation payment mock initiated.");
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 11);
      const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11);
      
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const verifyRes = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'mock_signature',
          patient_id: user?.id,
          payment_type: 'consultation',
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.status === 'success' && verifyData.verified) {
        alert("Payment successful! Funds are securely held in the Admin escrow pool until your consultation concludes.");
        setStep(13);
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Could not verify payment with backend. Please contact support.');
    }
    setPaymentLoading(false);
  };

  // ── FIX 1: handleMembershipPayment saves membership_tier + shipping_state to DB ─────
  const handleMembershipPayment = async () => {
    setPaymentLoading(true);
    try {
      console.log("[DEV BYPASS] Membership payment mock initiated.");
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 11);
      const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 11);
      
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const verifyRes = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'mock_signature',
          patient_id: user?.id,
          payment_type: 'membership',
          membership_tier: selectedMembership,
          shipping_state: shippingState,
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.status === 'success' && verifyData.verified) {
        setStep(11);
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Error verifying membership payment:', err);
      alert('Could not verify payment with backend. Please contact support.');
    }
    setPaymentLoading(false);
  };

  const handleLogData = async () => {
    if (!logWeight || !user) return;
    const { error } = await supabase.from('progress_logs').insert([{ user_id: user.id, weight_kg: parseFloat(logWeight), calories: parseInt(logCalories) || null }]);
    if (error) alert('DB Error: ' + error.message);
    else { alert('Progress saved! ✅'); setLogWeight(''); setLogCalories(''); fetchProgressData(); }
  };

  // ── handleStartVideoCall ──────────────────────────────────────────────────
  const handleStartVideoCall = async () => {
    setVideoLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const r = await fetch(`${API_URL}/api/create-video-room`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const d = await r.json();
      const roomUrl = d.room_url || 'https://meet.google.com/abc-defg-hij';
      const cur_d = bookingDate || new Date().toLocaleDateString();
      const cur_t = bookingTime || (step === 12 ? 'Dietician' : step === 13 ? 'Fitness' : 'Consultation');

      const payload: any = { patient_id: user?.id, booking_date: cur_d, booking_time: cur_t, room_url: roomUrl };
      if (localFood?.trim()) payload.local_food = localFood.trim();
      if (workoutPreference?.trim()) payload.workout_preference = workoutPreference.trim();
      await fetch(`${API_URL}/api/update-booking`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (step === 13) {
        const matchedSlot = doctorSlots.find(s => s.id === selectedSlotId) || doctorSlots.find(s => s.available_date === bookingDate && s.time_slot === bookingTime);
        const patientFullName = user?.user_metadata?.display_id || `${formData.first_name} ${formData.last_name}`.trim() || formData.full_name || 'Member';
        
        // DEV BYPASS: Use doctor_id from slot, or fallback to patient ID (so it passes UUID constraint in DB)
        const doctorId = matchedSlot?.doctor_id || user?.id;
        
        if (doctorId) {
          await supabase.from('doctor_consultations').insert({
            doctor_id: doctorId, patient_id: user?.id, patient_name: patientFullName,
            booking_date: cur_d, booking_time: cur_t, room_url: roomUrl,
            status: 'scheduled', consultation_fee: 500, doctor_payout: 250,
          });
          if (matchedSlot && !matchedSlot.id.startsWith('mock_')) {
            await supabase.from('doctor_availability').update({ is_booked: true }).eq('id', matchedSlot.id);
          }

          await supabase.from('patient_notifications').insert({
            patient_id: user?.id, doctor_id: doctorId,
            type: 'booking_confirmed',
            title: '✅ Consultation Booked!',
            message: `Your doctor consultation is confirmed for ${cur_d} at ${cur_t}. Join the video call at the scheduled time from your dashboard.`,
          });
        }
        // Booking done — go back to dashboard (FIX 2: patient must wait for actual time)
        setBookingDate(cur_d);
        setBookingTime(cur_t);
        setVideoRoomUrl(roomUrl);
        setIsSlotBooked(true);
      } else {
        // Dietician / Fitness — start call immediately (these are on-demand)
        setVideoRoomUrl(roomUrl); setCallActive(true);
      }
    } catch { setVideoRoomUrl('https://meet.google.com/abc-defg-hij'); setCallActive(true); }
    setVideoLoading(false);
  };

  // ── handleJoinCall — called from dashboard "Join Now" button ─────────────
  const handleJoinCall = () => {
    if (videoRoomUrl) { setCallActive(true); setStep(13); }
  };

  // ── handleEndCall ─────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    if ((step === 13 || callActive) && user) {
      // DEV BYPASS: Auto-approve prescription on call end for testing
      await supabase.from('doctor_consultations')
        .update({ 
          status: 'approved', 
          prescription_text: 'Semaglutide 0.25mg injection once weekly.\nInject subcutaneously on the same day each week, preferably in the evening.', 
          prescription_type: 'Injected',
          updated_at: new Date().toISOString() 
        })
        .eq('patient_id', user.id)
        .in('status', ['scheduled', 'calling', 'attended']);

      await supabase.from('patient_notifications').insert({
        patient_id: user.id,
        type: 'prescription_ready',
        title: '🎉 Prescription Approved! 💊',
        message: 'Your doctor has approved your weight loss medication! Choose a membership plan now to order your prescription and have it delivered.',
      });
    }
    setCallActive(false); setVideoRoomUrl('');
    setStep(12);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!callActive) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => {
      if (isOnline) {
        setCallDuration(prev => {
          if (prev >= 3599) {
            handleEndCall();
            return 3600;
          }
          return prev + 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [callActive, isOnline]);

  // ── handleCancelAppointment ──────────────────────────────────────────────
  const handleCancelAppointment = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      `Cancel your appointment on ${bookingDate} at ${bookingTime}?\n\nThe slot will be released and you can rebook anytime.`
    );
    if (!confirmed) return;
    setCancelLoading(true);
    try {
      // 1. Mark the doctor_consultation as cancelled
      await supabase
        .from('doctor_consultations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('patient_id', user.id)
        .eq('booking_date', bookingDate)
        .eq('booking_time', bookingTime)
        .eq('status', 'scheduled');

      // 2. Free the doctor_availability slot (is_booked → false)
      const matchedSlot = doctorSlots.find(
        s => s.available_date === bookingDate && s.time_slot === bookingTime
      );
      if (matchedSlot) {
        await supabase.from('doctor_availability').update({ is_booked: false }).eq('id', matchedSlot.id);
      } else {
        // Fallback: search by date+time directly
        await supabase.from('doctor_availability')
          .update({ is_booked: false })
          .eq('available_date', bookingDate)
          .eq('time_slot', bookingTime);
      }

      // 3. Clear booking from health_assessments
      await supabase.from('health_assessments')
        .update({ booking_date: null, booking_time: null, room_url: null, updated_at: new Date().toISOString() })
        .eq('patient_id', user.id);

      // 4. Cancellation notification for the patient
      await supabase.from('patient_notifications').insert({
        patient_id: user.id,
        type: 'booking_cancelled',
        title: '❌ Appointment Cancelled',
        message: `Your appointment on ${bookingDate} at ${bookingTime} has been cancelled. You can rebook anytime from the Doctor Session page.`,
      });

      // 5. Reset local UI state
      setBookingDate('');
      setBookingTime('');
      setVideoRoomUrl('');
      setIsSlotBooked(false);
      setCanJoinCallNow(false);
      setCallCountdown(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setStep(12);
    } catch (err: any) {
      alert('Failed to cancel: ' + err.message);
    }
    setCancelLoading(false);
  };

  // Render Login Form
  const renderLoginForm = (role: string, theme = "patient") => (
    <form onSubmit={(e) => { e.preventDefault(); handleAuth(e); }} className="w-full text-left animate-fadeIn">
      {authError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {authError}
        </div>
      )}
      <ElegantInput id={`${role}-login-email`} label="Email Address" type="email" value={authEmail} onChange={(e: any) => setAuthEmail(e.target.value)} required theme={theme} />
      <ElegantInput id={`${role}-login-pass`} label="Password" type="password" value={authPassword} onChange={(e: any) => setAuthPassword(e.target.value)} required theme={theme} />
      
      <button 
        type="submit" 
        disabled={authLoading} 
        className={`w-full mt-4 py-3.5 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60 text-white shadow-lg ${
          theme === 'doctor' 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20' 
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20'
        }`}
      >
        {authLoading ? 'Signing In...' : 'Sign In'}
      </button>
      
      <div className="flex justify-between items-center mt-6 text-sm">
        <button 
          type="button" 
          onClick={() => { setShowRoleSelection(true); setAuthError(''); setAuthSuccessMsg(''); }} 
          className={`font-bold transition-colors text-slate-500 ${theme === 'doctor' ? 'hover:text-emerald-600' : 'hover:text-indigo-600'}`}
        >
          ← Back
        </button>
        <button 
          type="button" 
          onClick={() => { setIsLoginView(false); setAuthError(''); setAuthSuccessMsg(''); }} 
          className={`font-bold hover:underline ${theme === 'doctor' ? 'text-emerald-600' : 'text-indigo-600'}`}
        >
          Create Account
        </button>
      </div>
    </form>
  );

  // Render Register Form
  const renderRegisterForm = (role: string, theme = "patient") => (
    <form onSubmit={(e) => { e.preventDefault(); handleAuth(e); }} className="w-full text-left animate-fadeIn">
      {authError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {authError}
        </div>
      )}
      {authSuccessMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {authSuccessMsg}
        </div>
      )}
      <div className="flex gap-4">
        <div className="w-1/2">
          <ElegantInput id={`${role}-reg-fname`} label="First Name" value={formData.first_name} onChange={(e: any) => setFormData({...formData, first_name: e.target.value})} required theme={theme} />
        </div>
        <div className="w-1/2">
          <ElegantInput id={`${role}-reg-lname`} label="Last Name" value={formData.last_name} onChange={(e: any) => setFormData({...formData, last_name: e.target.value})} required theme={theme} />
        </div>
      </div>
      <ElegantInput id={`${role}-reg-email`} label="Email Address" type="email" value={authEmail} onChange={(e: any) => setAuthEmail(e.target.value)} required theme={theme} />
      <ElegantInput id={`${role}-reg-pass`} label="Password" type="password" value={authPassword} onChange={(e: any) => setAuthPassword(e.target.value)} required theme={theme} />
      
      <button 
        type="submit" 
        disabled={authLoading} 
        className={`w-full mt-2 py-3.5 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60 text-white shadow-lg ${
          theme === 'doctor' 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20' 
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20'
        }`}
      >
        {authLoading ? 'Creating...' : 'Create Account'}
      </button>
      
      <div className="flex justify-between items-center mt-6 text-sm">
        <button 
          type="button" 
          onClick={() => { setShowRoleSelection(true); setAuthError(''); setAuthSuccessMsg(''); }} 
          className={`font-bold transition-colors text-slate-500 ${theme === 'doctor' ? 'hover:text-emerald-600' : 'hover:text-indigo-600'}`}
        >
          ← Back
        </button>
        <button 
          type="button" 
          onClick={() => { setIsLoginView(true); setAuthError(''); setAuthSuccessMsg(''); }} 
          className={`font-bold hover:underline ${theme === 'doctor' ? 'text-emerald-600' : 'text-indigo-600'}`}
        >
          Already have an account? Sign In
        </button>
      </div>
    </form>
  );

  // ── AUTH SCREEN ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-50 overflow-hidden font-sans">
        {/* Top Bar with Logo */}
        <div className="w-full flex justify-center pt-8 pb-4">
          <img src="/images/logo%20loss.png" alt="8liv Logo" className="h-36 md:h-44 w-auto object-contain transition-all" />
        </div>

        {/* Main Split Container */}
        <div className="flex-1 flex w-full max-w-7xl mx-auto px-8 pb-12 rounded-[2rem] overflow-hidden">
          
          {/* --- LEFT PANEL: PATIENT --- */}
          <div 
            className={`relative flex flex-col items-center justify-center bg-white transition-all duration-700 ease-in-out overflow-hidden cursor-pointer rounded-l-[2rem]
              ${showRoleSelection ? 'w-1/2 hover:bg-slate-50' : selectedAuthRole === 'patient' ? 'w-[75%]' : 'w-[25%] opacity-50'}`}
            onClick={() => (showRoleSelection || selectedAuthRole !== 'patient') && handleSelectRole('patient')}
          >
            {/* Subtle Background Pattern/Watermark */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
              <svg className="w-96 h-96 text-slate-800" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>

            <div className={`relative z-10 text-center px-8 transition-all duration-500 ${selectedAuthRole === 'patient' && !showRoleSelection ? 'mt-[-30px]' : ''}`}>
              <h2 className="text-4xl font-serif font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-violet-800 mb-4">
                I am a Member
              </h2>
              {showRoleSelection && (
                <p className="text-slate-500 font-bold mb-8 max-w-xs mx-auto">
                  Begin your personalized journey to better health.
                </p>
              )}
            </div>

            {/* Patient Form (Hidden until selected) */}
            {!showRoleSelection && selectedAuthRole === 'patient' && (
              <div className="relative z-10 w-full max-w-sm px-8 animate-fadeIn">
                {isLoginView ? renderLoginForm('patient', "patient") : renderRegisterForm('patient', "patient")}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-[1px] bg-slate-100"></div>

          {/* --- RIGHT PANEL: DOCTOR --- */}
          <div 
            className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 text-slate-800 transition-all duration-700 ease-in-out overflow-hidden cursor-pointer rounded-r-[2rem]
              ${showRoleSelection ? 'w-1/2 hover:from-emerald-100/90 hover:via-teal-50 hover:to-emerald-200/90' : selectedAuthRole === 'doctor' ? 'w-[75%]' : 'w-[25%] opacity-70'}`}
            onClick={() => (showRoleSelection || selectedAuthRole !== 'doctor') && handleSelectRole('doctor')}
          >
            {/* Subtle Background Pattern/Watermark */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
              <svg className="w-96 h-96 text-emerald-800" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
            </div>

            <div className={`relative z-10 text-center px-8 transition-all duration-500 ${selectedAuthRole === 'doctor' && !showRoleSelection ? 'mt-[-30px]' : ''}`}>
              <h2 className="text-4xl font-serif font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-900 to-teal-800 mb-4">
                Medical Professional
              </h2>
              {showRoleSelection && (
                <p className="text-emerald-700 font-bold mb-8 max-w-xs mx-auto">
                  Access your dashboard and member profiles securely.
                </p>
              )}
            </div>

            {/* Doctor Form (Hidden until selected) */}
            {!showRoleSelection && selectedAuthRole === 'doctor' && (
              <div className="relative z-10 w-full max-w-sm px-8 animate-fadeIn">
                {isLoginView ? renderLoginForm('doctor', 'doctor') : renderRegisterForm('doctor', 'doctor')}
              </div>
            )}
          </div>

        </div>
      </main>
    );
  }

  if (user && !isProfileLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-lg font-black text-slate-600 mt-6">Loading Profile...</p>
      </div>
    );
  }

  const LiveCallPanel = ({ color }: { color: string }) => (
    <div className={`relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-100 ${color} bg-slate-900`}>
      <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-4 py-2 rounded-full font-bold text-sm backdrop-blur flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        Live Consult: {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
      </div>
      {!isOnline && (
        <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 text-center">
          <PhoneOff className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h3 className="text-2xl font-black mb-2">Network Disconnected</h3>
          <p className="text-slate-300">Please check your internet connection. We've paused your timer.</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={videoRoomUrl}
        allow="camera; microphone; fullscreen; display-capture"
        className="w-full h-[600px] border-0"
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6 relative font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
        @keyframes slowZoom { from { transform: scale(1.05); } to { transform: scale(1.12); } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes bellShake { 0%,100%{transform:rotate(0)}15%{transform:rotate(12deg)}30%{transform:rotate(-10deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(4deg)} }
        @keyframes prescriptionShake { 0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)} }
        @keyframes prescriptionPulse { 0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,0.4)}50%{box-shadow:0 0 0 12px rgba(79,70,229,0)} }
        @keyframes countdownPulse { 0%,100%{opacity:1}50%{opacity:0.6} }
        @keyframes joinGlow { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)}50%{box-shadow:0 0 0 14px rgba(16,185,129,0)} }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out both; }
        .bell-shake { animation: bellShake 0.6s ease-in-out 3; }
        .prescription-shake { animation: prescriptionShake 0.5s ease-in-out 2; }
        .prescription-pulse { animation: prescriptionPulse 1.5s ease-in-out 4; }
        .countdown-pulse { animation: countdownPulse 1s ease-in-out infinite; }
        .join-glow { animation: joinGlow 1.5s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width:6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:#f1f5f9; border-radius:99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#c7d2fe; border-radius:99px; }
      `}</style>

      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full blur-[120px] pointer-events-none z-0"></div>



      {/* ── Logout Button (always visible when logged in) ──────────────── */}
      <button
        onClick={handleLogout}
        className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/80 font-bold py-2.5 px-4 rounded-2xl shadow-sm transition-all text-sm"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      {/* ── STEP 0 ─────────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="max-w-6xl w-full bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 relative z-10 animate-fadeIn">
          <div className="flex flex-col lg:flex-row items-stretch gap-10">
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex mb-6"><div className="bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 p-4 rounded-2xl shadow-sm border border-white"><Activity className="w-8 h-8"/></div></div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">Medically Supervised<br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Weight Loss</span></h1>
              <p className="text-lg text-slate-700 font-semibold mb-6">Tailored to your unique biology.</p>
              <div className="space-y-4 text-slate-600 font-medium mb-8 leading-relaxed">
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"/><p>Over 1 billion people live with obesity globally — affecting 1 in 8.</p></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"/><p>In India, 135 million adults are affected — driven by urbanisation & lifestyle shifts.</p></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"/><p>Obesity links to diabetes, heart disease, stroke, PCOS, CKD & more.</p></div>
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-5 rounded-2xl border border-indigo-100/50 shadow-sm">
                  <p className="font-bold text-indigo-900 leading-snug">Our platform integrates expert doctor advice, modern medications, fitness & proper diet — to help you lose weight effectively and sustainably.</p>
                </div>
              </div>
              <button onClick={() => setStep(1)} className={`${btnPrimaryCls} py-4 text-lg w-full`}>Start Your Transformation <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
            </div>
            <div className="lg:w-[420px] flex-shrink-0 flex flex-col gap-4">
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-video flex-shrink-0">
                <img src={IMG.visual2} alt="medical supervision" className="w-full h-full object-cover animate-[slowZoom_20s_ease-in-out_infinite_alternate]"/>
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent"/>
                <div className="absolute bottom-0 left-0 right-0 p-6 animate-[fadeSlideUp_0.8s_ease-out_both]">
                  <p className="text-white font-black text-xl leading-tight">Your Journey Starts Here</p>
                  <p className="text-indigo-200 text-sm font-semibold mt-1">Medical-grade weight loss program</p>
                </div>
              </div>
              <div className="relative rounded-[2rem] overflow-hidden shadow-xl" style={{ height: '200px' }}>
                {SLIDESHOW_IMGS.map((img, idx) => (
                  <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ${idx === slideIdx ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={img} alt={`slide ${idx}`} className="w-full h-full object-cover object-center"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"/>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className={`font-black text-lg text-white ${idx === slideIdx ? 'animate-[fadeSlideUp_0.6s_ease-out_both]' : ''}`}>{SLIDE_HEALTH_FACTS[idx].title}</p>
                      <p className={`text-xs text-slate-300 font-semibold mt-1 ${idx === slideIdx ? 'animate-[fadeSlideUp_0.6s_ease-out_0.15s_both]' : ''}`}>{SLIDE_HEALTH_FACTS[idx].sub}</p>
                    </div>
                  </div>
                ))}
                <div className="absolute top-3 right-4 flex gap-1.5 z-10">
                  {SLIDESHOW_IMGS.map((_, i) => (<button key={i} onClick={() => setSlideIdx(i)} className={`rounded-full transition-all duration-300 ${i === slideIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}/>))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEPS 1–4 ──────────────────────────────────────────────────────── */}
      {[1, 2, 3, 4].includes(step) && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={step}/>
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60">

            {step === 1 && (<>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><User className="text-indigo-500 w-8 h-8"/> Contact Info</h2>
                {isEditing && <span className="bg-amber-100 text-amber-800 text-xs font-black px-4 py-2 rounded-full">EDIT MODE</span>}
              </div>
              <p className="text-slate-500 mb-8 font-medium">How can you be reached? Our medical teams use email and text for member communication.</p>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className={labelCls}>First Name</label><input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={inputCls} placeholder="John"/></div>
                  <div><label className={labelCls}>Last Name</label><input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={inputCls} placeholder="Doe"/></div>
                </div>
                <div><label className={labelCls}>Age</label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className={inputCls}/></div>
                <div><label className={labelCls}>Email</label><input type="email" value={user?.email || ''} readOnly className={`${inputCls} bg-slate-100/50 text-slate-500 cursor-not-allowed`}/></div>
                <div><label className={labelCls}>Phone Number</label><input type="tel" name="phone_number" value={formData.phone_number} onChange={handleInputChange} className={inputCls}/></div>
                <div><label className={labelCls}>Address</label><textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className={inputCls}></textarea></div>
                <div className="bg-indigo-50/40 p-6 rounded-3xl border border-indigo-100">
                  <label className="flex items-start space-x-4 cursor-pointer group">
                    <input type="checkbox" name="agree_terms" checked={formData.agree_terms} onChange={handleInputChange} className="mt-1 w-5 h-5 text-indigo-600 rounded border-slate-300"/>
                    <span className="text-xs text-slate-600 font-medium leading-relaxed">I understand that my information is never shared, is protected by HIPAA, and I agree to the terms and privacy policy. I agree to receive recurring SMS/text regarding my healthcare.</span>
                  </label>
                </div>
                {stepError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-3"><AlertCircle className="w-5 h-5"/> {stepError}</p>}
                <div className="flex gap-4 mt-10">
                  <button onClick={() => { if (isEditing) { setIsEditing(false); setStep(8); } else setStep(0); }} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button onClick={() => { if (validateStep1()) setStep(2); }} className={btnPrimaryCls}>Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                </div>
              </div>
            </>)}

            {step === 2 && (<>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Scale className="text-indigo-500 w-8 h-8"/> Vitals & Details</h2>
                {isEditing && <span className="bg-amber-100 text-amber-800 text-xs font-black px-4 py-2 rounded-full">EDIT MODE</span>}
              </div>
              <div className="space-y-8">
                <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100">
                  <p className="text-sm font-black text-slate-800 mb-6 uppercase tracking-wider">Measurements</p>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div><label className={labelCls}>Height (cm)</label><input type="number" name="height_cm" value={formData.height_cm} onChange={handleInputChange} className={inputCls} placeholder="170"/></div>
                    <div><label className={labelCls}>Weight (kg)</label><input type="number" name="weight_kg" value={formData.weight_kg} onChange={handleInputChange} className={inputCls} placeholder="85"/></div>
                  </div>
                  <div><label className={labelCls}>Goal Weight (kg)</label><input type="number" name="goal_weight_kg" value={formData.goal_weight_kg} onChange={handleInputChange} className={inputCls} placeholder="65"/></div>
                </div>
                <div><label className={labelCls}>Biological Sex</label><select name="gender" value={formData.gender} onChange={handleInputChange} className={inputCls}><option value="male">Male</option><option value="female">Female</option></select></div>
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-3">Date of Birth</p>
                  <div className="grid grid-cols-3 gap-4">
                    <input type="text" name="dob_month" value={formData.dob_month} onChange={handleInputChange} placeholder="MM" maxLength={2} className={inputCls}/>
                    <input type="text" name="dob_day" value={formData.dob_day} onChange={handleInputChange} placeholder="DD" maxLength={2} className={inputCls}/>
                    <input type="text" name="dob_year" value={formData.dob_year} onChange={handleInputChange} placeholder="YYYY" maxLength={4} className={inputCls}/>
                  </div>
                </div>
                {stepError && <p className="text-rose-600 text-sm font-bold bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-3"><AlertCircle className="w-5 h-5"/> {stepError}</p>}
                <div className="flex gap-4 mt-10">
                  <button onClick={() => setStep(1)} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button onClick={() => { if (validateStep2()) setStep(3); }} className={btnPrimaryCls}>Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button>
                </div>
              </div>
            </>)}

            {step === 3 && (<>
              <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3"><Activity className="text-indigo-500 w-8 h-8"/> Health Questionnaire</h2>
              <div className="space-y-8">
                <div className="bg-rose-50/40 p-8 rounded-[2rem] border border-rose-100">
                  <p className="text-sm font-black text-rose-900 mb-2 flex items-center gap-2 uppercase tracking-wider"><AlertCircle className="w-5 h-5"/> Severe Conditions</p>
                  <p className="text-sm text-rose-700/80 mb-6 font-medium">Select all that apply.</p>
                  <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                    {HEALTH_CONDITIONS_ONE_LIST.map(c => {
                      const checked = formData.health_conditions_one.includes(c), isNone = c === 'None of the above';
                      return (
                        <label key={c} onClick={() => handleConditionOneToggle(c)} className={`group flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${checked ? isNone ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                          <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? isNone ? 'border-emerald-500 bg-emerald-500 scale-110' : 'border-rose-500 bg-rose-500 scale-110' : 'border-slate-300'}`}>{checked && <CheckCircle2 className="text-white w-4 h-4"/>}</div>
                          <span className={`text-sm font-semibold leading-relaxed ${isNone && checked ? 'text-emerald-900' : checked ? 'text-rose-900' : 'text-slate-700'}`}>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  {[{ name: 'recent_opiate_use', label: 'Recent opiate pain medications / street drugs?' }, { name: 'prior_weight_loss_surgery', label: 'Prior weight loss surgeries?' }, { name: 'takes_prescription_meds', label: 'Currently take any prescription medications?' }].map(({ name, label }) => (
                    <label key={name} className="group flex items-center space-x-4 cursor-pointer p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <input type="checkbox" name={name} checked={(formData as any)[name]} onChange={handleInputChange} className="w-5 h-5 text-indigo-600 rounded border-slate-300"/>
                      <span className={checkboxLabelCls}>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50/80 rounded-3xl border border-slate-100">
                  <div><label className={labelCls}>Blood pressure</label><select name="blood_pressure_range" value={formData.blood_pressure_range} onChange={handleInputChange} className={inputCls}><option value="Normal">Normal (&lt;120/80)</option><option value="120-129/<80">Elevated</option><option value="Hypertension Stage 1">Stage 1 HTN</option><option value="Hypertension Stage 2">Stage 2 HTN</option></select></div>
                  <div><label className={labelCls}>Resting heart rate</label><select name="resting_heart_rate" value={formData.resting_heart_rate} onChange={handleInputChange} className={inputCls}><option value="Normal">Normal (60–100)</option><option value="Slow">Slow (&lt;60)</option><option value="Slightly Fast">Fast (101–110)</option><option value="Fast">Very Fast (&gt;110)</option></select></div>
                </div>
                <div className="border-t border-slate-100 pt-8">
                  <p className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wider">General Medical History</p>
                  <p className="text-sm text-slate-500 mb-6 font-medium">Select all conditions that apply.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                    {HEALTH_CONDITIONS_TWO_LIST.map(c => {
                      const checked = formData.health_conditions_two.includes(c), isNone = c === 'None of the above';
                      return (
                        <label key={c} onClick={() => handleConditionToggle(c)} className={`group flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${checked ? isNone ? 'border-emerald-500 bg-emerald-50/80' : 'border-indigo-500 bg-indigo-50/80' : 'border-slate-100 hover:border-indigo-200 bg-white'}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? isNone ? 'border-emerald-500 bg-emerald-500 scale-110' : 'border-indigo-500 bg-indigo-500 scale-110' : 'border-slate-300'}`}>{checked && <CheckCircle2 className="text-white w-3 h-3"/>}</div>
                          <span className={`text-sm font-semibold ${isNone && checked ? 'text-emerald-900' : checked ? 'text-indigo-900' : 'text-slate-700'}`}>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-4 mt-10">
                  <button onClick={() => setStep(2)} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  {/* Continue / Next button */}
                  <button
                    onClick={handleHealthStepNext}   // <-- Changed this line
                    className={btnPrimaryCls}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                {showIneligibleMsg && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg text-center font-semibold animate-fadeIn">
                    YOUR HEALTH IS MORE IMPORTANT FOR US TO CONTINUE THE PROCESS , WE ARE SORRY TO INFORM YOU THAT YOU WONT BE ABLE TO CONTINUE FURTHER.
                  </div>
                )}
              </div>
            </>)}

            {step === 4 && (<>
              <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3"><Pill className="text-indigo-500 w-8 h-8"/> Medication History</h2>
              <div className="space-y-8">
                <div><label className={labelCls}>Recent weight loss medications?</label><select name="prior_medication_type" value={formData.prior_medication_type} onChange={handleInputChange} className={inputCls}><option value="none">None</option><option value="glp1">Yes, GLP-1 medication</option><option value="other">Yes, Other medication</option></select></div>
                {formData.prior_medication_type !== 'none' && (
                  <div className="bg-indigo-50/40 p-8 rounded-3xl space-y-6 border border-indigo-100/50">
                    <p className="text-sm font-black text-indigo-900 uppercase tracking-wider">Medication Details</p>
                    <input type="text" name="prior_medication_details" value={formData.prior_medication_details} onChange={handleInputChange} placeholder="Name, dose, and frequency..." className={inputCls}/>
                    {formData.prior_medication_type === 'glp1' && (<>
                      <div><label className={labelCls}>Last dose timeframe</label><select name="last_dose_timeframe" value={formData.last_dose_timeframe} onChange={handleInputChange} className={inputCls}><option value="">Select...</option><option value="0-5 days">0-5 days ago</option><option value="6-10 days">6-10 days ago</option><option value="11-14 days">11-14 days ago</option><option value="More than 2 weeks">2-4 weeks ago</option><option value="More than 4 weeks">&gt; 4 weeks ago</option></select></div>
                      <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all rounded-3xl p-8 text-center group cursor-pointer">
                        <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FileText className="w-8 h-8"/></div>
                        <label className="block text-base font-black text-slate-800 mb-2">Upload GLP-1 Prescription</label>
                        <p className="text-sm text-slate-500 mb-5 font-medium">Max {MAX_FILE_SIZE_MB} MB. JPG, PNG, or PDF.</p>
                        <input type="file" accept="image/*,.heic,.pdf" onChange={handleGlp1FileSelect} className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"/>
                        {glp1UploadError && <p className="text-rose-600 text-sm font-bold mt-4 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/> {glp1UploadError}</p>}
                        {glp1File && !glp1UploadSuccess && (
                          <div className="mt-5 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-sm text-slate-700 font-semibold flex-1 truncate text-left">{glp1File.name}</span>
                            <button onClick={handleGlp1Upload} disabled={glp1UploadLoading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all">{glp1UploadLoading ? 'Uploading...' : 'Upload'}</button>
                          </div>
                        )}
                        {glp1UploadSuccess && formData.glp1_image_url && (
                          <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 text-left animate-fadeIn"><CheckCircle2 className="text-emerald-500 w-8 h-8 flex-shrink-0"/><div><p className="text-emerald-900 font-bold">Successfully uploaded!</p><a href={formData.glp1_image_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 text-sm font-semibold hover:underline">View file</a></div></div>
                        )}
                      </div>
                    </>)}
                    <div><label className={labelCls}>Starting weight (kg) on medication</label><input type="number" name="starting_weight_kg" value={formData.starting_weight_kg} onChange={handleInputChange} className={inputCls}/></div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors"><label className="flex items-start space-x-4 cursor-pointer group"><input type="checkbox" name="agrees_to_no_stacking" checked={formData.agrees_to_no_stacking} onChange={handleInputChange} className="mt-1 w-5 h-5 text-indigo-600 rounded border-slate-300"/><span className="text-sm font-semibold text-slate-700 leading-snug group-hover:text-slate-900">I agree to only obtain weight loss medication through this program. No stacking.</span></label></div>
                  </div>
                )}
                <div className="pt-8 border-t border-slate-100 space-y-5">
                  <label className="group flex items-center space-x-4 cursor-pointer p-5 border-2 border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all"><input type="checkbox" name="tried_weight_program" checked={formData.tried_weight_program} onChange={handleInputChange} className="w-5 h-5 text-indigo-600 rounded border-slate-300"/><span className={checkboxLabelCls}>Tried a weight management program before?</span></label>
                  <label className="group flex items-center space-x-4 cursor-pointer p-5 border-2 border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all"><input type="checkbox" name="has_extra_info" checked={formData.has_extra_info} onChange={handleInputChange} className="w-5 h-5 text-indigo-600 rounded border-slate-300"/><span className={checkboxLabelCls}>Any additional medical info for our team?</span></label>
                  {formData.has_extra_info && <textarea name="extra_medical_info" value={formData.extra_medical_info} onChange={handleInputChange} placeholder="Type here..." rows={4} className={inputCls}></textarea>}
                </div>
                <div className="flex gap-4 mt-10">
                  <button onClick={() => setStep(3)} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button onClick={isEditing ? handleUpdateProfile : submitAssessment} disabled={loading} className={`flex-1 font-bold py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 text-white ${isEditing ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>{loading ? 'Processing...' : (isEditing ? 'Save Profile' : 'Analyze Assessment')}</button>
                </div>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── STEP 5: PROJECTION ─────────────────────────────────────────────── */}
      {step === 5 && !assessmentResult && (
        <div className="max-w-2xl w-full bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 relative z-10 animate-fadeIn text-center">
          <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">Your Projection</h2>
          
          <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100 mb-8">
            <p className="text-lg text-slate-600 mb-4 font-semibold leading-relaxed">
              With medication, you'll lose <span className="font-black text-slate-800">0.5 to 1 kg</span> per week.
            </p>
            <p className="text-lg text-slate-600 mb-6 font-semibold leading-relaxed">
              It will take about <span className="font-black text-emerald-600">{getProjectionData().minWeeks} - {getProjectionData().maxWeeks} weeks</span> to reach your goal weight of <span className="font-black text-slate-800">{formData.goal_weight_kg || (formData as any).goal_weight || 0} kg</span>.
            </p>
          </div>

          <button
            onClick={() => setStep(6)}
            className={btnPrimaryCls} // Reusing primary button class
          >
            NEXT
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* ── STEP 9: ASSESSMENT RESULT ─────────────────────────────────────────── */}
      {step === 9 && assessmentResult && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={5}/>
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60">
            <div className="flex flex-col items-center mb-10">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${assessmentResult.is_eligible ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>{assessmentResult.is_eligible ? <CheckCircle2 className="w-12 h-12"/> : <AlertCircle className="w-12 h-12"/>}</div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Analysis Complete</h2>
              <h2 className={`text-5xl font-black tracking-tight ${assessmentResult.is_eligible ? 'text-slate-900' : 'text-rose-600'}`}>{assessmentResult.is_eligible ? "You're Eligible!" : "We're Sorry"}</h2>
            </div>
            {assessmentResult.is_eligible && (
              <div className="bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 rounded-[2.5rem] p-8 mb-10 shadow-inner">
                <h3 className="text-indigo-900 font-black text-xl mb-6 flex items-center gap-3 border-b border-indigo-100 pb-4"><Activity className="w-6 h-6 text-indigo-500"/> Medical Review</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center"><span className="text-base font-semibold text-slate-500">Success Probability</span><span className="font-black text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-xl border border-emerald-200">{assessmentResult.success_probability}</span></div>
                  <div className="flex justify-between items-center"><span className="text-base font-semibold text-slate-500">Calculated BMI</span><span className="font-black text-slate-800 text-xl">{assessmentResult.bmi}</span></div>
                  <div className="flex justify-between items-center"><span className="text-base font-semibold text-slate-500">Current Weight</span><span className="font-black text-slate-800 text-lg">{formData.weight_kg} kg</span></div>
                  <div className="flex justify-between items-center"><span className="text-base font-semibold text-slate-500">Goal Target</span><span className="font-black text-indigo-600 text-lg">{formData.goal_weight_kg} kg</span></div>
                  <div className="mt-6 pt-6 border-t border-indigo-100 bg-white p-6 rounded-2xl shadow-sm">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Projected Timeline</p>
                    <p className="text-lg text-indigo-900 font-black flex items-center gap-3 mb-3"><Calendar className="w-5 h-5 text-indigo-500"/> {calculateTimeline().minWeeks} - {calculateTimeline().maxWeeks} weeks to reach goal</p>
                    <p className="text-sm text-slate-600 font-semibold bg-slate-50 border border-slate-100 rounded-xl p-3.5 leading-relaxed">
                      With medication, you'll lose <span className="text-emerald-600 font-extrabold">0.5 to 1.0 kg</span> per week. It will take about <span className="text-indigo-600 font-extrabold">{calculateTimeline().minWeeks} - {calculateTimeline().maxWeeks} weeks</span> to reach your goal weight of <span className="text-slate-900 font-extrabold">{formData.goal_weight_kg} kg</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-slate-600 font-semibold text-lg leading-relaxed mb-10 text-center">{assessmentResult.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setStep(8)} className={btnSecondaryCls}>Back</button>
              {assessmentResult.is_eligible ? <button onClick={handleConsultationPayment} disabled={paymentLoading} className={btnPrimaryCls}>{paymentLoading ? 'Connecting...' : 'Pay ₹499 & Book Video Call'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></button> : <button onClick={() => setStep(0)} className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-1">Start Over</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 6: MEDICATION HISTORY CHOICE ─────────────────────────────────── */}
      {step === 6 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={4} />
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <Pill className="text-indigo-500 w-8 h-8" /> Medication History
            </h2>
            <p className="text-slate-600 font-semibold text-lg leading-relaxed mb-8">
              Have you taken medication for weight loss within the past weeks?
            </p>
            <div className="space-y-4 mb-10">
              {[
                { value: 'glp1', label: "Yes, I've taken GLP-1 medication" },
                { value: 'other', label: "Yes, other medication" },
                { value: 'none', label: "No medication" }
              ].map((option) => {
                const checked = medicationHistoryChoice === option.value;
                return (
                  <label
                    key={option.value}
                    onClick={() => setMedicationHistoryChoice(option.value)}
                    className={`group flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50/80'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        checked ? 'border-indigo-500 bg-indigo-500 scale-110' : 'border-slate-300'
                      }`}
                    >
                      {checked && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm font-semibold ${checked ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(5)} className={btnSecondaryCls}>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button
                disabled={!medicationHistoryChoice}
                onClick={() => setStep(7)}
                className={btnPrimaryCls}
              >
                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 7: MEDICATION BRANCH DETAILS ─────────────────────────────────── */}
      {step === 7 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={4} />
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 overflow-y-auto max-h-[75vh] custom-scrollbar">
            
            {/* BRANCH 1: GLP-1 */}
            {medicationHistoryChoice === 'glp1' && (
              <div className="space-y-8 animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Pill className="text-indigo-500 w-8 h-8" /> GLP-1 History Details
                </h2>
                
                <div className="bg-indigo-50/40 p-8 rounded-3xl space-y-6 border border-indigo-100/50">
                  <div>
                    <label className={labelCls}>Which GLP-1 medication did you take?</label>
                    <input
                      type="text"
                      value={glp1Details}
                      onChange={(e) => setGlp1Details(e.target.value)}
                      placeholder="Semaglutide, Ozempic, Wegovy, etc."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Last dose timeframe</label>
                    <select
                      value={lastDoseTimeframe}
                      onChange={(e) => setLastDoseTimeframe(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select...</option>
                      <option value="0-5 days">0-5 days ago</option>
                      <option value="6-10 days">6-10 days ago</option>
                      <option value="11-14 days">11-14 days ago</option>
                      <option value="More than 2 weeks">2-4 weeks ago</option>
                      <option value="More than 4 weeks">&gt; 4 weeks ago</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Starting weight (kg) on medication</label>
                    <input
                      type="number"
                      value={medStartingWeight}
                      onChange={(e) => setMedStartingWeight(e.target.value)}
                      placeholder="e.g. 85"
                      className={inputCls}
                    />
                  </div>
                  <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all rounded-3xl p-8 text-center group cursor-pointer relative">
                    <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-8 h-8" />
                    </div>
                    <label className="block text-base font-black text-slate-800 mb-2">Upload Medication Photo / Prescription</label>
                    <p className="text-sm text-slate-500 mb-5 font-medium">Max 15 MB. JPG, PNG, or PDF.</p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setMedicationPhoto(e.target.files ? e.target.files[0] : null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {medicationPhoto && (
                      <p className="mt-3 text-emerald-600 font-bold text-sm">Selected file: {medicationPhoto.name}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Do you agree to only obtain weight loss medication through this program moving forward? <span className="font-normal text-gray-500">(It's important not to "stack" weight loss medications.)</span>
                  </p>
                  <div className="flex gap-4">
                    {['No', 'Yes'].map((opt) => {
                      const checked = stackingConsent === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => setStackingConsent(opt)}
                          className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
                            checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            value={opt}
                            checked={checked}
                            onChange={() => {}}
                            className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* BRANCH 2: OTHER MEDICATION */}
            {medicationHistoryChoice === 'other' && (
              <div className="space-y-8 animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Pill className="text-indigo-500 w-8 h-8" /> Medication Details
                </h2>
                
                <div className="bg-indigo-50/40 p-8 rounded-3xl space-y-6 border border-indigo-100/50">
                  <div>
                    <label className={labelCls}>Which weight loss medication did you take?</label>
                    <input
                      type="text"
                      value={otherMedDetails}
                      onChange={(e) => setOtherMedDetails(e.target.value)}
                      placeholder="Name, dose, and frequency..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Starting weight (kg) on medication</label>
                    <input
                      type="number"
                      value={otherMedStartingWeight}
                      onChange={(e) => setOtherMedStartingWeight(e.target.value)}
                      placeholder="e.g. 85"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Do you agree to only obtain weight loss medication through this program moving forward? <span className="font-normal text-gray-500">(It's important not to "stack" weight loss medications.)</span>
                  </p>
                  <div className="flex gap-4">
                    {['No', 'Yes'].map((opt) => {
                      const checked = stackingConsent === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => setStackingConsent(opt)}
                          className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
                            checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            value={opt}
                            checked={checked}
                            onChange={() => {}}
                            className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* BRANCH 3: NO MEDICATION */}
            {(medicationHistoryChoice === 'none' || medicationHistoryChoice === 'no') && (
              <div className="space-y-8 animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Activity className="text-indigo-500 w-8 h-8" /> Weight Program History
                </h2>
                
                <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Have you ever tried to lose weight in a weight management program?
                  </p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map((opt) => {
                      const checked = triedWeightProgram === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => setTriedWeightProgram(opt)}
                          className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
                            checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            value={opt}
                            checked={checked}
                            onChange={() => {}}
                            className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50/80 p-8 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Do you have any further information which you would like our medical team to know?
                  </p>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map((opt) => {
                      const checked = hasExtraInfo === opt;
                      return (
                        <label
                          key={opt}
                          onClick={() => setHasExtraInfo(opt)}
                          className={`flex-1 flex items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
                            checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            value={opt}
                            checked={checked}
                            onChange={() => {}}
                            className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {hasExtraInfo === 'Yes' && (
                  <div className="animate-fadeIn">
                    <label className={labelCls}>Please specify details below</label>
                    <textarea
                      value={extraInfoText}
                      onChange={(e) => setExtraInfoText(e.target.value)}
                      placeholder="Type details here..."
                      className={`${inputCls} p-5`}
                      rows={4}
                    />
                  </div>
                )}
              </div>
            )}

            {/* COMMON NAVIGATION */}
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(6)} className={btnSecondaryCls}>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button
                onClick={() => {
                  if (!summaryFirstName) setSummaryFirstName(formData.first_name);
                  if (!summaryLastName) setSummaryLastName(formData.last_name);
                  setStep(8);
                }}
                className={btnPrimaryCls}
              >
                Next <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 8: SUMMARY & FINAL DETAILS ─────────────────────────────────── */}
      {step === 8 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={4} />
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60 overflow-y-auto max-h-[75vh] custom-scrollbar">
            <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <ShieldCheck className="text-indigo-500 w-8 h-8" /> Eligibility Check
            </h2>
            <p className="text-slate-600 font-semibold text-sm leading-relaxed mb-8">
              Please review your details and enter your shipping information below to check your eligibility.
            </p>

            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Vitals Summary */}
                <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400" /> Vitals & Goals
                  </p>
                  <div className="text-xs font-bold text-slate-700 space-y-1.5">
                    <p>Height: <span className="text-slate-900 font-extrabold">{formData.height_cm} cm</span></p>
                    <p>Weight: <span className="text-slate-900 font-extrabold">{formData.weight_kg} kg</span></p>
                    <p>Goal Weight: <span className="text-slate-900 font-extrabold">{formData.goal_weight_kg} kg</span></p>
                    <p>Biological Sex: <span className="text-slate-900 font-extrabold capitalize">{formData.gender}</span></p>
                    <p>DOB: <span className="text-slate-900 font-extrabold">{formData.dob_day}/{formData.dob_month}/{formData.dob_year}</span></p>
                  </div>
                </div>

                {/* Health Questionnaire Summary */}
                <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" /> Health Screening
                  </p>
                  <div className="text-xs font-bold text-slate-700 space-y-1.5">
                    <p>Blood Pressure: <span className="text-slate-900 font-extrabold">{formData.blood_pressure_range}</span></p>
                    <p>Heart Rate: <span className="text-slate-900 font-extrabold">{formData.resting_heart_rate}</span></p>
                    <p>Severe Conditions: <span className="text-slate-900 font-extrabold">
                      {formData.health_conditions_one.includes('None of the above') ? 'None' : formData.health_conditions_one.join(', ') || 'None'}
                    </span></p>
                    <p>Medical Conditions: <span className="text-slate-900 font-extrabold">
                      {formData.health_conditions_two.includes('None of the above') ? 'None' : formData.health_conditions_two.join(', ') || 'None'}
                    </span></p>
                  </div>
                </div>
              </div>

              {/* Medication History Summary */}
              <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-slate-400" /> Medication & Programs
                </p>
                <div className="text-xs font-bold text-slate-700 space-y-1.5">
                  <p>Medication History: <span className="text-slate-900 font-extrabold">
                    {medicationHistoryChoice === 'glp1' ? 'Yes, GLP-1' : medicationHistoryChoice === 'other' ? 'Yes, other' : 'No prior medication'}
                  </span></p>
                  {medicationHistoryChoice === 'glp1' && (
                    <>
                      <p>GLP-1 Details: <span className="text-slate-900 font-extrabold">{glp1Details || 'N/A'}</span></p>
                      <p>Last Dose Timeframe: <span className="text-slate-900 font-extrabold">{lastDoseTimeframe || 'N/A'}</span></p>
                      <p>Starting Weight: <span className="text-slate-900 font-extrabold">{medStartingWeight || 'N/A'} kg</span></p>
                      <p>Prescription Uploaded: <span className="text-emerald-600 font-extrabold">{medicationPhoto ? 'Yes' : 'No'}</span></p>
                      <p>Stacking Consent: <span className="text-slate-900 font-extrabold">{stackingConsent}</span></p>
                    </>
                  )}
                  {medicationHistoryChoice === 'other' && (
                    <>
                      <p>Other Details: <span className="text-slate-900 font-extrabold">{otherMedDetails || 'N/A'}</span></p>
                      <p>Starting Weight: <span className="text-slate-900 font-extrabold">{otherMedStartingWeight || 'N/A'} kg</span></p>
                      <p>Stacking Consent: <span className="text-slate-900 font-extrabold">{stackingConsent}</span></p>
                    </>
                  )}
                  {(medicationHistoryChoice === 'none' || medicationHistoryChoice === 'no') && (
                    <>
                      <p>Tried weight program: <span className="text-slate-900 font-extrabold">{triedWeightProgram}</span></p>
                      <p>Has additional info: <span className="text-slate-900 font-extrabold">{hasExtraInfo}</span></p>
                      {hasExtraInfo === 'Yes' && <p>Extra info: <span className="text-slate-900 font-semibold">{extraInfoText}</span></p>}
                    </>
                  )}
                </div>
              </div>

              {/* Final Details Form */}
              <div className="bg-indigo-50/40 p-8 rounded-3xl border border-indigo-100/50 space-y-6">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" /> Shipping & Details Confirmation
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <input
                      type="text"
                      value={summaryFirstName}
                      onChange={(e) => setSummaryFirstName(e.target.value)}
                      placeholder="First name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input
                      type="text"
                      value={summaryLastName}
                      onChange={(e) => setSummaryLastName(e.target.value)}
                      placeholder="Last name"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Shipping State</label>
                  <select
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select State...</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 mt-10">
                <button onClick={() => setStep(7)} className={btnSecondaryCls}>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back
                </button>
                <button
                  disabled={!summaryFirstName.trim() || !summaryLastName.trim() || !shippingState || loading}
                  onClick={submitAssessment}
                  className={btnPrimaryCls}
                >
                  {loading ? 'Checking Eligibility...' : 'Check Eligibility'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 10: PLAN ─────────────────────────────────────────────────────── */}
      {step === 10 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={6}/>
          <div className="flex-1 bg-white/80 backdrop-blur-xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/60">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Choose Your Plan</h2>
              <p className="text-sm font-bold text-emerald-600 bg-emerald-50 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-100"><ShieldCheck className="w-4 h-4"/> HIPAA Compliant & Secure</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div><label className={labelCls}>First Name</label><input type="text" value={summaryFirstName || formData.first_name} disabled className={`${inputCls} bg-slate-50 cursor-not-allowed`}/></div>
              <div><label className={labelCls}>Last Name</label><input type="text" value={summaryLastName || formData.last_name} disabled className={`${inputCls} bg-slate-50 cursor-not-allowed`}/></div>
            </div>

            {/* ── FIX 3: Shipping state bound to shippingState (separate from formData) ── */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mb-12 hover:border-indigo-100 transition-colors">
              <label className={labelCls}>Shipping State <span className="text-rose-500">*</span></label>
              <select
                value={shippingState}
                onChange={e => setShippingState(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select State...</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {shippingState && (
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Medication will be shipped to {shippingState}</p>
              )}
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between"><h3 className="text-2xl font-black text-slate-800">Select Tier</h3><span className="text-xs text-indigo-700 font-black bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2 uppercase"><Video className="w-4 h-4"/> Consult: ₹500</span></div>
              <div className="grid md:grid-cols-2 gap-6">
                <div onClick={() => setSelectedMembership('gold')} className={`cursor-pointer border-2 rounded-[2rem] p-8 transition-all ${selectedMembership === 'gold' ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-xl scale-[1.03]' : 'border-slate-100 hover:border-amber-300 hover:shadow-lg hover:-translate-y-1 bg-white'}`}>
                  <div className="flex justify-between items-center mb-6"><h4 className="text-3xl font-black text-amber-600">Gold</h4>{selectedMembership === 'gold' && <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">Selected</span>}</div>
                  <ul className="space-y-4 text-sm text-slate-600 font-semibold">{['Doctor Consult','Medication','Dietician Plan','Fitness Coach'].map(f => <li key={f} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-amber-500"/> {f}</li>)}</ul>
                </div>
                <div onClick={() => setSelectedMembership('bronze')} className={`cursor-pointer border-2 rounded-[2rem] p-8 transition-all ${selectedMembership === 'bronze' ? 'border-slate-400 bg-gradient-to-b from-slate-50 to-white shadow-xl scale-[1.03]' : 'border-slate-100 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 bg-white'}`}>
                  <div className="flex justify-between items-center mb-6"><h4 className="text-3xl font-black text-slate-600">Bronze</h4>{selectedMembership === 'bronze' && <span className="bg-slate-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">Selected</span>}</div>
                  <ul className="space-y-4 text-sm text-slate-500 font-semibold">{['Doctor Consult','Medication'].map(f => <li key={f} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-500"/> {f}</li>)}{['Dietician Plan','Fitness Coach'].map(f => <li key={f} className="flex items-center gap-3 opacity-40"><span className="w-5 h-5 block rounded-full border-2 border-slate-300"/> {f}</li>)}</ul>
                </div>
              </div>
            </div>

            {/* FIX: Button disabled until BOTH membership AND shipping_state are filled */}
            {selectedMembership && shippingState && (
              <div className="mt-12 flex gap-4 pt-10 border-t border-slate-100 animate-fadeIn">
                <button onClick={() => setStep(12)} className={btnSecondaryCls}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Cancel</button>
                <button onClick={handleMembershipPayment} disabled={paymentLoading} className={`${btnPrimaryCls} py-5 text-lg`}>{paymentLoading ? 'Connecting Gateway...' : 'Proceed to Payment'}</button>
              </div>
            )}
            {selectedMembership && !shippingState && (
              <p className="mt-6 text-sm text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Please select your shipping state to continue.</p>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 11: PAYMENT COMPLETE ─────────────────────────────────────────── */}
      {step === 11 && (
        <div className="max-w-2xl w-full bg-white p-16 rounded-[3rem] shadow-2xl text-center mt-12 border-t-[12px] border-emerald-500 animate-fadeIn relative overflow-hidden z-10">
          <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-emerald-100 rounded-full blur-3xl -z-10"></div>
          <div className="flex justify-center mb-8"><CheckCircle2 className="w-32 h-32 text-emerald-500 drop-shadow-md"/></div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Payment Complete!</h2>
          <p className="text-slate-500 font-semibold text-xl mb-4">Welcome to your 8liv transformation journey.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-10 text-sm font-semibold text-slate-600">
            <p>🏆 Membership: <span className="font-black text-amber-600 capitalize">{selectedMembership}</span></p>
            <p className="mt-1">📦 Shipping to: <span className="font-black text-slate-900">{shippingState}</span></p>
          </div>
          <button onClick={() => setStep(12)} className={`${btnPrimaryCls} py-5 text-lg w-full`}>Enter Dashboard <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform"/></button>
        </div>
      )}

      {/* ── STEP 12: DASHBOARD ──────────────────────────────────────────────── */}
      {step === 12 && (
        <div className="w-full max-w-6xl mt-4 animate-fadeIn relative z-10">

          {/* ── REMINDER TOAST NOTIFICATION ── */}
          {reminderToast && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] ${reminderToast.color} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm w-full animate-fadeIn`}
              style={{ animation: 'fadeSlideUp 0.4s ease-out both' }}>
              <Bell className="w-5 h-5 flex-shrink-0 animate-bounce"/>
              <p className="font-bold text-sm flex-1">{reminderToast.msg}</p>
              <button onClick={() => setReminderToast(null)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>
          )}

          {/* ── DASHBOARD TOP NAVBAR ── */}
          <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-xl px-6 py-4 rounded-2xl border border-slate-100 shadow-sm relative z-[200]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-sm">{(formData.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}</span>
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight">{formData.first_name || user?.email?.split('@')[0] || 'Member'}</p>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedMembership === 'gold' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>{selectedMembership || 'member'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifPanel(!showNotifPanel); if (unreadCount > 0) markAllRead(); }}
                  className={`relative bg-slate-50 hover:bg-slate-100 text-slate-600 p-2.5 rounded-xl border border-slate-200 hover:shadow-sm transition-all ${notifBell ? 'bell-shake' : ''}`}
                >
                  {unreadCount > 0 ? <BellRing className="w-5 h-5 text-indigo-600"/> : <Bell className="w-5 h-5"/>}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">{unreadCount}</span>
                  )}
                </button>
                {showNotifPanel && (
                  <div className="absolute right-0 top-12 w-96 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 overflow-hidden z-[300] animate-fadeIn">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-black text-slate-900 text-sm">Notifications</h3>
                      <button onClick={() => setShowNotifPanel(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="text-center py-10 text-slate-400"><Bell className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm font-semibold">No notifications yet</p></div>
                      ) : notifications.map(n => (
                        <div key={n.id} onClick={() => markNotifRead(n.id)} className={`px-5 py-4 border-b border-slate-50 cursor-pointer transition-colors ${n.is_read ? 'bg-white' : 'bg-indigo-50/60 hover:bg-indigo-50'}`}>
                          <p className={`text-sm font-black ${n.is_read ? 'text-slate-700' : 'text-indigo-900'}`}>{n.title}</p>
                          <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-semibold">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Logout */}
              <button onClick={handleLogout} className="bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 font-bold py-2.5 px-5 rounded-xl text-sm transition-all border border-slate-200 flex items-center gap-2">
                <LogOut className="w-4 h-4"/> Logout
              </button>
            </div>
          </div>

          {/* ── FIX 2: COUNTDOWN + JOIN CALL BANNER ── */}
          {bookingDate && bookingTime && (
            <div className={`mb-6 rounded-3xl overflow-hidden shadow-xl transition-all ${canJoinCallNow ? 'border-2 border-emerald-500' : ''}`}>
              <div className={`p-5 flex items-center gap-5 ${canJoinCallNow ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-indigo-900 to-violet-900'} text-white relative`}>
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 rounded-l-full"></div>
                <div className="bg-white/15 p-3 rounded-2xl flex-shrink-0">
                  {canJoinCallNow ? <Video className="w-7 h-7 text-emerald-200"/> : <Clock className="w-7 h-7 text-indigo-200"/>}
                </div>
                <div className="flex-1">
                  <p className="font-black text-white text-base">{canJoinCallNow ? '🟢 Your Doctor is Ready!' : 'Upcoming Doctor Consultation'}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${canJoinCallNow ? 'text-emerald-100' : 'text-indigo-200'}`}>{bookingDate} at {bookingTime}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-4 z-10">
                  {!canJoinCallNow && callCountdown && (
                    <div className={`text-right ${callCountdown.includes('now') ? '' : 'countdown-pulse'}`}>
                      <p className="text-xs text-indigo-300 font-black uppercase tracking-wider mb-1">Time Remaining</p>
                      <p className="font-black text-xl text-white">{callCountdown}</p>
                    </div>
                  )}
                  {/* FIX 2: Join button only appears when it's time */}
                  {canJoinCallNow && videoRoomUrl && (
                    <button
                      onClick={handleJoinCall}
                      className="bg-white text-emerald-700 font-black py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 join-glow"
                    >
                      <Video className="w-5 h-5"/> Join Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PRESCRIPTION ALERT BANNER ── */}
          {prescription?.prescription_text && (
            <div className={`mb-6 rounded-3xl overflow-hidden shadow-xl border-2 ${newPrescriptionAlert ? 'border-indigo-500 prescription-pulse' : 'border-slate-200'} ${prescriptionShake ? 'prescription-shake' : ''}`}>
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
                <Pill className="w-6 h-6 text-white"/>
                <p className="text-white font-black text-base">Doctor Prescription Ready</p>
                {newPrescriptionAlert && <span className="ml-auto bg-white text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">NEW</span>}
              </div>
              <div className="bg-white p-6">
                <div className="flex flex-wrap gap-4 mb-4">
                  {prescription.prescription_type && (
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 font-black px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                      {prescription.prescription_type === 'Oral' ? '💊' : '💉'} {prescription.prescription_type} Medicine
                    </span>
                  )}
                  <span className={`font-black px-4 py-2 rounded-xl text-sm ${prescription.status === 'approved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                    {prescription.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Doctor's Notes & Prescription</p>
                  <p className="text-slate-900 font-semibold leading-relaxed whitespace-pre-wrap">{prescription.prescription_text}</p>
                </div>

                {prescription.status === 'approved' && !selectedMembership && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-amber-900 font-black text-lg mb-2">Unlock Your Medication & Plan</h4>
                      <p className="text-amber-700 text-sm font-semibold mb-4">Your doctor has approved your medication. Purchase a membership plan now to start your journey and get your medication delivered.</p>
                      <button onClick={() => setStep(8)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
                        Purchase Membership
                      </button>
                    </div>
                  </div>
                )}

                {prescription.status === 'approved' && selectedMembership && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span>📦</span> Pharmacy Order & Shipping Details
                    </h4>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Order Status:</span>
                        <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">Ordered & Dispatched</span>
                      </div>
                      <div className="flex justify-between items-start text-xs font-bold">
                        <span className="text-slate-500 flex-shrink-0">Ship To:</span>
                        <span className="text-slate-800 text-right">
                          {formData.first_name} {formData.last_name}<br />
                          {formData.address || 'Address not provided'}, {shippingState || ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Contact Tel:</span>
                        <span className="text-slate-800">{formData.phone_number || 'N/A'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-2 leading-normal">
                      Order placed automatically and sent to our pharmacy dealers. Standard transit time is 2-4 business days.
                    </p>
                  </div>
                )}

                {newPrescriptionAlert && (
                  <button onClick={() => setNewPrescriptionAlert(false)} className="mt-4 text-xs text-indigo-600 font-bold hover:underline">Mark as read</button>
                )}
              </div>
            </div>
          )}

          {/* ── PRESCRIPTION REJECTED BANNER ── */}
          {prescription && prescription.status === 'rejected' && (
            <div className={`mb-6 rounded-3xl overflow-hidden shadow-xl border-2 border-rose-200 hover:shadow-2xl transition-all ${newPrescriptionAlert ? 'prescription-pulse' : ''} ${prescriptionShake ? 'prescription-shake' : ''}`}>
              <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-white"/>
                <p className="text-white font-black text-base">Consultation Status: Not Approved</p>
                {newPrescriptionAlert && <span className="ml-auto bg-white text-rose-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">NEW UPDATE</span>}
              </div>
              <div className="bg-white p-6">
                <p className="text-sm font-bold text-rose-900 mb-4">
                  Your doctor reviewed your medical case and did not approve the weight loss program at this time.
                </p>
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 mb-4">
                  <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <span>📋</span> Doctor's Rejection Reason
                  </p>
                  <p className="text-rose-950 font-bold leading-relaxed whitespace-pre-wrap">{prescription.prescription_notes || 'No notes provided.'}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  If you have questions, please reach out to our clinical support team or request a follow-up consultation.
                </p>
                {newPrescriptionAlert && (
                  <button onClick={() => setNewPrescriptionAlert(false)} className="mt-4 text-xs text-rose-600 font-bold hover:underline">Mark as read</button>
                )}
              </div>
            </div>
          )}

          {/* Prescription pending */}
          {prescription && !prescription.prescription_text && prescription.status === 'attended' && (
            <div className={`mb-6 bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex items-center gap-4 ${prescriptionShake ? 'prescription-shake' : ''}`}>
              <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl flex-shrink-0 animate-pulse"><Pill className="w-6 h-6"/></div>
              <div>
                <p className="font-black text-amber-900">Prescription Pending</p>
                <p className="text-sm text-amber-700 font-semibold mt-0.5">Your doctor is reviewing your case. Prescription will appear here when ready.</p>
              </div>
            </div>
          )}

          {/* Daily reminders */}
          <div className="mb-10 space-y-4 w-full">
            {!hasLoggedWeightToday && (
              <div className="bg-amber-50/90 backdrop-blur border border-amber-200 p-5 rounded-3xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="bg-white p-3 rounded-2xl text-amber-500 shadow-sm"><Scale className="w-7 h-7"/></div>
                <div><h4 className="text-base font-black text-amber-900">Daily Log Pending</h4><p className="text-sm text-amber-700/80 font-bold mt-1">Please update your empty stomach weight today.</p></div>
              </div>
            )}
            <div className="bg-indigo-50/90 backdrop-blur border border-indigo-200 p-5 rounded-3xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-white p-3 rounded-2xl text-indigo-500 shadow-sm"><Pill className="w-7 h-7"/></div>
              <div><h4 className="text-base font-black text-indigo-900">Medication Reminder</h4><p className="text-sm text-indigo-700/80 font-bold mt-1">Time for your prescribed medication.</p></div>
            </div>
          </div>

          <div className="flex justify-between items-end mb-12 border-b border-slate-200/60 pb-8">
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm">Dashboard</h1>
              <p className="text-slate-500 font-bold text-lg mt-2">Welcome back, <span className="text-indigo-600">{user?.user_metadata?.display_id || 'Member'}</span></p>
            </div>
            <div className="flex gap-4 items-center">
              <button onClick={() => { setIsEditing(true); setStep(1); }} className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 group"><User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors"/> Edit Profile</button>
              <div className={`text-white px-6 py-3 rounded-2xl text-sm font-black shadow-xl tracking-widest border ${selectedMembership === 'gold' ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400' : 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700'}`}>
                {selectedMembership.toUpperCase() || 'GOLD'} TIER
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] group-hover:bg-indigo-50/50 transition-colors -z-10"></div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Scale className="w-4 h-4"/> Starting Weight</p>
              <p className="text-5xl font-black text-slate-800">{formData.weight_kg || '0'} <span className="text-2xl font-bold text-slate-300">kg</span></p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] group-hover:bg-emerald-50/50 transition-colors -z-10"></div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Target Goal</p>
              <p className="text-5xl font-black text-indigo-600">{formData.goal_weight_kg || '0'} <span className="text-2xl font-bold text-indigo-300/60">kg</span></p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 text-white flex flex-col relative overflow-hidden">
              <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-5 z-10">Consultations</p>
              <div className="space-y-3 z-10">
                {bookingDate && bookingTime && (
                  <div className="bg-indigo-500/20 border border-indigo-500/50 p-4 rounded-xl mb-4 cursor-pointer hover:bg-indigo-500/30 transition-all shadow-lg" onClick={() => setStep(13)}>
                    <p className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-300"/> Upcoming Appointment</p>
                    <p className="text-xs text-indigo-200 mt-1">{bookingDate} @ {bookingTime}</p>
                    <p className="text-xs font-black text-white mt-2 flex items-center gap-1">Click to join <ArrowRight className="w-3 h-3"/></p>
                  </div>
                )}
                {/* Gated Doctor booking button based on membership plan */}
                {(() => {
                  const hasHadCall = completedConsultations >= 1;
                  const isGold = selectedMembership === 'gold';
                  const isSilver = selectedMembership === 'silver';
                  
                  let btnLabel = "Doctor";
                  let btnStyle = "bg-white/10 hover:bg-indigo-500 border border-white/5";
                  let onClickAction = () => setStep(13);
                  
                  if (hasHadCall) {
                    if (!selectedMembership) {
                      btnLabel = "Doctor (Unlock with Membership) 🔒";
                      btnStyle = "bg-white/5 hover:bg-amber-600/40 border border-amber-500/20 text-amber-200/80";
                      onClickAction = () => setStep(10); // Redirect to membership choice
                    } else if (isSilver) {
                      btnLabel = "Doctor (1/month Refill Limit) ⏳";
                      btnStyle = "bg-white/5 hover:bg-indigo-900/40 border border-indigo-500/20 text-indigo-200/80";
                      onClickAction = () => alert("Silver plan allows 1 consultation per month for medication refills. Upgrade to Gold for unlimited consultations.");
                    }
                  }
                  
                  return (
                    <button 
                      onClick={onClickAction} 
                      className={`w-full ${btnStyle} text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-sm text-left flex justify-between items-center group`}
                    >
                      <span className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-indigo-300 group-hover:text-white"/> 
                        {btnLabel}
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all"/>
                    </button>
                  );
                })()}
                {/* FIX: Only show Dietician + Fitness for actual gold members (from DB) */}
                {selectedMembership === 'gold' && (<>
                  <button onClick={() => setStep(14)} className="w-full bg-white/10 hover:bg-amber-500 border border-white/5 text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-sm text-left flex justify-between items-center group"><span className="flex items-center gap-3"><Apple className="w-5 h-5 text-amber-300 group-hover:text-white"/> Dietician</span><ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all"/></button>
                  <button onClick={() => setStep(15)} className="w-full bg-white/10 hover:bg-emerald-500 border border-white/5 text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-sm text-left flex justify-between items-center group"><span className="flex items-center gap-3"><Dumbbell className="w-5 h-5 text-emerald-300 group-hover:text-white"/> Fitness</span><ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all"/></button>
                </>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-xl transition-shadow duration-500">
              <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><Activity className="w-6 h-6 text-indigo-500 bg-indigo-50 p-1 rounded-lg"/> Progress Tracker</h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={15}/>
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dx={-15}/>
                    <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.15)', padding: '16px' }} labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}/>
                    <Line type="monotone" dataKey="weight" stroke="url(#colorGrad)" strokeWidth={5} dot={{ r: 7, fill: '#4f46e5', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 10, strokeWidth: 0, fill: '#4f46e5' }}/>
                    <defs><linearGradient id="colorGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
                    {formData.goal_weight_kg && <ReferenceLine y={parseFloat(formData.goal_weight_kg as string) || 0} stroke="#10B981" strokeDasharray="8 8" strokeWidth={2} label={{ position: 'top', value: 'Target', fill: '#10B981', fontSize: 13, fontWeight: '900' }}/>}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col hover:shadow-xl transition-shadow duration-500">
              <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><FileText className="w-6 h-6 text-indigo-500 bg-indigo-50 p-1 rounded-lg"/> Daily Log</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div><label className={labelCls}>Weight (Stomach Empty)</label><div className="relative"><input type="number" value={logWeight} onChange={e => setLogWeight(e.target.value)} className={inputCls} placeholder="0.0"/><span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">kg</span></div></div>
                <div><label className={labelCls}>Calories (End of day)</label><div className="relative"><input type="number" value={logCalories} onChange={e => setLogCalories(e.target.value)} className={inputCls} placeholder="0"/><span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">kcal</span></div></div>
                <div className="mt-auto pt-6"><button onClick={handleLogData} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-indigo-600/30 flex justify-center items-center gap-3 hover:-translate-y-1 active:scale-[0.98] group">Save Record <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform"/></button></div>
              </div>
            </div>
          </div>

          {/* Dashboard motivation slideshow */}
          <div className="mt-10 relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ height: '420px' }}>
            {DASH_SLIDES.map((slide, idx) => (
              <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === dashSlideIdx ? 'opacity-100' : 'opacity-0'}`}>
                <img src={slide.img} alt={`motivation ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover object-center animate-[slowZoom_20s_ease-in-out_infinite_alternate]"/>
                <div className={`absolute inset-0 ${slide.headlineShadow ? 'bg-gradient-to-r from-black/75 via-black/40 to-transparent' : 'bg-gradient-to-r from-white/60 via-white/30 to-transparent'}`}/>
                <div className="absolute inset-0 flex flex-col justify-between p-10 md:p-14">
                  <div className="flex items-center justify-between">
                    <span className={`${slide.badgeBg} backdrop-blur text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border ${slide.headlineShadow ? 'text-white border-white/20' : 'text-white border-slate-900/20'}`}>Your Progress Journey</span>
                    <div className="flex gap-2 items-center">{DASH_SLIDES.map((_, i) => (<button key={i} onClick={() => setDashSlideIdx(i)} className={`rounded-full transition-all duration-300 ${i === dashSlideIdx ? 'w-8 h-2.5 bg-white shadow-md' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'}`}/>))}</div>
                  </div>
                  <div className="max-w-lg">
                    <div className={`flex items-baseline gap-3 mb-3 ${idx === dashSlideIdx ? 'animate-[fadeSlideUp_0.7s_ease-out_both]' : 'opacity-0'}`}>
                      <span className={`text-5xl md:text-6xl font-black tracking-tight leading-none ${slide.statColor}`}>{slide.stat}</span>
                      <span className={`text-sm font-bold uppercase tracking-wider opacity-80 ${slide.fontColor}`}>{slide.statLabel}</span>
                    </div>
                    <h2 className={`text-4xl md:text-5xl font-black leading-tight mb-4 ${slide.fontColor} ${idx === dashSlideIdx ? 'animate-[fadeSlideUp_0.7s_ease-out_0.1s_both]' : 'opacity-0'}`}>{slide.headline}</h2>
                    <p className={`text-base font-semibold leading-relaxed max-w-md opacity-85 ${slide.fontColor} ${idx === dashSlideIdx ? 'animate-[fadeSlideUp_0.7s_ease-out_0.2s_both]' : 'opacity-0'}`}>{slide.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 13: DOCTOR SESSION ─────────────────────────────────────────── */}
      {step === 13 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={13}/>
          <div className="flex-1 bg-white/90 backdrop-blur-xl p-10 md:p-12 rounded-[3rem] shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-10 pb-8 border-b border-slate-100">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><Activity className="w-9 h-9 text-indigo-500 bg-indigo-50 p-2 rounded-2xl"/> Doctor Session</h2>
              <button onClick={() => { setStep(12); setCallActive(false); setVideoRoomUrl(''); }} className="bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-2xl transition-all text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Dashboard</button>
            </div>

            {callActive && videoRoomUrl ? <LiveCallPanel color="bg-rose-500"/> : isSlotBooked ? (

              /* ── SESSION BOOKED: show confirmation + countdown ── */
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl">
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-14 flex flex-col items-center border-b border-indigo-100/50">
                  <div className="w-20 h-20 bg-white text-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-5 shadow-md transform -rotate-6"><FileText className="w-10 h-10"/></div>
                  <h3 className="text-2xl font-black text-indigo-900 mb-2">Consultation Booked!</h3>
                  <p className="text-indigo-600 font-semibold text-sm">Your doctor has been notified</p>
                </div>
                <div className="p-10">
                  {/* Countdown for booked call */}
                  {callCountdown && (
                    <div className={`mb-6 rounded-2xl p-5 text-center ${canJoinCallNow ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-slate-50 border border-slate-200'}`}>
                      {canJoinCallNow ? (
                        <>
                          <p className="font-black text-emerald-800 mb-3 text-lg">🟢 It's time! Join your call now.</p>
                          <button onClick={handleJoinCall} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-10 rounded-2xl shadow-lg join-glow flex items-center gap-2 mx-auto transition-all hover:-translate-y-0.5"><Video className="w-5 h-5"/> Join Video Call</button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Time Until Your Call</p>
                          <p className="text-3xl font-black text-indigo-700 countdown-pulse">{callCountdown}</p>
                          <p className="text-xs text-slate-500 font-semibold mt-2">Join button will appear when it's time</p>
                        </>
                      )}
                    </div>
                  )}
                  <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 text-left">
                    <h4 className="font-black text-slate-800 mb-4 text-lg flex items-center gap-3 border-b border-slate-100 pb-4"><Pill className="text-indigo-500 w-5 h-5"/> What Happens Next</h4>
                    <ul className="space-y-3 text-sm font-semibold text-slate-600">
                      <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 w-4 h-4 mt-0.5 flex-shrink-0"/> Slot reserved: <strong>{bookingDate} at {bookingTime}</strong></li>
                      <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 w-4 h-4 mt-0.5 flex-shrink-0"/> Doctor notified of your booking</li>
                      <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 w-4 h-4 mt-0.5 flex-shrink-0"/> Join button appears automatically at call time</li>
                      <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 w-4 h-4 mt-0.5 flex-shrink-0"/> Prescription will appear on dashboard after call</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md mx-auto">
                    <button onClick={() => setStep(12)} className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4"/> Back to Dashboard
                    </button>
                    {!canJoinCallNow && (
                      <button
                        onClick={handleCancelAppointment}
                        disabled={cancelLoading}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-400 text-rose-600 hover:text-rose-700 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {cancelLoading ? (
                          <><div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin"/> Cancelling...</>
                        ) : (
                          <><X className="w-4 h-4"/> Cancel Appointment</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── BOOKING UI or MEMBERSHIP GATE ── */
              completedConsultations >= 1 && !selectedMembership ? (
                /* ── MEMBERSHIP GATING: Must buy plan after 1 free consultation ── */
                <div className="flex flex-col items-center text-center py-8 gap-6">
                  <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] flex items-center justify-center shadow-md">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Membership Required</h3>
                    <p className="text-slate-500 font-semibold max-w-sm">
                      You've completed your free consultation! To book more sessions and continue your treatment, please purchase a membership plan.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 w-full max-w-sm text-left space-y-3">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest">What you get with membership</p>
                    {['Unlimited doctor consultations', 'Medication delivery to your door', 'Dietician & fitness plans', 'Priority support'].map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0"/>{f}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep(6)}
                    className="w-full max-w-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    <span>🚀</span> Purchase Membership Plan
                  </button>
                  <button onClick={() => setStep(8)} className="text-slate-400 hover:text-slate-600 font-semibold text-sm transition-colors">
                    ← Back to Dashboard
                  </button>
                </div>
              ) : (

              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Status: Paid</span></div>
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl"><Video className="w-3.5 h-3.5 text-indigo-500"/><span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Format: Video</span></div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl"><ShieldCheck className="w-3.5 h-3.5 text-slate-500"/><span className="text-xs font-black text-slate-700 uppercase tracking-wider">End-to-end encrypted</span></div>
                </div>

                {/* Step 1 — Date: Only dates from DB slots are shown */}
                <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all">
                  <label className="block text-xs font-black text-indigo-500 mb-4 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4"/> Step 1 — Select Date</label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-3 text-slate-400 py-4 justify-center"><div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div><span className="text-sm font-semibold">Loading doctor availability...</span></div>
                  ) : availableDatesFromDB.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                      <p className="font-bold text-sm text-slate-500">No availability posted by any doctor yet</p>
                      <p className="text-xs mt-1">Please check back later or contact support</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {availableDatesFromDB.map(d => {
                        const dateObj = new Date(d + 'T00:00:00');
                        const label = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                        const isSelected = bookingDate === d;
                        return (
                          <button key={d} onClick={() => { setBookingDate(d); setBookingTime(''); setSelectedSlotId(null); }}
                            className={`px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700'}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 2 — Time: Only real slots for selected date are shown with doctor name */}
                <div className={`bg-slate-50/80 p-6 rounded-3xl border border-slate-100 transition-all ${!bookingDate ? 'opacity-40 pointer-events-none' : 'hover:border-indigo-100 animate-fadeIn'}`}>
                  <label className="block text-xs font-black text-indigo-500 mb-4 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Step 2 — Select Time Slot</label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-3 text-slate-400 py-6 justify-center"><div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div><span className="text-sm font-semibold">Fetching available slots...</span></div>
                  ) : (() => {
                    const slotsForDate = doctorSlots.filter(s => s.available_date === bookingDate && !isSlotInPast(s.available_date, s.time_slot));
                    if (!bookingDate) return null;
                    if (slotsForDate.length === 0) return (
                      <div className="text-center py-8"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Calendar className="w-6 h-6 text-slate-400"/></div><p className="text-slate-500 font-bold text-sm">No slots available on this date</p><p className="text-slate-400 text-xs mt-1">Please select a different date above</p></div>
                    );
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {slotsForDate.map(slot => (
                          <button key={slot.id} onClick={() => { if (!slot.is_locked_for_user) { setBookingTime(slot.time_slot); setSelectedSlotId(slot.id); } }} disabled={slot.is_locked_for_user}
                            className={`py-4 px-5 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 text-left flex flex-col gap-1 ${slot.is_locked_for_user ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : selectedSlotId === slot.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                            <span className={`text-base font-black ${slot.is_locked_for_user ? 'text-slate-400' : bookingTime === slot.time_slot ? 'text-indigo-700' : 'text-slate-800'}`}>{slot.time_slot}</span>
                            <span className="text-xs font-semibold text-slate-500 flex items-center justify-between w-full">
                              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-indigo-400"/> {(slot as any).doctor_name || 'Dr. Expert'}</span>
                              {slot.is_locked_for_user && <span className="text-rose-500 text-[10px] uppercase font-black">Locked</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <button disabled={!bookingDate || !bookingTime || videoLoading} onClick={handleStartVideoCall}
                  className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 text-lg group">
                  {videoLoading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Booking Your Slot...</>) : (<><Calendar className="w-6 h-6"/> Confirm Booking</>)}
                </button>

                {bookingDate && bookingTime && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                      Your slot on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong> will be reserved. The video call "Join" button will appear automatically on your dashboard at the scheduled time.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 14: DIETICIAN ─────────────────────────────────────────────── */}
      {step === 14 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={12}/>
          <div className="flex-1 bg-white/90 backdrop-blur-xl p-10 md:p-12 rounded-[3rem] shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-12 border-b border-slate-200/60 pb-8">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4"><Apple className="w-10 h-10 text-amber-500 bg-amber-50 p-2 rounded-2xl"/> Dietician Session</h2>
              <button onClick={() => { setStep(12); setCallActive(false); setVideoRoomUrl(''); }} className="bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-700 font-bold px-6 py-3 rounded-2xl transition-all text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Dashboard</button>
            </div>
            {callActive && videoRoomUrl ? <LiveCallPanel color="bg-amber-500"/> : (
              <div className="text-center max-w-3xl mx-auto py-6">
                <div className="w-28 h-28 bg-amber-50 text-amber-500 rounded-[2rem] transform rotate-3 flex items-center justify-center mx-auto mb-8 shadow-md border border-amber-100"><Apple className="w-14 h-14"/></div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Nutrition Planning</h2>
                <p className="text-slate-500 font-semibold mb-12 text-lg">We build a custom chart based on your regional preferences.</p>
                <div className="text-left mb-12 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <label className="block text-sm font-black text-amber-600 mb-4 uppercase tracking-widest">What does your typical daily meal look like?</label>
                  <textarea value={localFood} onChange={e => setLocalFood(e.target.value)} className={`${inputCls} p-6 text-lg bg-white`} rows={5} placeholder="E.g., Idli for breakfast, Rice & sambar for lunch..."></textarea>
                </div>
                <div className="flex gap-5">
                  <button onClick={() => setStep(12)} className={`${btnSecondaryCls} py-5 text-lg`}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button disabled={!localFood || videoLoading} onClick={handleStartVideoCall} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] text-lg group">{videoLoading ? 'Connecting...' : <><Video className="w-6 h-6 group-hover:scale-110 transition-transform"/> Connect to Dietician</>}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 15: FITNESS COACH ─────────────────────────────────────────── */}
      {step === 15 && (
        <div className="max-w-5xl w-full flex gap-8 items-stretch relative z-10 animate-fadeIn">
          <StepImagePanel stepNum={13}/>
          <div className="flex-1 bg-white/90 backdrop-blur-xl p-10 md:p-12 rounded-[3rem] shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-12 border-b border-slate-200/60 pb-8">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4"><Dumbbell className="w-10 h-10 text-emerald-500 bg-emerald-50 p-2 rounded-2xl"/> Fitness Coach</h2>
              <button onClick={() => { setStep(12); setCallActive(false); setVideoRoomUrl(''); }} className="bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-700 font-bold px-6 py-3 rounded-2xl transition-all text-sm flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Dashboard</button>
            </div>
            {callActive && videoRoomUrl ? <LiveCallPanel color="bg-emerald-500"/> : (
              <div className="text-center max-w-3xl mx-auto py-6">
                <div className="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-[2rem] transform -rotate-3 flex items-center justify-center mx-auto mb-8 shadow-md border border-emerald-100"><Dumbbell className="w-14 h-14"/></div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Movement Plan</h2>
                <p className="text-slate-500 font-semibold mb-12 text-lg">Select your environment to get a tailored routine.</p>
                <div className="grid grid-cols-2 gap-8 mb-12 text-left">
                  {[{ key: 'home', icon: <HomeIcon className="w-10 h-10"/>, label: 'Home Workout', sub: 'No equipment needed.' }, { key: 'gym', icon: <Dumbbell className="w-10 h-10"/>, label: 'Gym Routine', sub: 'Full equipment access.' }].map(opt => (
                    <div key={opt.key} onClick={() => setWorkoutPreference(opt.key)} className={`group cursor-pointer border-4 rounded-[2.5rem] p-10 transition-all hover:-translate-y-2 hover:shadow-xl ${workoutPreference === opt.key ? 'border-emerald-500 bg-emerald-50/50 shadow-lg' : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'}`}>
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors ${workoutPreference === opt.key ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>{opt.icon}</div>
                      <h4 className="font-black text-slate-800 text-2xl mb-2">{opt.label}</h4>
                      <p className="text-slate-500 font-medium">{opt.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-5">
                  <button onClick={() => setStep(12)} className={`${btnSecondaryCls} py-5 text-lg`}><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform"/> Back</button>
                  <button disabled={!workoutPreference || videoLoading} onClick={handleStartVideoCall} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] text-lg group">{videoLoading ? 'Connecting...' : <><Video className="w-6 h-6 group-hover:scale-110 transition-transform"/> Connect to Coach</>}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INCOMING VIDEO CALL MODAL OVERLAY ── */}
      {incomingCall && (
        <div className="fixed inset-0 z-[500] bg-slate-950/85 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-[3rem] p-10 text-center shadow-2xl relative overflow-hidden text-white">
            {/* Shimmer decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Pulsing doctor avatar */}
            <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
              <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full blur-sm opacity-75"></div>
              <div className="relative w-full h-full bg-slate-800 border-2 border-indigo-400 rounded-full flex items-center justify-center shadow-2xl">
                <Stethoscope className="w-16 h-16 text-indigo-300 animate-pulse"/>
              </div>
            </div>

            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full inline-block mb-4 animate-pulse">
              🟢 Incoming Consultation
            </span>
            
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              {incomingCall.doctor_name}
            </h2>
            <p className="text-slate-400 text-sm font-semibold mb-10">
              Is calling you for your scheduled video consultation...
            </p>

            <div className="flex gap-6 justify-center">
              {/* Decline Button */}
              <button 
                onClick={handleDeclineCall} 
                className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-rose-600/30 hover:scale-105 active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Accept Button */}
              <button 
                onClick={handleAcceptCall} 
                className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-xl hover:shadow-emerald-600/40 animate-bounce hover:scale-110 active:scale-95"
                title="Accept & Join Call"
              >
                <Video className="w-9 h-9 text-white animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}