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

if (typeof window !== 'undefined') {
  globalForSupabase.__browserSupabaseClient = supabase
}
