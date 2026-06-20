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

export function getOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}

export function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

export function checkRateLimit(key: string, options: { limit: number; windowMs: number; lockMs?: number }) {
  const now = Date.now()
  const existing = rateLimits.get(key)
  if (existing?.lockedUntil && existing.lockedUntil > now) {
    const seconds = Math.ceil((existing.lockedUntil - now) / 1000)
    return { allowed: false, message: `Too many attempts. Try again in ${seconds} seconds.` }
  }

  if (!existing || existing.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }

  existing.count += 1
  if (existing.count > options.limit) {
    existing.lockedUntil = now + (options.lockMs || options.windowMs)
    rateLimits.set(key, existing)
    return { allowed: false, message: 'Too many attempts. Please try again later.' }
  }

  rateLimits.set(key, existing)
  return { allowed: true }
}

export async function findUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) throw error
  return data.users.find((user) => normalizeEmail(user.email) === email) || null
}

export async function getUserRole(userId: string, email?: string | null) {
  if (normalizeEmail(email) === '8livofficial@gmail.com') return 'admin'

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role) return profile.role

  const { data: doctorProfile } = await supabaseAdmin
    .from('doctor_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  return doctorProfile?.id ? 'doctor' : 'patient'
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
