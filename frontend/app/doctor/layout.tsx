import React from 'react'
import ProviderActiveCallFloatingButton from '@/components/provider/ProviderActiveCallFloatingButton'

export default function DoctorLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <ProviderActiveCallFloatingButton />
    </>
  )
}

