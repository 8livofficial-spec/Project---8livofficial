import crypto from 'crypto'

export const CONSENT_VERSION = 'v5.0'
export const CONSENT_EFFECTIVE_DATE = '2026-11-05'

export const COMPANY_DETAILS = {
  legalName: 'LONGLIV PRIVATE LIMITED',
  brandName: '8liv',
  website: 'www.8liv.in',
  registeredOffice: '30/4, 1st Floor, PCM Nagar, Arumugam Vadaku Theru-I, Tirumangalam South, Madurai North, Madurai 625706, Tamil Nadu',
  jurisdiction: 'Madurai, Tamil Nadu, India',
  grievanceOfficer: {
    name: 'ROHITH S',
    email: 'rohith@8liv.in',
    phoneTerms: '9944023986',
    phonePrivacy: '9344698676',
    acknowledgmentHours: 48,
    resolutionDays: 30,
  },
  retentionYears: 3,
  hosting: 'Google Cloud Platform (GCP) encrypted storage',
}

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 4: DATA AND PRIVACY CONSENT NOTICE (SIGN-UP / ONBOARDING GATE 1)
// ─────────────────────────────────────────────────────────────────────────────
export const PART4_DATA_NOTICE = {
  document_id: 'data_notice',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Data and Privacy Consent Notice (Part 4)',
  whoIsAsking: 'LONGLIV PRIVATE LIMITED (8liv), www.8liv.in',
  whatWeCollect: 'Your contact details, health history, consultation notes, prescriptions, lab reports, and diet, weight and exercise records.',
  why: 'To provide your consultations, lab tests, diet and fitness coaching, to send reminders and follow-ups, and to keep your medical record.',
  whoSeesIt: 'Your doctor, dietician and trainer, our partner laboratory, and our secure technology providers. We do not sell your data, and we do not share it with pharmacies.',
  howLong: 'As long as needed for your care and as the law requires. Clinical records are kept for at least 3 years.',
  yourRights: 'You can see, correct or erase your data, withdraw consent, and make a complaint to our Grievance Officer at rohith@8liv.in or to the Data Protection Board of India.',
  checkboxes: [
    {
      id: 'consent_health_data',
      required: true,
      label: 'I consent to 8liv collecting and using my personal and health data for the purposes above.',
      badge: 'REQUIRED',
    },
    {
      id: 'consent_care_team_share',
      required: true,
      label: 'I consent to my lab reports and health records being shared with my doctor, dietician and trainer for my care.',
      badge: 'REQUIRED',
    },
    {
      id: 'consent_reminders',
      required: false,
      label: 'I would like reminders and health tips by WhatsApp, SMS or email.',
      badge: 'OPTIONAL',
    },
    {
      id: 'consent_deidentified_research',
      required: false,
      label: 'I consent to my de-identified data being used to improve 8liv’s services.',
      badge: 'OPTIONAL',
    },
  ],
  content: `Data and Privacy Consent Notice (8liv Legal Pack v5 · Part 4)
Who is asking: LONGLIV PRIVATE LIMITED (8liv), www.8liv.in.
What we collect: Your contact details, health history, consultation notes, prescriptions, lab reports, and diet, weight and exercise records.
Why: To provide your consultations, lab tests, diet and fitness coaching, to send reminders and follow-ups, and to keep your medical record.
Who sees it: Your doctor, dietician and trainer, our partner laboratory, and our secure technology providers. We do not sell your data, and we do not share it with pharmacies.
How long: As long as needed for your care and as the law requires. Clinical records are kept for 3 years.
Your rights: You can see, correct or erase your data, withdraw consent, and make a complaint to our Grievance Officer at rohith@8liv.in or to the Data Protection Board of India.`,
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: INFORMED CONSENT TO TREATMENT (12 STATEMENTS FOR GATE 3)
// ─────────────────────────────────────────────────────────────────────────────
export const PART3_TREATMENT_STATEMENTS = [
  {
    id: 'teleconsultation',
    lead: 'Teleconsultation',
    text: 'My consultation will take place by video, audio or chat with a registered doctor. The doctor cannot physically examine me, and this has limits. The doctor may advise an in-person visit, further tests, or may decline to prescribe if teleconsultation is not suitable for me.',
  },
  {
    id: 'accurate_information',
    lead: 'Accurate information',
    text: 'I have given, and will give, correct and complete information about my health, medicines and allergies. I know that wrong or missing information can lead to unsafe advice.',
  },
  {
    id: 'benefits_and_risks',
    lead: 'Benefits and risks',
    text: 'Teleconsultation offers convenience and continuity of care. Its risks include a missed diagnosis because there was no physical examination, technical failure during the session, and delays if I need urgent care.',
  },
  {
    id: 'laboratory_tests',
    lead: 'Laboratory tests',
    text: 'I agree to the collection of my samples and the sharing of my reports with my doctor. Tests have limits, and a result can need repeating or clinical correlation. I will not change my treatment until my doctor has reviewed the report.',
  },
  {
    id: 'prescriptions',
    lead: 'Prescriptions',
    text: 'Any prescription is issued by my doctor based on my consultation, and may include medicines, tests or lifestyle advice. I understand that 8liv does not sell or deliver medicines and I can fill the prescription at any pharmacy. I will take medicines as prescribed and report side effects to my doctor.',
  },
  {
    id: 'diet_and_exercise',
    lead: 'Diet and exercise guidance',
    text: 'The dietician and trainer give general guidance and do not diagnose or treat disease. A doctor’s clearance may be needed before I start exercise. I will tell them about any new symptoms, injury, pregnancy or medicine, and I will stop and seek medical help if I feel unwell during exercise.',
  },
  {
    id: 'no_guarantee',
    lead: 'No guarantee',
    text: 'My results depend on my health, my following the plan and other factors. No outcome has been promised.',
  },
  {
    id: 'emergencies',
    lead: 'Emergencies',
    text: 'This service is not for emergencies. In an emergency I will call 112 or go to the nearest hospital.',
  },
  {
    id: 'follow_up',
    lead: 'Follow-up',
    text: 'I will attend my follow-ups and retests, and I may be contacted by the care team to check my progress.',
  },
  {
    id: 'recording',
    lead: 'Recording',
    text: 'Sessions are not recorded unless I am asked and I agree. Clinical notes are kept in my medical record.',
  },
  {
    id: 'right_to_withdraw',
    lead: 'Right to withdraw',
    text: 'I may ask questions at any time, refuse or stop any service, and withdraw this consent. Withdrawal does not affect care already given.',
  },
  {
    id: 'minors_and_others',
    lead: 'Minors and others',
    text: 'If I am booking for a child or someone who cannot consent, I am their parent or legal guardian and I consent on their behalf.',
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
// PART 1: PATIENT TERMS OF SERVICE (14 SECTIONS)
// ─────────────────────────────────────────────────────────────────────────────
export const TERMS_SECTIONS = [
  {
    number: '01',
    title: 'What 8liv is',
    content:
      '8liv is a technology platform that connects you with registered doctors for teleconsultation, with partner laboratories for diagnostic tests, and with qualified dieticians and fitness trainers for lifestyle coaching. The medical, nutrition and training services are provided by the independent professionals and laboratories you choose or are assigned. 8liv does not practise medicine and does not run a pharmacy.',
  },
  {
    number: '02',
    title: 'No medicines supplied by 8liv',
    content:
      '8liv does not sell, stock, dispense, ship or deliver medicines. If a doctor prescribes medicine, you receive the prescription and may buy it from any pharmacy of your choice. Any pharmacy you use is independent of 8liv, and we are not responsible for its stock, price, quality or service.',
  },
  {
    number: '03',
    title: 'Eligibility and your account',
    content:
      'You must be 18 or older. A parent or legal guardian may book for a minor and must give consent for them. Give accurate and complete information, including your medical history, current medicines and allergies. Wrong or missing information can make advice unsafe. Keep your login details private. You are responsible for activity on your account. One person, one account.',
  },
  {
    number: '04',
    title: 'Teleconsultation',
    content:
      'Consultations take place by video, audio or chat with a registered medical practitioner, as allowed under the Telemedicine Practice Guidelines 2020. The doctor cannot physically examine you. Advice relies on what you tell the doctor and the reports you share. The doctor may ask you to visit a clinic or hospital in person, and may decline to prescribe if teleconsultation is not suitable. Doctors use their own clinical judgement. 8liv does not direct their medical decisions. Booking, rescheduling and cancellation: Free rescheduling is permitted up to 72 hours before your scheduled slot.',
  },
  {
    number: '05',
    title: 'Laboratory tests',
    content:
      'Tests are carried out by partner laboratories. You must follow the preparation instructions (such as fasting). Reports are shared with you and with your treating doctor through your 8liv account. Test results support, but do not replace, a doctor’s assessment. Do not change treatment based on a report until your doctor has reviewed it. Sample collection, turnaround time and report corrections are the laboratory’s responsibility. We will help you raise a concern.',
  },
  {
    number: '06',
    title: 'Dietician and fitness services',
    content:
      'Dieticians and trainers give general lifestyle, nutrition and exercise guidance. They do not diagnose or treat disease, and they do not prescribe medicines. A doctor’s clearance may be required before an exercise or diet plan begins. You must tell your trainer and dietician about any new symptom, injury or medicine. Stop exercising and seek medical help if you feel chest pain, breathlessness, dizziness, or any other alarming symptom. Individual results vary. 8liv does not guarantee weight loss, health improvement or any specific outcome.',
  },
  {
    number: '07',
    title: 'Not for emergencies',
    content:
      '8liv is not for emergencies or life-threatening conditions. In an emergency, call 112 or go to the nearest hospital immediately.',
  },
  {
    number: '08',
    title: 'Your responsibilities',
    content:
      'Follow the advice you receive, take any medicines exactly as prescribed, and attend follow-ups and retests. Do not impersonate anyone, share another person’s details, record sessions without permission, or contact professionals outside the platform to avoid fees. Treat professionals and staff with respect. We may suspend accounts for abuse or misuse.',
  },
  {
    number: '09',
    title: 'Fees, payments and refunds',
    content:
      'Prices are shown before you pay and include applicable taxes unless stated. Payments are processed through authorized payment gateways (e.g. Razorpay). Programme and membership terms: Each programme shows its duration and inclusions (doctor consultations, dietitian and fitness coaching, follow-ups) before checkout. Refunds: Full refund if a consultation is cancelled by 8liv or the doctor; lab test refund if the sample is not collected; no refund once a consultation has taken place or a report is issued, except where required by law. Approved refunds go back to the original payment method within 3 working days.',
  },
  {
    number: '10',
    title: 'Intellectual property and content',
    content:
      'The platform, its design and content belong to 8liv or its licensors. You may use them only for your own personal, non-commercial use. Your health records remain yours.',
  },
  {
    number: '11',
    title: 'Risk acknowledgement and limitation of liability',
    content:
      'You acknowledge that healthcare, laboratory testing, diet and exercise carry inherent risks and uncertainties, including the limits of remote consultation, that these have been explained in the Informed Consent, and that you choose to use the services knowing them. You are responsible for your own decisions, for the accuracy of what you tell us, for following medical advice, and for choosing to buy and take any medicine or start any exercise. Doctors, dieticians, trainers and laboratories are independent professionals who are responsible for their own clinical and professional advice and services. 8liv is a technology platform and, to the extent the law allows, is not liable for the clinical judgement, advice or outcome of their services, or for any loss caused by your failure to follow advice, your wrong or missing information, delay in seeking care, or use of medicines bought from a pharmacy of your choice. To the extent the law allows, 8liv’s total liability to you for anything arising from the platform itself is limited to the fees you paid for the service concerned, and 8liv is not liable for indirect or consequential loss. Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, for fraud, for a professional’s negligence, for your statutory rights under the Consumer Protection Act, 2019, or for anything else that cannot be excluded under Indian law. You agree to compensate us for loss caused by your giving false information or misusing the platform.',
  },
  {
    number: '12',
    title: 'Changes, suspension and termination',
    content:
      'We may update these terms and will show the new date. Continued use means you accept the update. You may close your account at any time; we may suspend it for breach of these terms. Records are kept as required by law.',
  },
  {
    number: '13',
    title: 'Grievance redressal',
    content:
      'Grievance Officer: ROHITH S, LONGLIV PRIVATE LIMITED. Email: rohith@8liv.in. Phone: 9944023986. We acknowledge each complaint within 48 hours and aim to resolve it within one month. If you are unsatisfied, you may approach the consumer forum or the relevant State Medical Council for complaints about a doctor.',
  },
  {
    number: '14',
    title: 'Governing law',
    content:
      'These terms are governed by the laws of India. Courts at Madurai, Tamil Nadu have jurisdiction, subject to your rights under consumer protection law.',
  },
]

export const TERMS_OF_SERVICE = {
  document_id: 'terms',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Patient Terms of Service (Part 1)',
  content: TERMS_SECTIONS.map(s => `${s.number}. ${s.title}\n${s.content}`).join('\n\n'),
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: PRIVACY POLICY (10 SECTIONS + DATA COLLECTION TABLE)
// ─────────────────────────────────────────────────────────────────────────────
export const PRIVACY_DATA_TABLE = [
  {
    type: 'Identity and contact',
    examples: 'Name, age, sex, mobile number, email, address',
    purpose: 'Account creation, identity verification, service delivery, and legal compliance.',
  },
  {
    type: 'Health information',
    examples: 'Medical history, symptoms, current medicines, allergies, consultation notes, prescriptions',
    purpose: 'Enabling doctor clinical assessment and treatment under Telemedicine Practice Guidelines.',
  },
  {
    type: 'Lab information',
    examples: 'Test orders and diagnostic laboratory reports',
    purpose: 'Clinical diagnostic correlation and treatment calibration by your treating doctor.',
  },
  {
    type: 'Lifestyle records',
    examples: 'Weight, measurements, meal logs and photos, exercise logs, dietician and trainer notes',
    purpose: 'Personalized metabolic coaching, calorie calibration, and fitness progress tracking.',
  },
  {
    type: 'Payment',
    examples: 'Transaction reference and status. Card and bank details handled by payment gateway',
    purpose: 'Processing payments, fee reconciliations, and tax invoicing. 8liv does not store card/bank details.',
  },
  {
    type: 'Technical',
    examples: 'Device, IP address, log-in activity, cookies',
    purpose: 'Platform security, fraud prevention, session integrity, and DPDP compliance auditing.',
  },
  {
    type: 'Communications',
    examples: 'Messages, call and video-session metadata, and any recording made with consent',
    purpose: 'Care team coordination, support request resolution, and clinical record keeping.',
  },
]

export const PRIVACY_SECTIONS = [
  {
    number: '01',
    title: 'Data we collect',
    content:
      'LONGLIV PRIVATE LIMITED ("8liv") acts as the data fiduciary for the personal and clinical data collected on this platform. We collect identity details, health and medical history, diagnostic reports, lifestyle logs, technical metadata, and session communication records as set forth in our statutory Data Matrix.',
  },
  {
    number: '02',
    title: 'Why we use it',
    content:
      'To book and deliver consultations, lab tests, diet and fitness services. To let your doctor, dietician and trainer see what they need to care for you safely. To send reminders, follow-up and retest notices, and service messages. To process payments, prevent fraud and keep the platform secure. To meet legal, medical-record and tax obligations. To improve the service using de-identified or aggregated data. We do not use your identifiable health data for advertising.',
  },
  {
    number: '03',
    title: 'Legal basis: your consent',
    content:
      'We process your personal data on the basis of your consent, given through the Data and Privacy Consent Notice, and where the law allows it for legitimate uses such as legal compliance or medical emergencies. You can withdraw consent at any time.',
  },
  {
    number: '04',
    title: 'Who we share it with',
    content:
      'Your care team: the doctor, dietician and trainer assigned to you, only to the extent needed for your care. Partner laboratories: to collect samples, run tests and return reports. Service providers: hosting, communication, payment and support providers who process data on our instructions under written security and confidentiality terms. Authorities: where required by law, court order or to protect someone’s life. 8liv does not sell your personal data. 8liv does not share it with pharmacies or medicine sellers, because it does not run a pharmacy service.',
  },
  {
    number: '05',
    title: 'Storage, security and transfers',
    content:
      'We keep data in access-controlled systems with encryption in transit and at rest, role-based access, and activity logs in secure Google Cloud Platform (GCP) encrypted storage. If data is processed outside India, it is only to countries and providers permitted by law. No system is perfectly secure; if a breach affects you, we will notify you and the authorities as the law requires.',
  },
  {
    number: '06',
    title: 'How long we keep it',
    content:
      'Clinical records are kept for the period required by law and medical practice, currently at least 3 years from the last consultation, or longer where required. Other data is deleted when no longer needed for its purpose. Before erasing your account data, we will give you advance notice.',
  },
  {
    number: '07',
    title: 'Your rights',
    content:
      'You may ask us to: see a summary of the data we hold and who it is shared with; correct or complete it; erase it where it is no longer needed and no law requires us to keep it; withdraw consent; and nominate another person to exercise your rights if you die or cannot act. Write to our Grievance Officer at rohith@8liv.in. We respond within 3 days. Withdrawing consent does not affect the lawfulness of earlier processing and may mean we can no longer provide some services.',
  },
  {
    number: '08',
    title: 'Children',
    content:
      'We collect data of a person under 18 only with verifiable consent of a parent or legal guardian, and we do not track or target children with advertising.',
  },
  {
    number: '09',
    title: 'Cookies',
    content:
      'We use essential cookies to run the site and, with your permission, analytics cookies. You can manage them in your browser or our cookie settings.',
  },
  {
    number: '10',
    title: 'Contact and grievances',
    content:
      'Data Protection / Grievance Officer: ROHITH S, LONGLIV PRIVATE LIMITED. Email: rohith@8liv.in. Phone: 9344698676. If we do not resolve your concern, you may approach the Data Protection Board of India once it is operational.',
  },
]

export const PRIVACY_POLICY = {
  document_id: 'privacy',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Privacy Policy (Part 2)',
  content: PRIVACY_SECTIONS.map(s => `${s.number}. ${s.title}\n${s.content}`).join('\n\n'),
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 5: PRESCRIPTION POLICY (9 SECTIONS)
// ─────────────────────────────────────────────────────────────────────────────
export const PRESCRIPTION_SECTIONS = [
  {
    number: '01',
    title: 'Who prescribes',
    content:
      'Only a registered medical practitioner, acting under the Telemedicine Practice Guidelines 2020 and their own clinical judgement, can issue a prescription on 8liv. Dieticians and fitness trainers cannot prescribe medicines.',
  },
  {
    number: '02',
    title: 'When a prescription is issued',
    content:
      'A doctor prescribes only after a consultation in which they have taken a history, reviewed any reports, and are satisfied that teleconsultation is safe for you. The doctor may instead advise more tests, or no medicine.',
  },
  {
    number: '03',
    title: 'What the prescription contains',
    content:
      'Patient name, age and sex; date; the doctor’s name, qualification and registration number; diagnosis or reason where appropriate; medicine name, strength, dose, frequency and duration; investigations advised; and follow-up advice. Digital prescriptions carry the doctor’s digital signature or an equivalent secure authentication.',
  },
  {
    number: '04',
    title: 'Medicines the platform will not prescribe',
    content:
      'The platform does not allow teleconsultation prescriptions for medicines restricted by the Telemedicine Practice Guidelines (for example narcotic and psychotropic drugs listed in the NDPS Act and other medicines the Guidelines bar for remote prescribing). Where weight-management or other medicines need extra checks, the doctor may require lab results, an in-person examination or a documented review first.',
  },
  {
    number: '05',
    title: 'Getting your medicines',
    content:
      '8liv does not sell, stock, dispense or deliver medicines. Your prescription is yours. Download it from your account and use it at any licensed pharmacy of your choice. 8liv does not receive commission or payment from any pharmacy for prescriptions or referrals. Check with the pharmacist that you receive the right medicine, strength and expiry date.',
  },
  {
    number: '06',
    title: 'Using the prescription safely',
    content:
      'Take medicines exactly as prescribed. Do not share them or change the dose on your own. Tell your doctor about side effects, other medicines, pregnancy or new symptoms. A prescription is valid for the period stated on it. Repeat prescriptions need a doctor’s review. Do not ask for medicines the doctor has advised against. We may close an account used to obtain medicines by giving false information.',
  },
  {
    number: '07',
    title: 'Monitoring and follow-up',
    content:
      'Because 8liv does not see what is bought or taken, you agree to follow the follow-up schedule, share requested lab retests, and tell your doctor honestly about adherence. Your doctor may stop or change treatment if follow-up is missed.',
  },
  {
    number: '08',
    title: 'Records',
    content:
      'Prescriptions and consultation notes are kept as part of your medical record for the period in the Privacy Policy and are available to you on request.',
  },
  {
    number: '09',
    title: 'Concerns',
    content:
      'If you have a concern about a prescription, contact your doctor first, then our Grievance Officer at rohith@8liv.in. In an emergency, call 112 or go to the nearest hospital.',
  },
]

export const PRESCRIPTION_POLICY = {
  document_id: 'prescription',
  version: CONSENT_VERSION,
  effective_date: CONSENT_EFFECTIVE_DATE,
  title: 'Prescription Policy (Part 5)',
  content: PRESCRIPTION_SECTIONS.map(s => `${s.number}. ${s.title}\n${s.content}`).join('\n\n'),
}

export const ALL_CANONICAL_DOCUMENTS = [
  PART4_DATA_NOTICE,
  PART3_TREATMENT_CONSENT,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  PRESCRIPTION_POLICY,
]
