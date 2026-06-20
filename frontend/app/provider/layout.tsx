'use client'

import React from 'react'
import { ProviderDataProvider } from '@/components/provider/ProviderPortal'

export default function ProviderLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ProviderDataProvider>
      {children}
    </ProviderDataProvider>
  )
}
