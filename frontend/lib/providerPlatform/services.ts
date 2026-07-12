import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { EmailService } from '@/lib/emailService'
import { checkRateLimit, createToken, getClientIp, getOrigin, hashToken, normalizeEmail, validatePasswordStrength } from '@/lib/authSecurity'
import { ProviderPlatformError } from './errors'
import { writeProviderAudit } from './audit'
import { encryptSensitiveValue, last4 } from './crypto'
import {
  bankingOnboardingSchema,
  compensationRuleSchema,
  createProviderSchema,
  personalOnboardingSchema,
  professionalSchemas,
  taxOnboardingSchema,
} from './validation'

function normalizePhone(phone?: string | null) {
  return String(phone || '').replace(/[^\d+]/g, '')
}

function legacyRole(role: string) {
  return role.toLowerCase()
}

async function ensureNoProviderDuplicates(email: string, phoneNumber?: string) {
  const normalized = normalizeEmail(email)
  const [{ data: existingV2 }, { data: existingProfile }] = await Promise.all([
    supabaseAdmin.from('provider_profiles_v2').select('id').eq('email', normalized).maybeSingle(),
    supabaseAdmin.from('profiles').select('id').eq('email', normalized).maybeSingle(),
  ])

  if (existingV2 || existingProfile) {
    throw new ProviderPlatformError('PROVIDER_ALREADY_EXISTS', 'A provider with this email already exists.', 409)
  }

  if (phoneNumber) {
    const { data: phoneMatch } = await supabaseAdmin
      .from('provider_profiles_v2')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle()
    if (phoneMatch) throw new ProviderPlatformError('PROVIDER_ALREADY_EXISTS', 'A provider with this phone number already exists.', 409)
  }
}

export const ProviderInvitationService = {
  async createProvider(input: unknown, context: { request: Request; adminId: string }) {
    const parsed = createProviderSchema.safeParse(input)
    if (!parsed.success) {
      throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid provider input.', 400, parsed.error.flatten())
    }

    const body = parsed.data
    const email = normalizeEmail(body.email)
    const phoneNumber = normalizePhone(body.phoneNumber)
    await ensureNoProviderDuplicates(email, phoneNumber)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role: body.role, display_id: body.fullName, onboarding_required: true },
    })
    if (authError || !authData.user) throw new ProviderPlatformError('FINANCIAL_OPERATION_CONFLICT', authError?.message || 'Unable to create auth user.', 500)

    const userId = authData.user.id
    const [firstName, ...rest] = body.fullName.trim().split(/\s+/)

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      first_name: firstName || body.fullName,
      last_name: rest.join(' '),
      phone_number: phoneNumber,
      role: legacyRole(body.role),
    })
    if (profileError) throw profileError

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('provider_profiles_v2')
      .insert({
        user_id: userId,
        legacy_provider_id: userId,
        full_name: body.fullName,
        email,
        phone_number: phoneNumber,
        role: body.role,
        specialization: body.specialization || null,
        internal_reference: body.internalReference || null,
        joining_date: body.joiningDate || null,
        compensation_model_placeholder: body.compensationModelPlaceholder || null,
        internal_notes: body.internalNotes || null,
        onboarding_status: 'NOT_STARTED',
        account_status: 'INVITED',
        clinical_verification_status: 'PENDING',
        payout_status: 'NOT_CONFIGURED',
        created_by: context.adminId,
      })
      .select('id, user_id, full_name, email, role, onboarding_status, account_status')
      .single()
    if (providerError) throw providerError

    await supabaseAdmin.from('provider_wallets').insert({ provider_id: provider.id, currency: 'INR' })

    const { token, tokenHash } = createToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: tokenError } = await supabaseAdmin.from('provider_activation_tokens').insert({
      provider_id: provider.id,
      user_id: userId,
      token_hash: tokenHash,
      purpose: 'PROVIDER_ACTIVATION',
      expires_at: expiresAt,
      created_by: context.adminId,
    })
    if (tokenError) throw tokenError

    await writeProviderAudit({
      request: context.request,
      actorId: context.adminId,
      actorRole: 'admin',
      action: 'PROVIDER_INVITED',
      resourceType: 'provider_profiles_v2',
      resourceId: provider.id,
      providerId: provider.id,
      newValues: { email, role: body.role, accountStatus: 'INVITED' },
    })

    await EmailService.sendProviderInvitation({
      email,
      name: body.fullName,
      patientId: userId,
      role: body.role,
      link: `${getOrigin(context.request)}/provider/activate?token=${encodeURIComponent(token)}`,
      expiresIn: '7 days',
    })

    return { providerId: provider.id, userId, email: provider.email, role: provider.role, accountStatus: provider.account_status }
  },
}

