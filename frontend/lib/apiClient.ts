import { supabase } from './supabaseClient'

// In-memory token cache to prevent redundant getSession() locks on rapid API calls
let cachedAccessToken: string | null = null
let tokenExpiry = 0

async function getValidToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && now < tokenExpiry) {
    return cachedAccessToken
  }

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    cachedAccessToken = null
    tokenExpiry = 0
    throw new Error('Please sign in again.')
  }

  cachedAccessToken = data.session.access_token
  // Refresh token memory cache every 30 seconds
  tokenExpiry = now + 30000
  return cachedAccessToken
}

// In-flight request deduplication map for GET requests
const inFlightRequests = new Map<string, Promise<Response>>()

// Client-side ETag revalidation cache for zero-bandwidth 304 responses
const clientETagCache = new Map<string, { etag: string; bodyText: string; headers: Headers }>()

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase()

  // Invalidate client GET caches on mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    clientETagCache.clear()
  }

  // Request Coalescing for identical in-flight GET requests
  const isCoalesceable = method === 'GET' && !options.body
  if (isCoalesceable && inFlightRequests.has(url)) {
    const existing = inFlightRequests.get(url)!
    const res = await existing
    return res.clone()
  }

  const fetchPromise = (async () => {
    try {
      const token = await getValidToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...((options.headers as Record<string, string>) || {}),
      }

      // If we have a cached ETag for this URL, send If-None-Match
      if (isCoalesceable && clientETagCache.has(url)) {
        const cached = clientETagCache.get(url)!
        if (!headers['If-None-Match'] && !headers['if-none-match']) {
          headers['If-None-Match'] = cached.etag
        }
      }

      const response = await fetch(url, {
        ...options,
        credentials: options.credentials || 'include',
        headers,
      })

      // If 304 Not Modified, reconstitute from client cache as 200 OK
      if (response.status === 304 && isCoalesceable && clientETagCache.has(url)) {
        const cached = clientETagCache.get(url)!
        return new Response(cached.bodyText, {
          status: 200,
          statusText: 'OK (From ETag Cache)',
          headers: cached.headers,
        })
      }

      // If 200 OK with ETag, update client cache
      if (response.ok && isCoalesceable) {
        const etag = response.headers.get('etag')
        if (etag) {
          const clone = response.clone()
          const text = await clone.text()
          clientETagCache.set(url, {
            etag,
            bodyText: text,
            headers: new Headers(response.headers),
          })
        }
      }

      return response
    } finally {
      if (isCoalesceable) {
        inFlightRequests.delete(url)
      }
    }
  })()

  if (isCoalesceable) {
    inFlightRequests.set(url, fetchPromise)
  }

  const res = await fetchPromise
  return res.clone()
}

/**
 * Manually bust client-side ETag cache if needed
 */
export function invalidateClientCache(urlPrefix?: string) {
  if (!urlPrefix) {
    clientETagCache.clear()
    return
  }
  for (const key of clientETagCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      clientETagCache.delete(key)
    }
  }
}
