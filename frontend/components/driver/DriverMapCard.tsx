'use client'

import React, { useState } from 'react'
import { MapPin, Navigation, Phone, ExternalLink, Map as MapIcon } from 'lucide-react'

interface DriverMapCardProps {
  recipientName: string
  phone?: string | null
  addressSnapshot: any
  formattedAddress: string
  navigationUrl: string
  searchUrl: string
  embedMapUrl?: string
}

export default function DriverMapCard({
  recipientName,
  phone,
  addressSnapshot,
  formattedAddress,
  navigationUrl,
  searchUrl,
  embedMapUrl,
}: DriverMapCardProps) {
  const [showEmbed, setShowEmbed] = useState(false)

  return (
    <div className="overflow-hidden rounded-3xl border border-[#1A1F36]/10 bg-white shadow-sm">
      {/* Map Preview Header / Frame */}
      <div className="relative h-44 w-full bg-[#E5DFD7]">
        {showEmbed && embedMapUrl ? (
          <iframe
            src={embedMapUrl}
            title="Delivery Destination Map"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#FAF7F5] to-[#EAE3DB]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C4622D] text-white shadow-md mb-2">
              <MapPin className="h-6 w-6 animate-bounce" />
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1A1F36]">
              Patient Delivery Destination
            </p>
            <p className="mt-0.5 max-w-xs text-[11px] font-semibold text-[#8896A4] line-clamp-1">
              {formattedAddress}
            </p>
            <button
              type="button"
              onClick={() => setShowEmbed(true)}
              className="mt-2.5 inline-flex items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#1A1F36] shadow-sm hover:bg-white"
            >
              <MapIcon className="h-3 w-3 text-[#C4622D]" />
              Load Interactive Map
            </button>
          </div>
        )}

        {/* Live Route Tag */}
        <div className="absolute top-3 left-3 rounded-full bg-[#1A1F36]/80 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Route Destination
        </div>
      </div>

      {/* Recipient & Address Info */}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-[#1A1F36]">{recipientName}</h4>
            <p className="mt-1 text-xs text-[#40516A] leading-relaxed">
              {addressSnapshot?.line1 || addressSnapshot?.address_line1}
              {addressSnapshot?.line2 ? `, ${addressSnapshot.line2}` : ''}
              {addressSnapshot?.area ? `, ${addressSnapshot.area}` : ''}
              <br />
              <span className="font-bold">
                {addressSnapshot?.city}, {addressSnapshot?.state} - {addressSnapshot?.pincode}
              </span>
            </p>
          </div>

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
              title="Call Patient"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
        </div>

        {/* Action Button Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <a
            href={navigationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#C4622D] px-4 py-3 text-xs font-black text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Navigation className="h-4 w-4" />
            Start Google Maps Navigation
          </a>

          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#1A1F36]/15 bg-[#FAF7F5] px-4 py-3 text-xs font-bold text-[#1A1F36] transition-colors hover:bg-[#F5F0EB]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View in Maps App
          </a>
        </div>
      </div>
    </div>
  )
}
