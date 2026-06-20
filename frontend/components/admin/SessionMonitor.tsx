'use client';
import React, { useEffect, useState } from 'react';
import { 
  VideoOff, Activity, CheckCircle, XCircle, Clock, 
  Calendar, Stethoscope, Apple, Dumbbell, AlertTriangle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import SessionLogDrawer from './SessionLogDrawer';

interface SessionMonitorProps {
  memberId: string;
}

export default function SessionMonitor({ memberId }: SessionMonitorProps) {
  const [stats, setStats] = useState({ total: 0, completed: 0, missed: 0, completion_rate: 0 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionLog, setSelectedSessionLog] = useState<string | null>(null);

  useEffect(() => {
    if (memberId) {
      fetchData();
      // Polling every 30 seconds for live monitor updates
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [memberId]);

  const fetchData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const [statsRes, sessRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/members/${memberId}/sessions/stats`),
        fetch(`${backendUrl}/api/admin/members/${memberId}/sessions`)
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (sessRes.ok) setSessions(await sessRes.json());
    } catch (e) {
      console.error("Failed to fetch session data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (sessionId: string) => {
    // Basic mock logic for now
    const newDate = prompt("Enter new datetime (YYYY-MM-DDTHH:MM:SS):");
    if (!newDate) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    await fetch(`${backendUrl}/api/admin/sessions/${sessionId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_datetime: newDate })
    });
    fetchData();
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    await fetch(`${backendUrl}/api/admin/sessions/${sessionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: "Admin Cancelled" })
    });
    fetchData();
  };

  const getRoleIcon = (role: string) => {
    if (role === 'doctor') return <Stethoscope className="w-4 h-4 text-indigo-500" />;
    if (role === 'dietitian') return <Apple className="w-4 h-4 text-amber-500" />;
    return <Dumbbell className="w-4 h-4 text-emerald-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'in_progress': return <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-bold">In Progress</span>;
      case 'scheduled': return <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">Scheduled</span>;
      case 'completed': return <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Completed</span>;
      case 'missed': return <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-bold">Missed</span>;
      case 'cancelled': return <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-xs font-bold">Cancelled</span>;
      default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const activeSession = sessions.find(s => s.status === 'in_progress');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled').slice(0, 3);
  const pastSessions = sessions.filter(s => s.status !== 'scheduled' && s.status !== 'in_progress');

  if (loading) {
    return <div className="p-8 text-center text-slate-400 font-medium">Loading session monitor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Active Session Warning Card */}
      {activeSession && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-green-400 p-6 shadow-sm relative overflow-hidden group ring-4 ring-green-400/20 animate-pulse"
          style={{ animationDuration: '3s' }}
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <h3 className="text-green-700 font-black text-lg">Session In Progress</h3>
              </div>
              <p className="text-slate-800 font-bold flex items-center gap-2 mt-2">
                {getRoleIcon(activeSession.staff_role)} Staff ID: {activeSession.staff_id.substring(0,8)} • {activeSession.session_type.replace('_', ' ')}
              </p>
              <p className="text-slate-500 text-sm mt-1">Started at: {new Date(activeSession.started_at).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Privacy Restriction Active</p>
              <p className="text-xs text-amber-700 mt-0.5">Admin cannot access this room. Video URLs and Join tokens are securely withheld from this dashboard.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', val: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', val: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Missed', val: stats.missed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completion Rate', val: `${stats.completion_rate}%`, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.bg} ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <VideoOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No sessions yet</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">
            Sessions will appear here once the care team begins scheduling with this member.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Upcoming */}
          <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Upcoming Schedule
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-4">No upcoming sessions.</p>
              ) : upcomingSessions.map(s => (
                <div key={s.id} className="border border-slate-100 rounded-xl p-3 hover:border-indigo-100 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    {getRoleIcon(s.staff_role)}
                    <span className="text-xs font-bold text-slate-600 capitalize">{s.staff_role}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">
                    {new Date(s.scheduled_at).toLocaleDateString()} at {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{s.session_type.replace('_', ' ')}</p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                    <button onClick={() => handleReschedule(s.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">Reschedule</button>
                    <button onClick={() => handleCancel(s.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider ml-auto">Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Sessions */}
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm">Past Sessions Log</h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                    <th className="p-4">Date</th>
                    <th className="p-4">Staff</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {pastSessions.slice(0, 10).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-700">
                        {new Date(s.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(s.staff_role)}
                          <span className="capitalize font-medium text-slate-700">{s.staff_role}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 capitalize">{s.session_type.replace('_', ' ')}</td>
                      <td className="p-4">{getStatusBadge(s.status)}</td>
                      <td className="p-4 text-slate-500 font-medium">
                        {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => setSelectedSessionLog(s.id)}
                          className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pastSessions.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">No past sessions found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <SessionLogDrawer 
        isOpen={!!selectedSessionLog} 
        sessionId={selectedSessionLog} 
        onClose={() => setSelectedSessionLog(null)} 
      />
    </div>
  );
}
