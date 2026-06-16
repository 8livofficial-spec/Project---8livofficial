'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity, Users, CheckCircle2, XCircle, Video, Calendar, Wallet,
  ArrowDownToLine, Pill, FileText, Clock, AlertCircle, LogOut,
  Stethoscope, ChevronRight, Plus, X, TrendingUp, BadgeCheck, Bell, BellRing, Ban, UserCheck, Check, PhoneOff, MessageCircle,
} from 'lucide-react';
import StaffChat from '@/components/StaffChat';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const inputCls = 'w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none transition-all text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 [color-scheme:light]';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

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

// Helper: check if scheduled time is within the 1.30 hours (90 mins) window
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
    const FIVE_MIN = 5 * 60 * 1000;
    const ONE_AND_HALF_HOURS = 90 * 60 * 1000; // 1.30 hours
    return now >= start - FIVE_MIN && now <= start + ONE_AND_HALF_HOURS;
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

type Tab = 'overview' | 'patients' | 'schedule' | 'consultations' | 'prescriptions' | 'wallet' | 'messages';

type Consultation = {
  id: string;
  patient_id: string;
  patient_name: string;
  booking_date: string;
  booking_time: string;
  room_url: string;
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

export default function DoctorDashboard() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [doctor, setDoctor] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Consultations
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availableRequests, setAvailableRequests] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

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
  const [availDate, setAvailDate] = useState('');
  const [availTime, setAvailTime] = useState('');
  const [availSlots, setAvailSlots] = useState<any[]>([]);

  // Prescription modal
  const [prescribeCase, setPrescribeCase] = useState<Consultation | null>(null);
  const [prescriptionType, setPrescriptionType] = useState<'Oral' | 'Injectable'>('Oral');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [prescribing, setPrescribing] = useState(false);

  // Sync prescribeCase with prescription text state
  useEffect(() => {
    if (prescribeCase) {
      setPrescriptionText(prescribeCase.prescription_text || '');
      setPrescriptionType(prescribeCase.prescription_type === 'none' ? 'Oral' : (prescribeCase.prescription_type || 'Oral') as any);
    } else {
      setPrescriptionText('');
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

        await Promise.all([
          loadConsultations(session.user.id),
          loadAvailability(session.user.id),
          loadWallet(session.user.id),
          loadPatients(session.user.id),
        ]);
        setLoading(false);
      } catch (err) {
        console.error('Doctor dashboard initialization failed:', err);
        await supabase.auth.signOut();
        router.push('/?role=doctor');
      }
    };
    init();
  }, [router]);

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

  // Poll new consultations, availability, and wallet balance every 5 seconds for real-time updates
  useEffect(() => {
    if (!doctor) return;
    const pollInterval = setInterval(() => {
      loadConsultations(doctor.id);
      loadAvailability(doctor.id);
      loadWallet(doctor.id);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [doctor]);

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


  const loadConsultations = async (doctorId: string) => {
    try {
      const res = await fetch('/api/doctor/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId })
      });
      const data = await res.json();
      if (data.consultations) setConsultations(data.consultations);
      if (data.availableRequests) setAvailableRequests(data.availableRequests);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
  };

  const loadPatients = async (doctorId: string) => {
    try {
      const res = await fetch('/api/staff/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: doctorId, role: 'doctor' })
      });
      const data = await res.json();
      if (data.patients) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const loadAvailability = async (doctorId: string) => {
    const { data } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('available_date', new Date().toISOString().split('T')[0])
      .order('available_date', { ascending: true });
    if (data) setAvailSlots(data);
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
  const addSlot = async () => {
    if (!availDate || !availTime || !doctor) return;

    // Prevent adding past slots
    const todayStr = new Date().toISOString().split('T')[0];
    if (availDate < todayStr) {
      alert("Cannot add a time slot that is in the past!");
      return;
    }
    if (availDate === todayStr) {
      try {
        const target = new Date(`${availDate} ${availTime}`);
        if (target.getTime() < Date.now()) {
          alert("Cannot add a time slot that is in the past!");
          return;
        }
      } catch (e) {}
    }

    const { error } = await supabase.from('doctor_availability').insert({
      doctor_id: doctor.id,
      available_date: availDate,
      time_slot: availTime,
    });
    if (!error) { setAvailDate(''); setAvailTime(''); loadAvailability(doctor.id); }
    else alert('Error: ' + error.message);
  };

  const deleteSlot = async (id: string) => {
    await supabase.from('doctor_availability').delete().eq('id', id);
    loadAvailability(doctor.id);
  };

  const joinCall = async (c: Consultation) => {
    // Check if within allowed call window: 5 mins before start up to 1.30h after start
    if (!isCallTimeNow(c.booking_date, c.booking_time)) {
      setWarningMessage(`Advance joining is not allowed. In accordance with clinical guidelines, you can only launch the call session between 5 minutes before and 1 hour 30 minutes after the scheduled time.\n\nScheduled time: ${c.booking_date} at ${c.booking_time}`);
      return;
    }
    
    let finalLink = c.room_url;
    if (!finalLink || finalLink.trim() === '') {
      // Auto-create a Daily.co room if no room_url exists
      try {
        const res = await fetch('/api/daily/create-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: `8liv-consult-${c.id.slice(0, 8)}` })
        });
        const data = await res.json();
        finalLink = data.url || '';
        if (finalLink) {
          await supabase.from('doctor_consultations').update({ room_url: finalLink }).eq('id', c.id);
        }
      } catch (err) {
        console.error('Failed to create Daily.co room:', err);
      }
    }

    if (!finalLink) {
      alert("Error: Could not create or find a video room for this consultation.");
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

      // 2. Lock/Claim the availability slot
      const { data: existingSlot } = await supabase
        .from('doctor_availability')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('available_date', req.booking_date)
        .eq('time_slot', req.booking_time)
        .eq('is_booked', false)
        .maybeSingle();

      if (existingSlot) {
        await supabase.from('doctor_availability')
          .update({ is_booked: true })
          .eq('id', existingSlot.id);
      } else {
        await supabase.from('doctor_availability').insert({
          doctor_id: doctor.id,
          available_date: req.booking_date,
          time_slot: req.booking_time,
          is_booked: true
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

      // Update consultation status and prescription text in DB
      const { error } = await supabase.from('doctor_consultations').update({
        status: 'approved',
        prescription_type: finalType,
        prescription_text: finalText,
        updated_at: new Date().toISOString(),
      }).eq('id', prescribeCase.id);

      if (error) throw error;

      // Also update patient's health_assessments: set prescription, reset payment, and clear booking
      if (prescribeCase.patient_id) {
        await supabase.from('health_assessments')
          .update({ 
            prescription_type: finalType,
            consultation_fee_paid: false,
            booking_date: null,
            booking_time: null,
            room_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('patient_id', prescribeCase.patient_id);
      }

      // Credit doctor wallet
      await creditDoctorWallet(prescribeCase.doctor_payout || 250, `Consultation: ${prescribeCase.patient_name}`);
      await loadConsultations(doctor.id);
      await loadWallet(doctor.id);
      setPrescribeCase(null);
      setPrescriptionText('');
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
    const { error } = await supabase.from('doctor_consultations').update({
      status: 'rejected',
      prescription_notes: rejectNote,
      updated_at: new Date().toISOString(),
    }).eq('id', rejectCase.id);
    if (!error) { await loadConsultations(doctor.id); setRejectCase(null); setRejectNote(''); }
    else alert('Error: ' + error.message);
    setRejecting(false);
  };

  // ── Cancel Appointment ────────────────────────────────────────────────
  const handleCancelAppointment = async (c: any) => {
    if (!confirm('Are you sure you want to cancel this scheduled appointment?')) return;
    try {
      // 1. Update consultation
      const { error } = await supabase.from('doctor_consultations').update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('id', c.id);
      if (error) throw error;

      // 2. Free up the slot in availability
      await supabase.from('doctor_availability').update({ is_booked: false })
        .eq('doctor_id', c.doctor_id)
        .eq('available_date', c.booking_date)
        .eq('time_slot', c.booking_time);

      // 3. Clear patient's booked slot in health_assessments
      if (c.patient_id) {
        await supabase.from('health_assessments').update({
          booking_date: null,
          booking_time: null,
          room_url: null,
          updated_at: new Date().toISOString()
        }).eq('patient_id', c.patient_id);

        // 4. Send notification to patient
        await supabase.from('patient_notifications').insert({
          patient_id: c.patient_id,
          type: 'booking_cancelled_by_doctor',
          title: '⚠️ Appointment Cancelled',
          message: `Your doctor has cancelled the appointment on ${c.booking_date} at ${c.booking_time}. Please select a new time slot.`,
        });
      }

      if (doctor) await loadConsultations(doctor.id);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────
  const creditDoctorWallet = async (amount: number, desc: string) => {
    if (!doctor) return;
    
    // FIXED: Fetch fresh balance from DB first to prevent race condition.
    // Using stale local state (wallet.balance) would give wrong totals
    // if two consultations were approved in quick succession.
    const { data: freshWallet } = await supabase
      .from('doctor_wallet')
      .select('balance, total_earned, total_withdrawn')
      .eq('doctor_id', doctor.id)
      .single();

    const currentBalance = freshWallet?.balance || 0;
    const currentEarned = freshWallet?.total_earned || 0;
    const currentWithdrawn = freshWallet?.total_withdrawn || 0;

    await supabase.from('doctor_wallet').upsert({
      doctor_id: doctor.id,
      balance: currentBalance + amount,
      total_earned: currentEarned + amount,
      total_withdrawn: currentWithdrawn,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'doctor_id' });

    await supabase.from('doctor_wallet_transactions').insert({
      doctor_id: doctor.id,
      type: 'credit',
      amount,
      description: desc,
    });
  };


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
  const thisWeekStart = new Date(); thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date(); thisMonthStart.setDate(1);

  const todayCases = consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today).length;
  const weekCases = consultations.filter(c => new Date(c.created_at) >= thisWeekStart).length;
  const monthCases = consultations.filter(c => new Date(c.created_at) >= thisMonthStart).length;
  const approvedCases = consultations.filter(c => c.status === 'approved').length;
  const rejectedCases = consultations.filter(c => c.status === 'rejected').length;
  const attendedCalls = consultations.filter(c => ['attended', 'approved', 'rejected'].includes(c.status)).length;
  const notAttendedCalls = consultations.filter(c => c.status === 'scheduled').length;
  const pendingCases = consultations.filter(c => c.status === 'attended').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-lg font-black text-slate-600 mt-6">Loading Doctor Portal...</p>
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
    c.room_url && 
    ['scheduled', 'calling', 'attended'].includes(c.status) && 
    isCallTimeNow(c.booking_date, c.booking_time)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">      {/* ── 15-MIN PRE-CALL ALERT BANNER ── */}
      {upcomingCallAlert && (
        <div className="fixed top-4 right-4 z-[200] max-w-sm w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-2xl shadow-indigo-500/40 border border-white/20" style={{animation:'fadeIn 0.4s ease-out both'}}>
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

      {/* ── ACTIVE VIDEO CALL OVERLAY (Embedded Daily.co) ── */}
      {activeCallUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          {/* Top Control Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              <Video className="w-5 h-5 text-cyan-400"/>
              <span className="font-black text-base">Live Consultation — {activeCallPatient}</span>
              {callTimer && (
                <span className="bg-white/10 text-white font-mono font-black text-sm px-3 py-1 rounded-full border border-white/20">
                  ⏱ {callTimer}
                </span>
              )}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                activeCallStatus === 'calling' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {activeCallStatus === 'calling' ? '📞 Waiting for patient...' : '🟢 Patient Connected'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400 font-semibold hidden sm:block">⚠️ Do not share personal contact details</div>
              <button 
                onClick={endCall} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4"/> End Session
              </button>
            </div>
          </div>
          {/* Daily.co Embedded Video Call */}
          <div className="flex-1 w-full bg-slate-950">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Pill className="w-6 h-6 text-blue-500"/> E-Prescription</h3>
              <button onClick={() => setPrescribeCase(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
              <p className="text-sm font-bold text-blue-800">Patient: {prescribeCase.patient_name}</p>
              <p className="text-xs text-blue-600 mt-1">Date: {prescribeCase.booking_date} @ {prescribeCase.booking_time}</p>
              {prescribeCase.call_started_at && (
                <p className="text-xs text-indigo-600 font-bold mt-1.5">
                  ⏱ Call Duration: {formatDuration(prescribeCase.call_started_at, prescribeCase.call_ended_at)}
                </p>
              )}
            </div>

            {/* ── No Prescription Option ── */}
            <button
              onClick={() => handlePrescribe(true)}
              className="w-full cursor-pointer border-2 border-slate-200 hover:border-[#5C7A6B] hover:bg-[#5C7A6B]/10 rounded-2xl p-4 text-center transition-all mb-5 group hover:scale-[1.02] active:scale-95"
            >
              <p className="font-black text-[#1A1F36] group-hover:text-[#5C7A6B] flex items-center justify-center gap-2 transition-colors">
                <Ban className="w-5 h-5"/> No Prescription Needed
              </p>
              <p className="text-xs text-[#8896A4] font-medium mt-1">Click to close this case without a prescription</p>
            </button>

            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200"/>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">OR PRESCRIBE MEDICATION</span>
              <div className="flex-1 h-px bg-slate-200"/>
            </div>

            <label className={labelCls}>Select Medication Type</label>
            <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
              {(['Oral', 'Injectable'] as const).map(type => (
                <button key={type} onClick={() => setPrescriptionType(type)}
                  className={`w-full cursor-pointer border-2 rounded-2xl p-4 text-center transition-all hover:scale-[1.03] active:scale-95 ${prescriptionType === type ? 'border-[#C4622D] bg-[#C4622D]/10' : 'border-slate-200 hover:border-[#C4622D]/40'}`}>
                  <p className={`font-black text-base ${prescriptionType === type ? 'text-[#C4622D]' : 'text-[#1A1F36]'}`}>
                    {type === 'Oral' ? '💊' : '💉'} {type}
                  </p>
                  <p className="text-xs text-[#8896A4] mt-1 font-medium">{type === 'Oral' ? 'Daily tablet' : 'Weekly injection'}</p>
                </button>
              ))}
            </div>

            <label className={`${labelCls} mt-4`}>Medicine Name & Dosage Instructions *</label>
            <textarea
              value={prescriptionText}
              onChange={e => setPrescriptionText(e.target.value)}
              className={`${inputCls} mt-1 mb-4`}
              rows={3}
              placeholder="e.g. Semaglutide 0.25mg — take once weekly on Wednesdays. Increase to 0.5mg after 4 weeks."
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p className="text-xs font-bold text-amber-800">⚡ Order will be placed automatically and sent to pharmacy with patient address & details.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPrescribeCase(null)} className="flex-1 bg-[#F5F0EB] hover:bg-[#e6dfd7] text-[#1A1F36] font-bold py-3 rounded-xl transition-all hover:scale-105 active:scale-95">Cancel</button>
              <button onClick={() => handlePrescribe(false)} disabled={prescribing || !prescriptionText.trim()}
                className="flex-1 bg-[#1A1F36] hover:bg-[#2A314D] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95">
                {prescribing ? 'Prescribing...' : 'Prescribe & Order ✓'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><XCircle className="w-6 h-6 text-rose-500"/> Not Approved</h3>
              <button onClick={() => setRejectCase(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl mb-6 border border-rose-100">
              <p className="text-sm font-bold text-rose-800">Patient: {rejectCase.patient_name}</p>
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
              <button onClick={() => setRejectCase(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleReject} disabled={rejecting || !rejectNote.trim()}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                {rejecting ? 'Saving...' : 'Submit & Close Case'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className="flex h-screen overflow-hidden">
        <motion.aside 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-64 bg-white border-r border-[#8896A4]/20 flex flex-col shadow-sm flex-shrink-0">
          {/* Doctor info */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#1A1F36] rounded-2xl flex items-center justify-center shadow-md">
                <Stethoscope className="w-6 h-6 text-[#C4622D]"/>
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-900 text-sm leading-tight">{doctorProfile?.full_name || doctor?.email?.split('@')[0] || 'Doctor'}</p>
                <p className="text-xs text-slate-500 font-semibold">Endocrinologist</p>
              </div>
              {/* Notification Bell */}
              <button
                onClick={() => { setUpcomingCallAlert(null); setDoctorNotifBell(false); }}
                className="relative p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                {doctorNotifBell
                  ? <BellRing className="w-5 h-5 text-indigo-600 animate-bounce"/>
                  : <Bell className="w-5 h-5 text-slate-400"/>}
                {doctorNotifBell && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"/>
                )}
              </button>
            </div>
            {/* Online Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-ping"></span>
                <span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
              </span>
              <span className="text-xs font-medium text-green-700">Online</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-r-xl text-sm transition-colors ${activeTab === t.key
                  ? 'bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                {t.icon} {t.label}
                {t.key === 'consultations' && pendingCases > 0 && (
                  <span className="ml-auto bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingCases}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Wallet quick view */}
          <div className="p-4 border-t border-slate-100">
            {/* FIX: Bug 4 — Hide ₹0 wallet balance and show a placeholder instead */}
            {wallet.balance > 0 ? (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
                <p className="text-2xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
                <button onClick={() => setActiveTab('wallet')}
                  className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1">
                  <ArrowDownToLine className="w-3.5 h-3.5"/> Withdraw
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 text-center border border-dashed border-slate-200">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Wallet</p>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs font-medium text-slate-500">Complete a consult to earn</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="p-4 pt-0">
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors py-2 px-3 rounded-lg hover:bg-red-50">
              <LogOut className="w-5 h-5"/> Sign Out
            </button>
          </div>
        </motion.aside>

        {/* ── MAIN CONTENT ── */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 overflow-y-auto bg-[#F5F0EB]/50 p-8">

          {/* ── TAB: OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.1 }} className="space-y-8">
              <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Overview of your practice and upcoming appointments. Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctorProfile?.full_name?.split(' ')[0] || 'Doctor'} 👋</p>
                </div>
                <div className="flex gap-3"></div>
              </div>

              {/* FIX: Bug 3 — Doctor Overview stats dynamically computed from consultations array */}
              {/* Quick stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Cases', value: consultations.length, icon: <Users className="w-6 h-6"/> },
                  { label: 'Approved', value: approvedCases, icon: <CheckCircle2 className="w-6 h-6"/> },
                  { label: 'Pending Review', value: pendingCases, icon: <Clock className="w-6 h-6"/> },
                  { label: 'Not Approved', value: rejectedCases, icon: <XCircle className="w-6 h-6"/> },
                ].map((s, idx) => (
                  <motion.div 
                    key={s.label} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-105 transition-transform duration-300"
                  >
                    <div className="bg-orange-50 text-orange-500 p-4 rounded-full">{s.icon}</div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Cases table: Today / Week / Month */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500"/> Cases Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Period', 'Cases Seen', 'Approved', 'Not Approved', 'Attended Calls'].map(h => (
                          <th key={h} className="text-xs font-black text-slate-500 uppercase tracking-wider py-3 px-4 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { period: 'Today', cases: todayCases, app: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && c.status === 'approved').length, rej: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && c.status === 'rejected').length, att: consultations.filter(c => new Date(c.created_at).toLocaleDateString('en-IN') === today && ['attended','approved','rejected'].includes(c.status)).length },
                        { period: 'This Week', cases: weekCases, app: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && c.status === 'approved').length, rej: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && c.status === 'rejected').length, att: consultations.filter(c => new Date(c.created_at) >= thisWeekStart && ['attended','approved','rejected'].includes(c.status)).length },
                        { period: 'This Month', cases: monthCases, app: approvedCases, rej: rejectedCases, att: attendedCalls },
                      ].map(row => (
                        <tr key={row.period} className="border-b border-slate-50 hover:bg-slate-50 transition-colors duration-200">
                          <td className="py-4 px-4 font-bold text-slate-900">{row.period}</td>
                          <td className="py-4 px-4"><span className="bg-blue-100 text-blue-700 font-black text-sm px-3 py-1 rounded-full">{row.cases}</span></td>
                          <td className="py-4 px-4"><span className="bg-emerald-100 text-emerald-700 font-black text-sm px-3 py-1 rounded-full">{row.app}</span></td>
                          <td className="py-4 px-4"><span className="bg-rose-100 text-rose-700 font-black text-sm px-3 py-1 rounded-full">{row.rej}</span></td>
                          <td className="py-4 px-4"><span className="bg-slate-100 text-slate-700 font-black text-sm px-3 py-1 rounded-full">{row.att}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Video call attendance table */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Video className="w-5 h-5 text-indigo-500"/> Video Call Attendance</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-emerald-700">{attendedCalls}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-2">Attended Calls</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                    <p className="text-4xl font-black text-amber-700">{notAttendedCalls}</p>
                    <p className="text-sm font-bold text-amber-600 mt-2">Pending / Not Attended</p>
                  </div>
                </div>
              </div>

              {/* ── AVAILABLE PATIENTS REQUESTS (CLAIM SYSTEM) ── */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-500"/> Available Patient Requests (Escrow Pool)
                  </h3>
                  <span className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-1 rounded-full animate-pulse">
                    {availableRequests.filter((r) => !r.doctor_id).length} Awaiting Review
                  </span>
                </div>
                {availableRequests.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-20"/>
                    <p className="text-sm font-semibold">No new patient requests at the moment</p>
                    <p className="text-xs text-slate-400 mt-1">New requests will appear here when patients pay and choose dates.</p>
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
                              : 'border-[#5C7A6B]/20 hover:border-[#C4622D] bg-white hover:scale-105 hover:shadow-lg shadow-sm'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                              Patient display ID 
                              {isClaimedByOther && <span className="text-rose-500 font-bold"> (booked)</span>}
                              {hasConflict && <span className="text-amber-600 font-bold"> (time conflict)</span>}
                            </p>
                            <h4 className={`font-black text-base mt-0.5 ${isLocked ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {req.patient_name || 'Anonymous Patient'} 
                              {isClaimedByOther && <span className="text-sm font-bold text-slate-500 normal-case"> (booked)</span>}
                              {hasConflict && <span className="text-sm font-bold text-amber-600 normal-case"> (time conflict)</span>}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
                              <span>📅</span> {req.booking_date} at {req.booking_time}
                            </p>
                            <p className={`text-[10px] px-2 py-0.5 rounded-md w-fit font-bold mt-2 border ${
                              isLocked 
                                ? 'text-slate-500 bg-slate-200 border-slate-300' 
                                : 'text-indigo-600 bg-indigo-50 border-indigo-100'
                            }`}>
                              💰 Escrow Paid: ₹499
                            </p>
                          </div>
                           {isClaimedByOther ? (
                            <div className="bg-slate-200 border border-slate-300 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2">
                              ⚡ Sorry, try to be quicker next time!
                            </div>
                          ) : hasConflict ? (
                            <div className="bg-amber-100 border border-amber-200 text-amber-800 font-bold py-2.5 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2">
                              ⚠️ Gap Conflict: Requires 2h gap with your bookings
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClaimRequest(req)}
                              className="w-full bg-[#C4622D] hover:bg-[#A95123] text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-sm active:scale-95 hover:shadow-lg hover:shadow-[#C4622D]/20"
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
              <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Availability Schedule</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Manage your video consultation slots.</p>
                </div>
              </div>

              {/* Add slot */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> Add Available Slot</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={availDate} onChange={e => setAvailDate(e.target.value)} className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Time Slot</label>
                    <select value={availTime} onChange={e => setAvailTime(e.target.value)} className={inputCls}>
                      <option value="">Select time</option>
                      {['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={addSlot} disabled={!availDate || !availTime}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
                    + Add Slot
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-4">💡 Members will be able to select these slots when booking their video consultation.</p>
              </div>

              {/* Available slots list */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-6">Upcoming Available Slots ({availSlots.length})</h3>
                {availSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-base font-semibold text-gray-500 mb-1">No slots added</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">Add some available slots above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availSlots.map((slot, idx) => (
                      <motion.div 
                        key={slot.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 hover:scale-105 transition-transform duration-300 hover:shadow-lg ${slot.is_booked ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}
                      >
                        <div>
                          <p className="font-black text-slate-900 text-sm">{slot.available_date}</p>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">{slot.time_slot}</p>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block ${slot.is_booked ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                            {slot.is_booked ? 'Booked' : 'Available'}
                          </span>
                        </div>
                        {!slot.is_booked && (
                          <button onClick={() => deleteSlot(slot.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                            <X className="w-5 h-5"/>
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB: CONSULTATIONS ── */}
          {activeTab === 'consultations' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Review your patient cases and approvals.</p>
                </div>
              </div>

              {/* Appointed cases notification banner */}
              {pendingCases > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="bg-amber-100 text-amber-600 p-3 rounded-xl"><AlertCircle className="w-6 h-6"/></div>
                  <div>
                    <p className="font-black text-amber-900">{pendingCases} case{pendingCases > 1 ? 's' : ''} awaiting your review</p>
                    <p className="text-sm text-amber-700 font-semibold mt-0.5">These members have completed their video call and need a prescription decision.</p>
                  </div>
                </div>
              )}

              {consultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <Users className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">No consultations yet</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">Members will appear here once they book a video call.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((c, idx) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
                      attended: { label: 'Attended — Pending Review', color: 'bg-amber-100 text-amber-700' },
                      approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
                      rejected: { label: 'Not Approved', color: 'bg-rose-100 text-rose-700' },
                      not_attended: { label: 'Not Attended', color: 'bg-gray-200 text-gray-600' },
                      cancelled: { label: 'Cancelled', color: 'bg-gray-200 text-gray-600' },
                    };
                    const st = statusMap[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-600' };
                    return (
                      <motion.div 
                        key={c.id} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 hover:scale-[1.01] transition-transform duration-300 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <p 
                                onClick={() => setPrescribeCase(c)}
                                className="font-black text-slate-900 text-lg cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                                title="Click to view/write prescription"
                              >
                                {c.patient_name || 'Member'}
                              </p>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${st.color}`}>
                                {st.label}
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm text-slate-500 font-semibold flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {c.booking_date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {c.booking_time}</span>
                              {c.prescription_type && <span className="flex items-center gap-1"><Pill className="w-4 h-4 text-blue-400"/> {c.prescription_type}</span>}
                            </div>
                            {c.prescription_notes && (
                              <div className="mt-3 bg-rose-50 border border-rose-100 rounded-xl p-3">
                                <p className="text-xs font-bold text-rose-700">Rejection Reason: {c.prescription_notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Join call */}
                            {c.room_url && ['scheduled', 'attended'].includes(c.status) && (() => {
                              const active = isCallTimeNow(c.booking_date, c.booking_time);
                              return (
                                <button onClick={() => joinCall(c)}
                                  className={`font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md ${active ? 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                  <Video className="w-4 h-4"/> Join Call
                                </button>
                              );
                            })()}
                            {/* Prescribe */}
                            {c.status === 'attended' && (
                              <button onClick={() => setPrescribeCase(c)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md">
                                <BadgeCheck className="w-4 h-4"/> Approve & Prescribe
                              </button>
                            )}
                            {/* Reject */}
                            {c.status === 'attended' && (
                              <button onClick={() => setRejectCase(c)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all">
                                <XCircle className="w-4 h-4"/> Not Approve
                              </button>
                            )}
                            {/* Cancel */}
                            {c.status === 'scheduled' && (
                              <button onClick={() => handleCancelAppointment(c)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm">
                                <XCircle className="w-4 h-4"/> Cancel Call
                              </button>
                            )}
                            {/* Call Member — for scheduled calls with no active URL yet */}
                            {c.status === 'scheduled' && !c.room_url && (
                              <button onClick={() => joinCall(c)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md">
                                📞 Call Member
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: PRESCRIPTIONS (E-Prescription Portal) ── */}
          {activeTab === 'prescriptions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">E-Prescription Portal</h1>
                  <p className="text-sm text-gray-400 mt-0.5">All approved prescriptions — visible to both doctor and patient.</p>
                </div>
              </div>

              {consultations.filter(c => c.status === 'approved').length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">No approved prescriptions</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">When you approve a case, its prescription will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.filter(c => c.status === 'approved').map((c, idx) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:scale-[1.01] transition-transform duration-300"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Pill className="w-5 h-5"/></div>
                            <p className="font-black text-slate-900 text-lg">{c.patient_name}</p>
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full">Approved</span>
                          </div>
                          <div className="flex gap-4 text-sm text-slate-500 font-semibold flex-wrap ml-11">
                            <span>{c.booking_date} @ {c.booking_time}</span>
                            <span className="font-black text-blue-700">{c.prescription_type === 'Oral' ? '💊' : '💉'} {c.prescription_type} Medicine</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          {/* Order status */}
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${c.prescription_ordered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.prescription_ordered ? <><CheckCircle2 className="w-4 h-4"/> Order Placed</> : <><Clock className="w-4 h-4"/> Pending Order</>}
                          </div>
                        </div>
                      </div>
                      {c.prescription_ordered && (
                        <div className="mt-4 ml-11 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <p className="text-xs font-bold text-slate-500">📦 Order automatically sent to pharmacy with patient address & details.</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: WALLET ── */}
          {activeTab === 'wallet' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">8liv Doctor Wallet</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Manage your earnings and withdrawals.</p>
                </div>
              </div>

              {/* Wallet cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-2xl">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-3">Available Balance</p>
                  <p className="text-5xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-500 mt-2 font-semibold">Ready to withdraw</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-[2rem] text-center">
                  <p className="text-xs text-emerald-600 font-black uppercase tracking-widest mb-3">Total Earned</p>
                  <p className="text-4xl font-black text-emerald-700">₹{wallet.total_earned.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-emerald-500 mt-2 font-semibold">From {approvedCases} consultations</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-8 rounded-[2rem] text-center">
                  <p className="text-xs text-blue-600 font-black uppercase tracking-widest mb-3">Total Withdrawn</p>
                  <p className="text-4xl font-black text-blue-700">₹{wallet.total_withdrawn.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-blue-500 mt-2 font-semibold">To bank account</p>
                </div>
              </div>

              {/* Withdraw */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-blue-500"/> Withdraw to Bank Account</h3>
                <p className="text-sm text-slate-500 font-semibold mb-6">Funds transfer directly to your registered bank account within 2 business days.</p>
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
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw Now'}
                  </button>
                </div>
                {wallet.balance === 0 && (
                  <p className="text-sm text-amber-600 font-bold mt-3 bg-amber-50 p-3 rounded-xl border border-amber-200">No balance available. Complete consultations to earn.</p>
                )}
              </div>

              {/* Transaction history */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-900 mb-6">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <Wallet className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-base font-semibold text-gray-500 mb-1">No transactions found</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">Your withdrawals will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx, idx) => (
                      <motion.div 
                        key={tx.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {tx.type === 'credit' ? <TrendingUp className="w-5 h-5"/> : <ArrowDownToLine className="w-5 h-5"/>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-slate-400 font-semibold">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              {tx.type === 'withdrawal' && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${tx.status === 'completed' || tx.status === 'approved' || tx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {tx.status === 'completed' || tx.status === 'approved' || tx.status === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`font-black text-base ${tx.type === 'credit' ? 'text-emerald-600' : 'text-blue-600'}`}>
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
                  if (activeRejoinableConsultation.status === 'scheduled') {
                    joinCall(activeRejoinableConsultation);
                  } else {
                    window.open(activeRejoinableConsultation.room_url, '_blank');
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 transition-all scale-100 hover:scale-105 active:scale-95 border border-rose-500 animate-pulse"
              >
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <Video className="w-5 h-5"/> Rejoin Call with {activeRejoinableConsultation.patient_name || 'Member'}
              </button>
            </div>
          )}

          {/* ── CALL TIMING WARNING MODAL ── */}
          {warningMessage && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-2 border-amber-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-amber-500 animate-bounce"/> Advance Joining Restrained
                  </h3>
                  <button onClick={() => setWarningMessage(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="bg-amber-50/80 p-5 rounded-2xl mb-6 border border-amber-100/50">
                  <p className="text-sm font-semibold text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {warningMessage}
                  </p>
                </div>

                <button onClick={() => setWarningMessage(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  Okay, I'll return later
                </button>
              </motion.div>
            </div>
          )}
          {/* Messages Tab */}
          {activeTab === 'messages' && doctor && (
            <div className="h-full flex flex-col">
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-xl font-black text-slate-900">Patient Messages</h2>
                <p className="text-sm text-slate-500 mt-0.5">Communicate securely with your assigned patients.</p>
              </div>
              <div className="flex-1 px-6 pb-6 overflow-hidden" style={{ minHeight: 0 }}>
                <StaffChat
                  staffId={doctor.id}
                  staffName={doctorProfile?.full_name || 'Doctor'}
                  patients={patients}
                  accentColor="#3B82F6"
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
              <div className="w-80 bg-white border-r border-slate-100 overflow-y-auto p-6 space-y-4 custom-scrollbar shrink-0">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest mb-4 px-2">Assigned Members</h3>
                {patients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-base font-semibold text-gray-500 mb-1">No patients</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">No patients assigned yet.</p>
                  </div>
                ) : (
                  patients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${selectedPatient?.id === p.id ? 'border-[#C4622D] bg-[#F5F0EB]/50 shadow-sm scale-[1.01]' : 'border-transparent bg-slate-50/50 hover:bg-[#F5F0EB]/40 hover:border-[#C4622D]/30'}`}
                    >
                      <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">{p.first_name} {p.last_name}</h4>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>Goal: {p.goal_weight_kg || '—'} kg</span>
                        <p className={`text-[10px] font-black mt-1 ${(p.status_color || '').replace('bg-', 'text-').split(' ')[0]}`}>
                          {p.status_label}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Patient Details Pane */}
              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                {selectedPatient ? (
                  <div className="max-w-3xl space-y-8">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500"/> Patient Medical File
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedPatient.phone_number && (
                          <div className="bg-white border border-slate-150 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
                            📞 {selectedPatient.phone_number}
                          </div>
                        )}
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

                    {/* Telemetry metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Height</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Start Weight</p>
                        <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Target Weight</p>
                        <p className="text-xl font-black text-[#C4622D] mt-1">{selectedPatient.goal_weight_kg ? `${selectedPatient.goal_weight_kg} kg` : '—'}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow duration-300 text-center">
                        <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">BMI Ratio</p>
                        <p className="text-xl font-black text-[#5C7A6B] mt-1">
                          {selectedPatient.weight_kg && selectedPatient.height_cm 
                            ? (selectedPatient.weight_kg / Math.pow(selectedPatient.height_cm / 100, 2)).toFixed(1)
                            : '—'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Weight Progress Chart */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#C4622D]"/> Weight Progress Log
                      </h3>
                      {!selectedPatient.weight_logs || selectedPatient.weight_logs.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-bold">
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

                    {/* Stated Medical History / Health Intake */}
                    {selectedPatient.medical_history && (
                      <div className="bg-white p-6 rounded-[2.2rem] border border-slate-150 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-500"/> Stated Medical History
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-slate-50 p-4.5 rounded-2xl border border-slate-100 leading-relaxed shadow-inner">
                          {selectedPatient.medical_history}
                        </p>
                      </div>
                    )}

                    {/* Extra Info */}
                    {selectedPatient.extra_medical_info && (
                      <div className="bg-white p-6 rounded-[2.2rem] border border-slate-150 shadow-sm">
                        <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-500"/> Intake Additional Notes
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-slate-50 p-4.5 rounded-2xl border border-slate-100 leading-relaxed shadow-inner">
                          {selectedPatient.extra_medical_info}
                        </p>
                      </div>
                    )}

                    {/* Food Preferences */}
                    {selectedPatient.local_food && (
                      <div className="bg-white p-6 rounded-[2.2rem] border border-slate-150 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-500"/> Food & Dietary Preferences
                        </h3>
                        <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-4.5 rounded-2xl border border-[#F5F0EB] leading-relaxed shadow-inner">
                          {selectedPatient.local_food}
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 h-64">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                      <Users className="w-10 h-10 text-slate-350" />
                    </div>
                    <h3 className="text-base font-black text-slate-600">Select a patient</h3>
                    <p className="text-xs text-slate-450 font-semibold mt-2 max-w-xs">
                      Choose a patient from the roster to view their medical files, telemetry history, and logs.
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