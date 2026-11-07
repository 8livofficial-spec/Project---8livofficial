import React from 'react'
import ProviderActiveCallFloatingButton from '@/components/provider/ProviderActiveCallFloatingButton'

export default function TrainerLayout({
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

