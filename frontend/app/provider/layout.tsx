'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { ProviderDataProvider } from '@/components/provider/ProviderPortal'

export default function ProviderLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  if (pathname === '/provider/activate') {
    return <>{children}</>
  }

  return (
    <ProviderDataProvider>
      {children}
    </ProviderDataProvider>
  )
}
