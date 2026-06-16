'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, MessageCircle, X, Search, Check, CheckCheck, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
};

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  status_label?: string;
  status_color?: string;
};

type Props = {
  staffId: string;
  staffName: string;
  patients: Patient[];
  accentColor?: string; // e.g. '#C4622D' for trainer, '#3B82F6' for doctor
};

export default function StaffChat({ staffId, staffName, patients, accentColor = '#C4622D' }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages for selected patient
  const loadMessages = useCallback(async (patientId: string) => {
    const res = await fetch(`/api/messages?userId=${staffId}&contactId=${patientId}`);
    const data = await res.json();
    if (data.messages) {
      setMessages(data.messages);
      // Mark unread as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', patientId)
        .eq('receiver_id', staffId)
        .eq('is_read', false);
      setUnreadCounts(prev => ({ ...prev, [patientId]: 0 }));
    }
  }, [staffId]);

  // Load unread counts for all patients
  const loadUnreadCounts = useCallback(async () => {
    if (!patients.length) return;
    const patientIds = patients.map(p => p.id);
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .in('sender_id', patientIds)
      .eq('receiver_id', staffId)
      .eq('is_read', false);

    const counts: Record<string, number> = {};
    data?.forEach(msg => {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  }, [staffId, patients]);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedPatient) return;

    loadMessages(selectedPatient.id);

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`chat-${staffId}-${selectedPatient.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${staffId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === selectedPatient.id) {
          setMessages(prev => [...prev, msg]);
          // Mark as read immediately
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
        } else {
          setUnreadCounts(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${staffId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.receiver_id === selectedPatient.id) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === msg.id);
            return exists ? prev : [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedPatient, staffId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedPatient || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: staffId,
      receiver_id: selectedPatient.id,
      message_text: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: staffId,
          receiverId: selectedPatient.id,
          messageText: text,
        }),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredPatients = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date, messages: [msg] });
    }
  });

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
      {/* Patient List */}
      <div className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5" style={{ color: accentColor }} />
            <h3 className="font-black text-slate-800 text-sm">Messages</h3>
            {totalUnread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs text-slate-400 font-semibold">No patients found</p>
            </div>
          ) : filteredPatients.map(p => {
            const isActive = selectedPatient?.id === p.id;
            const unread = unreadCounts[p.id] || 0;
            const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || 'U';
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-all border-l-4 ${
                  isActive
                    ? 'bg-orange-50 border-l-4'
                    : 'border-transparent hover:bg-slate-50'
                }`}
                style={isActive ? { borderColor: accentColor } : {}}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
                  style={{ backgroundColor: isActive ? accentColor : '#94A3B8' }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{p.status_label || 'Member'}</p>
                </div>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 shrink-0 animate-pulse">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <>
            {/* Chat Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs"
                style={{ backgroundColor: accentColor }}
              >
                {`${selectedPatient.first_name?.[0] || ''}${selectedPatient.last_name?.[0] || ''}`.toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Active Member
                </p>
              </div>
              <button
                onClick={() => loadMessages(selectedPatient.id)}
                className="ml-auto p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Refresh messages"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/50">
              {groupedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <MessageCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">Start a conversation</p>
                  <p className="text-xs text-slate-300 mt-1">Send your first message to {selectedPatient.first_name}</p>
                </div>
              ) : groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  {group.messages.map(msg => {
                    const isOwn = msg.sender_id === staffId;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-sm ${
                          isOwn
                            ? 'rounded-br-md text-white'
                            : 'bg-white rounded-bl-md text-slate-800 border border-slate-100'
                        }`}
                        style={isOwn ? { backgroundColor: accentColor } : {}}
                        >
                          <p className="leading-relaxed">{msg.message_text}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[9px] font-bold ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                              {formatTime(msg.created_at)}
                            </span>
                            {isOwn && (
                              msg.is_read
                                ? <CheckCheck className="w-3 h-3 text-white/80" />
                                : <Check className="w-3 h-3 text-white/60" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white px-4 py-4 border-t border-slate-100 shrink-0">
              <div className="flex gap-3 items-end">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedPatient.first_name}...`}
                  rows={1}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 resize-none transition-colors leading-relaxed"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="p-3 rounded-2xl text-white shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-semibold ml-1">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-600">Select a patient to chat</h3>
            <p className="text-xs text-slate-400 font-semibold mt-2 max-w-xs">
              Choose a patient from the list on the left to start or continue a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
