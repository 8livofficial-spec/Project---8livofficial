import { absoluteUrl } from './site'

export type PublicPage = {
  slug: string
  title: string
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  intro: string
  sections: Array<{
    heading: string
    body: string
    bullets?: string[]
  }>
  cta?: {
    label: string
    href: string
  }
  lastModified: Date
  priority: number
  changeFrequency: 'weekly' | 'monthly' | 'yearly'
  faq?: Array<{ question: string; answer: string }>
}

export const publicPages: PublicPage[] = [
  {
    slug: 'about',
    title: 'About 8liv',
    metaTitle: 'About 8liv',
    description: 'Learn how 8liv provides secure online doctor-led weight-management care with nutrition, fitness and follow-up support.',
    eyebrow: 'About',
    h1: 'Doctor-led metabolic care delivered online',
    intro: '8liv is built around secure telemedicine, structured clinical review and ongoing lifestyle support for people seeking supervised weight-management care.',
    sections: [
      {
        heading: 'What 8liv provides',
        body: 'The platform coordinates clinical assessment, online doctor consultations, nutrition support, fitness guidance and follow-up care in one secure experience.',
        bullets: ['Secure health intake and eligibility review', 'Online doctor consultation workflow', 'Personalized support from care teams', 'Patient portal for ongoing tracking'],
      },
      {
        heading: 'Our care principles',
        body: '8liv avoids unsupported promises. Treatment decisions belong to qualified clinicians and depend on each patient\'s health history, consultation findings and safety considerations.',
      },
    ],
    cta: { label: 'Learn how 8liv works', href: '/how-it-works' },
    lastModified: new Date('2026-07-14'),
    priority: 0.7,
    changeFrequency: 'monthly',
  },
  {
    slug: 'how-it-works',
    title: 'How 8liv Works',
    metaTitle: 'How 8liv Works',
    description: 'See how 8liv combines online assessment, doctor consultation, membership support and follow-up care for weight management.',
    eyebrow: 'How it works',
    h1: 'A structured path from assessment to follow-up care',
    intro: '8liv guides patients through a secure intake, doctor consultation and ongoing care plan without exposing private health details publicly.',
    sections: [
      {
        heading: '1. Complete a secure assessment',
        body: 'Patients begin with a health intake that helps determine whether a doctor consultation is appropriate.',
      },
      {
        heading: '2. Meet a doctor online',
        body: 'A doctor reviews the consultation context and discusses care options through a secure telemedicine workflow.',
      },
      {
        heading: '3. Continue with support',
        body: 'Where clinically appropriate, patients receive ongoing follow-up, nutrition guidance, fitness support and prescription fulfilment coordination.',
      },
    ],
    cta: { label: 'Start assessment', href: '/assessment' },
    lastModified: new Date('2026-07-14'),
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  {
    slug: 'medical-weight-management',
    title: 'Medical Weight Management',
    metaTitle: 'Medical Weight Management Online',
    description: 'Explore doctor-supervised medical weight-management care with online consultations, nutrition support and follow-up through 8liv.',
    eyebrow: 'Weight management',
    h1: 'Medical weight management with doctor oversight',
    intro: '8liv focuses on clinically supervised weight-management care, combining medical review with practical lifestyle support.',
    sections: [
      {
        heading: 'Doctor-supervised review',
        body: 'A doctor-led approach helps evaluate medical history, current health context, eligibility and safety considerations before treatment decisions are made.',
      },
      {
        heading: 'Lifestyle support matters',
        body: 'Sustainable weight management often needs nutrition, activity, behavior and follow-up support alongside any medical plan.',
        bullets: ['Nutrition guidance', 'Fitness coaching', 'Follow-up consultations', 'Progress tracking'],
      },
      {
        heading: 'No guaranteed outcomes',
        body: '8liv does not promise guaranteed weight loss or cures. Results vary and clinical suitability must be assessed by a qualified professional.',
      },
    ],
    cta: { label: 'Book your initial consultation', href: '/assessment' },
    lastModified: new Date('2026-07-14'),
    priority: 0.9,
    changeFrequency: 'monthly',
  },
  {
    slug: 'online-doctor-consultation',
    title: 'Online Doctor Consultation',
    metaTitle: 'Online Doctor Consultation for Weight Management',
    description: 'Book an online doctor consultation for weight-management review through the secure 8liv telemedicine platform.',
    eyebrow: 'Telemedicine',
    h1: 'Online doctor consultations for supervised care',
    intro: '8liv enables patients to consult doctors online for weight-management review and ongoing care planning.',
    sections: [
      {
        heading: 'Before the consultation',
        body: 'Patients complete a structured intake so the doctor can review relevant health context before the appointment.',
      },
      {
        heading: 'During the consultation',
        body: 'The doctor discusses symptoms, goals, health history and clinically appropriate next steps. Any prescription decision is made by the doctor.',
      },
      {
        heading: 'After the consultation',
        body: 'Patients can use the secure portal for appointment details, prescriptions where issued, medicine-order tracking and follow-up care.',
      },
    ],
    cta: { label: 'Start your assessment', href: '/assessment' },
    lastModified: new Date('2026-07-14'),
    priority: 0.85,
    changeFrequency: 'monthly',
  },
  {
    slug: 'nutrition-support',
    title: 'Nutrition Support',
    metaTitle: 'Online Nutrition Support',
    description: 'Nutrition support from 8liv helps patients build practical eating habits as part of a doctor-led weight-management plan.',
    eyebrow: 'Nutrition',
    h1: 'Nutrition support for sustainable weight management',
    intro: 'Nutrition guidance on 8liv is designed to support clinically supervised care with realistic, patient-friendly changes.',
    sections: [
      {
        heading: 'Personalized guidance',
        body: 'Nutrition support can account for goals, preferences, routine and clinical guidance from the care team.',
      },
      {
        heading: 'Practical habit building',
        body: 'The focus is on sustainable choices, meal structure, consistency and follow-up rather than short-term extremes.',
      },
    ],
    cta: { label: 'See membership options', href: '/membership' },
    lastModified: new Date('2026-07-14'),
    priority: 0.7,
    changeFrequency: 'monthly',
  },
  {
    slug: 'fitness-coaching',
    title: 'Fitness Coaching',
    metaTitle: 'Fitness Coaching for Weight Management',
    description: '8liv fitness coaching supports safe activity planning and sustainable movement habits as part of ongoing weight-management care.',
    eyebrow: 'Fitness',
    h1: 'Fitness support built around your care plan',
    intro: 'Movement and strength habits can support metabolic health when matched to a person\'s current ability, preferences and clinical context.',
    sections: [
      {
        heading: 'Accessible activity planning',
        body: 'Fitness guidance should be practical, progressive and appropriate for the patient\'s health status.',
      },
      {
        heading: 'Follow-up and adjustment',
        body: 'Plans may be adjusted as patients build confidence, improve consistency and receive ongoing care-team input.',
      },
    ],
    cta: { label: 'Explore the 8liv program', href: '/medical-weight-management' },
    lastModified: new Date('2026-07-14'),
    priority: 0.65,
    changeFrequency: 'monthly',
  },
  {
    slug: 'membership',
    title: 'Membership',
    metaTitle: '8liv Membership',
    description: 'Review 8liv membership support for doctor-led weight-management care, follow-up, nutrition guidance and fitness support.',
    eyebrow: 'Membership',
    h1: 'Membership support for ongoing care',
    intro: '8liv membership is designed to support patients beyond a single consultation with structured follow-up and care-team coordination.',
    sections: [
      {
        heading: 'What membership may include',
        body: 'Membership can include access to follow-up workflows, nutrition and fitness support, care coordination and patient portal tools.',
      },
      {
        heading: 'Clinical decisions remain medical decisions',
        body: 'Membership does not guarantee prescriptions, medication eligibility or outcomes. Doctors decide what is clinically appropriate.',
      },
    ],
    cta: { label: 'Compare plans', href: '/plans' },
    lastModified: new Date('2026-07-14'),
    priority: 0.75,
    changeFrequency: 'monthly',
  },
  {
    slug: 'contact',
    title: 'Contact 8liv',
    metaTitle: 'Contact 8liv',
    description: 'Contact 8liv for questions about online weight-management consultations, membership and platform support.',
    eyebrow: 'Contact',
    h1: 'Contact 8liv',
    intro: 'For general questions about the 8liv platform, membership or care workflows, contact the team by email.',
    sections: [
      {
        heading: 'General support',
        body: 'Email 8livofficial@gmail.com for general platform and support questions. Do not send emergency medical concerns by email.',
      },
      {
        heading: 'Medical emergencies',
        body: '8liv is not an emergency service. If you have urgent symptoms or a medical emergency, contact local emergency services immediately.',
      },
    ],
    cta: { label: 'Email 8liv', href: 'mailto:8livofficial@gmail.com' },
    lastModified: new Date('2026-07-14'),
    priority: 0.6,
    changeFrequency: 'monthly',
  },
  {
    slug: 'faq',
    title: 'FAQ',
    metaTitle: '8liv FAQ',
    description: 'Find answers about 8liv online consultations, medical weight-management care, prescriptions, membership and privacy.',
    eyebrow: 'FAQ',
    h1: 'Frequently asked questions',
    intro: 'These answers explain the public 8liv care workflow. Personal medical questions should be discussed with a qualified clinician.',
    sections: [
      {
        heading: 'Common questions',
        body: '8liv provides secure online workflows for assessment, consultation, follow-up support and prescription fulfilment coordination where clinically appropriate.',
      },
    ],
    faq: [
      {
        question: 'Does 8liv guarantee weight loss?',
        answer: 'No. 8liv does not guarantee weight loss, cures or specific outcomes. Results vary and depend on clinical suitability and follow-up.',
      },
      {
        question: 'Can every patient receive a prescription?',
        answer: 'No. Prescription decisions are made by a qualified doctor after reviewing the patient\'s clinical context.',
      },
      {
        question: 'Is 8liv an emergency service?',
        answer: 'No. 8liv is not for emergencies. People with urgent symptoms should contact local emergency services.',
      },
    ],
    cta: { label: 'Start assessment', href: '/assessment' },
    lastModified: new Date('2026-07-14'),
    priority: 0.65,
    changeFrequency: 'monthly',
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy',
    description: 'Read how 8liv approaches privacy for online health assessment, consultation, membership and care-support workflows.',
    eyebrow: 'Privacy',
    h1: 'Privacy policy',
    intro: '8liv handles health-related information with care. This public summary explains the privacy principles that should guide the platform.',
    sections: [
      {
        heading: 'Information handling',
        body: 'Health information should be collected only for legitimate care, support, security, payment or compliance purposes.',
      },
      {
        heading: 'Private health data',
        body: 'Patient names, assessments, diagnosis, prescriptions, appointments, payment details and private documents must not be exposed in public pages or SEO metadata.',
      },
      {
        heading: 'Analytics',
        body: 'Analytics, when implemented, should not receive medical assessment answers, diagnoses, prescription details or sensitive personal health information.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.45,
    changeFrequency: 'yearly',
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    metaTitle: 'Terms of Use',
    description: 'Read the public terms summary for using the 8liv telemedicine and weight-management platform.',
    eyebrow: 'Terms',
    h1: 'Terms of use',
    intro: 'These terms summarize appropriate use of the public 8liv website and platform workflows.',
    sections: [
      {
        heading: 'Platform use',
        body: 'Users should provide accurate information, protect account access and use the platform only for lawful, appropriate care-related purposes.',
      },
      {
        heading: 'Medical information',
        body: 'Website content is informational and does not replace consultation with a qualified medical professional.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.4,
    changeFrequency: 'yearly',
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    metaTitle: 'Refund Policy',
    description: 'Review the public 8liv refund policy summary for consultation, membership and care-support payments.',
    eyebrow: 'Policy',
    h1: 'Refund policy',
    intro: 'Refund eligibility depends on the payment type, service status and applicable platform policy at the time of request.',
    sections: [
      {
        heading: 'How refund requests are reviewed',
        body: 'Refund requests should be reviewed by the 8liv support or admin team using payment records and service status.',
      },
      {
        heading: 'Medical-service context',
        body: 'Completed consultations, issued prescriptions and delivered services may be handled differently from failed or duplicate payments.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.35,
    changeFrequency: 'yearly',
  },
  {
    slug: 'telemedicine-policy',
    title: 'Telemedicine Policy',
    metaTitle: 'Telemedicine Policy',
    description: 'Understand how 8liv uses telemedicine workflows for online consultations, eligibility review and follow-up care.',
    eyebrow: 'Policy',
    h1: 'Telemedicine policy',
    intro: '8liv uses online workflows to support assessment, consultation, documentation and follow-up where telemedicine is appropriate.',
    sections: [
      {
        heading: 'Appropriate use',
        body: 'Telemedicine may not be appropriate for every condition. Doctors may recommend in-person care or emergency care when needed.',
      },
      {
        heading: 'Consultation standards',
        body: 'Patients should provide accurate information and participate in consultation workflows needed for safe clinical decision-making.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.4,
    changeFrequency: 'yearly',
  },
  {
    slug: 'prescription-policy',
    title: 'Prescription Policy',
    metaTitle: 'Prescription Policy',
    description: 'Learn how prescriptions are handled in 8liv through doctor review, signed e-prescriptions and admin-managed fulfilment workflows.',
    eyebrow: 'Policy',
    h1: 'Prescription policy',
    intro: 'Prescription decisions are made by qualified doctors after clinical review. 8liv does not allow patients or admins to create unsigned prescriptions.',
    sections: [
      {
        heading: 'Doctor-issued prescriptions',
        body: 'Where clinically appropriate, a doctor may issue a signed e-prescription through the secure platform.',
      },
      {
        heading: 'Medicine fulfilment',
        body: '8liv admin teams may coordinate manual Apollo Pharmacy fulfilment after a prescription is signed. Apollo Pharmacy users do not log in to 8liv.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.45,
    changeFrequency: 'yearly',
  },
  {
    slug: 'editorial-policy',
    title: 'Editorial Policy',
    metaTitle: 'Editorial Policy',
    description: 'Review 8liv editorial standards for public health and weight-management information.',
    eyebrow: 'Editorial standards',
    h1: 'Editorial policy',
    intro: '8liv public medical content should be accurate, clear, useful and free from misleading claims.',
    sections: [
      {
        heading: 'Content standards',
        body: 'Public content should answer genuine patient questions, avoid keyword stuffing and clearly separate educational information from medical advice.',
      },
      {
        heading: 'Claims and evidence',
        body: '8liv should not publish guaranteed outcomes, cures, fabricated credentials, fake reviews or unsupported medical claims.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.35,
    changeFrequency: 'yearly',
  },
  {
    slug: 'medical-review-policy',
    title: 'Medical Review Policy',
    metaTitle: 'Medical Review Policy',
    description: 'Learn how 8liv should review public medical content for accuracy, safety and clinical appropriateness.',
    eyebrow: 'Medical review',
    h1: 'Medical review policy',
    intro: 'Public medical content should be reviewed by appropriately qualified professionals before publication.',
    sections: [
      {
        heading: 'Reviewer information',
        body: 'Medical articles should show reviewer name, qualification, review date, last updated date and sources where applicable.',
      },
      {
        heading: 'Corrections',
        body: 'If medical content is inaccurate or outdated, it should be corrected promptly and transparently.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.35,
    changeFrequency: 'yearly',
  },
  {
    slug: 'corrections-policy',
    title: 'Corrections Policy',
    metaTitle: 'Corrections Policy',
    description: 'Read how 8liv should handle corrections to public health and platform information.',
    eyebrow: 'Corrections',
    h1: 'Corrections policy',
    intro: '8liv should correct material errors in public content when they are identified.',
    sections: [
      {
        heading: 'Correction process',
        body: 'Corrections should be reviewed, documented and published when they materially affect meaning, safety or accuracy.',
      },
      {
        heading: 'Contact',
        body: 'Readers can contact 8livofficial@gmail.com to report potential issues in public content.',
      },
    ],
    lastModified: new Date('2026-07-14'),
    priority: 0.3,
    changeFrequency: 'yearly',
  },
]

export const publicPageMap = new Map(publicPages.map((page) => [page.slug, page]))

export function pagePath(page: PublicPage) {
  return `/${page.slug}`
}

export function publicPageOgImage(page: PublicPage) {
  if (['nutrition-support'].includes(page.slug)) return absoluteUrl('/images/nutrition_indian.png')
  if (['fitness-coaching'].includes(page.slug)) return absoluteUrl('/images/medical_supervision_visual8.png')
  return absoluteUrl('/images/hero_indian.png')
}
