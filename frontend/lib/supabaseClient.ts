import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Supabase URL or Key is missing from environment variables.")
}

const globalForSupabase = globalThis as typeof globalThis & {
  __browserSupabaseClient?: SupabaseClient
}

// Preserve one auth client across Turbopack hot reloads. Multiple clients can
// race while rotating the same refresh token and invalidate each other's token.
export const supabase = globalForSupabase.__browserSupabaseClient ?? createClient(supabaseUrl, supabaseKey)

if (!globalForSupabase.__browserSupabaseClient) {
  // Monkey-patch getSession to automatically sign out on invalid refresh token.
  // This prevents infinite loops of AuthApiError when the token is missing/invalid on the client.
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)
  supabase.auth.getSession = async () => {
    const result = await originalGetSession()
    if (result.error && result.error.message.toLowerCase().includes('refresh token')) {
      await supabase.auth.signOut()
    }
    return result
  }
}

export function syncSupabaseAuthCookie(session?: any | null) {
  if (typeof document === 'undefined') return
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
    const projectRef = match ? match[1] : 'owagvhvypehvvxwdecjn'
    const cookieName = `sb-${projectRef}-auth-token`

    if (session && session.access_token) {
      const payload = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
      })
      const encoded = encodeURIComponent(payload)
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const secureFlag = isHttps ? '; Secure' : ''
      document.cookie = `${cookieName}=${encoded}; path=/; max-age=604800; SameSite=Lax${secureFlag}`
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`

      const role = session.user?.user_metadata?.role || session.user?.app_metadata?.role || 'patient'
      if (!document.cookie.includes('user_role=')) {
        document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax${secureFlag}`
      }
    } else {
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      document.cookie = `user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    }
  } catch (e) {
    console.warn('[SupabaseClient] Failed to sync auth cookie:', e)
  }
}

if (typeof window !== 'undefined') {
  globalForSupabase.__browserSupabaseClient = supabase

  // Initial sync with active browser session
  supabase.auth.getSession().then(({ data: { session } }) => {
    syncSupabaseAuthCookie(session)
  }).catch(() => {})

  // Listen to all auth state changes (login, signup, refresh, signout)
  supabase.auth.onAuthStateChange((_event, session) => {
    syncSupabaseAuthCookie(session)
  })
}
