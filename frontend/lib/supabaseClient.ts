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

export function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : 'owagvhvypehvvxwdecjn'
}

export function cleanStaleAuthStorage() {
  if (typeof document === 'undefined') return
  try {
    const projectRef = getProjectRef()
    const storageKey = `sb-${projectRef}-auth-token`
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(storageKey)
    }
    syncSupabaseAuthCookie(null)
  } catch (e) {
    console.warn('[SupabaseClient] Error clearing stale auth storage:', e)
  }
}

export function syncSupabaseAuthCookie(session?: any | null) {
  if (typeof document === 'undefined') return
  try {
    const projectRef = getProjectRef()
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

if (!globalForSupabase.__browserSupabaseClient) {
  const originalSignOut = supabase.auth.signOut.bind(supabase.auth)
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)
  const originalRefreshSession = supabase.auth.refreshSession.bind(supabase.auth)

  // Patch signOut to cleanly purge local tokens and suppress 400 AuthApiErrors when token is already revoked
  supabase.auth.signOut = async (options?: any) => {
    cleanStaleAuthStorage()
    try {
      return await originalSignOut(options || { scope: 'local' })
    } catch {
      return { error: null }
    }
  }

  // Patch getSession to cleanly recover and auto-purge when refresh token has expired or cannot be found
  supabase.auth.getSession = async () => {
    try {
      const result = await originalGetSession()
      if (result.error && (
        result.error.message.toLowerCase().includes('refresh token') ||
        result.error.message.toLowerCase().includes('invalid grant') ||
        (result.error as any).status === 400
      )) {
        cleanStaleAuthStorage()
        try {
          await originalSignOut({ scope: 'local' })
        } catch {}
        return { data: { session: null }, error: null }
      }
      return result
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('refresh token') || err?.status === 400) {
        cleanStaleAuthStorage()
        try {
          await originalSignOut({ scope: 'local' })
        } catch {}
        return { data: { session: null }, error: null }
      }
      return { data: { session: null }, error: err }
    }
  }

  // Patch refreshSession to cleanly handle invalid refresh tokens
  supabase.auth.refreshSession = async (params?: any) => {
    try {
      const result = await originalRefreshSession(params)
      if (result.error && (
        result.error.message.toLowerCase().includes('refresh token') ||
        result.error.message.toLowerCase().includes('invalid grant') ||
        (result.error as any).status === 400
      )) {
        cleanStaleAuthStorage()
        try {
          await originalSignOut({ scope: 'local' })
        } catch {}
        return { data: { session: null, user: null }, error: null }
      }
      return result
    } catch {
      cleanStaleAuthStorage()
      try {
        await originalSignOut({ scope: 'local' })
      } catch {}
      return { data: { session: null, user: null }, error: null }
    }
  }
}

if (typeof window !== 'undefined') {
  globalForSupabase.__browserSupabaseClient = supabase

  // Initial sync with active browser session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      syncSupabaseAuthCookie(session)
    } else {
      cleanStaleAuthStorage()
    }
  }).catch(() => {
    cleanStaleAuthStorage()
  })

  // Listen to all auth state changes (login, signup, refresh, signout)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      cleanStaleAuthStorage()
    } else {
      syncSupabaseAuthCookie(session)
    }
  })
}
