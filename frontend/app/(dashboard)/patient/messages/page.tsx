'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Paperclip, Video, Phone, Search, Users } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  message_text: string
  is_read: boolean
  created_at: string
}

interface Contact {
  id: string
  name: string
  role: string
  initials: string
  active: boolean
}

export default function MessagesPage() {
  const { user, profile, assessment, careTeam, loading } = usePatientData()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const patientName = (profile?.display_id || profile?.first_name || assessment?.first_name || 'Member')

  // Build contacts from care team
  const contacts: Contact[] = []
  
  if (careTeam?.doctor_name && careTeam.doctor_name !== 'Not Assigned') {
    contacts.push({
      id: careTeam.doctor_id || 'doctor',
      name: careTeam.doctor_name,
      role: 'Physician Specialist',
      initials: careTeam.doctor_name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      active: false
    })
  }
  if (careTeam?.dietitian_name && careTeam.dietitian_name !== 'Not Assigned') {
    contacts.push({
      id: careTeam.dietitian_id || 'dietitian',
      name: careTeam.dietitian_name,
      role: 'Dietitian Coach',
      initials: careTeam.dietitian_name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      active: false
    })
  }
  if (careTeam?.trainer_name && careTeam.trainer_name !== 'Not Assigned') {
    contacts.push({
      id: careTeam.trainer_id || 'trainer',
      name: careTeam.trainer_name,
      role: 'Fitness Trainer',
      initials: careTeam.trainer_name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      active: false
    })
  }

  // Add fallback support contact
  contacts.push({
    id: 'support',
    name: '8Liv Care Support',
    role: 'Customer Support',
    initials: '8L',
    active: false
  })

  // Set first contact as active by default
  useEffect(() => {
    if (contacts.length > 0 && !activeContact) {
      setActiveContact({ ...contacts[0], active: true })
    }
  }, [contacts.length])

  // Fetch messages for the active contact
  useEffect(() => {
    if (!user?.id || !activeContact?.id || activeContact.id === 'support') return

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
        // Mark unread messages as read
        const unreadIds = data.filter(m => m.receiver_id === user.id && !m.is_read).map(m => m.id)
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
        }
      }
    }

    fetchMessages()

    // Subscribe to realtime updates
    const channelName = `chat-${user.id}-${activeContact.id}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          // Only add if it's for this conversation
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === activeContact.id) ||
            (newMsg.sender_id === activeContact.id && newMsg.receiver_id === user.id)
          ) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // Mark as read if we received it
            if (newMsg.receiver_id === user.id) {
              supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, activeContact?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !user?.id || !activeContact?.id || activeContact.id === 'support') return

    const messageText = inputText.trim()
    setInputText('')

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeContact.id,
      message_text: messageText,
      is_read: false,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: activeContact.id,
          message_text: messageText
        })
        .select()
        .single()

      if (error) throw error

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m))
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setInputText(messageText) // Put text back
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = []
  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString()
    const existing = groupedMessages.find(g => g.date === dateKey)
    if (existing) {
      existing.msgs.push(msg)
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] })
    }
  })

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-white rounded-2xl border border-[#1A1F36]/8 shadow-[0_4px_24px_rgba(26,31,54,0.08)] overflow-hidden h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)] flex">
      {/* Left Contact List Panel */}
      <div className="w-full md:w-80 border-r border-[#1A1F36]/8 flex flex-col bg-white shrink-0">
        <div className="p-4 border-b border-[#1A1F36]/8 space-y-3">
          <h3 className="font-bold text-base font-sora">Conversations</h3>
          <div className="flex items-center gap-2 bg-[#F5F0EB] border border-[#1A1F36]/12 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-[#8896A4]" />
            <input
              type="text"
              placeholder="Search care team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-[#1A1F36] placeholder-[#8896A4] w-full"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-[#1A1F36]/5">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setActiveContact({ ...contact, active: true })}
              className={`w-full text-left flex gap-3 px-4 py-4 transition-colors select-none cursor-pointer ${
                activeContact?.id === contact.id
                  ? 'bg-[#F5F0EB]/60 border-r-4 border-r-[#C4622D]'
                  : 'hover:bg-[#F5F0EB]/30'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] text-[#1A1F36] font-bold text-xs flex items-center justify-center shrink-0">
                {contact.initials}
              </div>
              <div className="min-w-0 flex-grow">
                <h4 className="text-xs font-bold text-[#1A1F36] truncate leading-tight font-sora">{contact.name}</h4>
                <p className="text-[10px] text-[#8896A4] font-medium truncate mt-1">{contact.role}</p>
              </div>
            </button>
          ))}

          {filteredContacts.length === 0 && (
            <div className="p-6 text-center text-[#8896A4]">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No contacts found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Conversation Chat Area */}
      <div className="hidden md:flex flex-col flex-1 bg-[#F5F0EB]/30">
        {activeContact ? (
          <>
            {/* Chat header */}
            <div className="bg-white px-6 py-4 border-b border-[#1A1F36]/8 flex justify-between items-center shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F5F0EB] text-[#1A1F36] font-bold text-sm flex items-center justify-center select-none">
                  {activeContact.initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight font-sora">{activeContact.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{activeContact.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-[#F5F0EB] hover:bg-[#EDE8E3] rounded-xl text-[#1A1F36] transition-all cursor-pointer"><Phone className="w-4 h-4" /></button>
                <button className="p-2.5 bg-[#F5F0EB] hover:bg-[#EDE8E3] rounded-xl text-[#1A1F36] transition-all cursor-pointer"><Video className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Message Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {activeContact.id === 'support' ? (
                <div className="flex flex-col items-center justify-center h-full text-[#8896A4]">
                  <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium">Support chat coming soon</p>
                  <p className="text-xs mt-1">For now, email us at 8livofficial.com</p>
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#8896A4]">
                  <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation.</p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <React.Fragment key={group.date}>
                    <div className="text-center">
                      <span className="bg-[#1A1F36]/5 text-[#8896A4] text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {formatDateSeparator(group.msgs[0].created_at)}
                      </span>
                    </div>
                    {group.msgs.map((msg) => {
                      const isMe = msg.sender_id === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                        >
                          <div
                            className={`px-4.5 py-3 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-[#1A1F36] text-white rounded-tr-none shadow-sm'
                                : 'bg-white text-[#1A1F36] rounded-tl-none border border-[#1A1F36]/6 shadow-sm'
                            }`}
                          >
                            {msg.message_text}
                          </div>
                          <span className="text-[9px] text-[#8896A4] mt-1 font-semibold px-1">
                            {formatTime(msg.created_at)}
                            {isMe && msg.is_read && ' • Read'}
                          </span>
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="bg-white border-t border-[#1A1F36]/8 px-6 py-4 flex items-center gap-3 shrink-0"
            >
              <button
                type="button"
                className="p-3 hover:bg-[#F5F0EB] text-[#8896A4] hover:text-[#1A1F36] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#1A1F36]/8 shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder={activeContact.id === 'support' ? 'Support chat coming soon...' : 'Type your message...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeContact.id === 'support'}
                className="flex-grow bg-[#F5F0EB] border border-[#1A1F36]/12 rounded-2xl px-4 py-3.5 text-sm text-[#1A1F36] placeholder-[#8896A4] focus:border-[#C4622D] outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={activeContact.id === 'support'}
                className="bg-[#C4622D] hover:bg-[#A8522A] text-white p-3.5 rounded-2xl transition-all shadow-md shadow-[#C4622D]/20 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#8896A4]">
            <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
