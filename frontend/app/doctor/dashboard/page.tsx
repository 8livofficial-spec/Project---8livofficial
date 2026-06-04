'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import {
  Activity, Users, CheckCircle2, XCircle, Video, Calendar, Wallet,
  ArrowDownToLine, Pill, FileText, Clock, AlertCircle, LogOut,
  Stethoscope, ChevronRight, Plus, X, TrendingUp, BadgeCheck,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const inputCls = 'w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none transition-all text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 [color-scheme:light]';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

type Tab = 'overview' | 'schedule' | 'consultations' | 'prescriptions' | 'wallet';

type Consultation = {
  id: string;
  patient_id: string;
  patient_name: string;
  booking_date: string;
  booking_time: string;
  room_url: string;
  status: string;
  prescription_type: string | null;
  prescription_notes: string | null;
  prescription_ordered: boolean;
  doctor_payout: number;
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

  // Video call
  const [activeCallUrl, setActiveCallUrl] = useState('');
  const [activeCallPatient, setActiveCallPatient] = useState('');
  const [activeCallStatus, setActiveCallStatus] = useState<string>('calling');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Link configuration modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/?role=doctor'); return; }
      setDoctor(session.user);

      // Load profile
      const { data: profile } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('doctor_id', session.user.id)
        .single();
      
      if (profile) {
        setDoctorProfile(profile);
      }

      await Promise.all([
        loadConsultations(session.user.id),
        loadAvailability(session.user.id),
        loadWallet(session.user.id),
      ]);
      setLoading(false);
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

  const loadConsultations = async (doctorId: string) => {
    // Load from health_assessments where booking exists (simulate)
    const { data } = await supabase
      .from('doctor_consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    if (data) setConsultations(data);
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

  // ── Video call ────────────────────────────────────────────────────────
  const joinCall = (c: Consultation) => {
    setSelectedConsultationForCall(c);
    const savedLink = localStorage.getItem('doctor_meet_link') || '';
    setTempMeetLink(savedLink);
    setShowLinkModal(true);
  };

  const handleStartCall = async () => {
    if (!selectedConsultationForCall) return;
    
    let finalLink = tempMeetLink.trim();
    if (!finalLink) {
      alert("Please enter a valid Google Meet link.");
      return;
    }
    
    if (!finalLink.startsWith('http://') && !finalLink.startsWith('https://')) {
      finalLink = 'https://' + finalLink;
    }

    localStorage.setItem('doctor_meet_link', finalLink);
    setShowLinkModal(false);

    setActiveCallUrl(finalLink);
    setActiveCallPatient(selectedConsultationForCall.patient_name || 'Member');
    setActiveCallStatus('calling');
    setActiveCallId(selectedConsultationForCall.id);

    // Update status and save the actual Google Meet room URL in DB
    await supabase.from('doctor_consultations').update({ 
      status: 'calling',
      room_url: finalLink,
      updated_at: new Date().toISOString()
    }).eq('id', selectedConsultationForCall.id);

    // Open Google Meet in a new tab immediately for the doctor
    window.open(finalLink, '_blank');
    
    loadConsultations(doctor.id);
  };

  const endCall = () => {
    setActiveCallUrl('');
    setActiveCallPatient('');
    setActiveCallId(null);
  };

  // ── Prescribe ─────────────────────────────────────────────────────────
  const handlePrescribe = async () => {
    if (!prescribeCase || !doctor) return;
    setPrescribing(true);
    
    try {
      // Update consultation status and prescription text in DB
      // NOTE: We do not set prescription_ordered: true here anymore.
      // The pharmacy API dispatch will happen after the patient buys the membership plan.
      const { error } = await supabase.from('doctor_consultations').update({
        status: 'approved',
        prescription_type: prescriptionType,
        prescription_text: prescriptionText,
        updated_at: new Date().toISOString(),
      }).eq('id', prescribeCase.id);

      if (error) throw error;

      // Also update patient's health_assessments prescription_type
      if (prescribeCase.patient_id) {
        await supabase.from('health_assessments')
          .update({ prescription_type: prescriptionType })
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
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4"/> },
    { key: 'consultations', label: 'Consultations', icon: <Video className="w-4 h-4"/> },
    { key: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4"/> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4"/> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        .anim { animation: fadeIn 0.4s ease-out both; }
      `}</style>

      {/* ── ACTIVE VIDEO CALL OVERLAY ── */}
      {activeCallUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              <span className="font-black text-base">Live — {activeCallPatient}</span>
            </div>
            <button onClick={endCall} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg">
              End Session
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-905 text-white p-8">
            <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Video className="w-8 h-8 text-white"/>
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-tight">Google Meet Call Ready</h3>
                <p className="text-slate-400 text-sm font-semibold mt-2">Click the button below to start the Google Meet session with <strong>{activeCallPatient}</strong>.</p>
              </div>

              <div className="flex justify-center items-center gap-2.5 py-2 px-5 rounded-full bg-slate-800 border border-slate-700/50 w-fit mx-auto animate-pulse">
                <span className={`w-3.5 h-3.5 rounded-full ${activeCallStatus === 'calling' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}></span>
                <span className="text-sm font-black tracking-wide">
                  {activeCallStatus === 'calling' ? '📞 Ringing Member...' : '🟢 Member Connected!'}
                </span>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl text-left border border-slate-700/50">
                <p className="text-xs font-bold text-cyan-400">⚡ Google Meet will open in a new browser tab. Please keep this dashboard window open to write the prescription after the meeting.</p>
              </div>

              <div className="pt-2">
                <a
                  href={activeCallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  <Video className="w-5 h-5"/> Launch Google Meet
                </a>
              </div>

              <div className="border-t border-slate-800 pt-6 space-y-3">
                {activeCallStatus !== 'attended' && activeCallId && (
                  <button
                    onClick={async () => {
                      await supabase.from('doctor_consultations').update({
                        status: 'calling',
                        updated_at: new Date().toISOString()
                      }).eq('id', activeCallId);
                      setActiveCallStatus('calling');
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                  >
                    📞 Ring Member Again
                  </button>
                )}
                <button
                  onClick={endCall}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all"
                >
                  Close Session Panel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── GOOGLE MEET LINK CONFIGURATION MODAL ── */}
      {showLinkModal && selectedConsultationForCall && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl anim">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Video className="w-6 h-6 text-indigo-500"/> Start Video Call
              </h3>
              <button onClick={() => setShowLinkModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100">
              <p className="text-sm font-bold text-indigo-800">Calling: {selectedConsultationForCall.patient_name}</p>
              <p className="text-xs text-indigo-600 mt-1">Scheduled for: {selectedConsultationForCall.booking_date} @ {selectedConsultationForCall.booking_time}</p>
            </div>

            <label className={labelCls}>Google Meet Link (Or any valid meeting link) *</label>
            <input
              type="text"
              value={tempMeetLink}
              onChange={e => setTempMeetLink(e.target.value)}
              className={`${inputCls} mt-1 mb-2`}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              required
            />
            <p className="text-[11px] text-slate-500 font-bold mb-6">
              💡 Tip: Open <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">meet.new</a> in a new tab to create a live Google Meet link instantly, then paste it here.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowLinkModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all">Cancel</button>
              <button onClick={handleStartCall} disabled={!tempMeetLink.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                Call Member & Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRESCRIBE MODAL ── */}
      {prescribeCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl anim">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Pill className="w-6 h-6 text-blue-500"/> E-Prescription</h3>
              <button onClick={() => setPrescribeCase(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
              <p className="text-sm font-bold text-blue-800">Patient: {prescribeCase.patient_name}</p>
              <p className="text-xs text-blue-600 mt-1">Date: {prescribeCase.booking_date} @ {prescribeCase.booking_time}</p>
            </div>
            <label className={labelCls}>Select Medication Type</label>
            <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
              {(['Oral', 'Injectable'] as const).map(type => (
                <div key={type} onClick={() => setPrescriptionType(type)}
                  className={`cursor-pointer border-2 rounded-2xl p-4 text-center transition-all ${prescriptionType === type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                  <p className={`font-black text-base ${prescriptionType === type ? 'text-blue-700' : 'text-slate-700'}`}>
                    {type === 'Oral' ? '💊' : '💉'} {type}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{type === 'Oral' ? 'Daily tablet' : 'Weekly injection'}</p>
                </div>
              ))}
            </div>

            <label className={`${labelCls} mt-4`}>Prescription Notes & Dosage Instructions *</label>
            <textarea
              value={prescriptionText}
              onChange={e => setPrescriptionText(e.target.value)}
              className={`${inputCls} mt-1 mb-4`}
              rows={3}
              placeholder="e.g. Take 0.25mg once weekly on Wednesdays. Increase dose after 4 weeks."
              required
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p className="text-xs font-bold text-amber-800">⚡ Order will be placed automatically and sent to pharmacy with patient address & details.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPrescribeCase(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all">Cancel</button>
              <button onClick={handlePrescribe} disabled={prescribing || !prescriptionText.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                {prescribing ? 'Prescribing...' : 'Prescribe & Order ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl anim">
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
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200/60 flex flex-col shadow-sm flex-shrink-0">
          {/* Doctor info */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-md">
                <Stethoscope className="w-6 h-6 text-white"/>
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight">{doctorProfile?.full_name || doctor?.email?.split('@')[0] || 'Doctor'}</p>
                <p className="text-xs text-slate-500 font-semibold">Endocrinologist</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700">Online</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === t.key
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                {t.icon} {t.label}
                {t.key === 'consultations' && pendingCases > 0 && (
                  <span className="ml-auto bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingCases}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Wallet quick view */}
          <div className="p-4 border-t border-slate-100">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
              <p className="text-2xl font-black">₹{wallet.balance.toLocaleString('en-IN')}</p>
              <button onClick={() => setActiveTab('wallet')}
                className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1">
                <ArrowDownToLine className="w-3.5 h-3.5"/> Withdraw
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 pt-0">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
              <LogOut className="w-4 h-4"/> Logout
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">

          {/* ── TAB: OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="anim space-y-8">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 font-bold mt-1">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctorProfile?.full_name?.split(' ')[0] || 'Doctor'} 👋</p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Cases', value: consultations.length, icon: <Users className="w-5 h-5"/>, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600' },
                  { label: 'Approved', value: approvedCases, icon: <CheckCircle2 className="w-5 h-5"/>, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                  { label: 'Pending Review', value: pendingCases, icon: <Clock className="w-5 h-5"/>, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
                  { label: 'Not Approved', value: rejectedCases, icon: <XCircle className="w-5 h-5"/>, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className={`${s.bg} ${s.text} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>{s.icon}</div>
                    <p className="text-3xl font-black text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
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
                        <tr key={row.period} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
            </div>
          )}

          {/* ── TAB: SCHEDULE ── */}
          {activeTab === 'schedule' && (
            <div className="anim space-y-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Availability Schedule</h1>

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
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                    <p className="font-bold">No slots added yet. Add your availability above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availSlots.map(slot => (
                      <div key={slot.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${slot.is_booked ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: CONSULTATIONS ── */}
          {activeTab === 'consultations' && (
            <div className="anim space-y-6">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Consultations</h1>

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
                <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm border border-slate-100">
                  <Users className="w-16 h-16 mx-auto mb-4 text-slate-200"/>
                  <p className="font-black text-slate-600 text-lg">No consultations yet</p>
                  <p className="text-slate-400 font-semibold mt-2">Members will appear here once they book a video call</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map(c => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
                      attended: { label: 'Attended — Pending Review', color: 'bg-amber-100 text-amber-700' },
                      approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
                      rejected: { label: 'Not Approved', color: 'bg-rose-100 text-rose-700' },
                      not_attended: { label: 'Not Attended', color: 'bg-slate-100 text-slate-600' },
                      cancelled: { label: 'Cancelled', color: 'bg-slate-200 text-slate-500' },
                    };
                    const st = statusMap[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-600' };
                    return (
                      <div key={c.id} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <p className="font-black text-slate-900 text-lg">{c.patient_name || 'Member'}</p>
                              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${st.color}`}>{st.label}</span>
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
                            {c.room_url && ['scheduled', 'attended'].includes(c.status) && (
                              <button onClick={() => joinCall(c)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md">
                                <Video className="w-4 h-4"/> Join Call
                              </button>
                            )}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: PRESCRIPTIONS (E-Prescription Portal) ── */}
          {activeTab === 'prescriptions' && (
            <div className="anim space-y-6">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">E-Prescription Portal</h1>
              <p className="text-slate-500 font-semibold">All approved prescriptions — visible to both doctor and patient.</p>

              {consultations.filter(c => c.status === 'approved').length === 0 ? (
                <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm border border-slate-100">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200"/>
                  <p className="font-black text-slate-600 text-lg">No prescriptions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.filter(c => c.status === 'approved').map(c => (
                    <div key={c.id} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: WALLET ── */}
          {activeTab === 'wallet' && (
            <div className="anim space-y-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">8liv Doctor Wallet</h1>

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
                  <div className="text-center py-8 text-slate-400">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                    <p className="font-bold">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}