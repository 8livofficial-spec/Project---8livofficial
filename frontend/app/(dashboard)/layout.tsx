'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Calendar, TrendingDown, MessageCircle, Video, X, PhoneCall } from 'lucide-react'
import { usePatientData, PatientDataProvider } from '@/hooks/usePatientData'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/components/patient/Sidebar'
import Topbar from '@/components/patient/Topbar'
import AppointmentOnlyLayout from '@/components/patient/AppointmentOnlyLayout'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <PatientDataProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </PatientDataProvider>
  )
}

function DashboardLayoutContent({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { user, profile, assessment, consultation, notifications, loading, flowStep, onboardingState } = usePatientData()

  // Global real-time doctor calling alert (works on any patient page)
  const [globalCallAlert, setGlobalCallAlert] = useState<{ roomUrl: string; consultationId: string } | null>(null)
  const callingAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !active) return
      const patientId = session.user.id
      const channelName = `global-call-alert-${patientId}`

      // Remove channel if already cached and subscribed
      const existingChannel = supabase.getChannels().find((channel) => {
        const cachedChannel = channel as { topic?: string; name?: string }
        return cachedChannel.topic === channelName || cachedChannel.name === channelName
      })
      if (existingChannel) {
        await supabase.removeChannel(existingChannel)
      }

      if (!active) return

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'doctor_consultations',
          filter: `patient_id=eq.${patientId}`,
        }, (payload) => {
          const rec = payload.new as { id?: string; room_url?: string; status?: string }
          if (rec.status === 'calling' && rec.room_url) {
            setGlobalCallAlert({ roomUrl: rec.room_url, consultationId: rec.id || '' })
            try {
              if (!callingAudioRef.current) {
                // Simple inline beep via AudioContext (no external file needed)
                const ctx = new AudioContext()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.frequency.value = 440
                gain.gain.setValueAtTime(0.3, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
                osc.start(ctx.currentTime)
                osc.stop(ctx.currentTime + 0.5)
              }
            } catch {}
          } else if (rec.status === 'attended' || rec.status === 'completed') {
            setGlobalCallAlert(null)
          }
        })
      
      channel.subscribe()
    }
    setup()
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Onboarding gate: redirect if the user hasn't completed required flow steps
  const isStandaloneFlowPage = pathname.startsWith('/patient/onboarding') || pathname.startsWith('/patient/consultation')
  const isOnboardingPlanPage = pathname.startsWith('/patient/onboarding/plan') || pathname === '/plans'
  const isOnboardingPaymentPage = pathname.startsWith('/patient/onboarding/payment') || pathname === '/membership-payment'
  const isConsultationBookingPage = pathname.startsWith('/patient/consultation')
  const isConsultationRoomPage = pathname.startsWith('/patient/consultation/room')
  const isAppointmentDetailsPage = /^\/patient\/appointments\/[^/]+/.test(pathname)
  const appointmentStatus = onboardingState.appointmentStatus || ''
  const bookingId = onboardingState.bookingId || null
  const dashboardAccess = onboardingState.dashboardAccess === true
  const consultationPaymentStatus = onboardingState.consultationPaymentStatus || ''

  useEffect(() => {
    if (loading) return

    let targetPath: string | null = null
    if (flowStep === 'needs_assessment') {
      targetPath = '/assessment'
    } else if (flowStep === 'not_eligible') {
      targetPath = '/not-eligible'
    } else if (dashboardAccess && pathname.startsWith('/patient/onboarding')) {
      targetPath = '/patient'
    } else if (flowStep === 'appointment_scheduled') {
      const canAccessRescheduleBooking = isConsultationBookingPage && ['MISSED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_PATIENT'].includes(appointmentStatus)
      if (!isAppointmentDetailsPage && !isConsultationRoomPage && !canAccessRescheduleBooking) {
        targetPath = bookingId ? `/patient/appointments/${bookingId}` : '/patient/appointments'
      }
    } else if (flowStep === 'needs_consultation') {
      if (!isConsultationBookingPage && !isAppointmentDetailsPage) {
        targetPath = consultationPaymentStatus === 'PAID' ? '/appointments/select-slot' : '/consultation-payment'
      }
    } else if (flowStep === 'needs_plan') {
      if (!isOnboardingPlanPage) targetPath = '/plans'
    } else if (flowStep === 'needs_payment') {
      if (!isOnboardingPaymentPage) targetPath = '/membership-payment'
    }

    if (targetPath && pathname !== targetPath) {
      router.replace(targetPath)
    }
  }, [
    flowStep,
    loading,
    isOnboardingPlanPage,
    isOnboardingPaymentPage,
    isConsultationBookingPage,
    isConsultationRoomPage,
    isAppointmentDetailsPage,
    appointmentStatus,
    bookingId,
    dashboardAccess,
    consultationPaymentStatus,
    pathname,
    router
  ])

  // Determine dynamic title and breadcrumbs based on route
  const getPageMeta = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return { title: 'Overview', crumbs: ['Patient', 'Overview'] }
    }
    const sub = segments[1]
    switch (sub) {
      case 'appointments':
        return { title: 'Appointments', crumbs: ['Patient', 'Appointments'] }
      case 'progress':
        return { title: 'My Progress', crumbs: ['Patient', 'Progress'] }
      case 'messages':
        return { title: 'Messages', crumbs: ['Patient', 'Messages'] }
      case 'prescriptions':
        return { title: 'Prescriptions', crumbs: ['Patient', 'Prescriptions'] }
      case 'consultation':
        return { title: 'Consultations', crumbs: ['Patient', 'Consultations'] }
      case 'billing':
        return { title: 'Billing', crumbs: ['Patient', 'Billing'] }
      case 'settings':
        return { title: 'Account Settings', crumbs: ['Patient', 'Settings'] }
      case 'profile':
        return { title: 'My Profile', crumbs: ['Patient', 'Profile'] }
      case 'notifications':
        return { title: 'Notifications Hub', crumbs: ['Patient', 'Notifications'] }
      default:
        return { title: 'Dashboard', crumbs: ['Patient', 'Portal'] }
    }
  }

  const { title, crumbs } = getPageMeta()

  const patientName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : assessment?.first_name 
      ? `${assessment.first_name} ${assessment.last_name || ''}`.trim()
      : user?.user_metadata?.display_id
        || user?.email?.split('@')[0]
        || 'Patient Member'

  const getInitials = (nameStr: string) => {
    const parts = nameStr.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts.length > 0 ? parts[0][0].toUpperCase() : 'PM'
  }

  const initials = profile?.first_name 
    ? `${profile.first_name[0]}${profile.last_name?.[0] || ''}`.toUpperCase()
    : assessment?.first_name
      ? `${assessment.first_name[0]}${assessment.last_name?.[0] || ''}`.toUpperCase()
      : getInitials(patientName)

  const getProgramWeek = (createdAtString?: string) => {
    if (!createdAtString) return 1
    const start = new Date(createdAtString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const week = Math.ceil(diffDays / 7)
    return Math.min(12, Math.max(1, week))
  }

  // Show real plan name or nothing — never default to 'Silver Plan'
  const membershipTier = assessment?.membership_tier || ''
  const programWeek = assessment?.created_at ? getProgramWeek(assessment.created_at) : 1
  const totalWeeks = 12

  const unreadMessages = notifications.filter(n => n.type === 'message' && !n.is_read).length
  const notificationsCount = notifications.filter(n => !n.is_read).length

  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/patient' },
    { icon: Calendar, label: 'Appointments', href: '/patient/appointments' },
    { icon: TrendingDown, label: 'Progress', href: '/patient/progress' },
    { icon: MessageCircle, label: 'Messages', href: '/patient/messages', badge: unreadMessages },
    { icon: Video, label: 'Consultations', href: '/patient/consultation' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center text-[#C4622D]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Onboarding & consultation booking pages: full-screen, no dashboard chrome ──
  if (isStandaloneFlowPage) {
    return <>{children}</>
  }

  if (flowStep === 'appointment_scheduled' && isAppointmentDetailsPage) {
    return <AppointmentOnlyLayout>{children}</AppointmentOnlyLayout>
  }

  if (flowStep !== 'ready') {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center text-[#C4622D]">
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col lg:flex-row overflow-hidden text-[#1A1F36] font-sans selection:bg-[#C4622D]/20 selection:text-[#C4622D]">
      {/* ── GLOBAL REAL-TIME CALLING ALERT (fixed, any page) ── */}
      {globalCallAlert && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#C4622D] to-orange-300 rounded-full flex items-center justify-center mx-auto shadow-xl animate-pulse">
                <PhoneCall className="w-12 h-12 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping inline-block mx-auto" style={{left: 'calc(50% + 28px)'}} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#C4622D] bg-[#C4622D]/10 px-3 py-1 rounded-full inline-block">🟢 Live Call
              </span>
              <h3 className="text-2xl font-bold text-[#1A1F36] mt-3">Your Doctor is Calling!</h3>
              <p className="text-xs text-[#8896A4] font-medium mt-2 leading-relaxed">
                Your physician has started your video consultation. Join now before the session times out.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  router.push(`/patient/consultation/room?id=${encodeURIComponent(globalCallAlert.roomUrl)}`)
                  setGlobalCallAlert(null)
                }}
                className="w-full bg-[#C4622D] hover:bg-[#A8522A] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-lg shadow-[#C4622D]/30 flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" /> Join Consultation Now
              </button>
              <button
                onClick={() => setGlobalCallAlert(null)}
                className="text-xs text-[#8896A4] hover:text-[#1A1F36] font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Desktop Sidebar (always visible on lg+) */}
      <div className="hidden lg:block">
        <Sidebar
          patientName={patientName}
          initials={initials}
          membershipTier={membershipTier}
          programWeek={programWeek}
          totalWeeks={totalWeeks}
          unreadMessagesCount={unreadMessages}
          email={user?.email || undefined}
        />
      </div>

      {/* 2. Mobile Sidebar Slide-out Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="relative z-55 w-64 h-full animate-slide-in">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 z-50 p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              patientName={patientName}
              initials={initials}
              membershipTier={membershipTier}
              programWeek={programWeek}
              totalWeeks={totalWeeks}
              unreadMessagesCount={unreadMessages}
              email={user?.email || undefined}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar
          pageTitle={title}
          breadcrumbs={crumbs}
          initials={initials}
          notificationsCount={notificationsCount}
          onMenuToggle={() => setMobileSidebarOpen(true)}
          notifications={notifications}
          assessment={assessment || undefined}
          consultation={consultation || undefined}
        />
        
        {/* Workspace scrollable viewport */}
        <main className="flex-grow overflow-y-auto p-6 pb-20 lg:pb-6 custom-scrollbar">
          {children}
        </main>
      </div>

      {/* 4. Mobile Bottom navigation tabs (visible on < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 
                      bg-white border-t border-[rgba(26,31,54,0.08)]
                      pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(26,31,54,0.04)]">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link 
                key={tab.href} 
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors relative
                  ${isActive ? 'text-[#C4622D]' : 'text-[#8896A4] hover:text-[#1A1F36]'}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-1.5 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                ) : null}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
