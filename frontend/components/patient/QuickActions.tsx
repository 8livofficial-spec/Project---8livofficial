'use client'

import React from 'react'
import Link from 'next/link'
import { CalendarCheck, MessageCircle, Pill, Scale } from 'lucide-react'

interface QuickActionsProps {
  onLogWeightClick: () => void
}

export default function QuickActions({ onLogWeightClick }: QuickActionsProps) {
  const actions = [
    {
      icon: Scale,
      title: 'Log Weight',
      sub: 'Submit daily log',
      color: '#5C7A6B',
      bg: 'rgba(92,122,107,0.08)',
      onClick: onLogWeightClick,
      href: ''
    },
    {
      icon: MessageCircle,
      title: 'Chat Doctor',
      sub: 'Send follow-up',
      color: '#C4622D',
      bg: 'rgba(196,98,45,0.08)',
      onClick: undefined,
      href: '/patient/messages'
    },
    {
      icon: CalendarCheck,
      title: 'Book Check-in',
      sub: 'Schedule call slot',
      color: '#1A1F36',
      bg: 'rgba(26,31,54,0.06)',
      onClick: undefined,
      href: '/patient/consultation'
    },
    {
      icon: Pill,
      title: 'Refill Protocol',
      sub: 'Request GLP-1 refill',
      color: '#8896A4',
      bg: 'rgba(136,150,164,0.1)',
      onClick: undefined,
      href: '/patient/prescriptions'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {actions.map((action) => {
        const Icon = action.icon

        const cardContent = (
          <div className="dash-card p-5 cursor-pointer group h-full">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200"
              style={{ background: action.bg }}
            >
              <Icon size={20} style={{ color: action.color }} strokeWidth={1.8} />
            </div>
            <p className="text-[#1A1F36] font-semibold text-sm leading-tight">{action.title}</p>
            <p className="text-[#8896A4] text-xs mt-0.5">{action.sub}</p>
          </div>
        )

        if (action.onClick) {
          return (
            <button 
              key={action.title}
              onClick={action.onClick}
              className="w-full text-left bg-transparent border-0 p-0 cursor-pointer h-full"
            >
              {cardContent}
            </button>
          )
        }

        return (
          <Link key={action.title} href={action.href} className="no-underline block h-full">
            {cardContent}
          </Link>
        )
      })}
    </div>
  )
}
