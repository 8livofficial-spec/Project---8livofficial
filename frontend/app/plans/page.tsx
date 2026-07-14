import type { Metadata } from 'next'
import PlanSelectionPage from '@/app/(dashboard)/patient/onboarding/plan/page'
import { absoluteUrl } from '@/lib/seo/site'

const title = '8liv Membership Plans'
const description = 'Compare 8liv membership options for doctor-led weight-management care, nutrition support, fitness guidance and ongoing follow-up.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/plans',
  },
  openGraph: {
    title,
    description,
    url: absoluteUrl('/plans'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/images/cta_background.png'),
        width: 1200,
        height: 630,
        alt: '8liv membership plans for doctor-led weight management care',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [absoluteUrl('/images/cta_background.png')],
  },
}

export default PlanSelectionPage
