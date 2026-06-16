'use client'

import React from 'react'
import Link from 'next/link'

interface Message {
  from: string
  preview: string
  time: string
  unread: boolean
  initials: string
}

interface MessagesPreviewProps {
  notifications: any[]
  patientName: string
  doctorName: string
}

export default function MessagesPreview({ notifications, patientName, doctorName }: MessagesPreviewProps) {
  const messageNotifications = notifications.filter(n => n.type === 'message')
  const unreadCount = messageNotifications.filter(n => !n.is_read).length
  
  const doctorInitials = doctorName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()

  const messages = messageNotifications.length > 0 
    ? messageNotifications.map(n => ({
        from: doctorName,
        preview: n.message || '',
        time: new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        unread: !n.is_read,
        initials: doctorInitials
      }))
    : []

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6 flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A1F36]/8 pb-3">
          <h3 className="font-bold text-[#1A1F36] text-base font-sora">Recent Chats</h3>
          {unreadCount > 0 && (
            <span className="bg-[#C4622D] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              {unreadCount} New
            </span>
          )}
        </div>

        {/* Message Items */}
        <div className="divide-y divide-[#1A1F36]/6">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8896A4] font-medium">
              No recent messages
            </div>
          ) : (
            messages.map((msg, index) => (
              <Link 
                key={index} 
                href="/patient/messages"
                className="flex items-start gap-3 py-3 hover:bg-[#F5F0EB]/50 transition-colors rounded-xl px-2 -mx-2"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F0EB] text-[#1A1F36] font-bold text-xs flex items-center justify-center shrink-0 select-none">
                  {msg.initials}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-[#1A1F36] text-xs font-bold truncate leading-snug">{msg.from}</h4>
                    <span className="text-[#8896A4] text-[9px] font-medium shrink-0 ml-2">{msg.time}</span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${msg.unread ? 'font-bold text-[#1A1F36]' : 'text-[#8896A4]'}`}>
                    {msg.preview}
                  </p>
                </div>

                {msg.unread && (
                  <span className="w-2 h-2 rounded-full bg-[#C4622D] shrink-0 mt-2.5 animate-pulse" />
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Link 
          href="/patient/messages"
          className="block text-center text-[#C4622D] hover:text-[#A8522A] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          View All Messages
        </Link>
      </div>
    </div>
  )
}
