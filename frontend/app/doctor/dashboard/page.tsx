'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity, Users, CheckCircle2, XCircle, Video, Calendar, Wallet,
  ArrowDownToLine, Pill, FileText, Clock, AlertCircle, LogOut,
  Stethoscope, ChevronRight, Plus, X, TrendingUp, BadgeCheck, Bell, BellRing, UserCheck, Check, PhoneOff, MessageCircle,
  Eye, Printer, Download, Menu,
} from 'lucide-react';
import StaffChat from '@/components/StaffChat';
import ProviderAvailabilityScheduler, { GeneratedSlot, AvailabilitySubmission } from '@/components/scheduling/ProviderAvailabilityScheduler';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const inputCls = 'w-full border border-[#1A1F36]/10 rounded-2xl p-3 bg-[#F5F0EB]/60 outline-none transition-all text-[#1A1F36] placeholder-[#8896A4] font-medium focus:bg-white focus:border-[#C4622D] focus:ring-4 focus:ring-[#C4622D]/10 [color-scheme:light]';
const labelCls = 'block text-xs font-bold text-[#40516A] mb-1 uppercase tracking-wider';

// ── Helper: format call duration ──────────────────────────────────────────────
function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return '—';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parsePrescriptionNotes(notes: string | null) {
  if (!notes) return { notes: '', diagnosis: '', followUp: '' };
  
  let notesStr = '';
  let diagnosisStr = '';
  let followUpStr = '';
  
  const notesMatch = notes.match(/Notes:\s*([\s\S]*?)(?=(?:Diagnosis summary:|Follow-up:|$))/i);
  const diagMatch = notes.match(/Diagnosis summary:\s*([\s\S]*?)(?=(?:Notes:|Follow-up:|$))/i);
  const followMatch = notes.match(/Follow-up:\s*([\s\S]*?)(?=(?:Notes:|Diagnosis summary:|$))/i);
  
  if (notesMatch) notesStr = notesMatch[1].trim();
  if (diagMatch) diagnosisStr = diagMatch[1].trim();
  if (followMatch) followUpStr = followMatch[1].trim();
  
  if (!notesStr && !diagnosisStr && !followUpStr) {
    diagnosisStr = notes.trim();
  }
  
  return {
    notes: notesStr,
    diagnosis: diagnosisStr,
    followUp: followUpStr
  };
}

function getStatusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (s === 'draft') return 'Draft';
  if (s === 'updated') return 'Updated';
  if (s === 'archived') return 'Archived';
  return 'Approved';
}

function getStatusClass(status: string) {
  const s = String(status).toLowerCase();
  if (s === 'draft') return 'bg-slate-100 text-slate-700';
  if (s === 'updated') return 'bg-blue-100 text-blue-700';
  if (s === 'archived') return 'bg-gray-100 text-gray-500';
  return 'bg-[#5C7A6B]/12 text-[#5C7A6B]';
}