export const ProviderActivationService = {
  async verifyToken(input: unknown, request: Request) {
    const token = String((input as { token?: unknown })?.token || '')
    const limit = checkRateLimit(`provider-activation:${getClientIp(request)}:${hashToken(token).slice(0, 16)}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
      lockMs: 30 * 60 * 1000,
    })
    if (!limit.allowed) {
      throw new ProviderPlatformError('ACTIVATION_TOKEN_INVALID', 'Activation link is invalid or expired.', 400)
    }

    const { data: tokenRow, error } = await supabaseAdmin
      .from('provider_activation_tokens')
      .select('*, provider_profiles_v2(id, full_name, email, role, account_status)')
      .eq('token_hash', hashToken(token))
      .maybeSingle()
    if (error) throw error

    await supabaseAdmin
      .from('provider_activation_tokens')
      .update({ attempt_count: (tokenRow?.attempt_count || 0) + 1 })
      .eq('token_hash', hashToken(token))

    if (!tokenRow || tokenRow.used_at || tokenRow.revoked_at) {
      throw new ProviderPlatformError('ACTIVATION_TOKEN_INVALID', 'Activation link is invalid or expired.', 400)
    }
    if (Date.parse(tokenRow.expires_at) < Date.now()) {
      throw new ProviderPlatformError('ACTIVATION_TOKEN_EXPIRED', 'Activation link is invalid or expired.', 400)
    }

    return {
      provider: {
        id: tokenRow.provider_profiles_v2.id,
        name: tokenRow.provider_profiles_v2.full_name,
        email: tokenRow.provider_profiles_v2.email,
        role: tokenRow.provider_profiles_v2.role,
      },
    }
  },

  async setPassword(input: unknown, request: Request) {
    const token = String((input as { token?: unknown })?.token || '')
    const password = String((input as { password?: unknown })?.password || '')
    const passwordError = validatePasswordStrength(password)
    if (passwordError) throw new ProviderPlatformError('VALIDATION_FAILED', passwordError, 400)

    const verified = await this.verifyToken({ token }, request)
    const { data: tokenRow, error } = await supabaseAdmin
      .from('provider_activation_tokens')
      .select('id, user_id, provider_id')
      .eq('token_hash', hashToken(token))
      .maybeSingle()
    if (error || !tokenRow?.user_id) throw new ProviderPlatformError('ACTIVATION_TOKEN_INVALID', 'Activation link is invalid or expired.', 400)

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(tokenRow.user_id, {
      password,
      email_confirm: true,
      user_metadata: { onboarding_required: true },
    })
    if (updateError) throw updateError

    await Promise.all([
      supabaseAdmin.from('provider_activation_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id),
      supabaseAdmin.from('provider_profiles_v2').update({ account_status: 'ONBOARDING', onboarding_status: 'NOT_STARTED', updated_at: new Date().toISOString() }).eq('id', tokenRow.provider_id),
    ])

    await writeProviderAudit({
      request,
      actorId: tokenRow.user_id,
      actorRole: 'provider',
      action: 'PROVIDER_ACTIVATED',
      resourceType: 'provider_profiles_v2',
      resourceId: tokenRow.provider_id,
      providerId: tokenRow.provider_id,
    })

    return { success: true, provider: verified.provider }
  },
}

export const ProviderOnboardingService = {
  async get(providerId: string) {
    const [profile, professional, tax, payout, documents, agreements, acceptances, submissions, reviews] = await Promise.all([
      supabaseAdmin.from('provider_profiles_v2').select('*').eq('id', providerId).single(),
      supabaseAdmin.from('provider_professional_details').select('*').eq('provider_id', providerId).maybeSingle(),
      supabaseAdmin.from('provider_tax_profiles').select('entity_type, pan_last4, gst_number, registered_business_name, verification_status, consent_captured_at').eq('provider_id', providerId).maybeSingle(),
      supabaseAdmin.from('provider_payout_profiles').select('account_number_last4, beneficiary_name, ifsc_last4, bank_name, branch_name, account_type, upi_id, preferred_payout_method, bank_verification_status, payout_status, payout_enabled, hold_reason').eq('provider_id', providerId).maybeSingle(),
      supabaseAdmin.from('provider_documents').select('*, provider_document_versions(*)').eq('provider_id', providerId),
      supabaseAdmin.from('provider_agreements').select('*').is('retired_at', null),
      supabaseAdmin.from('provider_agreement_acceptances').select('agreement_id, agreement_type, agreement_version, accepted_at').eq('provider_id', providerId).is('revoked_at', null),
      supabaseAdmin.from('provider_onboarding_submissions').select('*').eq('provider_id', providerId).order('submitted_at', { ascending: false }).limit(1),
      supabaseAdmin.from('provider_verification_reviews').select('*').eq('provider_id', providerId).order('reviewed_at', { ascending: false }).limit(20),
    ])
    if (profile.error) throw profile.error

    return {
      profile: profile.data,
      professional: professional.data,
      tax: tax.data,
      payout: payout.data,
      documents: documents.data || [],
      agreements: agreements.data || [],
      acceptances: acceptances.data || [],
      latestSubmission: submissions.data?.[0] || null,
      reviews: reviews.data || [],
    }
  },

  async savePersonal(providerId: string, input: unknown, request: Request, actorId: string) {
    const parsed = personalOnboardingSchema.safeParse(input)
    if (!parsed.success) throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid personal information.', 400, parsed.error.flatten())

    const value = parsed.data
    const { error } = await supabaseAdmin.from('provider_profiles_v2').update({
      full_name: value.legalFullName,
      phone_number: normalizePhone(value.primaryPhone),
      account_status: 'ONBOARDING',
      onboarding_status: 'IN_PROGRESS',
      updated_at: new Date().toISOString(),
    }).eq('id', providerId).in('onboarding_status', ['NOT_STARTED', 'IN_PROGRESS', 'CHANGES_REQUESTED'])
    if (error) throw error

    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'ONBOARDING_PERSONAL_SAVED', resourceType: 'provider_profiles_v2', resourceId: providerId, providerId, newValues: value })
    return { success: true }
  },

  async saveProfessional(providerId: string, role: string, input: unknown, request: Request, actorId: string) {
    const schema = professionalSchemas[role as keyof typeof professionalSchemas]
    if (!schema) throw new ProviderPlatformError('INVALID_PROVIDER_ROLE', 'Invalid provider role.', 400)
    const parsed = schema.safeParse(input)
    if (!parsed.success) throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid professional information.', 400, parsed.error.flatten())

    const { error } = await supabaseAdmin.from('provider_professional_details').upsert({
      provider_id: providerId,
      role,
      schema_version: 1,
      details: parsed.data,
      verification_status: 'PENDING',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' })
    if (error) throw error

    await supabaseAdmin.from('provider_profiles_v2').update({ onboarding_status: 'IN_PROGRESS', updated_at: new Date().toISOString() }).eq('id', providerId)
    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'ONBOARDING_PROFESSIONAL_SAVED', resourceType: 'provider_professional_details', providerId, newValues: { role, schemaVersion: 1 } })
    return { success: true }
  },

  async saveTax(providerId: string, input: unknown, request: Request, actorId: string) {
    const parsed = taxOnboardingSchema.safeParse(input)
    if (!parsed.success) throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid tax information.', 400, parsed.error.flatten())
    if (!parsed.data.complianceConsent) throw new ProviderPlatformError('VALIDATION_FAILED', 'Compliance consent is required.', 400)

    const encrypted = encryptSensitiveValue(parsed.data.pan.toUpperCase())
    const { error } = await supabaseAdmin.from('provider_tax_profiles').upsert({
      provider_id: providerId,
      entity_type: parsed.data.entityType,
      pan_ciphertext: encrypted.ciphertext,
      pan_last4: last4(parsed.data.pan),
      encryption_key_version: encrypted.keyVersion,
      gst_number: parsed.data.gstNumber || null,
      registered_business_name: parsed.data.registeredBusinessName || null,
      registered_address: parsed.data.registeredAddress || {},
      verification_status: 'PENDING',
      consent_captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' })
    if (error) throw error

    await supabaseAdmin.from('provider_profiles_v2').update({ identity_kyc_status: 'PENDING', onboarding_status: 'IN_PROGRESS', updated_at: new Date().toISOString() }).eq('id', providerId)
    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'ONBOARDING_TAX_SAVED', resourceType: 'provider_tax_profiles', providerId, newValues: { entityType: parsed.data.entityType, panLast4: last4(parsed.data.pan) } })
    return { success: true, panLast4: last4(parsed.data.pan) }
  },

  async saveBanking(providerId: string, input: unknown, request: Request, actorId: string) {
    const parsed = bankingOnboardingSchema.safeParse(input)
    if (!parsed.success) throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid banking information.', 400, parsed.error.flatten())
    if (!parsed.data.payoutConsent) throw new ProviderPlatformError('VALIDATION_FAILED', 'Payout consent is required.', 400)

    const account = encryptSensitiveValue(parsed.data.accountNumber)
    const ifsc = encryptSensitiveValue(parsed.data.ifsc.toUpperCase())
    const { error } = await supabaseAdmin.from('provider_payout_profiles').upsert({
      provider_id: providerId,
      encrypted_account_number: account.ciphertext,
      account_number_last4: last4(parsed.data.accountNumber),
      beneficiary_name: parsed.data.accountHolderName,
      ifsc_encrypted: ifsc.ciphertext,
      ifsc_last4: last4(parsed.data.ifsc),
      bank_name: parsed.data.bankName,
      branch_name: parsed.data.branch || null,
      account_type: parsed.data.accountType,
      upi_id: parsed.data.upiId || null,
      preferred_payout_method: parsed.data.preferredPayoutMethod,
      bank_verification_status: 'PENDING',
      payout_status: 'VERIFICATION_PENDING',
      payout_enabled: false,
      consent_captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' })
    if (error) throw error

    await supabaseAdmin.from('provider_profiles_v2').update({ bank_verification_status: 'PENDING', payout_status: 'VERIFICATION_PENDING', onboarding_status: 'IN_PROGRESS', updated_at: new Date().toISOString() }).eq('id', providerId)
    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'ONBOARDING_BANKING_SAVED', resourceType: 'provider_payout_profiles', providerId, newValues: { accountLast4: last4(parsed.data.accountNumber), bankName: parsed.data.bankName } })
    return { success: true, accountLast4: last4(parsed.data.accountNumber) }
  },

  async acceptAgreement(providerId: string, agreementId: string, request: Request, actorId: string) {
    const { data: agreement, error } = await supabaseAdmin.from('provider_agreements').select('*').eq('id', agreementId).maybeSingle()
    if (error) throw error
    if (!agreement) throw new ProviderPlatformError('NOT_FOUND', 'Agreement not found.', 404)

    const { error: insertError } = await supabaseAdmin.from('provider_agreement_acceptances').upsert({
      provider_id: providerId,
      agreement_id: agreement.id,
      agreement_type: agreement.agreement_type,
      agreement_version: agreement.agreement_version,
      document_hash: agreement.document_hash,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent') || null,
      evidence: { acceptedBy: actorId },
    }, { onConflict: 'provider_id,agreement_type,agreement_version' })
    if (insertError) throw insertError

    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'AGREEMENT_ACCEPTED', resourceType: 'provider_agreements', resourceId: agreement.id, providerId })
    return { success: true }
  },

  async submit(providerId: string, request: Request, actorId: string) {
    const data = await this.get(providerId)
    const missing: string[] = []
    if (!data.professional) missing.push('professional')
    if (!data.tax) missing.push('tax')
    if (!data.payout) missing.push('banking')
    if (!data.agreements.length) missing.push('agreements')
    const acceptedCount = await supabaseAdmin.from('provider_agreement_acceptances').select('id', { count: 'exact', head: true }).eq('provider_id', providerId)
    if ((acceptedCount.count || 0) < Math.min(data.agreements.length, 4)) missing.push('agreement_acceptance')
    if (missing.length) throw new ProviderPlatformError('ONBOARDING_INCOMPLETE', 'Onboarding is incomplete.', 400, { missing })

    const nextVersion = ((data.latestSubmission?.submission_version as number | undefined) || 0) + 1
    const snapshot = { profile: data.profile, professional: data.professional, tax: data.tax, payout: data.payout, documents: data.documents, acceptedAgreementCount: acceptedCount.count || 0 }
    const { data: submission, error } = await supabaseAdmin.from('provider_onboarding_submissions').insert({
      provider_id: providerId,
      submission_version: nextVersion,
      snapshot,
      status: 'SUBMITTED',
    }).select('id').single()
    if (error) throw error

    await supabaseAdmin.from('provider_profiles_v2').update({ onboarding_status: 'SUBMITTED', account_status: 'REVIEW_PENDING', updated_at: new Date().toISOString() }).eq('id', providerId)
    await writeProviderAudit({ request, actorId, actorRole: 'provider', action: 'ONBOARDING_SUBMITTED', resourceType: 'provider_onboarding_submissions', resourceId: submission.id, providerId, newValues: { submissionVersion: nextVersion } })
    return { success: true, submissionId: submission.id }
  },
}

export const ProviderVerificationService = {
  async approveClinical(providerId: string, request: Request, adminId: string) {
    const { error } = await supabaseAdmin.from('provider_profiles_v2').update({
      clinical_verification_status: 'APPROVED',
      onboarding_status: 'APPROVED',
      account_status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    }).eq('id', providerId)
    if (error) throw error
    await writeProviderAudit({ request, actorId: adminId, actorRole: 'admin', action: 'CLINICAL_APPROVED', resourceType: 'provider_profiles_v2', resourceId: providerId, providerId })
    return { success: true }
  },

  async approvePayout(providerId: string, request: Request, adminId: string) {
    const now = new Date().toISOString()
    const [{ error: profileError }, { error: payoutError }] = await Promise.all([
      supabaseAdmin.from('provider_profiles_v2').update({ bank_verification_status: 'VERIFIED', payout_status: 'ACTIVE', payout_enabled: true, updated_at: now }).eq('id', providerId),
      supabaseAdmin.from('provider_payout_profiles').update({ bank_verification_status: 'VERIFIED', payout_status: 'ACTIVE', payout_enabled: true, verified_at: now, verified_by: adminId, updated_at: now }).eq('provider_id', providerId),
    ])
    if (profileError) throw profileError
    if (payoutError) throw payoutError
    await supabaseAdmin.rpc('release_provider_payout_holds_v2', { p_provider_id: providerId, p_actor_id: adminId })
    await writeProviderAudit({ request, actorId: adminId, actorRole: 'admin', action: 'PAYOUT_PROFILE_APPROVED', resourceType: 'provider_payout_profiles', providerId })
    return { success: true }
  },

  async requestChanges(providerId: string, input: { section?: string; feedback?: string; notes?: string }, request: Request, adminId: string) {
    const { data: review, error } = await supabaseAdmin.from('provider_verification_reviews').insert({
      provider_id: providerId,
      section: input.section || 'ONBOARDING',
      decision: 'CHANGES_REQUESTED',
      internal_notes: input.notes || null,
      provider_visible_feedback: input.feedback || 'Changes requested.',
      reviewed_by: adminId,
    }).select('id').single()
    if (error) throw error
    await supabaseAdmin.from('provider_profiles_v2').update({ onboarding_status: 'CHANGES_REQUESTED', account_status: 'ONBOARDING', updated_at: new Date().toISOString() }).eq('id', providerId)
    await writeProviderAudit({ request, actorId: adminId, actorRole: 'admin', action: 'CHANGES_REQUESTED', resourceType: 'provider_verification_reviews', resourceId: review.id, providerId, reason: input.feedback || null })
    return { success: true, reviewId: review.id }
  },
}

export const ProviderCompensationService = {
  async createRule(input: unknown, request: Request, adminId: string, providerId?: string) {
    const parsed = compensationRuleSchema.safeParse(input)
    if (!parsed.success) throw new ProviderPlatformError('VALIDATION_FAILED', 'Invalid compensation rule.', 400, parsed.error.flatten())
    const value = parsed.data
    const fingerprint = createHash('sha256').update(JSON.stringify({ providerId, ...value })).digest('hex').slice(0, 12)
    const { data, error } = await supabaseAdmin.from('provider_compensation_rules').insert({
      provider_id: providerId || null,
      provider_role: value.providerRole || null,
      service_type: value.serviceType,
      calculation_type: value.calculationType,
      fixed_amount: value.fixedAmount ?? null,
      percentage: value.percentage ?? null,
      minimum_amount: value.minimumAmount ?? null,
      maximum_amount: value.maximumAmount ?? null,
      currency: value.currency,
      effective_from: value.effectiveFrom,
      effective_until: value.effectiveUntil || null,
      version: 1,
      active: true,
      created_by: adminId,
      approved_by: adminId,
    }).select('*').single()
    if (error) throw error
    await writeProviderAudit({ request, actorId: adminId, actorRole: 'admin', action: 'COMPENSATION_RULE_CREATED', resourceType: 'provider_compensation_rules', resourceId: data.id, providerId: providerId || null, newValues: { ...value, fingerprint } })
    return data
  },
}

export const ProviderFinanceService = {
  async createEarning(input: { providerId: string; sourceType: string; sourceId: string; serviceType: string; eligiblePaymentAmount?: number; idempotencyKey: string }, request: Request, actorId: string) {
    const { data, error } = await supabaseAdmin.rpc('create_provider_earning_v2', {
      p_provider_id: input.providerId,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_service_type: input.serviceType,
      p_eligible_payment_amount: input.eligiblePaymentAmount || 0,
      p_idempotency_key: input.idempotencyKey,
    })
    if (error) {
      if (error.message?.includes('PAYOUT_CONFIGURATION_MISSING')) {
        throw new ProviderPlatformError('PAYOUT_CONFIGURATION_MISSING', 'Provider compensation is not configured.', 409)
      }
      throw error
    }
    await writeProviderAudit({ request, actorId, actorRole: 'service', action: 'EARNING_CREATED', resourceType: 'provider_earnings', providerId: input.providerId, newValues: data as Record<string, unknown> })
    return data
  },

  async getProviderWallet(providerId: string) {
    const [wallet, transactions, earnings, payouts] = await Promise.all([
      supabaseAdmin.from('provider_wallets').select('*').eq('provider_id', providerId).eq('currency', 'INR').maybeSingle(),
      supabaseAdmin.from('provider_wallet_transactions').select('*').eq('provider_id', providerId).order('created_at', { ascending: false }).limit(30),
      supabaseAdmin.from('provider_earnings').select('*').eq('provider_id', providerId).order('earned_at', { ascending: false }).limit(50),
      supabaseAdmin.from('provider_payout_records').select('*').eq('provider_id', providerId).order('created_at', { ascending: false }).limit(20),
    ])
    if (wallet.error) throw wallet.error
    return {
      wallet: wallet.data || { pending_balance: 0, eligible_balance: 0, on_hold_balance: 0, processing_balance: 0, paid_total: 0, reversed_total: 0, currency: 'INR' },
      transactions: transactions.data || [],
      earnings: earnings.data || [],
      payouts: payouts.data || [],
    }
  },

  async getProviderWalletForProvider(providerId: string) {
    const [wallet, transactions, earnings, payouts] = await Promise.all([
      supabaseAdmin
        .from('provider_wallets')
        .select('provider_id, currency, pending_balance, eligible_balance, on_hold_balance, processing_balance, paid_total, reversed_total, updated_at')
        .eq('provider_id', providerId)
        .eq('currency', 'INR')
        .maybeSingle(),
      supabaseAdmin
        .from('provider_wallet_transactions')
        .select('id, earning_id, payout_id, transaction_type, amount, currency, balance_category, reference_type, reference_id, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('provider_earnings')
        .select('id, source_type, source_id, service_type, gross_amount, tax_withheld, other_deductions, net_amount, currency, status, hold_reason, earned_at, eligible_at, approved_at, paid_at')
        .eq('provider_id', providerId)
        .order('earned_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('provider_payout_records')
        .select('id, gross_amount, tax_withheld, deductions, net_amount, currency, status, failure_code, failure_reason, initiated_at, processed_at, completed_at, failed_at, created_at, updated_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (wallet.error) throw wallet.error
    if (transactions.error) throw transactions.error
    if (earnings.error) throw earnings.error
    if (payouts.error) throw payouts.error
    return {
      wallet: wallet.data || { pending_balance: 0, eligible_balance: 0, on_hold_balance: 0, processing_balance: 0, paid_total: 0, reversed_total: 0, currency: 'INR' },
      transactions: transactions.data || [],
      earnings: earnings.data || [],
      payouts: payouts.data || [],
    }
  },
}
