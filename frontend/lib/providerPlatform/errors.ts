export type ProviderErrorCode =
  | 'PROVIDER_ALREADY_EXISTS'
  | 'INVALID_PROVIDER_ROLE'
  | 'ACTIVATION_TOKEN_INVALID'
  | 'ACTIVATION_TOKEN_EXPIRED'
  | 'ONBOARDING_INCOMPLETE'
  | 'DOCUMENT_REQUIRED'
  | 'DOCUMENT_REJECTED'
  | 'CLINICAL_VERIFICATION_REQUIRED'
  | 'PAYOUT_PROFILE_INCOMPLETE'
  | 'BANK_VERIFICATION_PENDING'
  | 'COMPENSATION_RULE_MISSING'
  | 'EARNING_ALREADY_EXISTS'
  | 'PAYOUT_CONFIGURATION_MISSING'
  | 'PAYOUT_ON_HOLD'
  | 'PAYOUT_ALREADY_PROCESSED'
  | 'INVALID_STATUS_TRANSITION'
  | 'UNAUTHORIZED_PROVIDER_ACCESS'
  | 'FINANCIAL_OPERATION_CONFLICT'
  | 'SELF_APPROVAL_NOT_ALLOWED'
  | 'STEP_UP_AUTH_REQUIRED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'

export class ProviderPlatformError extends Error {
  code: ProviderErrorCode
  status: number
  details?: unknown

  constructor(code: ProviderErrorCode, message: string, status = 400, details?: unknown) {
    super(message)
    this.name = 'ProviderPlatformError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function toSafeError(error: unknown) {
  if (error instanceof ProviderPlatformError) {
    return {
      body: { error: error.message, code: error.code, details: error.details },
      status: error.status,
    }
  }

  return {
    body: { error: 'Request could not be completed.', code: 'FINANCIAL_OPERATION_CONFLICT' },
    status: 500,
  }
}
