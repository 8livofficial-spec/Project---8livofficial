import { createHash, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseServer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

type RateLimitEntry = {
  count: number
  resetAt: number
  lockedUntil?: number
}

const rateLimits = new Map<string, RateLimitEntry>()

export function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePasswordStrength(password: unknown) {
  const value = String(password || '')
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.'
  if (!/\d/.test(value)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character.'
  return null
}

export function createToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getOrigin(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    return configured.replace(/\/+$/, '')
  }
  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    if (forwardedHost) {
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      return `${proto}://${forwardedHost}`
    }
    const origin = request.headers.get('origin')
    if (origin) {
      return origin
    }
    try {
      return new URL(request.url).origin
    } catch {}
  }
  return 'https://8liv.in'
}

export function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

import { NextResponse } from 'next/server'

export function checkRateLimit(key: string, options: { limit: number; windowMs: number; lockMs?: number }) {
  const now = Date.now()
  const existing = rateLimits.get(key)
  if (existing?.lockedUntil && existing.lockedUntil > now) {
    const seconds = Math.ceil((existing.lockedUntil - now) / 1000)
    return { allowed: false, message: `Too many attempts. Try again in ${seconds} seconds.`, retryAfter: seconds }
  }

  if (!existing || existing.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }

  existing.count += 1
  if (existing.count > options.limit) {
    const lockDuration = options.lockMs || options.windowMs
    existing.lockedUntil = now + lockDuration
    rateLimits.set(key, existing)
    const seconds = Math.ceil(lockDuration / 1000)
    return { allowed: false, message: 'Too many attempts. Please try again later.', retryAfter: seconds }
  }

  rateLimits.set(key, existing)
  return { allowed: true }
}

export function rateLimitResponse(retryAfterSeconds: number, message?: string) {
  const msg = message || 'Too many attempts. Please try again later.'
  return new NextResponse(
    JSON.stringify({ error: msg }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds)
      }
    }
  )
}


export async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) throw error
  return data.users.find((user) => normalizeEmail(user.email) === email) || null
}

export async function getUserRole(userId: string, email?: string | null) {
  const normalizedEmail = normalizeEmail(email)
  // SECURITY: Admin bypass emails are driven EXCLUSIVELY by ADMIN_BYPASS_EMAILS env var (comma-separated).
  const adminBypassEmails = (process.env.ADMIN_BYPASS_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (adminBypassEmails.length > 0 && adminBypassEmails.includes(normalizedEmail)) return 'admin'

  // 1. Check partner_pharmacy_users (authoritative source for pharmacy team members)
  try {
    const { data: pharmacyUser } = await supabaseAdmin
      .from('partner_pharmacy_users')
      .select('role')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (pharmacyUser) return 'pharmacy'
  } catch (err) {
    console.error('[getUserRole] Error checking partner_pharmacy_users:', err)
  }

  // 2. Check profiles
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role) {
      const pRole = String(profile.role).toLowerCase()
      if (pRole === 'pharmacy' || pRole.includes('pharmacy')) return 'pharmacy'
      return profile.role
    }
  } catch (err) {
    console.error('[getUserRole] Error checking profiles:', err)
  }

  // 3. Check auth metadata
  try {
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const metaRole = authUserData?.user?.user_metadata?.role?.toLowerCase()
    if (metaRole === 'pharmacy' || metaRole === 'pharmacy_admin' || metaRole === 'pharmacy_staff') {
      return 'pharmacy'
    }
    if (metaRole && ['doctor', 'dietitian', 'trainer', 'fitness_coach', 'nutritionist', 'admin'].includes(metaRole)) {
      return metaRole
    }
  } catch (err) {
    // Non-blocking
  }

  // 4. Check doctor_profiles
  try {
    const { data: doctorProfile } = await supabaseAdmin
      .from('doctor_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (doctorProfile?.id) return 'doctor'
  } catch (err) {
    console.error('[getUserRole] Error checking doctor_profiles:', err)
  }

  // 5. Check provider_profiles_v2
  try {
    const { data: providerProfile } = await supabaseAdmin
      .from('provider_profiles_v2')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (providerProfile?.role) return providerProfile.role
  } catch (err) {
    // Non-blocking
  }

  return 'patient'
}

export async function writeAuthAudit(params: {
  userId?: string | null
  email?: string | null
  event: string
  status: 'SUCCESS' | 'FAILED'
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin
      .from('auth_audit_logs')
      .insert({
        user_id: params.userId || null,
        email: params.email || null,
        event: params.event,
        status: params.status,
        ip_address: params.ip || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || {},
      })
  } catch (error) {
    console.error('Failed to write auth audit log:', error)
  }
}

export function createSupabasePasswordClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
