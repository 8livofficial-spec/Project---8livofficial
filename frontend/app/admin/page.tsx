'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ShieldCheck, Users, User, Video, Apple, Dumbbell, Clock, Stethoscope, Pill, Syringe, Activity, CheckCircle2, Home as HomeIcon, PhoneOff, FileText, Scale, Target, ChevronRight, AlertCircle, Wallet, ArrowDownToLine, RefreshCw, LogOut, Link2, Timer, Trash2, GitMerge, ClipboardList, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import SessionMonitor from '@/components/admin/SessionMonitor';
// ── Helper: format duration from timestamps ──────────────────────────────
function fmtDuration(startedAt: string | null, endedAt: string | null): string {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminDashboard() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientLogs, setPatientLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'patients' | 'doctors' | 'connections' | 'payouts' | 'staff' | 'plans'>('patients');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);

  // ── Auth states ────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── New Tab state ──────────────────────────────────────────────────────
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // ── Care Team Assignment state ──────────────────────────────────────────
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  // ── Revenue State ───────────────────────────────────────────────────────
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);

  // ── Staff Form state ────────────────────────────────────────────────────
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'doctor' | 'dietitian' | 'trainer'>('doctor');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffDeleting, setStaffDeleting] = useState(false);

  // ── Plan Form state ─────────────────────────────────────────────────────
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planConsultFee, setPlanConsultFee] = useState('499');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);
  const [planDiscountCode, setPlanDiscountCode] = useState('');
  const [planDiscountPercent, setPlanDiscountPercent] = useState('0');
  const [planSubmitting, setPlanSubmitting] = useState(false);

  const resetStaffForm = () => {
    setStaffEmail('');
    setStaffPassword('');
    setStaffRole('doctor');
    setStaffFirstName('');
    setStaffLastName('');
    setStaffPhone('');
  };

  const handleRemoveStaff = async (staffMember: any) => {
    if (!adminUser) return;
    if (staffMember.id === adminUser.id) {
      alert("Security Block: You cannot delete your own logged-in admin account!");
      return;
    }

    const firstConfirm = window.confirm(
      `Are you absolutely sure you want to remove ${staffMember.first_name} ${staffMember.last_name} (${staffMember.role})?\n\nThis will completely delete their account and dissociate them from all assigned care teams.`
    );
    if (!firstConfirm) return;

    const doubleCheck = window.prompt(
      `CRITICAL WARNING: This action cannot be undone.\nTo permanently delete this user, please type the word 'REMOVE' below:`
    );
    if (doubleCheck !== 'REMOVE') {
      alert("Action cancelled. Input did not match 'REMOVE'.");
      return;
    }

    setStaffDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?adminId=${adminUser.id}&userId=${staffMember.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member.');
      }
      alert(`Successfully removed ${staffMember.first_name} ${staffMember.last_name} from the system.`);
      setSelectedStaff(null);
      
      // Refresh all necessary listings in background
      await Promise.all([
        fetchStaffProfiles(),
        fetchPayoutsData(),
        fetchConnections(),
        fetchPatients()
      ]);
    } catch (err: any) {
      console.error('[Remove Staff Error]', err);
      alert('Error removing staff member: ' + err.message);
    } finally {
      setStaffDeleting(false);
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanPrice('');
    setPlanConsultFee('499');
    setPlanFeatures('');
    setPlanIsActive(true);
    setPlanDiscountCode('');
    setPlanDiscountPercent('0');
  };

  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        setAuthChecking(true);
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) {
          setAuthError('Please sign in to access the administrator control center.');
          setAuthChecking(false);
          setLoading(false);
          router.push('/');
          return;
        }

        const profileRes = await fetch(`/api/admin/profile?userId=${session.user.id}`);
        if (!profileRes.ok) {
          setAuthError('Access Denied. You do not have permission to view the admin control center.');
          setAuthChecking(false);
          setLoading(false);
          return;
        }

        const { profile } = await profileRes.json();

        if (!profile || profile.role !== 'admin') {
          setAuthError('Access Denied. You do not have permission to view the admin control center.');
          setAuthChecking(false);
          setLoading(false);
          return;
        }

        setAdminUser(profile);
        setAuthChecking(false);

        // Load data
        await Promise.all([
          fetchPatients(),
          fetchPayoutsData(),
          fetchConnections(),
          fetchStaffProfiles(),
          fetchPlans()
        ]);
      } catch (err: any) {
        setAuthError('Authentication verification failed: ' + (err.message || err));
        setAuthChecking(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, []);

  // ── Fetch staff profiles ───────────────────────────────────────────────
  const fetchStaffProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, phone_number')
        .in('role', ['admin', 'doctor', 'dietitian', 'trainer'])
        .order('role', { ascending: true });
      if (!error && data) {
        setAllStaff(data);
      }
    } catch (err) {
      console.error('[Staff Fetch Error]', err);
    }
  };

  // ── Fetch plans from backend API ───────────────────────────────────────
  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('[Plans Fetch Error]', err);
    }
  };

  // ── Fetch assignments for a patient ────────────────────────────────────
  const fetchPatientAssignment = async (patientId: string) => {
    if (!adminUser) return;
    setAssignmentLoading(true);
    try {
      const res = await fetch(`/api/admin/assignments?patientId=${patientId}&adminId=${adminUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.assignment) {
          setCurrentAssignment({
            doctor_id: data.assignment.doctor_id || '',
            dietitian_id: data.assignment.dietitian_id || '',
            trainer_id: data.assignment.trainer_id || ''
          });
        } else {
          setCurrentAssignment({ doctor_id: '', dietitian_id: '', trainer_id: '' });
        }
      }
    } catch (err) {
      console.error('Failed to fetch patient assignments:', err);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // ── Update Care Team clinician assignment ───────────────────────────────
  const handleUpdateAssignment = async (roleType: 'doctor' | 'dietitian' | 'trainer', value: string) => {
    if (!adminUser || !selectedPatient) return;
    setUpdatingAssignment(true);
    try {
      const payload = {
        adminId: adminUser.id,
        patientId: selectedPatient.patient_id,
        doctorId: roleType === 'doctor' ? value : currentAssignment?.doctor_id,
        dietitianId: roleType === 'dietitian' ? value : currentAssignment?.dietitian_id,
        trainerId: roleType === 'trainer' ? value : currentAssignment?.trainer_id,
      };

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCurrentAssignment({
          doctor_id: payload.doctorId || '',
          dietitian_id: payload.dietitianId || '',
          trainer_id: payload.trainerId || ''
        });
        alert('Care team updated and patient notified! ✅');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update care team.');
      }
    } catch (err: any) {
      alert('Error updating assignment: ' + err.message);
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // ── Fetch doctor-patient connections ───────────────────────────────────
  const fetchConnections = async () => {
    try {
      // Get all consultations that have been at least scheduled
      const { data: cons } = await supabase
        .from('doctor_consultations')
        .select('id, patient_id, doctor_id, status, booking_date, booking_time, prescription_type, prescription_text, prescription_notes, call_started_at, call_ended_at, created_at')
        .in('status', ['scheduled', 'calling', 'attended', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (!cons || cons.length === 0) { setConnections([]); return; }

      // Fetch doctor profiles
      const docIds = [...new Set(cons.map((c: any) => c.doctor_id))];
      const { data: docProfiles } = await supabase
        .from('doctor_profiles')
        .select('id, full_name')
        .in('id', docIds);

      // Fetch patient names from health_assessments
      const patientIds = [...new Set(cons.map((c: any) => c.patient_id))];
      const { data: patientData } = await supabase
        .from('health_assessments')
        .select('patient_id, full_name, first_name, last_name, phone_number, age')
        .in('patient_id', patientIds);

      const docMap: Record<string, string> = {};
      if (docProfiles) docProfiles.forEach((d: any) => { docMap[d.id] = d.full_name || 'Dr. Expert'; });

      const patMap: Record<string, any> = {};
      if (patientData) patientData.forEach((p: any) => { patMap[p.patient_id] = p; });

      const enriched = cons.map((c: any) => ({
        ...c,
        doctor_name: docMap[c.doctor_id] || 'Unknown Doctor',
        patient_name: patMap[c.patient_id]?.full_name || `${patMap[c.patient_id]?.first_name || ''} ${patMap[c.patient_id]?.last_name || ''}`.trim() || 'Unknown Patient',
        patient_phone: patMap[c.patient_id]?.phone_number || '',
        patient_age: patMap[c.patient_id]?.age || '',
      }));

      setConnections(enriched);
    } catch (err) {
      console.error('[Connections Fetch Error]', err);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('health_assessments')
      .select(`
        id, patient_id, full_name, first_name, last_name, age, phone_number, address, dob_month, dob_day, dob_year, agree_terms,
        height_cm, weight_kg, goal_weight_kg, tried_weight_program, extra_medical_info, prescription_type,
        health_conditions_two, glp1_image_url,
        is_eligible, medical_history, booking_date, booking_time, room_url, local_food, workout_preference, created_at, consultation_fee_paid
      `)
      .order('created_at', { ascending: false });

    if (!error && data) { 
      setAssessments(data); 
    }
    setLoading(false);
  };

  const fetchPayoutsData = async () => {
    setPayoutLoading(true);
    try {
      const { data: profiles } = await supabase.from('doctor_profiles').select('*');
      const { data: wallets } = await supabase.from('doctor_wallet').select('*');
      const { data: txs } = await supabase.from('doctor_wallet_transactions').select('*').order('created_at', { ascending: false });

      if (profiles && wallets) {
        const doctorsWithWallets = profiles.map((doc: any) => {
          const wallet = wallets.find((w: any) => w.doctor_id === doc.id) || { balance: 0, total_earned: 0, total_withdrawn: 0 };
          return {
            ...doc,
            doctor_id: doc.id,
            balance: wallet.balance,
            total_earned: wallet.total_earned,
            total_withdrawn: wallet.total_withdrawn,
          };
        });
        setDoctors(doctorsWithWallets);
      }
      if (txs) {
        setTransactions(txs);
      }

      // Fetch monthly revenue from patient payments
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'success')
        .gte('created_at', startOfMonth.toISOString());
      
      if (payments) {
        const total = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        setMonthlyRevenue(total);
      }
    } catch (err) {
      console.error('[Payouts Fetch Error]', err);
    }
    setPayoutLoading(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
      router.push('/');
    } catch (err) {
      console.error('[Logout Error]', err);
    }
  };

  const handleMarkAsPaid = async (txId: string, doctorName: string, amount: number) => {
    const confirmed = window.confirm(
      `Mark this ₹${amount} withdrawal request from ${doctorName || 'the doctor'} as paid?\n\nMake sure you have personally / manually sent the money to the doctor's bank account.`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('doctor_wallet_transactions')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', txId);

      if (error) {
        alert('Error updating transaction status: ' + error.message);
      } else {
        alert('Withdrawal request successfully marked as paid! ✅');
        fetchPayoutsData();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (selectedPatient?.patient_id) {
      fetchPatientLogs(selectedPatient.patient_id, selectedPatient.weight_kg);
      fetchPatientAssignment(selectedPatient.patient_id);
    } else { 
      setPatientLogs([]); 
      setCurrentAssignment(null);
    }
  }, [selectedPatient, adminUser]);

  const fetchPatientLogs = async (userId: string, startWeight: number) => {
    const { data, error } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    const startData = { day: 'Start', weight: parseFloat(startWeight as any) || 0 };
    
    if (!error && data && data.length > 0) {
      const dbData = data.map((log: any) => {
        const dateObj = new Date(log.created_at);
        const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;
        return { day: formattedDate, weight: parseFloat(log.weight_kg), calories: log.calories };
      });
      setPatientLogs([startData, ...dbData]);
    } else { 
      setPatientLogs([startData]); 
    }
  };

  const handlePrescription = async (type: string) => {
    setPrescribeLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_URL}/api/prescribe`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient.patient_id, prescription_type: type }),
      });
      
      if (response.ok) {
        alert(`Prescription for ${type} Medicine placed successfully! ✅`);
        setSelectedPatient({...selectedPatient, prescription_type: type});
        fetchPatients();
      } else {
        alert("Failed to save prescription. Please try again.");
      }
    } catch (error) {
      alert("Network Error: Could not connect to the backend server.");
      console.error("[Admin API Error]", error);
    }
    setPrescribeLoading(false);
  };

  const hasLocalFood = selectedPatient?.local_food && selectedPatient.local_food.trim().length > 0;
  const hasWorkoutPref = selectedPatient?.workout_preference && selectedPatient.workout_preference.trim().length > 0;
  const hasDietFitnessData = hasLocalFood || hasWorkoutPref;

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-black text-slate-300 mt-6 tracking-wide">Verifying credentials...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-955 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8"/>
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Security Alert</h3>
            <p className="text-slate-400 text-sm font-semibold mt-3 leading-relaxed">{authError}</p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm"
            >
              Go to Homepage
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-2xl text-sm transition-all"
            >
              Logout / Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="w-8 h-8 border-4 border-violet-100 border-t-violet-500 rounded-full animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 direction-reverse"></div>
        </div>
        <p className="text-lg font-black text-slate-600 mt-6 tracking-wide">Loading Admin System...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 relative">
      
      {/* ── BACKGROUND DECORATIONS ── */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* ── LEFT SIDEBAR ── */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[380px] bg-white/80 backdrop-blur-2xl border-r border-white/60 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.03)] z-20"
      >
        <div className="p-8 bg-[#1A1F36] text-white rounded-br-[3rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-orange-500"/> 8liv Admin</h1>
          <p className="text-[#5C7A6B] text-sm mt-2 font-bold tracking-wide uppercase">Control Center</p>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 flex flex-col py-6 px-4 gap-2 overflow-y-auto">
          {[
            { id: 'patients', label: 'Members', icon: Users },
            { id: 'doctors', label: 'Doctors', icon: Stethoscope },
            { id: 'connections', label: 'Pairs', icon: GitMerge },
            { id: 'payouts', label: 'Payouts', icon: DollarSign },
            { id: 'staff', label: 'Staff Mgmt', icon: ShieldCheck },
            { id: 'plans', label: 'Plans', icon: ClipboardList }
          ].map(item => {
            const isActive = adminTab === item.id;
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setAdminTab(item.id as any);
                  if (item.id === 'doctors') setSelectedDoctor(null);
                  if (item.id === 'connections') { setSelectedConnection(null); fetchConnections(); }
                }}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-black tracking-wide uppercase transition-all rounded-r-xl border-l-4 ${
                  isActive 
                    ? 'bg-orange-50 text-orange-600 border-orange-500 shadow-sm' 
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {adminTab === 'patients' ? (
            <>
              <div className="flex flex-col gap-3 mb-4 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4"/> Member Roster ({assessments.length})</h3>
                <a
                  href={`/api/admin/reports?adminId=${adminUser?.id}&format=csv`}
                  download="8liv_patients_report.csv"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] w-full"
                >
                  <ArrowDownToLine className="w-4 h-4"/> Export Patient Roster (CSV)
                </a>
              </div>
              {assessments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mx-2">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 mb-1">No members found</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-[200px]">New registered members will appear here automatically.</p>
                </div>
              ) : (
                assessments.map((patient, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={patient.id} 
                    onClick={() => { setSelectedPatient(patient); setSelectedDoctor(null); }} 
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border hover:-translate-y-1 ${selectedPatient?.id === patient.id ? 'ring-2 ring-orange-500 bg-orange-50/50 shadow-md border-transparent scale-[1.01]' : 'border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:bg-orange-50/30'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-black text-slate-800 text-lg leading-tight pr-2">{patient.first_name || patient.last_name ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : `Member #${patient.id?.slice(0, 4)}`}</h4>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex-shrink-0 shadow-sm ${patient.is_eligible ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>{patient.is_eligible ? 'Eligible' : 'Rejected'}</span>
                    </div>
                    <div className="flex gap-5 text-xs font-bold text-slate-500 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="flex items-center gap-1.5"><Scale className="w-4 h-4 text-slate-400"/> {patient.weight_kg} kg</p>
                      <p className="flex items-center gap-1.5 text-indigo-600"><Target className="w-4 h-4 text-indigo-400"/> {patient.goal_weight_kg} kg</p>
                    </div>

                    {/* Member Payment Status */}
                    <div className="mt-2 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl border flex items-center justify-between shadow-sm bg-white">
                      <span>Payment Status:</span>
                      {patient.consultation_fee_paid ? (
                        patient.booking_date ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Call Booked</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Paid (Not Scheduled)</span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Needs Payment</span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </>
          ) : adminTab === 'doctors' ? (
            <>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2"><Stethoscope className="w-4 h-4"/> Doctor Profiles ({doctors.length})</h3>
              {doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mx-2">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                    <Stethoscope className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 mb-1">No doctors found</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-[200px]">Register doctors in the Staff Mgmt tab.</p>
                </div>
              ) : (
                doctors.map((doc, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={doc.doctor_id} 
                    onClick={() => { setSelectedDoctor(doc); setSelectedPatient(null); }}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border hover:-translate-y-1 ${selectedDoctor?.doctor_id === doc.doctor_id ? 'ring-2 ring-orange-500 bg-orange-50/50 shadow-md border-transparent scale-[1.01]' : 'border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:bg-orange-50/30'}`}
                  >
                    <h4 className="font-black text-slate-800 text-base leading-tight pr-2 mb-2">{doc.full_name || 'Dr. Doctor'}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {doc.doctor_id.slice(0, 8)}...</p>
                  </motion.div>
                ))
              )}
            </>
          ) : adminTab === 'connections' ? (
            <>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2"><Link2 className="w-4 h-4"/> Doctor–Patient Pairs ({connections.length})</h3>
              {connections.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mx-2">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                    <GitMerge className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 mb-1">No pairs yet</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-[200px]">Assign members to their care teams to create pairs.</p>
                </div>
              ) : (
                connections.map((conn, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={conn.id}
                    onClick={() => setSelectedConnection(conn)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border hover:-translate-y-1 ${selectedConnection?.id === conn.id ? 'ring-2 ring-orange-500 bg-orange-50/50 shadow-md border-transparent scale-[1.01]' : 'border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:bg-orange-50/30'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wide">{conn.status}</span>
                    </div>
                    <p className="font-black text-slate-800 text-sm">{conn.patient_name}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">→ {conn.doctor_name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{conn.booking_date} @ {conn.booking_time}</p>
                  </motion.div>
                ))
              )}
            </>
          ) : adminTab === 'staff' ? (
            <>
              <div className="px-2 mb-4 space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4"/> Staff Directory ({allStaff.length})
                </h3>
                <button
                  onClick={() => { setSelectedStaff(null); resetStaffForm(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                >
                  + Appoint New Staff
                </button>
              </div>
              {allStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mx-2">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 mb-1">No staff found</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-[200px]">Add staff members to manage the platform.</p>
                </div>
              ) : (
                allStaff.map((staff, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border hover:-translate-y-1 ${selectedStaff?.id === staff.id ? 'ring-2 ring-orange-500 bg-orange-50/50 shadow-md border-transparent scale-[1.01]' : 'border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:bg-orange-50/30'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 text-base leading-tight pr-2">
                        {staff.first_name} {staff.last_name}
                      </h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${staff.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : staff.role === 'doctor' ? 'bg-blue-100 text-blue-700 border border-blue-200' : staff.role === 'dietitian' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                        {staff.role}
                      </span>
                    </div>
                    {staff.phone_number && <p className="text-xs font-bold text-slate-500">📞 {staff.phone_number}</p>}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {staff.id.slice(0, 8)}...</p>
                  </motion.div>
                ))
              )}
            </>
          ) : adminTab === 'plans' ? (
            <>
              <div className="px-2 mb-4 space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Apple className="w-4 h-4"/> Membership Tiers ({plans.length})
                </h3>
                <button
                  onClick={() => { setSelectedPlan(null); resetPlanForm(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                >
                  + Configure New Plan
                </button>
              </div>
              {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mx-2">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                    <Apple className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 mb-1">No active plans found</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-[200px]">Create membership plans for patients.</p>
                </div>
              ) : (
                plans.map((plan, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={plan.id || plan.name}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPlanName(plan.name);
                      setPlanPrice(plan.price_monthly.toString());
                      setPlanConsultFee((plan.consultation_fee || 499).toString());
                      setPlanFeatures(plan.features?.join(', ') || '');
                      setPlanIsActive(plan.is_active !== false);
                      setPlanDiscountCode(plan.discount_code || '');
                      setPlanDiscountPercent((plan.discount_percent || 0).toString());
                    }}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border hover:-translate-y-1 ${selectedPlan?.name === plan.name ? 'ring-2 ring-orange-500 bg-orange-50/50 shadow-md border-transparent scale-[1.01]' : 'border-slate-100 bg-white shadow-sm hover:border-orange-200 hover:shadow-md hover:bg-orange-50/30'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-800 text-base leading-tight pr-2">
                        {plan.name}
                      </h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-slate-500">
                      <span>Monthly Fee:</span>
                      <span className="text-indigo-600">₹{plan.price_monthly}</span>
                    </div>
                    {plan.discount_code && (
                      <div className="mt-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md font-bold inline-block">
                        🏷️ Code: {plan.discount_code} ({plan.discount_percent}% off)
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </>
          ) : (
            <>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2"><Stethoscope className="w-4 h-4"/> Doctor Wallets ({doctors.length})</h3>
              {doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <Stethoscope className="w-10 h-10 text-gray-300 mb-4" />
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">No doctors found</h3>
                </div>
              ) : (
                doctors.map((doc, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={doc.doctor_id} 
                    className="p-5 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all space-y-3"
                  >
                    <h4 className="font-black text-slate-800 text-base leading-tight pr-2">{doc.full_name || 'Dr. Doctor'}</h4>
                    <div className="space-y-1.5 text-xs font-bold text-slate-500">
                      <p className="flex justify-between"><span>Wallet Balance:</span> <span className="text-indigo-600 font-extrabold">₹{doc.balance}</span></p>
                      <p className="flex justify-between"><span>Total Earned:</span> <span className="text-slate-700">₹{doc.total_earned}</span></p>
                      <p className="flex justify-between"><span>Total Withdrawn:</span> <span className="text-slate-700">₹{doc.total_withdrawn}</span></p>
                    </div>
                  </motion.div>
                ))
              )}
            </>
          )}
        </div>

        {/* Sign Out */}
        <div className="p-4 pt-0 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-red-100 hover:border-red-200"
          >
            <LogOut className="w-4 h-4"/> Sign Out
          </button>
        </div>
      </motion.div>

      {/* ── RIGHT MAIN AREA ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex-1 overflow-y-auto relative z-10 custom-scrollbar bg-[#F5F0EB]/20"
      >
        {activeCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-950 flex flex-col">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shadow-2xl border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]"></span>
                </div>
                <h2 className="text-xl font-black tracking-wide">Live {activeCall} Session <span className="text-slate-500 font-medium">|</span> {selectedPatient?.first_name || selectedPatient?.last_name ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() : 'Member'}</h2>
              </div>
              <button onClick={() => setActiveCall(null)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-rose-600/30 active:scale-95"><PhoneOff className="w-5 h-5"/> End Session</button>
            </div>
            <div className="flex-1 w-full bg-slate-900 p-6 flex items-center justify-center">
              <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl text-center space-y-6 text-white">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <Video className="w-8 h-8 text-white"/>
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight">Google Meet Call Ready</h3>
                  <p className="text-slate-400 text-sm font-semibold mt-2">Click the button below to join the Google Meet session for the <strong>{activeCall} View</strong>.</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl text-left border border-slate-700/50">
                  <p className="text-xs font-bold text-indigo-300">⚡ Google Meet will open in a new browser tab. Please keep this dashboard window open to manage the patient's record after the meeting.</p>
                </div>

                <div className="pt-2">
                  <a
                    href={selectedPatient?.room_url || "https://meet.google.com/abc-defg-hij"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
                  >
                    <Video className="w-5 h-5"/> Launch Google Meet
                  </a>
                </div>

                <div className="border-t border-slate-800 pt-6">
                  <button
                    onClick={() => setActiveCall(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all"
                  >
                    Close Session Panel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {adminTab === 'connections' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-5xl mx-auto">
            {selectedConnection ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setSelectedConnection(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-all flex items-center gap-2">
                    ← Back
                  </button>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Link2 className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Connection Details
                  </h2>
                </div>

                {/* Doctor info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4"/> Doctor</h3>
                    <p className="text-2xl font-black text-slate-900">{selectedConnection.doctor_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block">ID: {selectedConnection.doctor_id}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User className="w-4 h-4"/> Patient</h3>
                    <p className="text-2xl font-black text-slate-900">{selectedConnection.patient_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block">ID: {selectedConnection.patient_id}</p>
                    {selectedConnection.patient_phone && <p className="text-xs text-slate-500 font-bold mt-1">📞 {selectedConnection.patient_phone}</p>}
                    {selectedConnection.patient_age && <p className="text-xs text-slate-500 font-bold mt-0.5">Age: {selectedConnection.patient_age}</p>}
                  </div>
                </div>

                {/* Consultation details */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Consultation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`text-sm font-black uppercase px-3 py-1 rounded-full ${selectedConnection.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : selectedConnection.status === 'attended' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{selectedConnection.status}</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Date</p>
                      <p className="font-black text-slate-900 text-sm">{selectedConnection.booking_date || '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Time</p>
                      <p className="font-black text-slate-900 text-sm">{selectedConnection.booking_time || '—'}</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Timer className="w-3 h-3"/> Call Duration</p>
                      <p className="font-black text-indigo-700 text-sm">{fmtDuration(selectedConnection.call_started_at, selectedConnection.call_ended_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Prescription */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Pill className="w-4 h-4"/> Prescription</h3>
                  {selectedConnection.prescription_type ? (
                    <div className="space-y-3">
                      <div className="flex gap-3 flex-wrap">
                        <span className={`font-black px-4 py-2 rounded-xl text-sm border ${selectedConnection.prescription_type === 'none' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                          {selectedConnection.prescription_type === 'none' ? '🚫 No Prescription' : selectedConnection.prescription_type === 'Oral' ? '💊 Oral' : '💉 Injectable'}
                        </span>
                      </div>
                      {selectedConnection.prescription_text && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Doctor's Notes</p>
                          <p className="text-slate-800 font-semibold text-sm leading-relaxed whitespace-pre-wrap">{selectedConnection.prescription_text}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 font-semibold text-sm">No prescription written yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-32">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                  <Link2 className="w-10 h-10 text-indigo-400"/>
                </div>
                <h3 className="text-xl font-black text-slate-700">Select a Connection</h3>
                <p className="text-slate-400 font-semibold mt-2 text-sm">Click any pair on the left to see full details</p>
              </div>
            )}
          </motion.div>
        ) : adminTab === 'payouts' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-6xl mx-auto space-y-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Wallet className="w-10 h-10 text-indigo-500 bg-indigo-50 p-2 rounded-2xl"/> Payout Requests
                </h2>
                <p className="text-slate-500 font-bold mt-2">Verify and log manual/personal offline transfers sent to doctors.</p>
              </div>
              <button 
                onClick={fetchPayoutsData} 
                className="bg-white border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 font-bold px-5 py-3 rounded-2xl text-xs shadow-sm transition-all flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${payoutLoading ? 'animate-spin' : ''}`}/> Refresh Data
              </button>
            </div>

            {/* PENDING WITHDRAWAL REQUESTS */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500 bg-amber-50 p-1.5 rounded-xl"/> Pending Withdrawal Requests
              </h3>
              {transactions.filter(tx => tx.type === 'withdrawal' && tx.status !== 'paid' && tx.status !== 'approved' && tx.status !== 'completed').length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">All cleared!</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">No pending withdrawal requests from doctors.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'withdrawal' && tx.status !== 'paid' && tx.status !== 'approved' && tx.status !== 'completed').map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border border-orange-200 bg-orange-50/50 gap-4 transition-colors hover:bg-orange-50 hover:border-orange-300 cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight">{doc?.full_name || 'Dr. Doctor'}</h4>
                          <p className="text-xs text-slate-400 font-bold mt-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Requested: {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          <span className="text-[10px] font-black text-amber-700 bg-amber-100 uppercase tracking-widest px-2.5 py-1 rounded-md mt-3 inline-block">Pending Payout</span>
                        </div>
                        <div className="flex items-center gap-6 self-end md:self-auto">
                          <p className="text-3xl font-black text-slate-900">₹{tx.amount.toLocaleString('en-IN')}</p>
                          <button 
                            onClick={() => handleMarkAsPaid(tx.id, doc?.full_name, tx.amount)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4"/> Mark as Paid (Offline)
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COMPLETED PAYOUTS HISTORY */}
            <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-emerald-50 p-1.5 rounded-xl"/> Payout History
              </h3>
              {transactions.filter(tx => tx.type === 'withdrawal' && (tx.status === 'paid' || tx.status === 'approved' || tx.status === 'completed')).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-2">No completed payouts</h3>
                  <p className="text-sm font-semibold text-slate-400 max-w-[250px]">No completed payouts history found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.filter(tx => tx.type === 'withdrawal' && (tx.status === 'paid' || tx.status === 'approved' || tx.status === 'completed')).map((tx: any, index: number) => {
                    const doc = doctors.find(d => d.doctor_id === tx.doctor_id);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={tx.id} 
                        className="flex items-center justify-between p-5 rounded-[1.8rem] border border-slate-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                            <ArrowDownToLine className="w-6 h-6"/>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base">Payout to {doc?.full_name || 'Dr. Doctor'}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl text-emerald-600">-₹{tx.amount.toLocaleString('en-IN')}</p>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 mt-1.5 inline-block">Paid Offline</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : adminTab === 'staff' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-4xl mx-auto space-y-8">
            {selectedStaff ? (
              <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                  >
                    ← Back to Appoint Form
                  </button>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Member Details</h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                    <p className="text-xl font-black text-slate-800">{selectedStaff.first_name} {selectedStaff.last_name}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Role</p>
                    <span className={`text-sm font-black uppercase px-3 py-1 rounded-full inline-block mt-1 ${selectedStaff.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : selectedStaff.role === 'doctor' ? 'bg-blue-100 text-blue-700 border border-blue-200' : selectedStaff.role === 'dietitian' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {selectedStaff.role}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="text-lg font-bold text-slate-700">{selectedStaff.phone_number || 'N/A'}</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unique User ID</p>
                    <p className="text-sm font-mono text-slate-500">{selectedStaff.id}</p>
                  </div>
                </div>

                {/* Remove Staff Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                  {selectedStaff.id === adminUser?.id ? (
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 text-xs font-black text-center uppercase tracking-wider">
                      🛡️ Currently Logged In (Self-deletion Blocked)
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRemoveStaff(selectedStaff)}
                      disabled={staffDeleting}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm font-black text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 transition-all duration-300 shadow-lg hover:shadow-rose-600/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
                    >
                      {staffDeleting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Removing Staff Member...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5"/>
                          Remove Staff Member / Doctor
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-indigo-500 bg-indigo-50/80 p-1.5 rounded-xl"/> Appoint New Clinician / Staff
                </h2>
                <p className="text-slate-500 font-semibold text-sm mb-8">
                  Appoint a new administrator, doctor (physician), dietitian, or fitness trainer. Credentials will bypass email confirmation requirements.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!adminUser) return;
                    if (!staffEmail || !staffPassword || !staffFirstName || !staffLastName) {
                      alert('Please fill in all required fields.');
                      return;
                    }
                    setStaffSubmitting(true);
                    try {
                      const res = await fetch('/api/admin/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          adminId: adminUser.id,
                          email: staffEmail,
                          password: staffPassword,
                          role: staffRole,
                          firstName: staffFirstName,
                          lastName: staffLastName,
                          phoneNumber: staffPhone
                        })
                      });

                      if (res.ok) {
                        alert('New staff member appointed successfully! ✅');
                        resetStaffForm();
                        await fetchStaffProfiles();
                      } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to appoint staff.');
                      }
                    } catch (err: any) {
                      alert('Error: ' + err.message);
                    } finally {
                      setStaffSubmitting(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">First Name *</label>
                      <input
                        type="text"
                        required
                        value={staffFirstName}
                        onChange={(e) => setStaffFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={staffLastName}
                        onChange={(e) => setStaffLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="doctor@8liv.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Initial Password *</label>
                      <input
                        type="password"
                        required
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">System Role *</label>
                      <select
                        value={staffRole}
                        onChange={(e: any) => setStaffRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="doctor">Doctor (Physician)</option>
                        <option value="dietitian">Dietitian</option>
                        <option value="trainer">Fitness Coach</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={staffSubmitting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                      {staffSubmitting ? 'Appointing Clinician...' : 'Appoint Staff Member'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        ) : adminTab === 'plans' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Apple className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> 
                    {selectedPlan ? `Configure: ${selectedPlan.name}` : 'Create Membership Plan'}
                  </h2>
                  <p className="text-slate-500 font-semibold text-sm mt-1">
                    {selectedPlan ? 'Update pricing tiers, consultation fee, promotional discount codes, and features.' : 'Initialize a new membership subscription tier.'}
                  </p>
                </div>
                {selectedPlan && (
                  <button
                    onClick={() => { setSelectedPlan(null); resetPlanForm(); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    Create Instead
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!adminUser) return;
                  if (!planName || !planPrice) {
                    alert('Please fill in Plan Name and Monthly Price.');
                    return;
                  }
                  setPlanSubmitting(true);
                  try {
                    const parsedFeatures = planFeatures.split(',').map(f => f.trim()).filter(f => f.length > 0);
                    const res = await fetch('/api/admin/plans', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        adminId: adminUser.id,
                        name: planName,
                        priceMonthly: parseFloat(planPrice),
                        consultationFee: parseFloat(planConsultFee || '499'),
                        features: parsedFeatures,
                        isActive: planIsActive,
                        discountCode: planDiscountCode || null,
                        discountPercent: parseInt(planDiscountPercent || '0')
                      })
                    });

                    if (res.ok) {
                      alert('Membership plan saved successfully! ✅');
                      resetPlanForm();
                      setSelectedPlan(null);
                      await fetchPlans();
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Failed to save plan.');
                    }
                  } catch (err: any) {
                    alert('Error: ' + err.message);
                  } finally {
                    setPlanSubmitting(false);
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Name *</label>
                    <input
                      type="text"
                      required
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Silver Plan / Gold Plan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Monthly Subscription Price (INR) *</label>
                    <input
                      type="number"
                      required
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Consultation Fee (INR)</label>
                    <input
                      type="number"
                      value={planConsultFee}
                      onChange={(e) => setPlanConsultFee(e.target.value)}
                      placeholder="499"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6 h-full">
                    <input
                      id="planIsActive"
                      type="checkbox"
                      checked={planIsActive}
                      onChange={(e) => setPlanIsActive(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="planIsActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Plan is Active (Visible to members during checkout)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Discount Code (Promo Code)</label>
                    <input
                      type="text"
                      value={planDiscountCode}
                      onChange={(e) => setPlanDiscountCode(e.target.value)}
                      placeholder="SAVE20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Discount Percent (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={planDiscountPercent}
                      onChange={(e) => setPlanDiscountPercent(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Features (comma-separated)</label>
                  <textarea
                    rows={4}
                    value={planFeatures}
                    onChange={(e) => setPlanFeatures(e.target.value)}
                    placeholder="GLP-1 Prescriptions, 1:1 Video Consultations, Pharmacy Delivery, priority chat support"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Separate features with commas (e.g. Feature A, Feature B, Feature C)</p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={planSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 text-sm flex items-center justify-center gap-2"
                  >
                    {planSubmitting ? 'Saving Configuration...' : selectedPlan ? 'Update Membership Plan' : 'Save Plan Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <>
            {!selectedPatient && !activeCall ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="p-8 md:p-12 max-w-6xl mx-auto h-full flex flex-col"
              >
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-[#1A1F36] tracking-tight mb-2">Dashboard Overview</h2>
                  <p className="text-[#5C7A6B] font-semibold">Track key metrics and recent platform activity.</p>
                </div>
                
                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 }
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Users className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Total Patients</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{assessments.length}</p>
                  </motion.div>
                  
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Stethoscope className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Total Doctors</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{doctors.length}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Wallet className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Monthly Revenue</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">₹{monthlyRevenue.toLocaleString('en-IN')}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="bg-white p-6 rounded-2xl hover:scale-105 transition-transform duration-300 hover:shadow-lg shadow-[0_4px_20px_rgba(26,31,54,0.05)] border border-[#F5F0EB]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-orange-50 text-orange-500 p-4 rounded-full"><Activity className="w-6 h-6"/></div>
                      <h3 className="text-sm font-black text-[#5C7A6B] uppercase tracking-widest">Active Plans</h3>
                    </div>
                    <p className="text-4xl font-black text-[#1A1F36]">{plans.length}</p>
                  </motion.div>
                </motion.div>

                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white/40 rounded-[3rem] border border-white/60 shadow-sm p-10">
                  <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border border-[#F5F0EB]"><Users className="w-12 h-12 text-[#5C7A6B]" /></div>
                  <h2 className="text-2xl font-black text-[#1A1F36] tracking-tight mb-2">Select a member</h2>
                  <p className="text-sm font-medium text-[#5C7A6B]">View detailed health profiles and manage sessions from the left sidebar.</p>
                </div>
              </motion.div>
            ) : !activeCall && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 md:p-12 max-w-6xl mx-auto">
                
                {/* ── MEMBER HEADER CARD ── */}
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 mb-10 flex justify-between items-center transition-all hover:shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
                  <div>
                    <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter flex items-center gap-4"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-[1.5rem]"><User className="w-8 h-8"/></div> {selectedPatient?.first_name || selectedPatient?.last_name ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() : 'Anonymous Member'}</h2>
                    <div className="flex flex-wrap gap-5 text-slate-600 font-bold text-sm mt-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 inline-flex items-center">
                      <p className="flex items-center gap-2"><span className="text-slate-400">AGE</span> {selectedPatient.age || 'N/A'}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <p className="flex items-center gap-2"><span className="text-slate-400">DOB</span> {selectedPatient.dob_day}/{selectedPatient.dob_month}/{selectedPatient.dob_year}</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <p className="flex items-center gap-2"><span className="text-slate-400">TEL</span> {selectedPatient.phone_number || 'N/A'}</p>
                    </div>
                    <p className="text-slate-500 font-semibold text-sm mt-5 pl-2 flex items-center gap-2"><HomeIcon className="w-4 h-4 text-slate-400"/> {selectedPatient.address || 'N/A'}</p>
                  </div>
                </div>

                {/* ── APPOINTMENT ALERT ── */}
                {(selectedPatient.booking_date || selectedPatient.booking_time) && (
                  <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200/60 p-8 rounded-[2.5rem] shadow-sm mb-10 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                    <div>
                      <h3 className="text-amber-950 font-black text-2xl flex items-center gap-3 mb-2"><Clock className="w-7 h-7 text-amber-500"/> Scheduled Consultation</h3>
                      <p className="text-base font-bold text-amber-700/80">Member is waiting for this time slot.</p>
                    </div>
                    <div className="text-right bg-white px-8 py-5 rounded-3xl shadow-sm border border-amber-100 group-hover:scale-105 transition-transform">
                      <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{selectedPatient.booking_time}</p>
                      <p className="text-amber-800 font-black mt-1 uppercase tracking-widest text-xs">{selectedPatient.booking_date}</p>
                    </div>
                  </div>
                )}

                {/* ── CARE TEAM ASSIGNMENT PANEL ── */}
                <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-10">
                  <h3 className="text-indigo-900 font-black text-2xl flex items-center gap-3 mb-6"><Users className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Assigned Care Team</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Doctor Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-slate-400"/> Doctor (Physician)
                      </label>
                      <select
                        value={currentAssignment?.doctor_id || ''}
                        onChange={(e) => handleUpdateAssignment('doctor', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'doctor').map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.first_name} {doc.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dietitian Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Apple className="w-4 h-4 text-slate-400"/> Dietitian Specialist
                      </label>
                      <select
                        value={currentAssignment?.dietitian_id || ''}
                        onChange={(e) => handleUpdateAssignment('dietitian', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'dietitian').map(diet => (
                          <option key={diet.id} value={diet.id}>
                            {diet.first_name} {diet.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Trainer Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Dumbbell className="w-4 h-4 text-slate-400"/> Fitness Coach
                      </label>
                      <select
                        value={currentAssignment?.trainer_id || ''}
                        onChange={(e) => handleUpdateAssignment('trainer', e.target.value)}
                        disabled={updatingAssignment || assignmentLoading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      >
                        <option value="">Not Assigned</option>
                        {allStaff.filter(s => s.role === 'trainer').map(train => (
                          <option key={train.id} value={train.id}>
                            {train.first_name} {train.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(assignmentLoading || updatingAssignment) && (
                    <p className="text-xs font-bold text-indigo-500 mt-4 animate-pulse">Syncing assignments with database...</p>
                  )}
                </div>

                {/* ── DOCTOR PRESCRIPTION PANEL ── */}
                <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 p-10 rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-10">
                  <h3 className="text-indigo-900 font-black text-2xl flex items-center gap-3 mb-8"><Stethoscope className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Prescribe Medication</h3>
                  {selectedPatient.prescription_type ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 p-6 rounded-[2rem] font-black flex items-center gap-4 text-xl shadow-sm">
                      <div className="bg-emerald-500 text-white p-2 rounded-full"><CheckCircle2 className="w-6 h-6"/></div> Order placed successfully for <span className="underline decoration-emerald-300 underline-offset-4">{selectedPatient.prescription_type.toUpperCase()} MEDICINE</span>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                      <button onClick={() => handlePrescription('Oral')} disabled={prescribeLoading} className="flex-1 bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-400 text-indigo-900 font-black py-6 rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-4 group">
                        <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform"><Pill className="w-8 h-8"/></div>
                        <span className="text-lg">Oral Medicine</span>
                      </button>
                      <button onClick={() => handlePrescription('Injectable')} disabled={prescribeLoading} className="flex-1 bg-white hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-400 text-indigo-900 font-black py-6 rounded-[2rem] transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center gap-4 group">
                        <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform"><Syringe className="w-8 h-8"/></div>
                        <span className="text-lg">Injectable Medicine</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-4 gap-6 mb-10">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Scale className="w-4 h-4"/> Current Weight</p>
                    <p className="text-4xl font-black text-slate-800">{selectedPatient.weight_kg} <span className="text-xl text-slate-400 font-bold">kg</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-10"></div>
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Target className="w-4 h-4"/> Goal Weight</p>
                    <p className="text-4xl font-black text-indigo-600">{selectedPatient.goal_weight_kg} <span className="text-xl text-indigo-400/60 font-bold">kg</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Activity className="w-4 h-4"/> Height</p>
                    <p className="text-4xl font-black text-slate-800">{selectedPatient.height_cm} <span className="text-xl text-slate-400 font-bold">cm</span></p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><User className="w-4 h-4"/> Gender</p>
                    <p className="text-3xl font-black text-slate-800 capitalize mt-1">{selectedPatient.medical_history?.gender}</p>
                  </div>
                </div>

                {/* ── SESSION MONITOR ── */}
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-[#1A1F36] mb-6 flex items-center gap-3"><Video className="w-6 h-6 text-indigo-600"/> Live Session Monitor</h3>
                  <SessionMonitor memberId={selectedPatient.id} />
                </div>

                {/* ── GRAPH SECTION ── */}
                <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 mb-10">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Activity className="w-8 h-8 text-indigo-500 bg-indigo-50 p-1.5 rounded-xl"/> Weight Loss Track</h3>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={patientLogs} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dy={15} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} dx={-15} />
                        <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.15)', padding: '16px' }} labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px' }} />
                        <Line type="monotone" dataKey="weight" stroke="url(#colorUvAdmin)" strokeWidth={5} dot={{ r: 7, fill: '#4f46e5', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 10, strokeWidth: 0, fill: '#4f46e5' }} />
                        <defs>
                          <linearGradient id="colorUvAdmin" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                        </defs>
                        {selectedPatient.goal_weight_kg && (
                          <ReferenceLine 
                            y={parseFloat(selectedPatient.goal_weight_kg)} 
                            stroke="#10B981" 
                            strokeDasharray="8 8" 
                            strokeWidth={2}
                            label={{ position: 'top', value: 'Target Goal', fill: '#10B981', fontSize: 13, fontWeight: '900' }} 
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── DIET & FITNESS DATA ── */}
                {hasDietFitnessData && (
                  <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-10">
                    <div className="bg-slate-900 px-10 py-6 flex items-center justify-between">
                      <h3 className="text-xl font-black text-white flex items-center gap-3"><Apple className="w-6 h-6 text-amber-400"/> Diet & Fitness Preferences</h3>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                      </div>
                    </div>
                    <div className="p-10 grid grid-cols-2 gap-x-12 gap-y-8">
                      {hasLocalFood && (
                        <div className="col-span-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Apple className="w-4 h-4"/> Local Food Consumed</p>
                          <p className="font-bold text-slate-800 text-lg bg-slate-50 p-6 rounded-3xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">{selectedPatient.local_food}</p>
                        </div>
                      )}
                      {hasWorkoutPref && (
                        <div className="col-span-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Dumbbell className="w-4 h-4"/> Workout Preference</p>
                          <div className="font-black text-slate-800 text-xl bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-inner">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                              {selectedPatient.workout_preference === 'home' ? <HomeIcon className="w-8 h-8 text-emerald-500"/> : <Dumbbell className="w-8 h-8 text-emerald-500"/>}
                            </div>
                            <span className="capitalize">{selectedPatient.workout_preference} Workout</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── MEDICAL HISTORY ── */}
                <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mb-10">
                  <div className="bg-gradient-to-r from-indigo-900 to-slate-900 px-10 py-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3"><FileText className="w-6 h-6 text-indigo-400"/> Full Medical Profile</h3>
                  </div>
                  <div className="p-10 grid grid-cols-2 gap-x-12 gap-y-10">
                    
                    {/* Column 1 */}
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Blood Pressure</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.medical_history?.vitals?.bp || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Resting Heart Rate</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.medical_history?.vitals?.hr || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tried Weight Program Before?</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">{selectedPatient.tried_weight_program ? 'Yes' : 'No'}</p>
                      </div>
                      {selectedPatient.extra_medical_info && (
                        <div>
                          <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Extra Medical Info</p>
                          <p className="font-bold text-rose-900 bg-rose-50 p-5 rounded-2xl border border-rose-200 leading-relaxed shadow-sm">{selectedPatient.extra_medical_info}</p>
                        </div>
                      )}
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Pill className="w-4 h-4"/> Prior Medications</p>
                        <p className="font-black text-slate-800 text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner capitalize">{selectedPatient.medical_history?.medication_history?.type === 'none' ? 'None' : (selectedPatient.medical_history?.medication_history?.type || 'N/A')}</p>
                      </div>
                      {selectedPatient.medical_history?.medication_history?.type !== 'none' && selectedPatient.medical_history?.medication_history?.details && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Medication Details</p>
                          <p className="font-bold text-indigo-900 bg-indigo-50 p-5 rounded-2xl border border-indigo-200 leading-relaxed shadow-sm">{selectedPatient.medical_history?.medication_history?.details}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Takes Prescription Meds?</p>
                        <p className={`font-black text-lg p-4 rounded-2xl border inline-flex items-center gap-3 shadow-sm ${selectedPatient.medical_history?.takes_prescription_meds ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-800 shadow-inner'}`}>
                          {selectedPatient.medical_history?.takes_prescription_meds ? <CheckCircle2 className="w-5 h-5 text-amber-500"/> : null} 
                          {selectedPatient.medical_history?.takes_prescription_meds ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>

                    {/* ── HEALTH CONDITIONS 2 DISPLAY ── */}
                    {selectedPatient.health_conditions_two && selectedPatient.health_conditions_two.length > 0 && (
                      <div className="col-span-2 border-t border-slate-100 pt-8 mt-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Activity className="w-4 h-4"/> Other Health Conditions</p>
                        <div className="flex flex-wrap gap-3">
                          {selectedPatient.health_conditions_two.map((condition: string, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-default shadow-sm">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── GLP-1 IMAGE UPLOAD DISPLAY ── */}
                    {selectedPatient.glp1_image_url && (
                      <div className="col-span-2 border-t border-slate-100 pt-8 mt-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><FileText className="w-4 h-4"/> GLP-1 Medication Document</p>
                        <a href={selectedPatient.glp1_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative group">
                          <img 
                            src={selectedPatient.glp1_image_url} 
                            alt="GLP-1 Medication" 
                            className="max-w-md rounded-3xl shadow-md border-4 border-slate-100 group-hover:border-indigo-200 transition-all duration-300" 
                          />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors rounded-3xl flex items-center justify-center">
                            <span className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform translate-y-2 group-hover:translate-y-0">View Full Size</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}