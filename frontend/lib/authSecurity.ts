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
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  try {
    // 1. O(1) indexed lookup via profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()

    if (profile?.id) {
      const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      if (userRecord?.user) return userRecord.user
    }
  } catch (err) {
    console.warn('[findUserByEmail] Fast-path lookup warning:', err)
  }

  // 2. Targeted fallback (page 1, 50 users) only if profile lookup yielded nothing
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 })
    if (!error && data?.users) {
      return data.users.find((user) => normalizeEmail(user.email) === normalized) || null
    }
  } catch (err) {
    console.error('[findUserByEmail] listUsers fallback error:', err)
  }

  return null
}

export async function getUserRole(
  userId: string,
  email?: string | null,
  userMetadata?: Record<string, unknown> | null
) {
  const normalizedEmail = normalizeEmail(email)
  // SECURITY: Admin bypass emails are driven EXCLUSIVELY by ADMIN_BYPASS_EMAILS env var (comma-separated).
  const adminBypassEmails = (process.env.ADMIN_BYPASS_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (adminBypassEmails.length > 0 && adminBypassEmails.includes(normalizedEmail)) return 'admin'

  // Fast-path 1: Check userMetadata if provided (0ms DB cost)
  if (userMetadata?.role) {
    const metaRole = String(userMetadata.role).toLowerCase()
    if (['pharmacy', 'pharmacy_admin', 'pharmacy_staff'].includes(metaRole)) return 'pharmacy'
    if (['admin', 'doctor', 'dietitian', 'trainer', 'fitness_coach', 'nutritionist'].includes(metaRole)) return metaRole
    if (metaRole === 'patient') return 'patient'
  }

  // Fast-path 2: Check profiles table (single indexed query)
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.role) {
      const pRole = String(profile.role).toLowerCase()
      if (pRole === 'pharmacy' || pRole.includes('pharmacy')) return 'pharmacy'
      if (['admin', 'doctor', 'dietitian', 'trainer', 'fitness_coach', 'nutritionist', 'patient'].includes(pRole)) {
        return pRole
      }
    }
  } catch (err) {
    console.error('[getUserRole] Error checking profiles:', err)
  }

  // Fallback: Run legacy partner_pharmacy_users, doctor_profiles, provider_profiles_v2 in PARALLEL
  try {
    const [pharmRes, docRes, provRes] = await Promise.all([
      supabaseAdmin
        .from('partner_pharmacy_users')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
      supabaseAdmin
        .from('doctor_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('provider_profiles_v2')
        .select('role')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (pharmRes.data) return 'pharmacy'
    if (docRes.data?.id) return 'doctor'
    if (provRes.data?.role) return provRes.data.role
  } catch (err) {
    console.error('[getUserRole] Parallel fallback error:', err)
  }

  return 'patient'
}

export function writeAuthAudit(params: {
  userId?: string | null
  email?: string | null
  event: string
  status: 'SUCCESS' | 'FAILED'
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}) {
  // Fire-and-forget: execute asynchronously without blocking authentication responses
  Promise.resolve(
    supabaseAdmin
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
  ).catch((error) => {
    console.warn('[writeAuthAudit] Non-blocking log write warning:', error)
  })
}

export function createSupabasePasswordClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