function handlePrintPrescription(c: any) {
  const parsed = parsePrescriptionNotes(c.prescription_notes);
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow popups to print/download the prescription.');
    return;
  }
  
  const isNone = !c.prescription_type || c.prescription_type === 'none';
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Prescription - ${c.patient_name}</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1F36; padding: 40px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #C4622D; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 800; color: #1A1F36; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { font-size: 14px; font-weight: 600; color: #8896A4; margin: 5px 0 0 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; font-size: 14px; }
          .meta-item { background: #F5F0EB; padding: 15px; border-radius: 12px; border: 1px solid rgba(26, 31, 54, 0.08); }
          .meta-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8896A4; margin: 0 0 5px 0; }
          .meta-value { font-weight: 700; color: #1A1F36; margin: 0; }
          .rx-symbol { font-size: 32px; font-weight: 800; color: #C4622D; margin-bottom: 10px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #8896A4; border-bottom: 1px solid rgba(26, 31, 54, 0.08); padding-bottom: 5px; margin-bottom: 15px; }
          .content { font-size: 15px; font-weight: 600; color: #40516A; white-space: pre-wrap; margin: 0; }
          .no-meds { color: #8896A4; font-style: italic; }
          .footer { margin-top: 60px; border-top: 1px solid rgba(26, 31, 54, 0.08); padding-top: 20px; text-align: right; }
          .signature-line { display: inline-block; border-top: 2px solid #1A1F36; width: 200px; margin-top: 40px; text-align: center; font-size: 12px; font-weight: 800; color: #8896A4; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">8Liv Medical Consultation</h1>
          <p class="subtitle">Official Electronic Prescription Record</p>
        </div>
        
        <div class="meta-grid">
          <div class="meta-item">
            <p class="meta-label">Patient Name</p>
            <p class="meta-value">${c.patient_name}</p>
          </div>
          <div class="meta-item">
            <p class="meta-label">Consultation Date</p>
            <p class="meta-value">${c.booking_date} @ ${c.booking_time}</p>
          </div>
        </div>
        
        <div class="section">
          <p class="section-title">Clinical Diagnosis</p>
          <pre class="content">${parsed.diagnosis || 'Diagnosis recorded in clinical file.'}</pre>
        </div>
        
        <div class="section">
          <p class="section-title">Rx (Medication & Directions)</p>
          <div class="rx-symbol">℞</div>
          ${isNone ? `
            <p class="content no-meds">No medication prescribed</p>
          ` : `
            <p class="meta-label" style="margin-bottom: 10px;">Medication Type: ${c.prescription_type}</p>
            <pre class="content">${c.prescription_text || 'Directions to follow'}</pre>
          `}
        </div>
        
        <div class="section">
          <p class="section-title">Follow-up & Safety Instructions</p>
          <pre class="content">${parsed.followUp || 'Follow-up as per standard care guidelines.'}</pre>
        </div>
        
        <div class="footer">
          <div class="signature-line">
            Authorized Practitioner Signature
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}


// Helper: check if scheduled time is within the allowed Jitsi join window
function isCallTimeNow(bookingDate: string, bookingTime: string): boolean {
  if (bookingDate.startsWith('mock_') || bookingTime === 'Consultation' || bookingTime === 'Dietician' || bookingTime === 'Fitness') return true;
  try {
    let isoDate = bookingDate;
    if (bookingDate.includes('/')) {
      const [d, m, y] = bookingDate.split('/');
      isoDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const target = new Date(`${isoDate} ${bookingTime}`);
    const now = Date.now();
    const start = target.getTime();
    const FIFTEEN_MIN = 15 * 60 * 1000;
    const ONE_AND_HALF_HOURS = 90 * 60 * 1000; // 1.30 hours
    return now >= start - FIFTEEN_MIN && now <= start + ONE_AND_HALF_HOURS;
  } catch {
    return true;
  }
}

// Helper: parse booking time safely into milliseconds
function getParsedTime(bookingDate: string, bookingTime: string): number | null {
  if (!bookingDate || !bookingTime || bookingDate.startsWith('mock_') || bookingTime === 'Consultation' || bookingTime === 'Dietician' || bookingTime === 'Fitness') return null;
  try {
    let isoDate = bookingDate;
    if (bookingDate.includes('/')) {
      const [d, m, y] = bookingDate.split('/');
      isoDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const target = new Date(`${isoDate} ${bookingTime}`);
    const parsed = target.getTime();
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function getSlotTimestamp(slotDate: string, slotTime: string): number | null {
  if (!slotDate || !slotTime) return null;
  try {
    const target = new Date(`${slotDate} ${slotTime}`);
    const parsed = target.getTime();
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function isExpiredSlot(slot: { available_date: string; time_slot: string }): boolean {
  const timestamp = getSlotTimestamp(slot.available_date, slot.time_slot);
  return timestamp !== null && timestamp < Date.now();
}

function formatSlotTime(slotTime: string): string {
  if (!slotTime) return 'Not set';
  const [hourPart, minutePart] = slotTime.split(':');
  const hours = Number(hourPart);
  if (!Number.isFinite(hours)) return slotTime;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minutePart || '00'} ${suffix}`;
}

function formatSlotDate(slotDate: string): string {
  const parsed = new Date(`${slotDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return slotDate;
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCountdown(slotDate: string, slotTime: string): string {
  const timestamp = getSlotTimestamp(slotDate, slotTime);
  if (!timestamp) return 'Time unavailable';
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Expired';
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}

function safeDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => safeDisplayValue(item)).filter(item => item !== 'N/A').join(', ') || 'N/A';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .map(([key, entry]) => {
        const text = safeDisplayValue(entry);
        return text === 'N/A' ? null : `${key}: ${text}`;
      })
      .filter(Boolean)
      .join(' | ') || 'N/A';
  }
  return 'N/A';
}

function patientName(patient: any): string {
  return `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || patient?.email || 'Patient';
}

function formatClinicalDate(date?: string | null, time?: string | null): string {
  if (!date) return 'Not scheduled';
  const parsed = new Date(`${date}T${String(time || '00:00').slice(0, 5)}:00`);
  if (Number.isNaN(parsed.getTime())) return [date, time].filter(Boolean).join(' at ');
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: time ? '2-digit' : undefined,
    minute: time ? '2-digit' : undefined,
  });
}

function patientBmi(patient: any): string {
  if (patient?.bmi) return Number(patient.bmi).toFixed(1);
  if (patient?.weight_kg && patient?.height_cm) {
    return (Number(patient.weight_kg) / Math.pow(Number(patient.height_cm) / 100, 2)).toFixed(1);
  }
  return 'N/A';
}

function statusTone(status?: string | null): string {
  const value = String(status || '').toLowerCase();
  if (['approved', 'completed', 'active', 'clinical review complete', 'eligible'].includes(value)) return 'bg-[#5C7A6B]/12 text-[#3F6B50] border-[#5C7A6B]/18';
  if (['rejected', 'not_eligible', 'not approved', 'cancelled', 'cancelled_by_doctor', 'cancelled_by_patient'].includes(value)) return 'bg-[#B94D4D]/10 text-[#B94D4D] border-[#B94D4D]/18';
  return 'bg-[#D89A3D]/12 text-[#B7792F] border-[#D89A3D]/18';
}

function consultationLabel(status?: string | null): string {
  return safeDisplayValue(status).replace(/_/g, ' ');
}

function isLegacyVideoUrl(url?: string | null): boolean {
  return Boolean(url && /daily\.co|8liv\.daily/i.test(url));
}

function ClinicalMetric({ label, value, accent, success, compact }: { label: string; value: string; accent?: boolean; success?: boolean; compact?: boolean }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.06)] text-center">
      <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">{label}</p>
      <p className={`${compact ? 'text-sm' : 'text-xl'} font-black mt-1 ${accent ? 'text-[#C4622D]' : success ? 'text-[#5C7A6B]' : 'text-[#1A1F36]'}`}>{value}</p>
    </div>
  );
}

function ClinicalCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[20px] border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
      <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-4 flex items-center gap-1.5">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function ClinicalText({ value, empty }: { value: unknown; empty: string }) {
  const text = safeDisplayValue(value);
  return (
    <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-4 rounded-2xl border border-[#1A1F36]/8 leading-relaxed">
      {text === 'N/A' ? empty : text}
    </p>
  );
}

function ClinicalMini({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/45 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{label}</p>
      <p className="mt-2 text-xs font-bold leading-relaxed text-[#40516A]">{safeDisplayValue(value)}</p>
    </div>
  );
}

type Tab = 'overview' | 'patients' | 'schedule' | 'consultations' | 'prescriptions' | 'wallet' | 'messages';

type Consultation = {
  id: string;
  patient_id: string;
  patient_name: string;
  booking_date: string;
  booking_time: string;
  room_url: string;
  meeting_provider?: string | null;
  meeting_room?: string | null;
  meeting_url?: string | null;
  status: string;
  prescription_type: string | null;
  prescription_text: string | null;
  prescription_notes: string | null;
  prescription_ordered: boolean;
  doctor_payout: number;
  call_started_at: string | null;
  call_ended_at: string | null;
  doctor_id: string | null;
  created_at: string;
  patient_age?: number | null;
  patient_bmi?: number | null;
  patient_weight?: number | null;
  patient_goal_weight?: number | null;
  patient_history?: string | null;
  patient_extra_info?: string | null;
  patient_eligibility_status?: string | null;
  patient_medical_risk_flags?: string | null;
  patient_medication_proof_url?: string | null;
};

type WalletData = {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};

type AvailabilitySlot = {
  id: string;
  doctor_id: string;
  available_date: string;
  time_slot: string;
  is_booked: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function DoctorDashboard() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [doctor, setDoctor] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Consultations
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availableRequests, setAvailableRequests] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Pagination & Search States
  const [consultationsPage, setConsultationsPage] = useState(1);
  const [consultationsTotalPages, setConsultationsTotalPages] = useState(1);
  const [consultationsSearch, setConsultationsSearch] = useState('');
  const [consultationsStatusFilter, setConsultationsStatusFilter] = useState('');

  const [patientsPage, setPatientsPage] = useState(1);
  const [patientsTotalPages, setPatientsTotalPages] = useState(1);
  const [patientsSearch, setPatientsSearch] = useState('');

  // Video call
  const [activeCallUrl, setActiveCallUrl] = useState('');
  const [activeCallPatient, setActiveCallPatient] = useState('');
  const [activeCallStatus, setActiveCallStatus] = useState<string>('calling');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callTimer, setCallTimer] = useState<string>('');
  const callTimerRef = useRef<any>(null);

  // Upcoming call alert (15 min pre-call notification)
  const [upcomingCallAlert, setUpcomingCallAlert] = useState<{ patient: string; time: string; url: string } | null>(null);
  const [doctorNotifBell, setDoctorNotifBell] = useState(false);

  // Link configuration modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [tempMeetLink, setTempMeetLink] = useState('');
  const [selectedConsultationForCall, setSelectedConsultationForCall] = useState<Consultation | null>(null);

  // Scheduling
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);
  const [generatingAvailability, setGeneratingAvailability] = useState(false);

  // Prescription modal
  const [prescribeCase, setPrescribeCase] = useState<Consultation | null>(null);
  const [prescriptionType, setPrescriptionType] = useState<'INJECTABLE'>('INJECTABLE');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [viewingPrescription, setViewingPrescription] = useState<Consultation | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [followUpInstruction, setFollowUpInstruction] = useState('');
  const [prescribing, setPrescribing] = useState(false);

  // Sync prescribeCase with prescription text state
  useEffect(() => {
    if (prescribeCase) {
      setPrescriptionText(prescribeCase.prescription_text || '');
      setPrescriptionType('INJECTABLE');
      setCompletionNotes('');
      setDiagnosisSummary('');
      setFollowUpInstruction('');
    } else {
      setPrescriptionText('');
      setCompletionNotes('');
      setDiagnosisSummary('');
      setFollowUpInstruction('');
    }
  }, [prescribeCase]);

  // Reject modal
  const [rejectCase, setRejectCase] = useState<Consultation | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Wallet
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, total_earned: 0, total_withdrawn: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          if (error) console.warn('Doctor session load error:', error.message);
          await supabase.auth.signOut();
          router.push('/?role=doctor');
          return;
        }
        setDoctor(session.user);

        // Fetch user profile securely via our backend to bypass any RLS limitations on Profiles
        const profileRes = await fetch('/api/staff/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        });
        const profileData = await profileRes.json();
        const userProfile = profileData.profile;
        const profErr = profileData.error;

        if (profErr || !userProfile || userProfile.role !== 'doctor') {
          console.warn('Access Denied: User is not a doctor.');
          alert('Access Denied. You must be a doctor to view this dashboard.');
          await supabase.auth.signOut();
          document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
          router.push('/login');
          return;
        }

        // Ensure doctor profile exists in profiles table (required for doctor_availability FK constraint)
        // This calls the backend which has service-role permissions to bypass RLS
        try {
          const profileInitRes = await fetch('/api/doctor/ensure-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctor_id: session.user.id,
              email: session.user.email || '',
              first_name: userProfile?.first_name || 'Dr',
              last_name: userProfile?.last_name || 'Unknown'
            })
          });

          if (!profileInitRes.ok) {
            console.warn('Failed to initialize doctor profile, continuing anyway...');
          }
        } catch (err) {
          console.warn('Profile initialization error (non-critical):', err);
        }

        // Load or auto-create doctor profile
        const { data: profile } = await supabase
          .from('doctor_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          setDoctorProfile(profile);
        } else {
          // Auto-create to satisfy foreign key constraints
          const { data: newProfile, error: insertErr } = await supabase
            .from('doctor_profiles')
            .upsert({
              id: session.user.id,
              full_name: `Dr. ${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Dr. Unknown',
              specialty: 'Physician'
            })
            .select()
            .single();

          if (!insertErr && newProfile) {
            setDoctorProfile(newProfile);
          }
        }

        const loadDashboardAggregated = async (token: string) => {
          try {
            const res = await fetch('/api/provider/dashboard', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.consultations) setConsultations(data.consultations);
              if (data.availableRequests) setAvailableRequests(data.availableRequests);
              if (data.wallet) setWallet(data.wallet);
            }
          } catch (err) {
            console.error('Failed to load doctor dashboard aggregated overview:', err);
          }
        };

        if (session.access_token) {
          await loadDashboardAggregated(session.access_token);
        }
        setLoading(false);
      } catch (err) {
        console.error('Doctor dashboard initialization failed:', err);
        await supabase.auth.signOut();
        router.push('/?role=doctor');
      }
    };
    init();
  }, [router]);

  // Tab change handler to lazy load data
  useEffect(() => {
    if (!doctor) return;
    const loadTabDetails = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      if (activeTab === 'overview') {
        const res = await fetch('/api/provider/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.consultations) setConsultations(data.consultations);
          if (data.availableRequests) setAvailableRequests(data.availableRequests);
          if (data.wallet) setWallet(data.wallet);
        }
      } else if (activeTab === 'schedule') {
        loadAvailability(doctor.id);
      } else if (activeTab === 'wallet') {
        loadWallet(doctor.id);
      }
    };
    loadTabDetails();
  }, [activeTab, doctor]);

  // Paginated Consultations Loader Effect
  useEffect(() => {
    if (doctor && activeTab === 'consultations') {
      loadConsultations(doctor.id, consultationsPage, consultationsSearch, consultationsStatusFilter);
    }
  }, [doctor, activeTab, consultationsPage, consultationsSearch, consultationsStatusFilter]);

  // Paginated Patients Loader Effect
  useEffect(() => {
    if (doctor && activeTab === 'patients') {
      loadPatients(doctor.id, patientsPage, patientsSearch);
    }
  }, [doctor, activeTab, patientsPage, patientsSearch]);

  // Poll consultation status while call is active
  useEffect(() => {
    if (!activeCallId) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('doctor_consultations')
        .select('status')
        .eq('id', activeCallId)
        .maybeSingle();

      if (data) {
        setActiveCallStatus(data.status);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [activeCallId]);

  // Poll active module data conditionally for real-time updates
  useEffect(() => {
    if (!doctor) return;
    const pollInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      if (activeTab === 'overview' && token) {
        const res = await fetch('/api/provider/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.consultations) setConsultations(data.consultations);
          if (data.availableRequests) setAvailableRequests(data.availableRequests);
          if (data.wallet) setWallet(data.wallet);
        }
      } else if (activeTab === 'consultations') {
        loadConsultations(doctor.id, consultationsPage, consultationsSearch, consultationsStatusFilter);
      } else if (activeTab === 'wallet') {
        loadWallet(doctor.id);
      }
    }, activeTab === 'overview' ? 8000 : 5000);
    return () => clearInterval(pollInterval);
  }, [doctor, activeTab, consultationsPage, consultationsSearch, consultationsStatusFilter]);

  // Heartbeat to update doctor's last_seen_at for online status tracking
  useEffect(() => {
    if (!doctor) return;
    const updatePresence = async () => {
      try {
        await supabase
          .from('doctor_profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', doctor.id);
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 10000); // Heartbeat every 10 seconds
    return () => clearInterval(presenceInterval);
  }, [doctor]);

  // ── 15-min pre-call notification check ──────────────────────────────────
  const checkUpcomingCalls = useCallback((cons: Consultation[]) => {
    const now = Date.now();
    for (const c of cons) {
      if (c.status !== 'scheduled') continue;
      if (!c.booking_date || !c.booking_time) continue;
      try {
        const target = new Date(`${c.booking_date} ${c.booking_time}`).getTime();
        const diffMin = (target - now) / 60000;
        if (diffMin >= 0 && diffMin <= 15) {
          setUpcomingCallAlert({ patient: c.patient_name || 'Member', time: c.booking_time, url: c.room_url });
          setDoctorNotifBell(true);
          // Play alert sound via Web Audio API
          try {
            const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(); osc.stop(ctx.currentTime + 0.8);
            }
          } catch (e) {}
          return;
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    checkUpcomingCalls(consultations);
  }, [consultations, checkUpcomingCalls]);

  // ── Live call timer (increments every second when call is active) ────────
  useEffect(() => {
    if (!activeCallId) {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallTimer('');
      return;
    }
    const started = Date.now();
    callTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setCallTimer(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [activeCallId]);


  const loadConsultations = async (
    doctorId: string,
    page: number = consultationsPage,
    search: string = consultationsSearch,
    status: string = consultationsStatusFilter
  ) => {
    try {
      const res = await fetch('/api/doctor/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, page, limit: 20, search, status })
      });
      const data = await res.json();
      if (data.consultations) setConsultations(data.consultations);
      if (data.availableRequests) setAvailableRequests(data.availableRequests);
      if (data.totalPages !== undefined) setConsultationsTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
  };

  const loadPatients = async (
    doctorId: string,
    page: number = patientsPage,
    search: string = patientsSearch
  ) => {
    try {
      const res = await fetch('/api/staff/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: doctorId, role: 'doctor', page, limit: 20, search })
      });
      const data = await res.json();
      if (data.patients) {
        setPatients(data.patients);
        if (data.patients.length > 0) {
          setSelectedPatient((prev: any) => {
            if (prev && data.patients.some((p: any) => p.id === prev.id)) {
              return data.patients.find((p: any) => p.id === prev.id);
            }
            return data.patients[0];
          });
        } else {
          setSelectedPatient(null);
        }
      }
      if (data.totalPages !== undefined) setPatientsTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const loadAvailability = async (doctorId: string) => {
    const { data } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', doctorId)
      .eq('provider_role', 'doctor')
      .order('available_date', { ascending: true });
    if (data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        doctor_id: row.provider_id,
        available_date: row.available_date,
        time_slot: row.start_time,
        is_booked: row.status === 'BOOKED' || !row.is_available,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      setAvailSlots(
        [...mapped].sort((a, b) => {
          const aTime = getSlotTimestamp(a.available_date, a.time_slot) || 0;
          const bTime = getSlotTimestamp(b.available_date, b.time_slot) || 0;
          return aTime - bTime;
        })
      );
    }
  };

  const loadWallet = async (doctorId: string) => {
    const { data } = await supabase
      .from('doctor_wallet')
      .select('*')
      .eq('doctor_id', doctorId)
      .single();
    if (data) setWallet(data);

    const { data: txns } = await supabase
      .from('doctor_wallet_transactions')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (txns) setTransactions(txns);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
    router.push('/');
  };

  // ── Scheduling ────────────────────────────────────────────────────────
  const generateAvailability = async (submission: AvailabilitySubmission) => {
    if (!doctor) return;
    setGeneratingAvailability(true);
    try {
      const response = await fetch('/api/doctor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          email: doctor.email || '',
          slots: submission.slots,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate availability.');
      }

      await loadAvailability(doctor.id);
      alert(data.message || `Generated ${data.inserted || 0} new availability slots. ${data.skipped || 0} duplicate slots were skipped.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error. Please try again.';
      console.error('Availability generation error:', err);
      alert('Error generating availability: ' + message);
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const deleteSlot = async (id: string) => {
    const slot = availSlots.find(item => item.id === id);
    if (slot?.is_booked) {
      alert('Booked slots cannot be deleted from availability. Cancel the consultation first if needed.');
      return;
    }
    await supabase.from('provider_availability').delete().eq('id', id);
    loadAvailability(doctor.id);
  };

  const joinCall = async (c: Consultation) => {
    // Check if within allowed call window: 15 mins before start up to 1.30h after start
    if (!isCallTimeNow(c.booking_date, c.booking_time)) {
      setWarningMessage(`Advance joining is not allowed. You can launch the Jitsi session between 15 minutes before and 1 hour 30 minutes after the scheduled time.\n\nScheduled time: ${c.booking_date} at ${c.booking_time}`);
      return;
    }

    let finalLink = c.meeting_url || c.room_url;

    if (!finalLink || isLegacyVideoUrl(finalLink)) {
      const res = await fetch('/api/doctor/consultations/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id, consultationId: c.id })
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.meetingUrl) {
        console.error('Failed to replace legacy meeting URL:', data);
        alert(data.error || 'Unable to prepare the Jitsi room for this consultation. Please refresh and try again.');
        return;
      }
      finalLink = data.meetingUrl;
    }

    if (!finalLink) {
      alert("Error: No stored Jitsi room was found for this consultation.");
      return;
    }

    setActiveCallUrl(finalLink);
    setActiveCallPatient(c.patient_name || 'Member');
    setActiveCallStatus('calling');
    setActiveCallId(c.id);

    // Update status and record call_started_at in DB
    await supabase.from('doctor_consultations').update({
      status: 'calling',
      call_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', c.id);

    loadConsultations(doctor.id);
  };

  const endCall = async () => {
    // Record call_ended_at and status: attended in DB
    if (activeCallId) {
      await supabase.from('doctor_consultations').update({
        status: 'attended',
        call_ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', activeCallId);

      const endingCons = consultations.find(c => c.id === activeCallId);
      if (endingCons) {
        setPrescribeCase({
          ...endingCons,
          status: 'attended',
          call_started_at: endingCons.call_started_at || new Date().toISOString(),
          call_ended_at: new Date().toISOString()
        });
      }
    }
    setActiveCallUrl('');
    setActiveCallPatient('');
    setActiveCallId(null);
    setCallTimer('');
    if (doctor) loadConsultations(doctor.id);
  };

  // ── Claim Patient Request ──────────────────────────────────────────────
  const handleClaimRequest = async (req: Consultation) => {
    if (!doctor) return;
    try {
      // 1. Verify availability of request and check if already claimed
      const { data: latestReq } = await supabase
        .from('doctor_consultations')
        .select('doctor_id, status')
        .eq('id', req.id)
        .maybeSingle();

      if (!latestReq || latestReq.doctor_id) {
        alert('This request has already been claimed by another doctor! ⏳');
        loadConsultations(doctor.id);
        return;
      }

      // 1b. Check for 2-hour gap conflict against doctor's existing scheduled consultations
      const { data: docCons } = await supabase
        .from('doctor_consultations')
        .select('booking_date, booking_time')
        .eq('doctor_id', doctor.id)
        .eq('status', 'scheduled');

      if (docCons && docCons.length > 0) {
        const newReqTime = getParsedTime(req.booking_date, req.booking_time);
        if (newReqTime !== null) {
          const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
          for (const existing of docCons) {
            const existingTime = getParsedTime(existing.booking_date, existing.booking_time);
            if (existingTime !== null) {
              const diff = Math.abs(newReqTime - existingTime);
              if (diff < TWO_HOURS_MS) {
                alert(`Conflict detected! You already have an appointment scheduled at ${existing.booking_date} ${existing.booking_time}. Doctors must maintain at least a 2-hour gap between appointments. ⏳`);
                return;
              }
            }
          }
        }
      }

      // 2. Lock/Claim the availability slot in provider_availability
      const formattedTime = req.booking_time.includes(':') && req.booking_time.split(':').length === 2 ? `${req.booking_time}:00` : req.booking_time;
      const { data: existingSlot } = await supabase
        .from('provider_availability')
        .select('id')
        .eq('provider_id', doctor.id)
        .eq('provider_role', 'doctor')
        .eq('available_date', req.booking_date)
        .eq('start_time', formattedTime)
        .maybeSingle();

      if (existingSlot) {
        await supabase.from('provider_availability')
          .update({ status: 'BOOKED', is_available: false })
          .eq('id', existingSlot.id);
      } else {
        // Compute end time based on 30 min duration
        let startMin = 0;
        const match = String(req.booking_time || '').trim().match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          startMin = Number(match[1]) * 60 + Number(match[2]);
        }
        const endMin = startMin + 30;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        const formattedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

        await supabase.from('provider_availability').insert({
          provider_id: doctor.id,
          provider_role: 'doctor',
          available_date: req.booking_date,
          start_time: formattedTime,
          end_time: formattedEndTime,
          slot_duration: 30,
          status: 'BOOKED',
          is_available: false,
          source: 'MANUAL'
        });
      }


      // 3. Update consultation doctor_id
      const { error } = await supabase
        .from('doctor_consultations')
        .update({
          doctor_id: doctor.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.id);

      if (error) throw error;

      // 4. Get doctor display info for rich notification
      const doctorDisplayId = doctor.user_metadata?.display_id || `DOC-${doctor.id.slice(0, 4).toUpperCase()}`;
      const doctorSpecialty = doctorProfile?.specialty || 'Endocrinologist';
      const doctorFullName = doctorProfile?.full_name || doctorDisplayId;

      // 5. Notify patient with professional message
      await supabase.from('patient_notifications').insert({
        patient_id: req.patient_id,
        doctor_id: doctor.id,
        type: 'doctor_assigned',
        title: `🩺 Your Doctor Has Been Assigned!`,
        message: `Great news! ${doctorDisplayId} (${doctorSpecialty}) has accepted your consultation request and will be your dedicated health guide. Your session is confirmed for ${req.booking_date} at ${req.booking_time}. Please be ready to join the video call at the scheduled time. Your doctor will guide you through your personalised treatment plan.`,
      });

      alert('Patient request successfully claimed and confirmed! 🎉');
      loadConsultations(doctor.id);
    } catch (err: any) {
      alert('Failed to claim request: ' + err.message);
    }
  };

  // ── Prescribe ─────────────────────────────────────────────────────────
  const handlePrescribe = async (isNoPrescription = false) => {
    if (!prescribeCase || !doctor) return;
    setPrescribing(true);

    try {
      const finalType = isNoPrescription ? 'none' : prescriptionType;
      const finalText = isNoPrescription ? null : prescriptionText;

      const res = await fetch('/api/doctor/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          consultationId: prescribeCase.id,
          action: 'complete_consultation',
          decision: 'approved',
          notes: completionNotes,
          diagnosisSummary,
          recommendedMedicationType: finalType,
          prescriptionText: finalText,
          followUpInstruction,
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to complete consultation.');
      }

      await loadConsultations(doctor.id);
      await loadWallet(doctor.id);
      setPrescribeCase(null);
      setPrescriptionText('');
      setCompletionNotes('');
      setDiagnosisSummary('');
      setFollowUpInstruction('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setPrescribing(false);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectCase || !doctor) return;
    setRejecting(true);
    try {
      const res = await fetch('/api/doctor/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          consultationId: rejectCase.id,
          action: 'complete_consultation',
          decision: 'rejected',
          notes: rejectNote,
          diagnosisSummary: 'Not approved for treatment at this time.',
          recommendedMedicationType: null,
          prescriptionText: null,
          followUpInstruction: 'Please follow the clinician notes and consult support for next steps.',
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to complete consultation.');
      }
      await loadConsultations(doctor.id);
      await loadWallet(doctor.id);
      setRejectCase(null);
      setRejectNote('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setRejecting(false);
    }
  };

  // ── Cancel Appointment ────────────────────────────────────────────────
  const handleCancelAppointment = async (c: any) => {
    if (!confirm('Are you sure you want to cancel this scheduled appointment?')) return;
    if (!doctor) return;
    try {
      const res = await fetch('/api/doctor/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          consultationId: c.id
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to cancel appointment.');
      }

      await Promise.all([
        loadConsultations(doctor.id),
        loadAvailability(doctor.id)
      ]);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || amt > wallet.balance) { alert('Invalid amount.'); return; }
    setWithdrawing(true);
    const newBalance = wallet.balance - amt;
    const newWithdrawn = wallet.total_withdrawn + amt;
    await supabase.from('doctor_wallet').update({
      balance: newBalance,
      total_withdrawn: newWithdrawn,
      updated_at: new Date().toISOString(),
    }).eq('doctor_id', doctor.id);
    await supabase.from('doctor_wallet_transactions').insert({
      doctor_id: doctor.id,
      type: 'withdrawal',
      amount: amt,
      description: 'Bank withdrawal',
      status: 'pending',
    });
    await loadWallet(doctor.id);
    setWithdrawAmount('');
    alert(`₹${amt} withdrawal initiated! ✅`);
    setWithdrawing(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-IN');
  const todayIso = new Date().toISOString().split('T')[0];
  const thisWeekStart = new Date(); thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date(); thisMonthStart.setDate(1);
  const completedStatuses = ['approved', 'rejected', 'completed'];
  const pendingStatuses = ['scheduled', 'calling', 'attended'];
  const cancelledStatuses = ['cancelled', 'cancelled_by_doctor', 'cancelled_by_patient'];

  const todayCases = consultations.filter(c => c.booking_date === todayIso || new Date(c.created_at).toLocaleDateString('en-IN') === today).length;
  const weekCases = consultations.filter(c => new Date(c.created_at) >= thisWeekStart).length;
  const monthCases = consultations.filter(c => new Date(c.created_at) >= thisMonthStart).length;
  const approvedCases = consultations.filter(c => c.status === 'approved').length;
  const rejectedCases = consultations.filter(c => c.status === 'rejected').length;
  const completedCases = consultations.filter(c => completedStatuses.includes(c.status)).length;
  const missedCases = consultations.filter(c => c.status === 'missed_by_patient').length;
  const cancelledCases = consultations.filter(c => cancelledStatuses.includes(c.status)).length;
  const attendedCalls = consultations.filter(c => ['attended', ...completedStatuses].includes(c.status)).length;
  const notAttendedCalls = consultations.filter(c => pendingStatuses.includes(c.status)).length;
  const pendingCases = consultations.filter(c => pendingStatuses.includes(c.status)).length;
  const upcomingAvailSlots = availSlots.filter(slot => !isExpiredSlot(slot));
  const expiredAvailSlots = availSlots.filter(slot => isExpiredSlot(slot));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#C4622D]/15 border-t-[#C4622D] rounded-full animate-spin"></div>
        <p className="text-lg font-black text-[#1A1F36] mt-6">Loading Doctor Portal...</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4"/> },
    { key: 'patients', label: 'Patients', icon: <Users className="w-4 h-4"/> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4"/> },
    { key: 'consultations', label: 'Consultations', icon: <Video className="w-4 h-4"/> },
    { key: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4"/> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4"/> },
    { key: 'messages', label: 'Messages', icon: <MessageCircle className="w-4 h-4"/> },
  ];

  const activeRejoinableConsultation = consultations.find(c =>
    (c.meeting_url || c.room_url) &&
    ['scheduled', 'calling', 'attended'].includes(c.status) &&
    isCallTimeNow(c.booking_date, c.booking_time)
  );

  const findConsultationForSlot = (slot: AvailabilitySlot) => consultations.find((consultation) => {
    if (consultation.booking_date !== slot.available_date) return false;
    const consultationTime = getSlotTimestamp(consultation.booking_date, consultation.booking_time);
    const slotTime = getSlotTimestamp(slot.available_date, slot.time_slot);
    return consultationTime !== null && slotTime !== null && consultationTime === slotTime;
  });

  const renderSlotCard = (slot: AvailabilitySlot, idx: number, mode: 'upcoming' | 'expired') => {
    const consultation = findConsultationForSlot(slot);
    const isExpired = mode === 'expired';
    const label = isExpired ? (slot.is_booked ? 'Completed' : 'Expired') : (slot.is_booked ? 'Booked' : 'Available');
    const color = isExpired
      ? (slot.is_booked ? 'border-[#8896A4]/20 bg-[#8896A4]/10 text-[#40516A]' : 'border-[#D96A6A]/25 bg-[#D96A6A]/10 text-[#B94D4D]')
      : (slot.is_booked ? 'border-[#40516A]/20 bg-[#40516A]/10 text-[#40516A]' : 'border-[#5C7A6B]/25 bg-[#5C7A6B]/10 text-[#5C7A6B]');
    const badge = isExpired
      ? (slot.is_booked ? 'bg-[#8896A4]/18 text-[#40516A]' : 'bg-[#D96A6A]/15 text-[#B94D4D]')
      : (slot.is_booked ? 'bg-[#40516A]/14 text-[#40516A]' : 'bg-[#5C7A6B]/15 text-[#5C7A6B]');

    return (
      <motion.div
        key={slot.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.03 }}
        className={`rounded-[20px] border p-5 shadow-[0_12px_32px_rgba(26,31,54,0.08)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 ${color}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-70">{formatSlotDate(slot.available_date)}</p>
            <p className="mt-1 text-2xl font-black text-[#1A1F36]">{formatSlotTime(slot.time_slot)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badge}`}>
            {label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold">
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-[#8896A4]">Booking</p>
            <p className="mt-1 text-[#1A1F36]">{slot.is_booked ? 'Reserved' : 'Open'}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-[#8896A4]">Countdown</p>
            <p className="mt-1 text-[#1A1F36]">{getCountdown(slot.available_date, slot.time_slot)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-white/70 p-3 text-xs font-bold">
          <p className="text-[#8896A4]">Patient</p>
          <p className="mt-1 text-[#1A1F36]">{consultation?.patient_name || (slot.is_booked ? 'Assigned patient' : 'Not booked')}</p>
        </div>

        {!slot.is_booked && !isExpired && (
          <button onClick={() => deleteSlot(slot.id)} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#B94D4D] shadow-sm transition-colors hover:bg-[#D96A6A]/10">
            <X className="h-4 w-4" />
            Remove Slot
          </button>
        )}
      </motion.div>
    );
  };

  const handleMarkMissedByPatient = async (c: any) => {
    if (!confirm('Mark this appointment as missed by patient? This is allowed only 10 minutes after the appointment start time.')) return;
    if (!doctor) return;
    try {
      const res = await fetch('/api/doctor/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          consultationId: c.id,
          action: 'mark_missed_by_patient'
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to mark appointment missed.');
      }

      await loadConsultations(doctor.id);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB] font-sans text-[#1A1F36]">      {/* ── 15-MIN PRE-CALL ALERT BANNER ── */}
      {upcomingCallAlert && (
        <div className="fixed top-4 right-4 z-[200] max-w-sm w-full bg-[#1A1F36] text-white rounded-2xl p-5 shadow-2xl shadow-[#1A1F36]/30 border border-white/10" style={{animation:'fadeIn 0.4s ease-out both'}}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <BellRing className="w-5 h-5 animate-bounce"/>
              </div>
              <div>
                <p className="font-black text-sm">⏰ Upcoming Call in 15 mins!</p>
                <p className="text-xs text-white/80 font-semibold mt-0.5">Patient: {upcomingCallAlert.patient} @ {upcomingCallAlert.time}</p>
              </div>
            </div>
            <button onClick={() => { setUpcomingCallAlert(null); setDoctorNotifBell(false); }} className="text-white/60 hover:text-white transition-colors mt-0.5">
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE VIDEO CALL OVERLAY (Embedded Jitsi Meet) */}
      {activeCallUrl && (
        <div className="fixed inset-0 z-[100] bg-[#0D101C] flex flex-col">
          {/* Top Control Bar */}
          <div className="bg-[#1A1F36] text-white px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              <Video className="w-5 h-5 text-[#C4622D]"/>
              <span className="font-black text-base">Live Consultation — {activeCallPatient}</span>
              {callTimer && (
                <span className="bg-white/10 text-white font-mono font-black text-sm px-3 py-1 rounded-full border border-white/20">
                  ⏱ {callTimer}
                </span>
              )}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                activeCallStatus === 'calling'
                  ? 'bg-[#D89A3D]/20 text-[#F0C06A] border border-[#D89A3D]/30'
                  : 'bg-[#5C7A6B]/25 text-[#DCE8E0] border border-[#5C7A6B]/35'
              }`}>
                {activeCallStatus === 'calling' ? '📞 Waiting for patient...' : '🟢 Patient Connected'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/55 font-semibold hidden sm:block">⚠️ Do not share personal contact details</div>
              <button
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4"/> End Session
              </button>
            </div>
          </div>
          {/* Jitsi Meet Embedded Video Call */}
          <div className="flex-1 w-full bg-[#0D101C]">
            <iframe
              src={activeCallUrl}
              allow="camera; microphone; display-capture; autoplay; fullscreen"
              className="w-full h-full border-none"
              title="8Liv Consultation Call"
              ref={iframeRef}
            />
          </div>
        </div>
      )}

      {/* ── PRESCRIBE MODAL ── */}
      {prescribeCase && (
        <div className="fixed inset-0 z-50 bg-[#1A1F36]/35 flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[20px] w-full max-w-[850px] max-h-[calc(100vh-32px)] shadow-2xl shadow-[#1A1F36]/20 border border-[#1A1F36]/8 overflow-hidden flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1A1F36]/8 bg-white px-6 py-5 sm:px-8">
              <div>
                <h3 className="text-xl font-black text-[#1A1F36] flex items-center gap-2"><Pill className="w-6 h-6 text-[#C4622D]"/> Complete Consultation</h3>
                <p className="mt-1 text-xs font-semibold text-[#8896A4]">Finalize clinical notes, medication recommendation, and follow-up instructions.</p>
              </div>
              <button onClick={() => setPrescribeCase(null)} className="rounded-xl p-2 hover:bg-[#F5F0EB] transition-colors"><X className="w-6 h-6 text-[#8896A4] hover:text-[#40516A]"/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 space-y-6">
            <div className="bg-[#F5F0EB]/70 p-4 rounded-2xl mb-6 border border-[#1A1F36]/8">
              <p className="text-sm font-bold text-[#1A1F36]">Patient: {prescribeCase.patient_name}</p>
              <p className="text-xs text-[#40516A] mt-1">Date: {prescribeCase.booking_date} @ {prescribeCase.booking_time}</p>
              {prescribeCase.call_started_at && (
                <p className="text-xs text-[#C4622D] font-bold mt-1.5">
                  ⏱ Call Duration: {formatDuration(prescribeCase.call_started_at, prescribeCase.call_ended_at)}
                </p>
              )}
            </div>

            <label className={labelCls}>Clinical Notes</label>
            <textarea
              value={completionNotes}
              onChange={e => setCompletionNotes(e.target.value)}
              className={`${inputCls} mt-2 min-h-[96px]`}
              rows={3}
              placeholder="Brief consultation notes and patient discussion..."
            />

            <label className={labelCls}>Diagnosis Summary <span className="text-[#B94D4D]">*</span></label>
            <textarea
              value={diagnosisSummary}
              onChange={e => setDiagnosisSummary(e.target.value)}
              className={`${inputCls} mt-2 min-h-[96px]`}
              rows={3}
              placeholder="Summarize clinical assessment and diagnosis..."
            />

            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#1A1F36]/10"/>
              <span className="text-xs font-black text-[#8896A4] uppercase tracking-widest">Medication Recommendation</span>
              <div className="flex-1 h-px bg-[#1A1F36]/10"/>
            </div>

            <label className={labelCls}>Medication Type <span className="text-[#B94D4D]">*</span></label>
            <div className="mt-2 mb-2">
              {(['INJECTABLE'] as const).map(type => (
                <button key={type} onClick={() => setPrescriptionType(type)}
                  className={`w-full cursor-pointer border-2 rounded-2xl p-5 text-left transition-all hover:scale-[1.01] active:scale-95 ${prescriptionType === type ? 'border-[#C4622D] bg-[#C4622D]/10' : 'border-[#1A1F36]/10 hover:border-[#C4622D]/40'}`}>
                  <p className={`font-black text-base ${prescriptionType === type ? 'text-[#C4622D]' : 'text-[#1A1F36]'}`}>
                    Injectable Medication
                  </p>
                  <p className="text-xs text-[#40516A] mt-1 font-semibold">Weekly injection</p>
                </button>
              ))}
            </div>
            <p className="mb-4 text-xs font-semibold text-[#8896A4]">Medication recommendation will be reviewed and processed according to clinical protocol.</p>

            <label className={labelCls}>Medicine Name & Dosage Instructions <span className="text-[#B94D4D]">*</span></label>
            <textarea
              value={prescriptionText}
              onChange={e => setPrescriptionText(e.target.value)}
              className={`${inputCls} mt-2 min-h-[112px]`}
              rows={4}
              placeholder="e.g. Semaglutide 0.25mg - take once weekly on Wednesdays. Increase to 0.5mg after 4 weeks."
            />

            <label className={labelCls}>Follow-up Instructions <span className="text-[#B94D4D]">*</span></label>
            <textarea
              value={followUpInstruction}
              onChange={e => setFollowUpInstruction(e.target.value)}
              className={`${inputCls} mt-2 min-h-[96px]`}
              rows={3}
              placeholder="Next check-in, safety instructions, and when to seek help..."
            />

            </div>
            <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-[#1A1F36]/8 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button onClick={() => setPrescribeCase(null)} className="rounded-xl border border-[#1A1F36] bg-white px-5 py-3 text-sm font-bold text-[#1A1F36] transition-all hover:bg-[#F5F0EB]">Cancel</button>
              <button
                onClick={() => handlePrescribe(true)}
                disabled={prescribing || !diagnosisSummary.trim() || !followUpInstruction.trim()}
                className="rounded-xl border border-[#1A1F36] bg-white px-5 py-3 text-sm font-bold text-[#1A1F36] transition-all hover:bg-[#F5F0EB] disabled:opacity-50"
              >
                {prescribing ? 'Completing...' : 'Complete Consultation'}
              </button>
              <button
                onClick={() => handlePrescribe(false)}
                disabled={prescribing || !diagnosisSummary.trim() || !prescriptionText.trim() || !followUpInstruction.trim()}
                className="rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#1A1F36]/15 transition-all hover:bg-[#0D101C] disabled:opacity-60"
              >
                {prescribing ? 'Completing...' : 'Approve & Prescribe'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[20px] p-8 max-w-md w-full shadow-2xl shadow-[#1A1F36]/20 border border-[#1A1F36]/8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#1A1F36] flex items-center gap-2"><XCircle className="w-6 h-6 text-[#B94D4D]"/> Not Approved</h3>
              <button onClick={() => setRejectCase(null)}><X className="w-6 h-6 text-[#8896A4] hover:text-[#40516A]"/></button>
            </div>
            <div className="bg-[#D96A6A]/10 p-4 rounded-2xl mb-6 border border-[#D96A6A]/18">
              <p className="text-sm font-bold text-[#B94D4D]">Patient: {rejectCase.patient_name}</p>
            </div>
            <label className={labelCls}>Reason for not prescribing *</label>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              className={`${inputCls} mt-1`}
              rows={4}
              placeholder="Enter clinical reason for non-approval..."
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRejectCase(null)} className="flex-1 bg-[#F5F0EB] hover:bg-[#e6dfd7] text-[#1A1F36] font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleReject} disabled={rejecting || !rejectNote.trim()}
                className="flex-1 bg-[#B94D4D] hover:bg-[#A33F3F] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                {rejecting ? 'Saving...' : 'Submit & Close Case'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── VIEW PRESCRIPTION MODAL ── */}
      {viewingPrescription && (
        <div className="fixed inset-0 z-50 bg-[#1A1F36]/35 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[20px] w-full max-w-[650px] max-h-[calc(100vh-32px)] shadow-2xl shadow-[#1A1F36]/20 border border-[#1A1F36]/8 overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1A1F36]/8 bg-white px-6 py-5 sm:px-8">
              <div>
                <h3 className="text-xl font-black text-[#1A1F36] flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#C4622D]"/> View Prescription
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#8896A4]">Official Electronic Medical Prescription Record.</p>
              </div>
              <button
                onClick={() => setViewingPrescription(null)}
                className="rounded-xl p-2 hover:bg-[#F5F0EB] transition-colors cursor-pointer"
              >
                <X className="w-6 h-6 text-[#8896A4] hover:text-[#40516A]"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 space-y-6">
              {/* Prescriber & Patient Metadata Header */}
              <div className="bg-[#F5F0EB]/60 border border-[#1A1F36]/8 rounded-[20px] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1F36]/5 pb-3">
                  <div>
                    <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Patient Name</span>
                    <span className="text-base font-black text-[#1A1F36]">{viewingPrescription.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Status</span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full block mt-0.5 text-center ${getStatusClass(viewingPrescription.status)}`}>
                      {getStatusLabel(viewingPrescription.status)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Consultation Date</span>
                    <span className="text-xs font-bold text-[#40516A]">{viewingPrescription.booking_date} @ {viewingPrescription.booking_time}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Care Provider</span>
                    <span className="text-xs font-bold text-[#40516A]">Licensed 8Liv Clinician</span>
                  </div>
                </div>
              </div>

              {/* Diagnosis Summary */}
              <div className="space-y-2">
                <span className="text-xs text-[#8896A4] font-black uppercase tracking-wider block border-b border-[#1A1F36]/5 pb-1">Clinical Diagnosis Summary</span>
                <p className="text-sm text-[#40516A] font-semibold whitespace-pre-wrap leading-relaxed">
                  {parsePrescriptionNotes(viewingPrescription.prescription_notes).diagnosis || 'No clinical diagnosis recorded.'}
                </p>
              </div>

              {/* RX Details */}
              <div className="space-y-2">
                <span className="text-xs text-[#8896A4] font-black uppercase tracking-wider block border-b border-[#1A1F36]/5 pb-1 flex items-center gap-1 text-[#C4622D]">
                  <span className="font-serif italic font-bold text-base">℞</span> Prescription details
                </span>
                {(!viewingPrescription.prescription_type || viewingPrescription.prescription_type === 'none') ? (
                  <p className="text-sm text-[#8896A4] italic font-semibold">No medication prescribed</p>
                ) : (
                  <div className="bg-[#C4622D]/5 border border-[#C4622D]/12 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-black text-[#C4622D] uppercase tracking-wider">
                      Medication Type: {viewingPrescription.prescription_type}
                    </div>
                    <pre className="text-sm text-[#1A1F36] font-bold whitespace-pre-wrap font-sans leading-relaxed">
                      {viewingPrescription.prescription_text || 'Directions to follow'}
                    </pre>
                  </div>
                )}
              </div>

              {/* Follow-up Instructions */}
              <div className="space-y-2">
                <span className="text-xs text-[#8896A4] font-black uppercase tracking-wider block border-b border-[#1A1F36]/5 pb-1">Follow-up & Safety Guidelines</span>
                <p className="text-sm text-[#40516A] font-semibold whitespace-pre-wrap leading-relaxed">
                  {parsePrescriptionNotes(viewingPrescription.prescription_notes).followUp || 'Follow-up as per standard care guidelines.'}
                </p>
              </div>

              {/* Signature Line */}
              <div className="pt-6 border-t border-[#1A1F36]/5 flex justify-end">
                <div className="text-center">
                  <div className="w-48 border-b-2 border-[#1A1F36] h-1"></div>
                  <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block mt-1.5">Authorized Practitioner Signature</span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-[#1A1F36]/8 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                onClick={() => setViewingPrescription(null)}
                className="rounded-xl border border-[#1A1F36]/15 bg-white px-5 py-3 text-sm font-bold text-[#40516A] transition-all hover:bg-[#F5F0EB] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintPrescription(viewingPrescription)}
                className="rounded-xl border border-[#1A1F36] bg-white px-5 py-3 text-sm font-bold text-[#1A1F36] transition-all hover:bg-[#F5F0EB] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4"/> Print
              </button>
              <button
                onClick={() => handlePrintPrescription(viewingPrescription)}
                className="rounded-xl bg-[#1A1F36] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#1A1F36]/15 transition-all hover:bg-[#0D101C] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4"/> Download PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Sidebar Slide-out Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Sidebar Drawer */}
            <div className="relative z-55 w-64 h-full bg-[#1A1F36] flex flex-col shadow-2xl animate-slide-in">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-4 right-4 z-50 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#C4622D] to-[#E7A06A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C4622D]/25">
                    <Stethoscope className="w-6 h-6 text-white"/>
                  </div>
                  <div className="flex-1 col-span-1">
                    <p className="font-black text-white text-sm leading-tight">{doctorProfile?.full_name || doctor?.email?.split('@')[0] || 'Doctor'}</p>
                    <p className="text-xs text-white/55 font-semibold">Endocrinologist</p>
                  </div>
                </div>
                {/* Online Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5C7A6B]/15 rounded-full border border-[#5C7A6B]/25">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full bg-[#5C7A6B] rounded-full opacity-75 animate-ping"></span>
                    <span className="relative inline-flex w-2 h-2 bg-[#5C7A6B] rounded-full"></span>
                  </span>
                  <span className="text-xs font-medium text-[#DCE8E0]">Online</span>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => { setActiveTab(t.key); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-r-2xl text-sm transition-all ${activeTab === t.key
                      ? 'bg-[#F5F0EB] text-[#C4622D] font-bold border-l-4 border-[#C4622D] shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    {t.icon} {t.label}
                    {t.key === 'consultations' && pendingCases > 0 && (
                      <span className="ml-auto bg-[#D89A3D] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingCases}</span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Wallet quick view */}
              <div className="p-4 border-t border-white/10">
                {wallet.balance > 0 ? (
                  <div className="bg-[#F5F0EB] rounded-2xl p-4 text-[#1A1F36] shadow-lg shadow-black/10 border border-white/10">
                    <p className="text-xs text-[#40516A] font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
                    <p className="text-2xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
                  </div>
                ) : (
                  <div className="bg-[#F5F0EB] rounded-2xl p-4 text-[#1A1F36] shadow-lg shadow-black/10 border border-white/10">
                    <p className="text-xs text-[#40516A] font-bold uppercase tracking-wider mb-1">Wallet Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-[#1A1F36] flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white/50" />
                      </div>
                      <p className="text-xs font-medium text-white/60">Complete a consult to earn</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout */}
              <div className="p-4 pt-0">
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/55 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-[#D96A6A]/20">
                  <LogOut className="w-5 h-5"/> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex w-64 bg-[#1A1F36] text-white flex flex-col shadow-2xl shadow-[#1A1F36]/20 flex-shrink-0">
          {/* Doctor info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#C4622D] to-[#E7A06A] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C4622D]/25">
                <Stethoscope className="w-6 h-6 text-white"/>
              </div>
              <div className="flex-1">
                <p className="font-black text-white text-sm leading-tight">{doctorProfile?.full_name || doctor?.email?.split('@')[0] || 'Doctor'}</p>
                <p className="text-xs text-white/55 font-semibold">Endocrinologist</p>
              </div>
              {/* Notification Bell */}
              <button
                onClick={() => { setUpcomingCallAlert(null); setDoctorNotifBell(false); }}
                className="relative p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                title="Notifications"
              >
                {doctorNotifBell
                  ? <BellRing className="w-5 h-5 text-[#C4622D] animate-bounce"/>
                  : <Bell className="w-5 h-5 text-white/55"/>}
                {doctorNotifBell && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#D96A6A] rounded-full border-2 border-[#1A1F36]"/>
                )}
              </button>
            </div>
            {/* Online Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5C7A6B]/15 rounded-full border border-[#5C7A6B]/25">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full bg-[#5C7A6B] rounded-full opacity-75 animate-ping"></span>
                <span className="relative inline-flex w-2 h-2 bg-[#5C7A6B] rounded-full"></span>
              </span>
              <span className="text-xs font-medium text-[#DCE8E0]">Online</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-r-2xl text-sm transition-all ${activeTab === t.key
                  ? 'bg-[#F5F0EB] text-[#C4622D] font-bold border-l-4 border-[#C4622D] shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                {t.icon} {t.label}
                {t.key === 'consultations' && pendingCases > 0 && (
                  <span className="ml-auto bg-[#D89A3D] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingCases}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Wallet quick view */}
          <div className="p-4 border-t border-white/10">
            {/* FIX: Bug 4 — Hide ₹0 wallet balance and show a placeholder instead */}
            {wallet.balance > 0 ? (
              <div className="bg-[#F5F0EB] rounded-2xl p-4 text-[#1A1F36] shadow-lg shadow-black/10 border border-white/10">
                <p className="text-xs text-[#40516A] font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
                <p className="text-2xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
                <button onClick={() => setActiveTab('wallet')}
                  className="mt-3 w-full bg-[#1A1F36] hover:bg-[#0D101C] text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1">
                  <ArrowDownToLine className="w-3.5 h-3.5"/> Withdraw
                </button>
              </div>
            ) : (
              <div className="bg-white/8 rounded-2xl p-4 text-center border border-dashed border-white/20">
                <p className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-2">Wallet</p>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <Wallet className="w-4 h-4 text-white/50" />
                </div>
                <p className="text-xs font-medium text-white/60">Complete a consult to earn</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="p-4 pt-0">
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-white/55 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-[#D96A6A]/20">
              <LogOut className="w-5 h-5"/> Sign Out
            </button>
          </div>
        </motion.aside>

        {/* ── MAIN CONTENT ── */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 overflow-y-auto bg-[#F5F0EB] p-4 sm:p-8">

          {/* Mobile Header Bar */}
          <div className="lg:hidden flex items-center justify-between bg-[#1A1F36] text-white px-5 py-4 border-b border-white/10 shadow-md mb-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <span className="font-black text-base tracking-tight font-sora">8liv Doctor</span>
            </div>
            <span className="text-xs font-bold bg-[#C4622D]/20 border border-[#C4622D]/40 text-[#D8E6DE] px-3 py-1 rounded-full capitalize">
              {activeTab}
            </span>
          </div>

          {/* ── TAB: OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="space-y-8">
              <div className="border-b border-[#1A1F36]/8 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1F36]">Dashboard</h1>
                  <p className="text-sm text-[#8896A4] mt-0.5">Overview of your practice and upcoming appointments. Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctorProfile?.full_name?.split(' ')[0] || 'Doctor'} 👋</p>
                </div>
                <div className="flex gap-3"></div>
              </div>

              {/* FIX: Bug 3 — Doctor Overview stats dynamically computed from consultations array */}
              {/* Quick stats */}
              <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 sm:gap-6">
                {[
                  { label: 'Assigned Cases', value: consultations.length, icon: <Users className="w-6 h-6"/> },
                  { label: "Today's Consults", value: todayCases, icon: <Calendar className="w-6 h-6"/> },
                  { label: 'Pending', value: pendingCases, icon: <Clock className="w-6 h-6"/> },
                  { label: 'Completed', value: completedCases, icon: <CheckCircle2 className="w-6 h-6"/> },
                  { label: 'Missed', value: missedCases, icon: <AlertCircle className="w-6 h-6"/> },
                  { label: 'Cancelled', value: cancelledCases, icon: <XCircle className="w-6 h-6"/> },
                ].map((s, idx) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-4 sm:p-6 border border-[#1A1F36]/8 rounded-[20px] shadow-[0_12px_32px_rgba(26,31,54,0.08)] flex items-center gap-2 sm:gap-4 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(26,31,54,0.12)] transition-all duration-300"
                  >
                    <div className="bg-[#C4622D]/10 text-[#C4622D] p-4 rounded-2xl">{s.icon}</div>
                    <div>
                      <p className="text-xs font-medium text-[#8896A4] uppercase tracking-wider">{s.label}</p>
                      <p className="text-3xl font-bold text-[#1A1F36] mt-1">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Cases table: Today / Week / Month */}
              <div className="bg-white rounded-[20px] p-4 sm:p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8">
                <h3 className="text-lg font-black text-[#1A1F36] mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#C4622D]"/> Cases Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1A1F36]/8">
                        {['Period', 'Cases Seen', 'Approved', 'Not Approved', 'Attended Calls'].map(h => (
                          <th key={h} className="text-xs font-black text-[#8896A4] uppercase tracking-wider py-3 px-4 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { period: 'Today', cases: todayCases, app: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && c.status === 'approved').length, rej: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && c.status === 'rejected').length, att: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && ['attended','approved','rejected'].includes(c.status)).length },
                        { period: 'This Week', cases: weekCases, app: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && c.status === 'approved').length, rej: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && c.status === 'rejected').length, att: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && ['attended','approved','rejected'].includes(c.status)).length },
                        { period: 'This Month', cases: monthCases, app: approvedCases, rej: rejectedCases, att: attendedCalls },
                      ].map(row => (
                        <tr key={row.period} className="border-b border-[#1A1F36]/5 hover:bg-[#F5F0EB]/45 transition-colors duration-200">
                          <td className="py-4 px-4 font-bold text-[#1A1F36]">{row.period}</td>
                          <td className="py-4 px-4"><span className="bg-[#1A1F36]/10 text-[#1A1F36] font-black text-sm px-3 py-1 rounded-full">{row.cases}</span></td>
                          <td className="py-4 px-4"><span className="bg-[#5C7A6B]/12 text-[#5C7A6B] font-black text-sm px-3 py-1 rounded-full">{row.app}</span></td>
                          <td className="py-4 px-4"><span className="bg-[#D96A6A]/12 text-[#B94D4D] font-black text-sm px-3 py-1 rounded-full">{row.rej}</span></td>
                          <td className="py-4 px-4"><span className="bg-[#8896A4]/14 text-[#40516A] font-black text-sm px-3 py-1 rounded-full">{row.att}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Video call attendance table */}
              <div className="bg-white rounded-[20px] p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8">
                <h3 className="text-lg font-black text-[#1A1F36] mb-6 flex items-center gap-2"><Video className="w-5 h-5 text-[#C4622D]"/> Video Call Attendance</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#5C7A6B]/10 border border-[#5C7A6B]/20 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-[#5C7A6B]">{attendedCalls}</p>
                    <p className="text-sm font-bold text-[#5C7A6B] mt-2">Attended Calls</p>
                  </div>
                  <div className="bg-[#D89A3D]/10 border border-[#D89A3D]/20 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-[#B7792F]">{notAttendedCalls}</p>
                    <p className="text-sm font-bold text-[#B7792F] mt-2">Pending / Not Attended</p>
                  </div>
                </div>
              </div>

              {/* ── AVAILABLE PATIENTS REQUESTS (CLAIM SYSTEM) ── */}
              <div className="bg-white rounded-[20px] p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-[#1A1F36] flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#C4622D]"/> Available Patient Requests (Escrow Pool)
                  </h3>
                  <span className="bg-[#1A1F36]/10 text-[#1A1F36] font-black text-xs px-3 py-1 rounded-full animate-pulse">
                    {availableRequests.filter((r) => !r.doctor_id).length} Awaiting Review
                  </span>
                </div>
                {availableRequests.length === 0 ? (
                  <div className="text-center py-10 text-[#8896A4]">
                    <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-20"/>
                    <p className="text-sm font-semibold">No new patient requests at the moment</p>
                    <p className="text-xs text-[#8896A4] mt-1">New requests will appear here when patients pay and choose dates.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableRequests.map((req) => {
                      const isClaimedByOther = req.doctor_id !== null && req.doctor_id !== doctor?.id;

                      const newReqTime = getParsedTime(req.booking_date, req.booking_time);
                      const hasConflict = !isClaimedByOther && newReqTime !== null && consultations.some(c => {
                        if (c.status !== 'scheduled') return false;
                        const cTime = getParsedTime(c.booking_date, c.booking_time);
                        return cTime !== null && Math.abs(newReqTime - cTime) < 2 * 60 * 60 * 1000;
                      });

                      const isLocked = isClaimedByOther || hasConflict;

                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`border p-5 rounded-2xl flex flex-col justify-between gap-4 transition-transform duration-300 ${
                            isLocked
                              ? 'border-[#8896A4]/30 bg-[#8896A4]/10 opacity-70 grayscale'
                              : 'border-[#1A1F36]/8 hover:border-[#C4622D]/50 bg-white hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(26,31,54,0.10)] shadow-sm'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black text-[#8896A4] uppercase tracking-wider">
                              Patient display ID
                              {isClaimedByOther && <span className="text-[#B94D4D] font-bold"> (booked)</span>}
                              {hasConflict && <span className="text-[#B7792F] font-bold"> (time conflict)</span>}
                            </p>
                            <h4 className={`font-black text-base mt-0.5 ${isLocked ? 'text-[#8896A4] line-through' : 'text-[#1A1F36]'}`}>
                              {req.patient_name || 'Anonymous Patient'}
                              {isClaimedByOther && <span className="text-sm font-bold text-[#8896A4] normal-case"> (booked)</span>}
                              {hasConflict && <span className="text-sm font-bold text-[#B7792F] normal-case"> (time conflict)</span>}
                            </h4>
                            <p className="text-xs font-bold text-[#40516A] mt-2 flex items-center gap-1">
                              <span>📅</span> {req.booking_date} at {req.booking_time}
                            </p>
                            <p className={`text-[10px] px-2 py-0.5 rounded-md w-fit font-bold mt-2 border ${
                              isLocked
                                ? 'text-[#40516A] bg-[#8896A4]/15 border-[#8896A4]/20'
                                : 'text-[#C4622D] bg-[#C4622D]/10 border-[#C4622D]/15'
                            }`}>
                              💰 Escrow Paid: ₹499
                            </p>
                          </div>
                           {isClaimedByOther ? (
                            <div className="bg-[#8896A4]/15 border border-[#8896A4]/25 text-[#40516A] font-bold py-2.5 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2">
                              ⚡ Sorry, try to be quicker next time!
                            </div>
                          ) : hasConflict ? (
                            <div className="bg-[#D89A3D]/12 border border-[#D89A3D]/25 text-[#B7792F] font-bold py-2.5 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2">
                              ⚠️ Gap Conflict: Requires 2h gap with your bookings
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClaimRequest(req)}
                              className="w-full bg-[#1A1F36] hover:bg-[#0D101C] text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 shadow-sm active:scale-95 hover:shadow-lg hover:shadow-[#1A1F36]/20"
                            >
                              <Check className="w-4 h-4"/> Accept & Pair Patient
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB: SCHEDULE ── */}
          {activeTab === 'schedule' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="border-b border-[#1A1F36]/8 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1F36]">Availability Schedule</h1>
                  <p className="text-sm text-[#8896A4] mt-0.5">Manage your video consultation slots.</p>
                </div>
              </div>

              <ProviderAvailabilityScheduler
                providerLabel="doctor"
                onGenerate={generateAvailability}
                isSaving={generatingAvailability}
              />

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.08)] backdrop-blur-xl md:p-8">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#1A1F36]">Upcoming Availability</h3>
                    <p className="text-sm font-semibold text-[#8896A4]">Future generated slots are used for automatic patient assignment.</p>
                  </div>
                  <span className="rounded-full bg-[#5C7A6B]/12 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#5C7A6B]">{upcomingAvailSlots.length} Slots</span>
                </div>
                {upcomingAvailSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#1A1F36]/12 bg-[#F5F0EB]/60 py-12 text-center">
                    <Calendar className="mb-4 h-12 w-12 text-[#8896A4]" />
                    <h3 className="mb-1 text-base font-black text-[#40516A]">No upcoming slots</h3>
                    <p className="mx-auto max-w-sm text-sm font-semibold text-[#8896A4]">Configure working hours above and generate availability for future dates.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {upcomingAvailSlots.map((slot, idx) => renderSlotCard(slot, idx, 'upcoming'))}
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-[#1A1F36]/8 bg-white p-6 shadow-[0_12px_32px_rgba(26,31,54,0.08)] backdrop-blur-xl md:p-8">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#1A1F36]">Expired & Completed Slots</h3>
                    <p className="text-sm font-semibold text-[#8896A4]">Past availability is separated automatically from upcoming slots.</p>
                  </div>
                  <span className="rounded-full bg-[#D96A6A]/12 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#B94D4D]">{expiredAvailSlots.length} Past</span>
                </div>
                {expiredAvailSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#1A1F36]/12 bg-[#F5F0EB]/60 py-10 text-center">
                    <Clock className="mb-3 h-10 w-10 text-[#8896A4]" />
                    <h3 className="mb-1 text-base font-black text-[#40516A]">No expired slots</h3>
                    <p className="mx-auto max-w-sm text-sm font-semibold text-[#8896A4]">Past generated availability will move here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {expiredAvailSlots.map((slot, idx) => renderSlotCard(slot, idx, 'expired'))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {/* ── TAB: CONSULTATIONS ── */}
          {activeTab === 'consultations' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b border-[#1A1F36]/8 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1F36]">Consultations</h1>
                  <p className="text-sm text-[#8896A4] mt-0.5">Review your patient cases and approvals.</p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-[20px] border border-[#1A1F36]/8 shadow-sm">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search patients by name, email, phone..."
                    value={consultationsSearch}
                    onChange={(e) => {
                      setConsultationsSearch(e.target.value);
                      setConsultationsPage(1);
                    }}
                    className={inputCls}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={consultationsStatusFilter}
                    onChange={(e) => {
                      setConsultationsStatusFilter(e.target.value);
                      setConsultationsPage(1);
                    }}
                    className={inputCls}
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="attended">Attended</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Not Approved</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="missed_by_patient">Missed by Patient</option>
                  </select>
                </div>
              </div>

              {/* Appointed cases notification banner */}
              {pendingCases > 0 && (
                <div className="bg-[#D89A3D]/10 border border-[#D89A3D]/22 rounded-2xl p-5 flex items-center gap-4">
                  <div className="bg-[#D89A3D]/15 text-[#B7792F] p-3 rounded-xl"><AlertCircle className="w-6 h-6"/></div>
                  <div>
                    <p className="font-black text-[#1A1F36]">{pendingCases} case{pendingCases > 1 ? 's' : ''} awaiting your review</p>
                    <p className="text-sm text-[#B7792F] font-semibold mt-0.5">These members have completed their video call and need a prescription decision.</p>
                  </div>
                </div>
              )}

              {consultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <Users className="w-12 h-12 text-[#8896A4] mb-4" />
                  <h3 className="text-base font-semibold text-[#40516A] mb-1">No consultations yet</h3>
                  <p className="text-sm text-[#8896A4] max-w-xs mx-auto">Members will appear here once they book a video call.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((c, idx) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      scheduled: { label: 'Scheduled', color: 'bg-[#40516A]/12 text-[#40516A]' },
                      attended: { label: 'Attended — Pending Review', color: 'bg-[#D89A3D]/12 text-[#B7792F]' },
                      approved: { label: 'Approved', color: 'bg-[#5C7A6B]/12 text-[#5C7A6B]' },
                      rejected: { label: 'Not Approved', color: 'bg-[#D96A6A]/12 text-[#B94D4D]' },
                      not_attended: { label: 'Not Attended', color: 'bg-[#8896A4]/15 text-[#40516A]' },
                      cancelled: { label: 'Cancelled', color: 'bg-[#8896A4]/15 text-[#40516A]' },
                      cancelled_by_doctor: { label: 'Cancelled by Doctor', color: 'bg-[#8896A4]/15 text-[#40516A]' },
                      cancelled_by_patient: { label: 'Cancelled by Patient', color: 'bg-[#8896A4]/15 text-[#40516A]' },
                      missed_by_patient: { label: 'Missed by Patient', color: 'bg-[#D89A3D]/12 text-[#B7792F]' },
                    };
                    const st = statusMap[c.status] || { label: c.status, color: 'bg-[#8896A4]/15 text-[#40516A]' };
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-[20px] p-6 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-[0_18px_40px_rgba(26,31,54,0.12)]"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <p
                                onClick={() => setPrescribeCase(c)}
                                className="font-black text-[#1A1F36] text-lg cursor-pointer hover:text-[#C4622D] transition-colors flex items-center gap-1.5"
                                title="Click to view/write prescription"
                              >
                                {c.patient_name || 'Member'}
                              </p>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${st.color}`}>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm text-[#40516A] font-semibold flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {c.booking_date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {c.booking_time}</span>
                              {c.patient_age ? <span>Age: {c.patient_age}</span> : null}
                              {c.prescription_type && <span className="flex items-center gap-1"><Pill className="w-4 h-4 text-[#C4622D]"/> {c.prescription_type}</span>}
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: 'BMI', value: safeDisplayValue(c.patient_bmi) },
                                { label: 'Current Weight', value: c.patient_weight ? `${c.patient_weight} kg` : 'N/A' },
                                { label: 'Goal Weight', value: c.patient_goal_weight ? `${c.patient_goal_weight} kg` : 'N/A' },
                                { label: 'Eligibility', value: safeDisplayValue(c.patient_eligibility_status) },
                              ].map(item => (
                                <div key={item.label} className="rounded-2xl bg-[#F5F0EB]/60 border border-[#1A1F36]/8 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">{item.label}</p>
                                  <p className="mt-1 text-sm font-black text-[#1A1F36]">{safeDisplayValue(item.value)}</p>
                                </div>
                              ))}
                            </div>
                            {(c.patient_history || c.patient_extra_info || c.patient_medical_risk_flags || c.patient_medication_proof_url) && (
                              <div className="mt-4 rounded-2xl bg-white border border-[#1A1F36]/8 p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8896A4]">Patient Case Review</p>
                                {c.patient_history && <p className="text-xs font-semibold text-[#40516A]"><span className="font-black text-[#1A1F36]">Assessment:</span> {safeDisplayValue(c.patient_history)}</p>}
                                {c.patient_extra_info && <p className="text-xs font-semibold text-[#40516A]"><span className="font-black text-[#1A1F36]">Additional info:</span> {safeDisplayValue(c.patient_extra_info)}</p>}
                                {c.patient_medical_risk_flags && <p className="text-xs font-semibold text-[#B7792F]"><span className="font-black">Risk flags:</span> {safeDisplayValue(c.patient_medical_risk_flags)}</p>}
                                {c.patient_medication_proof_url && (
                                  <a href={c.patient_medication_proof_url} target="_blank" rel="noreferrer" className="inline-flex text-xs font-black text-[#C4622D] hover:text-[#A8522A]">
                                    View uploaded medication proof
                                  </a>
                                )}
                              </div>
                            )}
                            {c.prescription_notes && (
                              <div className="mt-3 bg-[#D96A6A]/10 border border-[#D96A6A]/18 rounded-xl p-3">
                                <p className="text-xs font-bold text-[#B94D4D]">Clinical Notes: {c.prescription_notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Join call */}
                            {(c.meeting_url || c.room_url) && ['scheduled', 'calling', 'attended'].includes(c.status) && (() => {
                              const active = isCallTimeNow(c.booking_date, c.booking_time);
                              return (
                                <button onClick={() => joinCall(c)}
                                  className={`font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md ${active ? 'bg-[#1A1F36] hover:bg-[#0D101C] text-white animate-pulse' : 'bg-[#F5F0EB] hover:bg-[#E9DED4] text-[#40516A]'}`}>
                                  <Video className="w-4 h-4"/> Join Call
                                </button>
                              );
                            })()}
                            {/* Prescribe */}
                            {c.status === 'attended' && (
                              <button onClick={() => setPrescribeCase(c)}
                                className="bg-[#5C7A6B] hover:bg-[#4A6658] text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md">
                                <BadgeCheck className="w-4 h-4"/> Mark Completed
                              </button>
                            )}
                            {/* Reject */}
                            {c.status === 'attended' && (
                              <button onClick={() => setRejectCase(c)}
                                className="bg-[#D96A6A]/12 hover:bg-[#D96A6A]/20 text-[#B94D4D] font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all">
                                <XCircle className="w-4 h-4"/> Complete Not Approved
                              </button>
                            )}
                            {/* Cancel */}
                            {c.status === 'scheduled' && (
                              <button onClick={() => handleCancelAppointment(c)}
                                className="bg-[#D96A6A]/10 hover:bg-[#D96A6A]/18 text-[#B94D4D] font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm">
                                <XCircle className="w-4 h-4"/> Cancel Call
                              </button>
                            )}
                            {c.status === 'scheduled' && (
                              <button onClick={() => handleMarkMissedByPatient(c)}
                                className="bg-[#D89A3D]/10 hover:bg-[#D89A3D]/18 text-[#B7792F] font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm">
                                <XCircle className="w-4 h-4"/> Patient No Show
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {consultationsTotalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[20px] border border-[#1A1F36]/8 shadow-sm mt-6">
                  <button
                    disabled={consultationsPage === 1}
                    onClick={() => setConsultationsPage((prev) => Math.max(prev - 1, 1))}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-[#1A1F36]/15 hover:bg-[#F5F0EB] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-[#40516A]">
                    Page {consultationsPage} of {consultationsTotalPages}
                  </span>
                  <button
                    disabled={consultationsPage === consultationsTotalPages}
                    onClick={() => setConsultationsPage((prev) => Math.min(prev + 1, consultationsTotalPages))}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-[#1A1F36]/15 hover:bg-[#F5F0EB] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: PRESCRIPTIONS (E-Prescription Portal) ── */}
          {activeTab === 'prescriptions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b border-[#1A1F36]/8 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1F36]">E-Prescription Portal</h1>
                  <p className="text-sm text-[#8896A4] mt-0.5">All clinical prescriptions — visible to both doctor and patient.</p>
                </div>
              </div>

              {consultations.filter(c => ['approved', 'draft', 'updated', 'archived'].includes(c.status.toLowerCase())).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <FileText className="w-12 h-12 text-[#8896A4] mb-4" />
                  <h3 className="text-base font-semibold text-[#40516A] mb-1">No prescriptions</h3>
                  <p className="text-sm text-[#8896A4] max-w-xs mx-auto">When you approve a case, its prescription will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.filter(c => ['approved', 'draft', 'updated', 'archived'].includes(c.status.toLowerCase())).map((c, idx) => {
                    const parsed = parsePrescriptionNotes(c.prescription_notes);
                    const isNone = !c.prescription_type || c.prescription_type === 'none';
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-[20px] p-6 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8 hover:shadow-[0_18px_40px_rgba(26,31,54,0.12)] hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <div className="flex flex-col space-y-4">
                          {/* Top Row: Patient Info & Actions */}
                          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#1A1F36]/5 pb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <div className="bg-[#C4622D]/10 text-[#C4622D] p-2 rounded-xl"><Pill className="w-5 h-5"/></div>
                                <p className="font-black text-[#1A1F36] text-lg">{c.patient_name}</p>
                                <span className={`text-xs font-black px-3 py-1 rounded-full ${getStatusClass(c.status)}`}>
                                  {getStatusLabel(c.status)}
                                </span>
                              </div>
                              <p className="text-xs text-[#8896A4] font-semibold ml-11">
                                Consultation Date/Time: {c.booking_date} @ {c.booking_time}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewingPrescription(c)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#C4622D]/10 text-[#C4622D] hover:bg-[#C4622D]/20 transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Prescription
                              </button>
                              <button
                                onClick={() => handlePrintPrescription(c)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#5C7A6B]/10 text-[#5C7A6B] hover:bg-[#5C7A6B]/20 transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" /> Download PDF
                              </button>
                              <button
                                onClick={() => handlePrintPrescription(c)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#1A1F36]/10 text-[#1A1F36] hover:bg-[#1A1F36]/20 transition-all cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ml-11">
                            <div>
                              <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Medication Type</span>
                              <div className="mt-1 flex items-center gap-1.5">
                                {isNone ? (
                                  <span className="text-sm font-semibold text-[#8896A4] italic">No medication prescribed</span>
                                ) : (
                                  <span className="text-sm font-bold text-[#1A1F36] flex items-center gap-1">
                                    💊 {c.prescription_type} Medication
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Diagnosis Summary</span>
                              <p className="text-sm text-[#40516A] font-semibold mt-1 line-clamp-2">
                                {parsed.diagnosis || 'No diagnosis recorded.'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8896A4] font-black uppercase tracking-wider block">Follow-up Instructions</span>
                              <p className="text-sm text-[#40516A] font-semibold mt-1 line-clamp-2">
                                {parsed.followUp || 'No follow-up instruction recorded.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: WALLET ── */}
          {activeTab === 'wallet' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="border-b border-[#1A1F36]/8 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A1F36]">8liv Doctor Wallet</h1>
                  <p className="text-sm text-[#8896A4] mt-0.5">Manage your earnings and withdrawals.</p>
                </div>
              </div>

              {/* Wallet cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1A1F36] p-8 rounded-[20px] text-white shadow-2xl shadow-[#1A1F36]/20">
                  <p className="text-xs text-white/55 font-black uppercase tracking-widest mb-3">Available Balance</p>
                  <p className="text-5xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-white/50 mt-2 font-semibold">Ready to withdraw</p>
                </div>
                <div className="bg-[#5C7A6B]/10 border border-[#5C7A6B]/20 p-8 rounded-[20px] text-center shadow-[0_12px_32px_rgba(26,31,54,0.06)]">
                  <p className="text-xs text-[#5C7A6B] font-black uppercase tracking-widest mb-3">Total Earned</p>
                  <p className="text-4xl font-black text-[#5C7A6B]">₹{wallet.total_earned.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-[#5C7A6B]/75 mt-2 font-semibold">From {approvedCases} consultations</p>
                </div>
                <div className="bg-[#40516A]/10 border border-[#40516A]/18 p-8 rounded-[20px] text-center shadow-[0_12px_32px_rgba(26,31,54,0.06)]">
                  <p className="text-xs text-[#40516A] font-black uppercase tracking-widest mb-3">Total Withdrawn</p>
                  <p className="text-4xl font-black text-[#40516A]">₹{wallet.total_withdrawn.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-[#40516A]/75 mt-2 font-semibold">To bank account</p>
                </div>
              </div>

              {/* Withdraw */}
              <div className="bg-white rounded-[20px] p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8">
                <h3 className="text-lg font-black text-[#1A1F36] mb-2 flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-[#C4622D]"/> Withdraw to Bank Account</h3>
                <p className="text-sm text-[#8896A4] font-semibold mb-6">Funds transfer directly to your registered bank account within 2 business days.</p>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className={labelCls}>Amount (₹)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className={inputCls}
                      placeholder={`Max ₹${wallet.balance}`}
                      max={wallet.balance}
                      min={1}
                    />
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > wallet.balance}
                    className="bg-[#1A1F36] hover:bg-[#0D101C] disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-[#1A1F36]/20"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw Now'}
                  </button>
                </div>
                {wallet.balance === 0 && (
                  <p className="text-sm text-[#B7792F] font-bold mt-3 bg-[#D89A3D]/10 p-3 rounded-xl border border-[#D89A3D]/22">No balance available. Complete consultations to earn.</p>
                )}
              </div>

              {/* Transaction history */}
              <div className="bg-white rounded-[20px] p-8 shadow-[0_12px_32px_rgba(26,31,54,0.08)] border border-[#1A1F36]/8">
                <h3 className="text-lg font-black text-[#1A1F36] mb-6">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <Wallet className="w-12 h-12 text-[#8896A4] mb-4" />
                    <h3 className="text-base font-semibold text-[#40516A] mb-1">No transactions found</h3>
                    <p className="text-sm text-[#8896A4] max-w-xs mx-auto">Your withdrawals will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx, idx) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-2xl border border-[#1A1F36]/8 hover:bg-[#F5F0EB]/45 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#40516A]/12 text-[#40516A]'}`}>
                            {tx.type === 'credit' ? <TrendingUp className="w-5 h-5"/> : <ArrowDownToLine className="w-5 h-5"/>}
                          </div>
                          <div>
                            <p className="font-bold text-[#1A1F36] text-sm">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-[#8896A4] font-semibold">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              {tx.type === 'withdrawal' && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${tx.status === 'completed' || tx.status === 'approved' || tx.status === 'paid' ? 'bg-[#5C7A6B]/12 text-[#5C7A6B]' : 'bg-[#D89A3D]/12 text-[#B7792F]'}`}>
                                  {tx.status === 'completed' || tx.status === 'approved' || tx.status === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`font-black text-base ${tx.type === 'credit' ? 'text-[#5C7A6B]' : 'text-[#40516A]'}`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Floating Rejoin Widget */}
          {!activeCallUrl && activeRejoinableConsultation && (
            <div className="fixed bottom-6 right-6 z-[9999] animate-bounce">
              <button
                onClick={() => {
                  joinCall(activeRejoinableConsultation);
                }}
                className="bg-[#B94D4D] hover:bg-[#A33F3F] text-white font-black py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 transition-all scale-100 hover:scale-105 active:scale-95 border border-[#D96A6A] animate-pulse"
              >
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D96A6A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <Video className="w-5 h-5"/> Rejoin Call with {activeRejoinableConsultation.patient_name || 'Member'}
              </button>
            </div>
          )}

          {/* ── CALL TIMING WARNING MODAL ── */}
          {warningMessage && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[20px] p-8 max-w-md w-full shadow-2xl border border-[#D89A3D]/25">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-[#B7792F] flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-[#D89A3D] animate-bounce"/> Advance Joining Restrained
                  </h3>
                  <button onClick={() => setWarningMessage(null)}><X className="w-6 h-6 text-[#8896A4] hover:text-[#40516A]"/></button>
                </div>

                <div className="bg-[#D89A3D]/10 p-5 rounded-2xl mb-6 border border-[#D89A3D]/18">
                  <p className="text-sm font-semibold text-[#B7792F] leading-relaxed whitespace-pre-wrap">
                    {warningMessage}
                  </p>
                </div>

                <button onClick={() => setWarningMessage(null)}
                  className="w-full bg-[#1A1F36] hover:bg-[#0D101C] text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  Okay, I&apos;ll return later
                </button>
              </motion.div>
            </div>
          )}
          {/* Messages Tab */}
          {activeTab === 'messages' && doctor && (
            <div className="h-full flex flex-col">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-black text-[#1A1F36]">Patient Messages</h2>
                <p className="text-sm text-[#8896A4] mt-0.5">Communicate securely with your assigned patients.</p>
              </div>
              <div className="flex-1 px-6 pb-6 overflow-hidden" style={{ minHeight: 0 }}>
                <StaffChat
                  staffId={doctor.id}
                  staffName={doctorProfile?.full_name || 'Doctor'}
                  patients={patients}
                  accentColor="#C4622D"
                />
              </div>
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex overflow-hidden h-full"
            >
              {/* Patient List Sidebar */}
              <div className="w-80 bg-white border-r border-[#1A1F36]/8 overflow-y-auto p-6 space-y-4 custom-scrollbar shrink-0">
                <div className="px-2 mb-4">
                  <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3">Assigned Patients</h3>
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={patientsSearch}
                    onChange={(e) => {
                      setPatientsSearch(e.target.value);
                      setPatientsPage(1);
                    }}
                    className={`${inputCls} text-xs p-2.5 rounded-xl`}
                  />
                </div>
                {patients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <Users className="w-12 h-12 text-[#8896A4] mb-4" />
                    <h3 className="text-base font-semibold text-[#40516A] mb-1">No patients</h3>
                    <p className="text-sm text-[#8896A4] max-w-xs mx-auto">No patients assigned yet.</p>
                  </div>
                ) : (
                  patients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${selectedPatient?.id === p.id ? 'border-[#C4622D] bg-[#F5F0EB]/70 shadow-sm scale-[1.01]' : 'border-transparent bg-[#F5F0EB]/35 hover:bg-[#F5F0EB]/65 hover:border-[#C4622D]/30'}`}
                    >
                      <h4 className="font-black text-[#1A1F36] text-sm leading-tight mb-1">{patientName(p)}</h4>
                      <div className="flex justify-between items-start gap-3 text-[10px] text-[#8896A4] font-bold">
                        <span>Goal: {p.goal_weight_kg || '—'} kg</span>
                        <p className={`text-[10px] font-black mt-1 ${(p.status_color || '').replace('bg-', 'text-').split(' ')[0]}`}>
                          {p.status_label}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Pagination Controls */}
                {patientsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-[#1A1F36]/8">
                    <button
                      disabled={patientsPage === 1}
                      onClick={() => setPatientsPage((prev) => Math.max(prev - 1, 1))}
                      className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#1A1F36]/15 hover:bg-[#F5F0EB] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="text-[10px] font-bold text-[#40516A]">
                      Page {patientsPage} / {patientsTotalPages}
                    </span>
                    <button
                      disabled={patientsPage === patientsTotalPages}
                      onClick={() => setPatientsPage((prev) => Math.min(prev + 1, patientsTotalPages))}
                      className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#1A1F36]/15 hover:bg-[#F5F0EB] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Patient Details Pane */}
              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                {selectedPatient ? (
                  <div className="max-w-6xl space-y-8">

                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-black text-[#1A1F36] tracking-tight">{patientName(selectedPatient)}</h2>
                        <p className="text-xs font-bold text-[#8896A4] mt-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-[#C4622D]"/> Endocrinology case file
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setActiveTab('messages');
                          }}
                          className="bg-[#1A1F36] hover:bg-[#0D101C] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Message Patient
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${statusTone(selectedPatient.eligibility_status)}`}>
                        Eligibility: {safeDisplayValue(selectedPatient.eligibility_status)}
                      </span>
                      <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${statusTone(selectedPatient.latest_consultation_status)}`}>
                        Latest consultation: {consultationLabel(selectedPatient.latest_consultation_status)}
                      </span>
                      <span className="rounded-full border border-[#1A1F36]/8 bg-white px-4 py-2 text-xs font-black text-[#40516A]">
                        Next appointment: {selectedPatient.next_appointment ? formatClinicalDate(selectedPatient.next_appointment.booking_date, selectedPatient.next_appointment.booking_time) : 'Not scheduled'}
                      </span>
                    </div>

                    {/* Telemetry metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.06)] hover:shadow-[0_18px_40px_rgba(26,31,54,0.10)] transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Height</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.06)] hover:shadow-[0_18px_40px_rgba(26,31,54,0.10)] transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Current Weight</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.06)] hover:shadow-[0_18px_40px_rgba(26,31,54,0.10)] transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Target Weight</p>
                        <p className="text-xl font-black text-[#C4622D] mt-1">{selectedPatient.goal_weight_kg ? `${selectedPatient.goal_weight_kg} kg` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.06)] hover:shadow-[0_18px_40px_rgba(26,31,54,0.10)] transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">BMI</p>
                        <p className="text-xl font-black text-[#5C7A6B] mt-1">
                          {selectedPatient.weight_kg && selectedPatient.height_cm
                            ? (selectedPatient.weight_kg / Math.pow(selectedPatient.height_cm / 100, 2)).toFixed(1)
                            : '—'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <ClinicalCard title="Assessment Summary" icon={<FileText className="w-4 h-4 text-[#C4622D]" />}>
                        <ClinicalText value={selectedPatient.assessment_summary || selectedPatient.medical_history || selectedPatient.extra_medical_info} empty="No assessment summary available." />
                        {selectedPatient.eligibility_reason && (
                          <div className="mt-4 rounded-2xl border border-[#D89A3D]/18 bg-[#D89A3D]/8 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#B7792F]">Eligibility rationale</p>
                            <p className="mt-2 text-sm font-bold leading-relaxed text-[#40516A]">{safeDisplayValue(selectedPatient.eligibility_reason)}</p>
                          </div>
                        )}
                      </ClinicalCard>

                      <ClinicalCard title="Medical Risk Flags" icon={<AlertCircle className="w-4 h-4 text-[#B94D4D]" />}>
                        {selectedPatient.medical_risk_flags ? (
                          <p className="rounded-2xl border border-[#B94D4D]/18 bg-[#B94D4D]/8 p-4 text-sm font-bold leading-relaxed text-[#B94D4D]">
                            {safeDisplayValue(selectedPatient.medical_risk_flags)}
                          </p>
                        ) : (
                          <ClinicalText value={null} empty="No high-risk flags recorded." />
                        )}
                        {selectedPatient.medication_proof_url && (
                          <a href={selectedPatient.medication_proof_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-[#FFF4EC] px-4 py-2 text-xs font-black text-[#C4622D]">
                            View uploaded medication proof
                          </a>
                        )}
                      </ClinicalCard>

                      <ClinicalCard title="Current Medications" icon={<Pill className="w-4 h-4 text-[#C4622D]" />}>
                        <ClinicalText value={selectedPatient.current_medications || selectedPatient.medication_history} empty="No current medication history recorded." />
                      </ClinicalCard>

                      <ClinicalCard title="Diagnosis Summary" icon={<Stethoscope className="w-4 h-4 text-[#5C7A6B]" />}>
                        <ClinicalText value={selectedPatient.diagnosis_summary} empty="No diagnosis summary saved yet." />
                      </ClinicalCard>

                      <ClinicalCard title="Follow-up Notes" icon={<FileText className="w-4 h-4 text-[#5C7A6B]" />}>
                        <ClinicalText value={selectedPatient.follow_up_notes} empty="No follow-up notes saved yet." />
                      </ClinicalCard>

                      <ClinicalCard title="Prescription History" icon={<Pill className="w-4 h-4 text-[#C4622D]" />}>
                        {selectedPatient.prescription_history?.length ? (
                          <div className="space-y-3">
                            {selectedPatient.prescription_history.slice(0, 4).map((item: Consultation) => (
                              <div key={item.id} className="rounded-2xl border border-[#1A1F36]/8 bg-white p-4 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-widest text-[#8896A4]">{formatClinicalDate(item.booking_date, item.booking_time)}</p>
                                <p className="mt-2 text-sm font-black text-[#1A1F36]">{safeDisplayValue(item.prescription_type || 'Medication recommendation')}</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#40516A]">{safeDisplayValue(item.prescription_text || item.prescription_notes)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ClinicalText value={null} empty="No prescription history yet." />
                        )}
                      </ClinicalCard>
                    </div>

                    <ClinicalCard title="Previous Consultations" icon={<Calendar className="w-4 h-4 text-[#C4622D]" />}>
                      {selectedPatient.previous_consultations?.length ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedPatient.previous_consultations.slice(0, 6).map((consultation: Consultation) => (
                            <div key={consultation.id} className="rounded-2xl border border-[#1A1F36]/8 bg-[#F5F0EB]/45 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-[#1A1F36]">{formatClinicalDate(consultation.booking_date, consultation.booking_time)}</p>
                                  <p className="mt-1 text-xs font-bold text-[#8896A4]">{consultationLabel(consultation.status)}</p>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusTone(consultation.status)}`}>{consultationLabel(consultation.status)}</span>
                              </div>
                              {consultation.prescription_notes && (
                                <p className="mt-3 text-xs font-semibold leading-relaxed text-[#40516A]">{safeDisplayValue(consultation.prescription_notes)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ClinicalText value={null} empty="No previous consultations found." />
                      )}
                    </ClinicalCard>

                    {/* Patient Progress Summary */}
                    <div className="bg-white p-6 rounded-[20px] border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
                      <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-6 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#C4622D]"/> Patient Progress Summary
                      </h3>
                      {!selectedPatient.weight_logs || selectedPatient.weight_logs.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-[#8896A4] text-sm font-bold">
                          No weight logs recorded by this user yet.
                        </div>
                      ) : (
                        <div className="h-60 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedPatient.weight_logs}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                              <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                              <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="#94A3B8" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontFamily: 'sans-serif' }} />
                              <Line type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Weight (kg)" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Secondary Health Intake */}
                    {selectedPatient.medical_history && (
                      <div className="bg-white p-6 rounded-[20px] border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
                        <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#C4622D]"/> Secondary Health Intake
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-4.5 rounded-2xl border border-[#1A1F36]/8 leading-relaxed shadow-inner">
                          {safeDisplayValue(selectedPatient.medical_history)}
                        </p>
                      </div>
                    )}

                    {/* Additional Clinical Notes */}
                    {selectedPatient.extra_medical_info && (
                      <div className="bg-white p-6 rounded-[20px] border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
                        <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#5C7A6B]"/> Additional Clinical Notes
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-4.5 rounded-2xl border border-[#1A1F36]/8 leading-relaxed shadow-inner">
                          {safeDisplayValue(selectedPatient.extra_medical_info)}
                        </p>
                      </div>
                    )}

                    {/* Care Team Context */}
                    {selectedPatient.local_food && (
                      <div className="bg-white p-6 rounded-[20px] border border-[#1A1F36]/8 shadow-[0_12px_32px_rgba(26,31,54,0.08)]">
                        <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#D89A3D]"/> Care Team Context
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-4.5 rounded-2xl border border-[#F5F0EB] leading-relaxed shadow-inner">
                          {safeDisplayValue(selectedPatient.local_food)}
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 h-64">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#1A1F36]/8 mb-6">
                      <Users className="w-10 h-10 text-[#8896A4]" />
                    </div>
                    <h3 className="text-base font-black text-[#40516A]">Select a patient</h3>
                    <p className="text-xs text-[#8896A4] font-semibold mt-2 max-w-xs">
                      Choose a patient from the roster to review their assessment, risks, medications, consultations, prescriptions, and follow-up plan.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.main>
      </div>
    </div>
  );
}
