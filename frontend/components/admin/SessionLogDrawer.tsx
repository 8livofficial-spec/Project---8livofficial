'use client';
import React, { useEffect, useState } from 'react';
import { X, Clock, Video, UserCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export default function SessionLogDrawer({ isOpen, onClose, sessionId }: SessionLogDrawerProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchLogs();
    }
  }, [isOpen, sessionId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/admin/sessions/${sessionId}/log`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (event: string) => {
    switch(event) {
      case 'created': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'started': return <Video className="w-4 h-4 text-green-500" />;
      case 'participant_joined': return <UserCheck className="w-4 h-4 text-indigo-500" />;
      case 'ended': return <Clock className="w-4 h-4 text-gray-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Session Logs</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Timeline of events for session {sessionId?.substring(0,8)}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">No logs found for this session.</div>
              ) : (
                <div className="space-y-6">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                          {getEventIcon(log.event)}
                        </div>
                        {idx !== logs.length - 1 && <div className="w-0.5 h-full bg-slate-200 mt-2"></div>}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="text-xs font-bold text-slate-400 mb-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-sm font-bold text-slate-800 capitalize">{log.event.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500 mt-1">Triggered by: {log.triggered_by}</p>
                          {log.metadata && (
                            <pre className="mt-2 text-[10px] bg-slate-50 p-2 rounded text-slate-600 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
