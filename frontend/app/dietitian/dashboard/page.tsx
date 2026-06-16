'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import {
  Apple, Users, Scale, Target, Activity, FileText, CheckCircle2,
  LogOut, AlertCircle, ShieldAlert, Heart, Calendar, Clock, Smile, Video
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg: number | null;
  extra_medical_info: string | null;
  local_food: string | null;
  medical_history: any;
  dietitian_notes: string | null;
  weight_logs: any[];
  consultations: any[];
};

export default function DietitianDashboard() {
  const router = useRouter();
  const [dietitian, setDietitian] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients'>('overview');

  // Patients data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Diet guidelines editing
  const [guidelinesText, setGuidelinesText] = useState('');
  const [savingGuidelines, setSavingGuidelines] = useState(false);

  // Scheduling
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const handleScheduleSession = async () => {
    if (!dietitian || !selectedPatient || !scheduleDate || !scheduleTime) return;
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/staff/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: dietitian.id,
          role: 'dietitian',
          patientId: selectedPatient.id,
          bookingDate: scheduleDate,
          bookingTime: scheduleTime,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule session.');
      
      alert('1:1 Session Scheduled Successfully! The patient has been notified.');
      setScheduleModalOpen(false);
      setScheduleDate('');
      setScheduleTime('');
      
      // Update local state to show the new consultation
      setPatients(prev => prev.map(p => {
        if (p.id === selectedPatient.id) {
          return { ...p, consultations: [data.consultation, ...p.consultations] };
        }
        return p;
      }));
      setSelectedPatient(prev => prev ? { ...prev, consultations: [data.consultation, ...prev.consultations] } : null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      setGuidelinesText(selectedPatient.dietitian_notes || '');
    } else {
      setGuidelinesText('');
    }
  }, [selectedPatient]);

  const loadDashboardData = async (staffId: string) => {
    try {
      const res = await fetch('/api/staff/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, role: 'dietitian' })
      });
      const data = await res.json();
      if (data.patients) {
        setPatients(data.patients);
        // Sync selectedPatient with updated data if one is selected
        if (selectedPatient) {
          const updated = data.patients.find((p: any) => p.id === selectedPatient.id);
          if (updated) setSelectedPatient(updated);
        }
      }
    } catch (err) {
      console.error('[Dietitian Load Error]', err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) {
          router.push('/login');
          return;
        }

        // Fetch user profile securely via our backend to bypass any RLS limitations on Profiles
        const profileRes = await fetch('/api/staff/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        });
        const profileData = await profileRes.json();
        const profile = profileData.profile;
        const profErr = profileData.error;

        if (profErr || !profile || profile.role !== 'dietitian') {
          setAuthError(`Access Denied. Only registered Dietitians are authorized to view this portal. Debug: profErr=${profErr}, profileRole=${profile?.role}`);
          setLoading(false);
          return;
        }

        setDietitian(profile);
        await loadDashboardData(session.user.id);
      } catch (err: any) {
        setAuthError(err.message || 'Authentication check failed.');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Poll dashboard data every 5 seconds for real-time updates
  useEffect(() => {
    if (!dietitian) return;
    const interval = setInterval(() => {
      loadDashboardData(dietitian.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [dietitian]);

  const handleSaveGuidelines = async () => {
    if (!dietitian || !selectedPatient) return;
    setSavingGuidelines(true);
    try {
      const res = await fetch('/api/staff/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: dietitian.id,
          patientId: selectedPatient.id,
          role: 'dietitian',
          notes: guidelinesText.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save nutrition guidelines.');
      
      alert('Nutrition guidelines updated successfully! 🥗');
      
      // Update local state and trigger reload to compute new status label/color
      await loadDashboardData(dietitian.id);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingGuidelines(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#5C7A6B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#5C7A6B] font-extrabold text-sm uppercase tracking-widest">Loading Nutrition Portal...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/70 backdrop-blur-xl border border-rose-100 rounded-[2.5rem] p-10 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-[#1A1F36] tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>Access Restricted</h2>
          <p className="text-[#8896A4] font-bold text-sm leading-relaxed">{authError}</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
              router.push('/login');
            }}
            className="w-full bg-[#1A1F36] hover:bg-[#1A1F36]/90 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-md"
          >
            Sign out & Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalAssigned = patients.length;
  const avgWeight = totalAssigned > 0 
    ? (patients.reduce((sum, p) => sum + (p.weight_kg || 0), 0) / totalAssigned).toFixed(1) 
    : '0';
  const avgGoal = totalAssigned > 0 
    ? (patients.reduce((sum, p) => sum + (p.goal_weight_kg || 0), 0) / totalAssigned).toFixed(1) 
    : '0';

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB]/50 flex font-sans antialiased text-[#1A1F36]">
      
      {/* ── SIDEBAR ── */}
      <div className="w-80 bg-white border-r border-[#F5F0EB] flex flex-col shrink-0 shadow-sm z-10">
        {/* Branding */}
        <div className="p-8 border-b border-[#F5F0EB] flex items-center gap-3">
          <div className="bg-[#F5F0EB] text-[#5C7A6B] p-2.5 rounded-2xl shadow-sm">
            <Apple className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-[#1A1F36] leading-none">8Liv Nutrition</h1>
            <span className="text-[10px] text-[#5C7A6B] font-black tracking-widest uppercase mt-1 block">Dietitian Panel</span>
          </div>
        </div>

        {/* Clinician Card */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Assigned Coach</p>
          <p className="font-black text-gray-900 text-base mt-1">
            {dietitian?.first_name} {dietitian?.last_name}
          </p>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Active Online
          </span>
        </div>

        {/* Nav Links */}
        <div className="flex-1 p-6 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-r-xl text-sm transition-colors ${activeTab === 'overview' ? 'bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Activity className="w-5 h-5" />
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-r-xl text-sm transition-colors ${activeTab === 'patients' ? 'bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Users className="w-5 h-5" />
            My Patient Roster ({patients.length})
          </button>
        </div>

        {/* Logout */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
        
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="p-8 md:p-12 max-w-5xl mx-auto w-full space-y-10"
          >
            {/* Page Header */}
            <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-400 mt-0.5">Overview of your assigned members and key metrics.</p>
              </div>
              <div className="flex gap-3">
                {/* Action buttons slot */}
              </div>
            </div>

            {/* Metrics Grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-105 transition-transform duration-300">
                <div className="bg-orange-50 text-orange-500 p-4 rounded-full">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalAssigned}</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-105 transition-transform duration-300">
                <div className="bg-orange-50 text-orange-500 p-4 rounded-full">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Current Weight</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{avgWeight} kg</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4 hover:scale-105 transition-transform duration-300">
                <div className="bg-orange-50 text-orange-500 p-4 rounded-full">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Goal Weight</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{avgGoal} kg</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Quick overview of latest updates */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-[#F5F0EB] p-10 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#1A1F36] flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                <Smile className="w-5 h-5 text-[#C4622D]" />
                Assigned Patients Overview
              </h3>
              {patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <Users className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">No patients assigned yet</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">Patients will appear here once they are assigned to your care team.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F5F0EB]">
                  {patients.slice(0, 5).map((p) => {
                    const latestWeight = p.weight_logs.length > 0 ? p.weight_logs[p.weight_logs.length - 1].weight : p.weight_kg;
                    return (
                      <motion.div 
                        key={p.id} 
                        className="py-4 px-4 flex items-center justify-between rounded-2xl hover:bg-[#F5F0EB]/50 transition-colors duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F5F0EB] text-[#5C7A6B] font-black text-xs flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            {p.first_name[0]}{p.last_name ? p.last_name[0] : ''}
                          </div>
                          <div>
                            <p className="font-black text-[#1A1F36] text-sm">{p.first_name} {p.last_name}</p>
                            <p className="text-[10px] font-bold text-[#8896A4]">📞 {p.phone_number || 'No Phone'}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-xs font-bold text-[#8896A4]">Weight: <span className="text-[#1A1F36] font-extrabold">{latestWeight} kg</span></p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${p.dietitian_notes ? 'bg-[#5C7A6B]/10 text-[#5C7A6B]' : 'bg-[#C4622D]/10 text-[#C4622D]'}`}>
                              {p.dietitian_notes ? 'Guidelines Set' : 'Needs Guidelines'}
                            </span>
                          </div>
                          {p.consultations.length > 0 && p.consultations[0].status === 'scheduled' && (
                            <button 
                              onClick={() => { window.location.href = p.consultations[0].room_url }}
                              className="bg-[#5C7A6B] hover:bg-[#5C7A6B]/90 text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform duration-300 shadow-md"
                            >
                              Join Call
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Tab 2: Patients List and Detail Editor */}
        {activeTab === 'patients' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 flex overflow-hidden"
          >
            {/* Patient List Sidebar */}
            <div className="w-80 bg-white border-r border-[#F5F0EB] overflow-y-auto p-6 space-y-4 custom-scrollbar shrink-0 shadow-inner">
              <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-4 px-2">Assigned Members</h3>
              {patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">No patients</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">No patients assigned.</p>
                </div>
              ) : (
                patients.map((p) => (
                  <motion.div
                    variants={itemVariants}
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-4.5 rounded-2xl cursor-pointer border-2 transition-all duration-300 hover:scale-[1.02] ${selectedPatient?.id === p.id ? 'border-[#5C7A6B] bg-[#5C7A6B]/5 shadow-md' : 'border-transparent bg-[#F5F0EB]/50 hover:bg-[#F5F0EB] hover:shadow-sm'}`}
                  >
                    <h4 className="font-black text-[#1A1F36] text-sm leading-tight mb-1">{p.first_name} {p.last_name}</h4>
                    <div className="flex justify-between items-center text-[10px] text-[#8896A4] font-bold">
                      <span>Goal: {p.goal_weight_kg || '—'} kg</span>
                      <span className={p.dietitian_notes ? 'text-[#5C7A6B]' : 'text-[#C4622D]'}>
                        {p.dietitian_notes ? '🥗 Configured' : '⚠️ Awaiting Diet Plan'}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Patient Details Pane */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar bg-[#F5F0EB]/30">
              {selectedPatient ? (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="max-w-3xl space-y-8"
                >
                  
                  {/* Header info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-black text-[#1A1F36] tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                      <p className="text-xs font-bold text-[#8896A4] mt-1 uppercase tracking-wider flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-[#C4622D]"/> Patient Telemetry File</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedPatient.consultations.length > 0 && selectedPatient.consultations[0].status === 'scheduled' && (
                        <button 
                          onClick={() => { window.location.href = selectedPatient.consultations[0].room_url }}
                          className="bg-[#5C7A6B] hover:bg-[#5C7A6B]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-transform duration-300 flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" /> Join Video Call
                        </button>
                      )}
                      <button 
                        onClick={() => setScheduleModalOpen(true)}
                        className="bg-[#1A1F36] hover:bg-[#1A1F36]/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-transform duration-300 flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" /> Schedule 1:1 Session
                      </button>
                      {selectedPatient.phone_number && (
                        <div className="bg-white border border-[#F5F0EB] px-4 py-2 rounded-xl text-xs font-bold text-[#1A1F36] shadow-sm">
                          📞 {selectedPatient.phone_number}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry metrics */}
                  <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-300 hover:shadow-md text-center">
                      <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Height</p>
                      <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : '—'}</p>
                    </motion.div>
                    <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-300 hover:shadow-md text-center">
                      <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Start Weight</p>
                      <p className="text-xl font-black text-[#1A1F36] mt-1">{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : '—'}</p>
                    </motion.div>
                    <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-300 hover:shadow-md text-center">
                      <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">Target Weight</p>
                      <p className="text-xl font-black text-[#C4622D] mt-1">{selectedPatient.goal_weight_kg ? `${selectedPatient.goal_weight_kg} kg` : '—'}</p>
                    </motion.div>
                    <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-300 hover:shadow-md text-center">
                      <p className="text-[10px] font-black text-[#8896A4] uppercase tracking-widest">BMI Ratio</p>
                      <p className="text-xl font-black text-[#5C7A6B] mt-1">
                        {selectedPatient.weight_kg && selectedPatient.height_cm 
                          ? (selectedPatient.weight_kg / Math.pow(selectedPatient.height_cm / 100, 2)).toFixed(1)
                          : '—'
                        }
                      </p>
                    </motion.div>
                  </motion.div>

                  {/* Weight Progress Chart */}
                  <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm">
                    <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-6 flex items-center gap-1.5"><Activity className="w-4 h-4 text-[#C4622D]"/> Weight Telemetry Graph</h3>
                    {selectedPatient.weight_logs.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-[#8896A4] text-sm font-bold">
                        No weight logs recorded by this user yet.
                      </div>
                    ) : (
                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedPatient.weight_logs}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F5F0EB" />
                            <XAxis dataKey="date" stroke="#8896A4" fontSize={10} tickLine={false} />
                            <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="#8896A4" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }} />
                            <Line type="monotone" dataKey="weight" stroke="#C4622D" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#C4622D', fill: '#fff' }} activeDot={{ r: 6, fill: '#C4622D' }} name="Weight (kg)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </motion.div>

                  {/* Food / Dietary Details */}
                  {selectedPatient.local_food && (
                    <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm">
                      <h3 className="text-xs font-black text-[#8896A4] uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#5C7A6B]"/> Stated Dietary & Food Preferences</h3>
                      <p className="text-sm font-bold text-[#1A1F36] bg-[#F5F0EB]/50 p-5 rounded-2xl leading-relaxed">{selectedPatient.local_food}</p>
                    </motion.div>
                  )}

                  {/* Diet Guidelines Editor */}
                  <motion.div 
                    variants={itemVariants}
                    className="bg-white p-8 rounded-3xl shadow-sm space-y-5"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-[#1A1F36] uppercase tracking-wider flex items-center gap-2">
                        <Apple className="w-5 h-5 text-[#5C7A6B]" />
                        Diet & Nutrition Guidelines
                      </h3>
                      <span className="text-[10px] text-[#8896A4] font-bold bg-[#F5F0EB] px-2 py-1 rounded-md">Visible on Patient Dashboard</span>
                    </div>
                    
                    <motion.textarea
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      value={guidelinesText}
                      onChange={(e) => setGuidelinesText(e.target.value)}
                      placeholder="Enter daily calorie counts, macros details, meal schedules, and general dietary recommendations for this patient..."
                      rows={6}
                      className="w-full border-2 border-[#F5F0EB] rounded-2xl p-5 bg-[#F5F0EB]/30 outline-none transition-all duration-300 text-[#1A1F36] placeholder-[#8896A4] font-bold focus:bg-white focus:border-[#5C7A6B] focus:ring-4 focus:ring-[#5C7A6B]/10 leading-relaxed text-sm resize-y"
                    />

                    <button
                      onClick={handleSaveGuidelines}
                      disabled={savingGuidelines}
                      className="w-full flex items-center justify-center gap-2.5 bg-[#5C7A6B] hover:bg-[#5C7A6B]/90 disabled:bg-[#5C7A6B]/50 text-white font-black py-4 px-6 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {savingGuidelines ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving Guidelines...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Save & Publish Nutrition Plan
                        </>
                      )}
                    </button>
                  </motion.div>

                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <Users className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-base font-semibold text-gray-500 mb-1">Select a patient to get started</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">Choose a patient from the roster on the left to view their profile and manage their plan.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Schedule Modal */}
        {scheduleModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1F36]/60 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#F5F0EB] flex justify-between items-center bg-[#F5F0EB]/30">
                <h3 className="font-black text-[#1A1F36] flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                  <Calendar className="w-5 h-5 text-[#C4622D]" />
                  Schedule 1:1 Session
                </h3>
                <button onClick={() => setScheduleModalOpen(false)} className="text-[#8896A4] hover:text-[#1A1F36] transition-colors">
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-sm font-bold text-[#8896A4] mb-5 leading-relaxed">
                    Book a video call with <span className="text-[#1A1F36] font-black">{selectedPatient.first_name}</span>. They will be notified immediately.
                  </p>
                  <label className="block text-xs font-black text-[#8896A4] uppercase mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border-2 border-[#F5F0EB] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#1A1F36] focus:border-[#5C7A6B] focus:ring-4 focus:ring-[#5C7A6B]/10 outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#8896A4] uppercase mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full border-2 border-[#F5F0EB] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#1A1F36] focus:border-[#5C7A6B] focus:ring-4 focus:ring-[#5C7A6B]/10 outline-none transition-all duration-300"
                  />
                </div>
                <button
                  onClick={handleScheduleSession}
                  disabled={scheduleLoading || !scheduleDate || !scheduleTime}
                  className="w-full bg-[#1A1F36] hover:bg-[#1A1F36]/90 disabled:bg-[#8896A4] disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-md mt-4"
                >
                  {scheduleLoading ? 'Scheduling...' : 'Confirm Session'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
