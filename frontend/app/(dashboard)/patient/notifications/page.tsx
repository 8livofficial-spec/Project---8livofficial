'use client'

import React, { useState } from 'react'
import { 
  Bell, CheckCircle2, Video, CreditCard, Scale, Lock, 
  MessageSquare, Calendar, ChevronRight, Inbox, MailOpen
} from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'
import { motion, AnimatePresence } from 'framer-motion'

export default function PatientNotificationsPage() {
  const { user, notifications, reloadData, loading } = usePatientData()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#C4622D]">
        <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Filter notifications
  const displayedNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'consultation':
        return <Video className="w-5 h-5 text-indigo-500" />
      case 'billing':
        return <CreditCard className="w-5 h-5 text-emerald-500" />
      case 'progress':
        return <Scale className="w-5 h-5 text-[#C4622D]" />
      case 'security':
        return <Lock className="w-5 h-5 text-rose-500" />
      case 'message':
        return <MessageSquare className="w-5 h-5 text-sky-500" />
      default:
        return <Bell className="w-5 h-5 text-[#8896A4]" />
    }
  }

  const markAsRead = async (id: string) => {
    if (!user) return
    setLoadingAction(id)
    try {
      const res = await fetch('/api/patient/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          notificationId: id
        })
      })
      if (res.ok) {
        reloadData()
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return
    setLoadingAction('all')
    try {
      const res = await fetch('/api/patient/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          markAll: true
        })
      })
      if (res.ok) {
        reloadData()
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#1A1F36]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-sora text-[#1A1F36]">Notifications Hub</h3>
          <p className="text-xs text-[#8896A4] mt-1">Review activity, prescription updates, and billing confirmations</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={loadingAction !== null}
            className="flex items-center gap-2 bg-[#F5F0EB] hover:bg-[#EDE8E3] text-[#C4622D] font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-center"
          >
            <MailOpen size={13} />
            <span>{loadingAction === 'all' ? 'Marking...' : 'Mark All as Read'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#1A1F36]/6 pb-px">
        {[
          { key: 'all' as const, label: 'All Activity' },
          { key: 'unread' as const, label: `Unread (${unreadCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`py-3 px-4 text-xs font-bold transition-all relative ${
              filter === tab.key
                ? 'text-[#C4622D]'
                : 'text-[#8896A4] hover:text-[#1A1F36]'
            }`}
          >
            {tab.label}
            {filter === tab.key && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C4622D]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayedNotifications.length > 0 ? (
            displayedNotifications.map(notif => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={`bg-white border rounded-2xl p-4 flex gap-4 transition-all duration-200 shadow-[0_2px_8px_rgba(26,31,54,0.01)] ${
                  notif.is_read 
                    ? 'border-[#1A1F36]/6 opacity-75' 
                    : 'border-[#C4622D]/20 bg-gradient-to-r from-[#C4622D]/2 to-transparent cursor-pointer hover:border-[#C4622D]/40'
                }`}
              >
                {/* Icon wrapper */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.is_read ? 'bg-[#F5F0EB]' : 'bg-[#C4622D]/10'
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Message Content */}
                <div className="flex-grow min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <p className={`text-sm font-bold text-[#1A1F36] ${notif.is_read ? '' : 'font-extrabold'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-[#8896A4] shrink-0 font-medium">
                      {new Date(notif.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[#8896A4] leading-relaxed break-words">{notif.message}</p>
                </div>

                {/* Unread Indicator dot */}
                {!notif.is_read && (
                  <div className="flex items-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C4622D] animate-pulse" />
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl p-12 text-center border border-[#1A1F36]/6 shadow-sm space-y-4"
            >
              <div className="w-14 h-14 bg-[#F5F0EB] rounded-full flex items-center justify-center mx-auto text-[#8896A4]">
                <Inbox size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1A1F36]">No Notifications</p>
                <p className="text-xs text-[#8896A4]">You are completely caught up with your wellness plan updates.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
