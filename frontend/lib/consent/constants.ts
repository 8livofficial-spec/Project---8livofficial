import crypto from 'crypto'

export const CONSENT_VERSION = 'v4.0'
export const CONSENT_EFFECTIVE_DATE = '2026-10-18'

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 4: DATA AND PRIVACY CONSENT NOTICE
// ─────────────────────────────────────────────────────────────────────────────
export const PART4_DATA_NOTICE = {
  document_id: 'data_notice',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Data and Privacy Consent Notice (Part 4)',
  summary: {
    whoIsAsking: '8liv Health Platform (operating as www.8liv.in)',
    whatWeCollect: 'Contact details, age/date of birth, baseline metrics, lab reports, medical history, and clinical consultation records.',
    whyWeCollect: 'To assess treatment eligibility, deliver doctor-supervised metabolic healthcare, and provide customized nutrition and fitness plans.',
    whoSeesIt: 'Your dedicated care team: your assigned licensed physician, clinical dietician, and certified fitness coach.',
    retention: 'Stored securely in encrypted format for the active duration of your treatment and required clinical record-keeping periods.',
    yourRights: 'You may inspect your recorded data, request corrections, or withdraw optional and required consents under Account Settings > Privacy.',
  },
  content: `Data and Privacy Consent Notice (8liv Legal Pack v4 · Part 4)
Who is asking: 8liv Health (www.8liv.in).
What we collect: Your personal identification, age/date of birth, metabolic metrics, lab reports, and health records.
Why we collect: To conduct clinical evaluation, provide doctor-supervised telehealth, and design metabolic nutrition and fitness programs.
Who sees it: Strictly your designated physician, registered dietician, certified trainer, and authorized clinical staff.
How long we store it: Securely encrypted for the duration of your care program in accordance with applicable medical record retention standards.
Your rights: You have the right to access, review, and withdraw your consent anytime via Account Settings > Privacy.`,
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: INFORMED CONSENT TO TREATMENT (12 STATEMENTS)
// ─────────────────────────────────────────────────────────────────────────────
export const PART3_TREATMENT_STATEMENTS = [
  {
    id: 'teleconsultation',
    lead: 'Teleconsultation',
    text: 'I understand that telemedicine involves the delivery of healthcare services using electronic audio, video, and digital communications between a qualified healthcare practitioner and a patient at a distance.',
  },
  {
    id: 'accurate_information',
    lead: 'Accurate information',
    text: 'I confirm that I will provide truthful, accurate, and complete information regarding my medical history, current symptoms, prior treatments, allergies, and medications.',
  },
  {
    id: 'benefits_and_risks',
    lead: 'Benefits and risks',
    text: 'I understand the potential benefits and limitations of remote care, including the risk of technological disruptions and that remote consultation cannot substitute for in-person emergency examination.',
  },
  {
    id: 'alternative_care',
    lead: 'Alternative care',
    text: 'I understand that in-person clinical consultations are available as an alternative, and my provider may advise an in-person physical assessment if clinically indicated.',
  },
  {
    id: 'emergency_care',
    lead: 'Emergency care',
    text: 'I understand that 8liv telemedicine services are not intended for acute medical emergencies. In an emergency, I must immediately call 112 or visit the nearest hospital emergency department.',
  },
  {
    id: 'provider_discretion',
    lead: 'Provider discretion',
    text: 'I acknowledge that the consulting physician or healthcare specialist exercises independent professional judgment and may decline or adjust treatment where clinically indicated.',
  },
  {
    id: 'care_team_coordination',
    lead: 'Care team coordination',
    text: 'I consent to structured communication and clinical sharing between my doctor, dietician, and trainer for multidisciplinary lifestyle and metabolic care.',
  },
  {
    id: 'electronic_records',
    lead: 'Electronic records',
    text: 'I consent to my consultation notes, medical assessments, and official digital e-prescriptions being recorded and encrypted in 8liv digital health systems.',
  },
  {
    id: 'medication_advisory',
    lead: 'Medication advisory',
    text: 'I agree to strictly review and comply with all instructions, dosages, precautions, and contraindications provided with any physician-issued e-prescription.',
  },
  {
    id: 'security_and_privacy',
    lead: 'Security and privacy',
    text: 'I understand that 8liv employs end-to-end security controls and access restrictions to protect my medical records and consultation transmissions.',
  },
  {
    id: 'voluntary_participation',
    lead: 'Voluntary participation',
    text: 'I understand that my consent to this telemedicine consultation is entirely voluntary, and I retain the right to withhold or withdraw consent at any stage.',
  },
  {
    id: 'financial_terms',
    lead: 'Financial terms',
    text: 'I acknowledge and agree to the consultation pricing, terms of service, and cancellation conditions applicable to my 8liv appointment booking.',
  },
]

export const PART3_TREATMENT_CONSENT = {
  document_id: 'treatment_consent',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Informed Consent to Treatment (Part 3)',
  content: PART3_TREATMENT_STATEMENTS.map(s => `${s.lead}: ${s.text}`).join('\n\n'),
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMS OF SERVICE, PRIVACY POLICY & PRESCRIPTION POLICY (PARTS 1, 2, 5)
// ─────────────────────────────────────────────────────────────────────────────
export const TERMS_OF_SERVICE = {
  document_id: 'terms',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Terms of Service',
  content: `Terms of Service (8liv Legal Pack v4 · Part 1)
Effective Date: ${CONSENT_EFFECTIVE_DATE} · Version ${CONSENT_VERSION}

1. Telehealth Platform Services
8liv operates a digital concierge healthcare technology platform connecting patients with independent licensed medical doctors, clinical dieticians, and certified fitness coaches. 8liv is a digital healthcare platform, not a pharmacy. 8liv does not dispense, sell, or deliver pharmaceutical drugs or medications.

2. Eligibility & Account Security
You must be at least 18 years of age or possess verified parent/guardian consent to use 8liv telehealth services. You agree to safeguard your credentials and provide accurate information.

3. Emergency Notice
8liv services are not for medical emergencies. In the event of a medical emergency, call 112 or visit the nearest emergency facility immediately.

4. Appointments, Payments, and Cancellations
Consultation fees are paid securely in advance. Eligible cancellations and reschedules can be made from your patient portal in accordance with platform policy.`,
}

export const PRIVACY_POLICY = {
  document_id: 'privacy',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Privacy Policy',
  content: `Privacy Policy (8liv Legal Pack v4 · Part 2)
Effective Date: ${CONSENT_EFFECTIVE_DATE} · Version ${CONSENT_VERSION}

1. Collection of Health and Personal Data
We collect personal contact details, demographic data, date of birth, biometric measurements, lab reports, and clinical consultation records strictly to deliver medical care.

2. Access & Clinical Confidentiality
Your medical records are shared only with your designated doctor, dietician, and trainer for direct patient care, and authorized clinical operations staff.

3. Data Security & Encryption
All health data is encrypted in transit and at rest using industry-standard cryptographic protocols.

4. Your Rights & Consent Withdrawal
You may view, export, or withdraw your consents at any time in Account Settings > Privacy.`,
}

export const PRESCRIPTION_POLICY = {
  document_id: 'prescription',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Prescription Policy',
  content: `Prescription Policy (8liv Legal Pack v4 · Part 5)
Effective Date: ${CONSENT_EFFECTIVE_DATE} · Version ${CONSENT_VERSION}

1. Independent Clinical Decision
Official digital e-prescriptions are issued exclusively by registered medical practitioners based solely on their independent clinical evaluation. No prescription is guaranteed.

2. No Pharmacy Operation
8liv is a telehealth software platform. 8liv does not sell, manufacture, package, or deliver prescription medications. Any prescription issued to you can be fulfilled at any licensed pharmacy of your choice.

3. Patient Responsibility
Patients must verify medication details and strictly follow physician instructions.`,
}

export const ALL_CANONICAL_DOCUMENTS = [
  PART4_DATA_NOTICE,
  PART3_TREATMENT_CONSENT,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  PRESCRIPTION_POLICY,
]
