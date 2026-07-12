import { z } from 'zod'

export const providerRoleSchema = z.preprocess((value) => {
  const normalized = String(value || '').trim().toUpperCase()
  return normalized === 'TRAINER' ? 'FITNESS_COACH' : normalized
}, z.enum(['DOCTOR', 'DIETITIAN', 'NUTRITIONIST', 'FITNESS_COACH']))

export const createProviderSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().min(6).optional().or(z.literal('')),
  role: providerRoleSchema,
  specialization: z.string().trim().optional().or(z.literal('')),
  internalReference: z.string().trim().optional().or(z.literal('')),
  joiningDate: z.string().trim().optional().or(z.literal('')),
  compensationModelPlaceholder: z.string().trim().optional().or(z.literal('')),
  internalNotes: z.string().trim().optional().or(z.literal('')),
})

export const activationVerifySchema = z.object({
  token: z.string().min(20),
})

export const activationSetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
})

export const personalOnboardingSchema = z.object({
  legalFullName: z.string().trim().min(1),
  displayName: z.string().trim().optional().or(z.literal('')),
  dateOfBirth: z.string().trim().min(4),
  gender: z.string().trim().optional().or(z.literal('')),
  primaryPhone: z.string().trim().min(6),
  alternatePhone: z.string().trim().optional().or(z.literal('')),
  residentialAddress: z.string().trim().min(4),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().trim().min(4),
  country: z.string().trim().default('India'),
})

const commonProfessional = {
  qualification: z.string().trim().min(1),
  yearsOfExperience: z.coerce.number().min(0).max(80),
  consultationLanguages: z.array(z.string().trim().min(1)).min(1),
  professionalBiography: z.string().trim().optional().or(z.literal('')),
}

export const professionalSchemas = {
  DOCTOR: z.object({
    ...commonProfessional,
    specialization: z.string().trim().min(1),
    additionalQualifications: z.string().trim().optional().or(z.literal('')),
    subSpecialization: z.string().trim().optional().or(z.literal('')),
    medicalCouncilName: z.string().trim().min(1),
    medicalRegistrationNumber: z.string().trim().min(1),
    registrationState: z.string().trim().min(1),
    registrationIssueDate: z.string().trim().min(4),
    registrationExpiryDate: z.string().trim().optional().or(z.literal('')),
    telemedicineEligibilityConfirmed: z.boolean(),
    prescriptionEligibility: z.boolean(),
  }),
  DIETITIAN: z.object({
    ...commonProfessional,
    specialization: z.string().trim().min(1),
    institution: z.string().trim().min(1),
    graduationYear: z.coerce.number().min(1950).max(2100),
    certificationBody: z.string().trim().optional().or(z.literal('')),
    certificateNumber: z.string().trim().optional().or(z.literal('')),
    areasOfExpertise: z.array(z.string().trim().min(1)).min(1),
  }),
  NUTRITIONIST: z.object({
    ...commonProfessional,
    certification: z.string().trim().min(1),
    institution: z.string().trim().min(1),
    certificateNumber: z.string().trim().optional().or(z.literal('')),
    areasOfExpertise: z.array(z.string().trim().min(1)).min(1),
  }),
  FITNESS_COACH: z.object({
    ...commonProfessional,
    certificationBody: z.string().trim().min(1),
    certificateNumber: z.string().trim().min(1),
    certificateValidity: z.string().trim().optional().or(z.literal('')),
    areasOfExpertise: z.array(z.string().trim().min(1)).min(1),
    trainingSpecialties: z.array(z.string().trim().min(1)).min(1),
  }),
}

export const taxOnboardingSchema = z.object({
  pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i),
  panName: z.string().trim().min(1),
  entityType: z.enum(['INDIVIDUAL', 'CONTRACTOR', 'COMPANY']).default('INDIVIDUAL'),
  gstNumber: z.string().trim().optional().or(z.literal('')),
  registeredBusinessName: z.string().trim().optional().or(z.literal('')),
  registeredAddress: z.record(z.string(), z.unknown()).optional(),
  complianceConsent: z.boolean(),
})

export const bankingOnboardingSchema = z.object({
  accountHolderName: z.string().trim().min(1),
  accountNumber: z.string().trim().min(6),
  confirmAccountNumber: z.string().trim().min(6),
  ifsc: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i),
  bankName: z.string().trim().min(1),
  branch: z.string().trim().optional().or(z.literal('')),
  accountType: z.string().trim().min(1),
  upiId: z.string().trim().optional().or(z.literal('')),
  preferredPayoutMethod: z.enum(['BANK_TRANSFER', 'UPI']).default('BANK_TRANSFER'),
  payoutConsent: z.boolean(),
}).refine((value) => value.accountNumber === value.confirmAccountNumber, {
  message: 'Account number and confirmation must match.',
  path: ['confirmAccountNumber'],
})

export const compensationRuleSchema = z.object({
  providerRole: providerRoleSchema.optional(),
  serviceType: z.string().trim().min(1),
  calculationType: z.enum(['FIXED', 'PERCENTAGE', 'HYBRID', 'CONTRACT']),
  fixedAmount: z.coerce.number().min(0).optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  minimumAmount: z.coerce.number().min(0).optional(),
  maximumAmount: z.coerce.number().min(0).optional(),
  currency: z.string().trim().default('INR'),
  effectiveFrom: z.string().trim().min(4),
  effectiveUntil: z.string().trim().optional().or(z.literal('')),
})

export function roleFromLegacy(role: string) {
  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'TRAINER') return 'FITNESS_COACH'
  return providerRoleSchema.parse(normalized)
}
