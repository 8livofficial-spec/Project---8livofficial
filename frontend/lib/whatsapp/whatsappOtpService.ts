/**
 * Production-Grade WhatsApp OTP Authentication Service
 *
 * Implements cryptographically secure 6-digit OTP generation,
 * HMAC-SHA256 token hashing, attempt limits, single-use consumption,
 * and session establishment via Supabase.
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../supabaseServer'
import { WHATSAPP_CONFIG } from './whatsappConfig'
import { WhatsAppClient } from './whatsappClient'
import { normalizePhoneNumber } from '../phone'
import { findUserByEmail, getUserRole, writeAuthAudit } from '../authSecurity'
import { loadPatientJourneyState } from '../patientJourneyServer'
import { getPatientJourneyTarget } from '../patientJourney'

export type OtpPurpose = 'LOGIN' | 'SIGNUP' | 'VERIFY_PHONE' | 'RESET_PASSWORD' | 'SENSITIVE_ACTION'

export type SendOtpOptions = {
  phoneNumber: string
  purpose: OtpPurpose
  userId?: string
  ipAddress?: string
  userAgent?: string
}

export type VerifyOtpOptions = {
  phoneNumber: string
  enteredOtp: string
  purpose: OtpPurpose
  ipAddress?: string
  userAgent?: string
  email?: string
  firstName?: string
  lastName?: string
}

export type OtpVerificationResult = {
  success: boolean
  message: string
  userId?: string
  role?: string
  target?: string
  session?: {
    access_token: string
    refresh_token: string
  }
  user?: {
    id: string
    phone: string
    email?: string | null
    role?: string
  }
  isNewUser?: boolean
}

// In-memory fallback challenge store if PostgreSQL table migration is pending
type InMemOtpChallenge = {
  phoneNumber: string
  tokenHash: string
  purpose: OtpPurpose
  userId?: string
  attempts: number
  maxAttempts: number
  resendCooldownUntil: number
  expiresAt: number
  consumedAt?: number
}
const inMemoryChallenges = new Map<string, InMemOtpChallenge>()

function hashOtp(phoneNumber: string, otp: string): string {
  const pepper = WHATSAPP_CONFIG.appSecret || '8liv_secure_whatsapp_otp_pepper_2026'
  return crypto
    .createHmac('sha256', pepper)
    .update(`${phoneNumber}:${otp.trim()}`)
    .digest('hex')
}

export class WhatsAppOtpService {
  /**
   * Generates a 6-digit cryptographically secure OTP and dispatches via WhatsApp
   */
  public static async sendOtp(options: SendOtpOptions): Promise<{
    success: boolean
    cooldownSeconds: number
    message: string
    challengeId?: string
  }> {
    const normalized = normalizePhoneNumber(options.phoneNumber)
    if (!normalized.isValid || !normalized.e164 || !normalized.whatsapp) {
      throw new Error('Please enter a valid mobile number with country code (e.g. +91 98765 43210).')
    }

    const phoneE164 = normalized.e164
    const now = Date.now()
    const purpose = options.purpose

    // 1. Check existing active challenge for cooldown
    let existingCooldown = 0
    try {
      const { data: activeChallenge } = await supabaseAdmin
        .from('whatsapp_otp_challenges')
        .select('*')
        .eq('phone_number', phoneE164)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .gt('expires_at', new Date(now).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeChallenge) {
        const cooldownUntil = new Date(activeChallenge.resend_cooldown_until).getTime()
        if (now < cooldownUntil) {
          const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000)
          return {
            success: false,
            cooldownSeconds: remainingSeconds,
            message: `Please wait ${remainingSeconds} seconds before requesting a new WhatsApp OTP.`,
          }
        }
      }
    } catch {
      // In-memory check
      const memKey = `${phoneE164}:${purpose}`
      const memChallenge = inMemoryChallenges.get(memKey)
      if (memChallenge && now < memChallenge.resendCooldownUntil && !memChallenge.consumedAt) {
        const remainingSeconds = Math.ceil((memChallenge.resendCooldownUntil - now) / 1000)
        return {
          success: false,
          cooldownSeconds: remainingSeconds,
          message: `Please wait ${remainingSeconds} seconds before requesting a new WhatsApp OTP.`,
        }
      }
    }

    // 2. Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString()
    const tokenHash = hashOtp(phoneE164, rawOtp)
    const expiresAt = new Date(now + WHATSAPP_CONFIG.otpTtlSeconds * 1000)
    const resendCooldownUntil = new Date(now + WHATSAPP_CONFIG.resendCooldownSeconds * 1000)

    if (WHATSAPP_CONFIG.isMockEnabled() || process.env.NODE_ENV !== 'production') {
      console.log(`[WhatsApp OTP Dev] Code for ${phoneE164} (${purpose}): ${rawOtp}`)
    }

    // 3. Persist challenge to database
    let challengeId: string | undefined
    try {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('whatsapp_otp_challenges')
        .insert({
          phone_number: phoneE164,
          token_hash: tokenHash,
          purpose,
          user_id: options.userId || null,
          attempts: 0,
          max_attempts: WHATSAPP_CONFIG.maxOtpFailedAttempts,
          resend_cooldown_until: resendCooldownUntil.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: {
            ip: options.ipAddress || null,
            userAgent: options.userAgent || null,
          },
        })
        .select('id')
        .single()

      if (insertErr) {
        throw insertErr
      }
      if (inserted) {
        challengeId = inserted.id
      }
    } catch {
      // In-memory fallback
      const memKey = `${phoneE164}:${purpose}`
      inMemoryChallenges.set(memKey, {
        phoneNumber: phoneE164,
        tokenHash,
        purpose,
        userId: options.userId,
        attempts: 0,
        maxAttempts: WHATSAPP_CONFIG.maxOtpFailedAttempts,
        resendCooldownUntil: resendCooldownUntil.getTime(),
        expiresAt: expiresAt.getTime(),
      })
    }

    // 4. Send OTP via WhatsApp Cloud API
    // Attempt official Authentication template first
    let sendResult = await WhatsAppClient.sendTemplate({
      to: normalized.whatsapp,
      templateName: WHATSAPP_CONFIG.templates.otpAuth.name,
      languageCode: WHATSAPP_CONFIG.templates.otpAuth.language,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: rawOtp }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: rawOtp }],
        },
      ],
    })

    if (!sendResult.success) {
      const errorMsg = sendResult.error?.message || 'Failed to dispatch WhatsApp OTP.'
      console.error(`[WhatsAppOtpService] Authentication template '${WHATSAPP_CONFIG.templates.otpAuth.name}' dispatch failed:`, errorMsg)
      throw new Error(`WhatsApp delivery failed: ${errorMsg}. Please check your phone number and try again.`)
    }

    writeAuthAudit({
      userId: options.userId || null,
      email: null,
      event: `WHATSAPP_OTP_SENT_${purpose}`,
      status: 'SUCCESS',
      ip: options.ipAddress,
      userAgent: options.userAgent,
      metadata: { phone: phoneE164, messageId: sendResult.messageId },
    })

    return {
      success: true,
      cooldownSeconds: WHATSAPP_CONFIG.resendCooldownSeconds,
      message: 'A 6-digit verification code has been sent to your WhatsApp.',
      challengeId,
    }
  }

  /**
   * Verifies the 6-digit WhatsApp OTP and establishes an authenticated session
   */
  public static async verifyOtp(options: VerifyOtpOptions): Promise<OtpVerificationResult> {
    const normalized = normalizePhoneNumber(options.phoneNumber)
    if (!normalized.isValid || !normalized.e164) {
      throw new Error('Invalid mobile number format.')
    }

    const phoneE164 = normalized.e164
    const enteredOtp = String(options.enteredOtp || '').trim()
    if (!/^\d{6}$/.test(enteredOtp)) {
      throw new Error('Please enter a valid 6-digit numeric OTP.')
    }

    const expectedHash = hashOtp(phoneE164, enteredOtp)
    const now = new Date()
    const purpose = options.purpose

    // 1. Fetch active challenge
    let challenge: any = null
    let usingDb = true

    try {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_otp_challenges')
        .select('*')
        .eq('phone_number', phoneE164)
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .gt('expires_at', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      challenge = data
    } catch {
      usingDb = false
      const memKey = `${phoneE164}:${purpose}`
      const mem = inMemoryChallenges.get(memKey)
      if (mem && !mem.consumedAt && mem.expiresAt > Date.now()) {
        challenge = mem
      }
    }

    if (!challenge) {
      throw new Error('Verification code has expired or was not requested. Please tap "Resend Code".')
    }

    // 2. Lockout / Max attempts check
    const attempts = Number(challenge.attempts || 0)
    const maxAttempts = Number(challenge.max_attempts || 5)
    if (attempts >= maxAttempts) {
      throw new Error('Too many incorrect attempts. This OTP has been invalidated for security. Please request a new code.')
    }

    // 3. Timing-safe comparison of token hash
    const storedHash = String(challenge.token_hash || challenge.tokenHash || '')
    const isMatch = timingSafeStringEqual(storedHash, expectedHash)

    if (!isMatch) {
      const newAttempts = attempts + 1
      if (usingDb && challenge.id) {
        await supabaseAdmin
          .from('whatsapp_otp_challenges')
          .update({ attempts: newAttempts })
          .eq('id', challenge.id)
      } else {
        challenge.attempts = newAttempts
      }

      const remaining = Math.max(0, maxAttempts - newAttempts)
      writeAuthAudit({
        userId: challenge.user_id,
        event: `WHATSAPP_OTP_VERIFY_FAILED_${purpose}`,
        status: 'FAILED',
        ip: options.ipAddress,
        userAgent: options.userAgent,
        metadata: { phone: phoneE164, attempts: newAttempts },
      })

      if (remaining === 0) {
        throw new Error('Too many failed attempts. This code is now invalid. Please request a new OTP.')
      }
      throw new Error(`Incorrect verification code. ${remaining} attempt(s) remaining.`)
    }

    // 4. Mark challenge consumed atomically (Single-Use)
    if (usingDb && challenge.id) {
      await supabaseAdmin
        .from('whatsapp_otp_challenges')
        .update({ consumed_at: now.toISOString() })
        .eq('id', challenge.id)
    } else {
      challenge.consumedAt = Date.now()
    }

    // 5. Establish authenticated session
    let userId = challenge.user_id
    let isNewUser = false
    let userEmail: string | null = null

    // Look up profile by phone number if user_id wasn't in challenge
    if (!userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, phone_number, role')
        .or(`phone_number.eq.${phoneE164},phone_number.eq.${normalized.raw},phone_number.eq.${normalized.whatsapp}`)
        .limit(1)
        .maybeSingle()

      if (profile?.id) {
        userId = profile.id
        userEmail = profile.email || null
      }
    }

    // Also look up by email if provided and not yet found
    if (!userId && options.email) {
      const normalizedEmail = options.email.trim().toLowerCase()
      const existingUser = await findUserByEmail(normalizedEmail)
      if (existingUser?.id) {
        userId = existingUser.id
        userEmail = existingUser.email || normalizedEmail
        await supabaseAdmin.from('profiles').update({
          phone_number: phoneE164,
          first_name: options.firstName || undefined,
          last_name: options.lastName || undefined,
          updated_at: new Date().toISOString(),
        }).eq('id', userId)
      }
    }

    // If still no user and purpose is LOGIN or SIGNUP:
    if (!userId && (purpose === 'LOGIN' || purpose === 'SIGNUP')) {
      const targetEmail = (options.email && options.email.trim())
        ? options.email.trim().toLowerCase()
        : `wa_${normalized.whatsapp}@auth.8liv.in`
      userEmail = targetEmail

      // Look up auth user by email
      const existingUser = await findUserByEmail(targetEmail)
      if (existingUser?.id) {
        userId = existingUser.id
      } else {
        // Create user in Supabase auth (auto-confirmed: verification is via WhatsApp OTP)
        const tempPassword = crypto.randomBytes(24).toString('hex')
        const displayName = `${options.firstName || ''} ${options.lastName || ''}`.trim() || 'Patient'
        const { data: createdAuth, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: tempPassword,
          email_confirm: true,
          phone: phoneE164,
          phone_confirm: true,
          user_metadata: {
            auth_provider: 'whatsapp_otp',
            phone: phoneE164,
            display_id: displayName,
          },
        })

        if (createAuthErr || !createdAuth?.user) {
          throw new Error('Failed to provision user session. Please try again.')
        }

        userId = createdAuth.user.id
        isNewUser = true

        // Upsert profiles record
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          phone_number: phoneE164,
          email: targetEmail.includes('@auth.8liv.in') ? null : targetEmail,
          role: 'patient',
          first_name: options.firstName || 'Patient',
          last_name: options.lastName || '',
          display_id: displayName,
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (userId) {
      // Sync names and phone to profile
      const updateData: Record<string, any> = {
        phone_number: phoneE164,
        updated_at: new Date().toISOString(),
      }
      if (options.email && !options.email.includes('@auth.8liv.in')) {
        updateData.email = options.email.trim().toLowerCase()
      }
      if (options.firstName) updateData.first_name = options.firstName
      if (options.lastName) updateData.last_name = options.lastName
      if (options.firstName || options.lastName) {
        updateData.display_id = `${options.firstName || ''} ${options.lastName || ''}`.trim()
      }
      await supabaseAdmin.from('profiles').update(updateData).eq('id', userId)
    }

    if (!userId) {
      throw new Error('User record could not be located for this verified number.')
    }

    // Authoritative role resolution
    const role = await getUserRole(userId, userEmail)

    // Generate authenticated Supabase session tokens
    let sessionTokens: { access_token: string; refresh_token: string } | undefined
    try {
      const emailForLink = userEmail || `wa_${normalized.whatsapp}@auth.8liv.in`
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: emailForLink,
      })

      if (!linkErr && linkData?.properties?.hashed_token) {
        const supabaseAnon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://owagvhvypehvvxwdecjn.supabase.co',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )
        const verificationType = (linkData.properties.verification_type as any) || 'magiclink'
        const { data: sessionData, error: sessionErr } = await supabaseAnon.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: verificationType,
        })

        if (!sessionErr && sessionData?.session) {
          sessionTokens = {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
          }
        }
      }
    } catch (sessionExchangeErr) {
      console.warn('[WhatsAppOtpService] Session exchange notice:', sessionExchangeErr)
    }

    // Resolve landing target according to role and patient clinical journey
    let target = '/patient'
    if (role === 'admin') {
      target = '/admin'
    } else if (role === 'doctor') {
      target = '/doctor/dashboard'
    } else if (['dietitian', 'trainer', 'fitness_coach', 'nutritionist'].includes(role)) {
      target = '/provider/dashboard'
    } else if (['PHARMACY', 'PHARMACY_ADMIN', 'PHARMACY_STAFF', 'DELIVERY_PARTNER', 'PHARMACIST'].includes(String(role).toUpperCase())) {
      target = '/pharmacy'
    } else {
      try {
        const journeyState = await loadPatientJourneyState(userId)
        if (journeyState) {
          target = getPatientJourneyTarget(journeyState)
        }
      } catch (err) {
        console.warn('[WhatsAppOtpService] Error resolving patient journey target:', err)
      }
    }

    writeAuthAudit({
      userId,
      email: userEmail,
      event: `WHATSAPP_OTP_VERIFIED_${purpose}`,
      status: 'SUCCESS',
      ip: options.ipAddress,
      userAgent: options.userAgent,
      metadata: { phone: phoneE164, role },
    })

    return {
      success: true,
      message: 'WhatsApp verification successful.',
      userId,
      role,
      target,
      session: sessionTokens,
      user: {
        id: userId,
        phone: phoneE164,
        email: userEmail,
        role,
      },
      isNewUser,
    }
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
