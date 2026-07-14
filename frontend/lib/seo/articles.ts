import { absoluteUrl } from './site'

export type SeoArticle = {
  slug: string
  title: string
  metaTitle: string
  description: string
  category: string
  summary: string
  publishedAt: string
  updatedAt: string
  reviewedAt: string
  author: string
  reviewer: string
  readingMinutes: number
  sections: Array<{
    heading: string
    body: string[]
  }>
  faqs: Array<{
    question: string
    answer: string
  }>
  sources: Array<{
    name: string
    url: string
  }>
  related: string[]
}

export const seoArticles: SeoArticle[] = [
  {
    slug: 'how-online-medical-weight-management-works',
    title: 'How Online Medical Weight Management Works',
    metaTitle: 'How Online Medical Weight Management Works',
    description: 'Learn how online medical weight-management care typically works, from health intake and doctor review to follow-up support.',
    category: 'Medical weight management',
    summary: 'Online medical weight management combines structured health intake, clinician review, care planning, and ongoing support. The exact care plan depends on individual history and doctor judgment.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 5,
    sections: [
      {
        heading: 'The process starts with health context',
        body: [
          'A safe online program should begin by collecting relevant health history, current medications, weight-related goals, and symptoms that may affect clinical decision-making.',
          'This intake is not a diagnosis by itself. It helps a qualified clinician decide what should be discussed during consultation and whether online care is appropriate.',
        ],
      },
      {
        heading: 'A doctor reviews suitability',
        body: [
          'Medical weight-management care should include clinician oversight. The doctor may review health risks, lifestyle factors, previous weight-loss attempts, and whether additional tests or in-person care are needed.',
          'Not every patient is suitable for every treatment option. Prescription decisions, if any, must be made by a qualified doctor after clinical review.',
        ],
      },
      {
        heading: 'Follow-up makes the plan safer and more practical',
        body: [
          'Weight management is rarely a single appointment. Follow-up helps track progress, side effects, adherence, nutrition, physical activity, and changes in health status.',
          'Patients should be able to ask questions, report concerns, and receive care-team guidance without exposing private health data publicly.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is online weight-management care the same for everyone?',
        answer: 'No. A safe plan depends on health history, goals, eligibility, doctor judgment, and follow-up findings.',
      },
      {
        question: 'Can online care replace emergency care?',
        answer: 'No. Online weight-management platforms are not emergency services. Urgent symptoms need local emergency care.',
      },
    ],
    sources: [
      { name: 'CDC: Steps for Losing Weight', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
      { name: 'NIDDK: Treatment for Overweight and Obesity', url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/treatment' },
    ],
    related: ['doctor-supervised-weight-loss', 'what-to-expect-weight-loss-doctor-consultation'],
  },
  {
    slug: 'doctor-supervised-weight-loss',
    title: 'Doctor-Supervised Weight Loss: What It Means',
    metaTitle: 'Doctor-Supervised Weight Loss',
    description: 'Understand what doctor-supervised weight loss means, why medical review matters, and how follow-up supports safer care.',
    category: 'Doctor-led care',
    summary: 'Doctor-supervised weight loss means clinical decisions are reviewed by a qualified medical professional rather than handled as a generic diet plan.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Medical review looks beyond weight alone',
        body: [
          'Weight can be influenced by medical conditions, medicines, sleep, stress, hormones, activity, nutrition, age, and environment.',
          'A doctor-supervised approach gives space to review risks, symptoms, medicines, and safety considerations before recommending next steps.',
        ],
      },
      {
        heading: 'Clinical suitability is individual',
        body: [
          'Some patients may need lifestyle support, some may need additional evaluation, and some may not be suitable for remote treatment.',
          'If medication is considered, it should be prescribed only after the doctor decides it is clinically appropriate.',
        ],
      },
      {
        heading: 'Progress should be monitored',
        body: [
          'Follow-up care can help evaluate whether a plan is working, whether it is tolerable, and whether goals need adjustment.',
          'Monitoring also helps patients raise side effects, new diagnoses, medication changes, or practical barriers to the plan.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does doctor supervision guarantee weight loss?',
        answer: 'No. Doctor supervision supports safer decision-making, but outcomes vary and no responsible program should guarantee results.',
      },
      {
        question: 'Why does medication history matter?',
        answer: 'Some medicines and health conditions can affect weight or treatment suitability, so they should be reviewed by a clinician.',
      },
    ],
    sources: [
      { name: 'CDC: Steps for Losing Weight', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
      { name: 'NIDDK: Health Risks of Overweight and Obesity', url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/health-risks' },
    ],
    related: ['how-online-medical-weight-management-works', 'medical-vs-lifestyle-weight-loss-programs'],
  },
  {
    slug: 'what-to-expect-weight-loss-doctor-consultation',
    title: 'What to Expect in a Weight-Loss Doctor Consultation',
    metaTitle: 'What to Expect in a Weight-Loss Doctor Consultation',
    description: 'Prepare for an online weight-loss doctor consultation by understanding health history review, safety questions, and follow-up planning.',
    category: 'Consultations',
    summary: 'A consultation should help the doctor understand your medical context, answer questions, discuss options, and decide whether a treatment plan is appropriate.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Before the consultation',
        body: [
          'You may be asked about weight history, health goals, medical conditions, medicines, allergies, prior treatments, eating patterns, activity, sleep, and symptoms.',
          'Accurate information helps the doctor decide what is safe and whether additional evaluation is needed.',
        ],
      },
      {
        heading: 'During the consultation',
        body: [
          'The doctor may discuss risks, benefits, alternatives, lifestyle support, prescription suitability, and when in-person or urgent care is needed.',
          'A good consultation should leave room for patient questions and should avoid pressure to start any treatment without informed discussion.',
        ],
      },
      {
        heading: 'After the consultation',
        body: [
          'The care plan may include follow-up, nutrition guidance, activity goals, monitoring, or prescription fulfilment where clinically appropriate.',
          'Patients should know how to report concerns and how follow-up decisions will be made.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should I mention existing medicines?',
        answer: 'Yes. Medication history can affect clinical decisions, interactions, and treatment suitability.',
      },
      {
        question: 'Will a consultation always lead to a prescription?',
        answer: 'No. Prescriptions depend on doctor review and clinical suitability.',
      },
    ],
    sources: [
      { name: 'NHS: Overweight and Obesity', url: 'https://www.nhs.uk/conditions/overweight-and-obesity/' },
      { name: 'NIDDK: Treatment for Overweight and Obesity', url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/treatment' },
    ],
    related: ['how-online-medical-weight-management-works', 'when-to-speak-to-a-doctor-about-weight-gain'],
  },
  {
    slug: 'medical-vs-lifestyle-weight-loss-programs',
    title: 'Medical vs Lifestyle Weight-Loss Programs',
    metaTitle: 'Medical vs Lifestyle Weight-Loss Programs',
    description: 'Compare medical and lifestyle weight-loss programs and learn when clinical supervision may be useful.',
    category: 'Weight-management options',
    summary: 'Lifestyle support and medical care can overlap, but medical programs add clinician review for health risks, suitability, and treatment decisions.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Lifestyle programs focus on habits',
        body: [
          'Lifestyle-focused programs may emphasize food choices, activity, sleep, stress, coaching, and behavior change.',
          'These elements matter in medical programs too, because sustainable weight management usually needs more than a single intervention.',
        ],
      },
      {
        heading: 'Medical programs add clinical review',
        body: [
          'A medical program should review conditions, medicines, contraindications, symptoms, and whether additional testing or in-person evaluation is needed.',
          'Medical supervision is especially relevant when weight is linked with health risks, complex history, or possible prescription treatment.',
        ],
      },
      {
        heading: 'The right fit depends on context',
        body: [
          'Some people may benefit from lifestyle coaching alone. Others may need medical assessment before choosing a path.',
          'A responsible program should not frame one option as universally best for everyone.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can lifestyle changes still matter in a medical program?',
        answer: 'Yes. Nutrition, activity, sleep, stress management, and follow-up can all support long-term weight management.',
      },
      {
        question: 'Is medical care only about medication?',
        answer: 'No. Medical care includes assessment, risk review, monitoring, guidance, and referral decisions where needed.',
      },
    ],
    sources: [
      { name: 'CDC: Steps for Losing Weight', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
      { name: 'WHO: Obesity and Overweight', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    ],
    related: ['doctor-supervised-weight-loss', 'nutrition-support-for-weight-management'],
  },
  {
    slug: 'when-to-speak-to-a-doctor-about-weight-gain',
    title: 'When to Speak to a Doctor About Weight Gain',
    metaTitle: 'When to Speak to a Doctor About Weight Gain',
    description: 'Learn when it may be appropriate to discuss weight gain or weight-management concerns with a qualified doctor.',
    category: 'Clinical guidance',
    summary: 'Weight gain can have many causes. Speaking with a doctor can help review symptoms, medicines, medical history, and safe options.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Consider medical review when weight changes are unexplained',
        body: [
          'Weight can change because of routine, nutrition, activity, sleep, stress, medicines, medical conditions, hormones, and other factors.',
          'A doctor can help decide whether the pattern needs evaluation and whether online care is suitable.',
        ],
      },
      {
        heading: 'Symptoms and medicines matter',
        body: [
          'New symptoms, major changes in appetite, swelling, fatigue, medication changes, or known chronic conditions should be discussed with a clinician.',
          'Do not stop prescribed medicines or start weight-loss medicines without medical advice.',
        ],
      },
      {
        heading: 'Urgent symptoms need urgent care',
        body: [
          'Online weight-management services are not emergency services.',
          'If symptoms feel urgent or severe, use local emergency services or in-person urgent care rather than waiting for an online consultation.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can stress and sleep affect weight management?',
        answer: 'They can be part of the picture for some people, and they are worth discussing during clinical review.',
      },
      {
        question: 'Should I talk to a doctor before starting a restrictive diet?',
        answer: 'Medical review is sensible if you have chronic conditions, take medicines, have symptoms, or are considering a major dietary change.',
      },
    ],
    sources: [
      { name: 'CDC: Steps for Losing Weight', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
      { name: 'NIDDK: Health Risks of Overweight and Obesity', url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/health-risks' },
    ],
    related: ['what-to-expect-weight-loss-doctor-consultation', 'doctor-supervised-weight-loss'],
  },
  {
    slug: 'nutrition-support-for-weight-management',
    title: 'Nutrition Support for Medical Weight Management',
    metaTitle: 'Nutrition Support for Medical Weight Management',
    description: 'Learn how nutrition support can fit into a doctor-led weight-management plan without relying on extreme or one-size-fits-all diets.',
    category: 'Nutrition',
    summary: 'Nutrition support can help turn a care plan into daily habits, but recommendations should fit the patient and respect medical context.',
    publishedAt: '2026-07-14',
    updatedAt: '2026-07-14',
    reviewedAt: '2026-07-14',
    author: '8liv Editorial Team',
    reviewer: '8liv Medical Review Team',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Nutrition support should be practical',
        body: [
          'Useful nutrition guidance usually focuses on repeatable choices, meal structure, planning, and patient preferences.',
          'Extreme approaches can be difficult to maintain and may not be suitable for people with certain health conditions.',
        ],
      },
      {
        heading: 'Medical context changes the plan',
        body: [
          'A nutrition plan may need adjustment for diabetes risk, digestive symptoms, medications, pregnancy status, allergies, or other health factors.',
          'That is why nutrition support works best when it is coordinated with the broader care plan.',
        ],
      },
      {
        heading: 'Follow-up helps make changes sustainable',
        body: [
          'Follow-up can identify barriers such as schedule, food access, cravings, side effects, family routines, and motivation.',
          'The goal is not perfection. The goal is a safer, more realistic path that can be adjusted over time.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does nutrition support replace doctor review?',
        answer: 'No. Nutrition support can complement medical care, but it does not replace clinician assessment or prescription decisions.',
      },
      {
        question: 'Is one diet best for everyone?',
        answer: 'No. Nutrition plans should account for health history, preferences, culture, routine, and clinical needs.',
      },
    ],
    sources: [
      { name: 'CDC: Healthy Eating for a Healthy Weight', url: 'https://www.cdc.gov/healthy-weight-growth/healthy-eating/index.html' },
      { name: 'CDC: Steps for Losing Weight', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
    ],
    related: ['medical-vs-lifestyle-weight-loss-programs', 'how-online-medical-weight-management-works'],
  },
]

export const seoArticleMap = new Map(seoArticles.map((article) => [article.slug, article]))

export function articlePath(article: SeoArticle) {
  return `/learn/${article.slug}`
}

export function articleOgImage(article: SeoArticle) {
  if (article.category === 'Nutrition') return absoluteUrl('/images/nutrition_indian.png')
  if (article.category === 'Consultations') return absoluteUrl('/images/medical_supervision_visual.png')
  return absoluteUrl('/images/hero_indian.png')
}
