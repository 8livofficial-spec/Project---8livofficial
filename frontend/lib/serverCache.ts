import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface CacheEntry<T> {
  value: T
  etag: string
  expiresAt: number
  tags: string[]
}

class MemoryServerCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxEntries: number

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries
  }

  public generateETag(data: any): string {
    const raw = typeof data === 'string' ? data : JSON.stringify(data)
    const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)
    return `"${hash}"`
  }

  private inFlight = new Map<string, Promise<any>>()

  public getEntry<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key)
  }

  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = 5000,
    tags: string[] = [],
    swrMs = 300000 // 5 minutes stale-while-revalidate window
  ): Promise<{ value: T; etag: string; isHit: boolean; isStale?: boolean }> {
    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached) {
      if (cached.expiresAt > now) {
        return { value: cached.value as T, etag: cached.etag, isHit: true }
      }

      // SWR: serve stale data immediately in 0ms, and refresh in background
      if (swrMs > 0 && (now - cached.expiresAt < swrMs)) {
        if (!this.inFlight.has(key)) {
          const bgPromise = (async () => {
            try {
              const freshValue = await fetcher()
              const freshEtag = this.generateETag(freshValue)
              this.cache.set(key, {
                value: freshValue,
                etag: freshEtag,
                expiresAt: Date.now() + ttlMs,
                tags,
              })
            } catch (bgErr) {
              console.warn(`[serverCache] SWR background update error for ${key}:`, bgErr)
            } finally {
              this.inFlight.delete(key)
            }
          })()
          this.inFlight.set(key, bgPromise)
        }
        return { value: cached.value as T, etag: cached.etag, isHit: true, isStale: true }
      }
    }

    // Coalesce in-flight requests to the same key to avoid duplicate DB queries
    if (this.inFlight.has(key)) {
      try {
        const val = await this.inFlight.get(key)
        const current = this.cache.get(key)
        if (current) {
          return { value: current.value as T, etag: current.etag, isHit: true }
        }
        return { value: val as T, etag: this.generateETag(val), isHit: false }
      } catch (err) {
        // Fallback to independent execution if in-flight failed
      }
    }

    const execPromise = (async () => {
      try {
        const value = await fetcher()
        const etag = this.generateETag(value)

        // Enforce size constraint (LRU approximation: evict oldest entry)
        if (this.cache.size >= this.maxEntries) {
          const firstKey = this.cache.keys().next().value
          if (firstKey) this.cache.delete(firstKey)
        }

        this.cache.set(key, {
          value,
          etag,
          expiresAt: Date.now() + ttlMs,
          tags,
        })

        return { value, etag }
      } finally {
        this.inFlight.delete(key)
      }
    })()

    this.inFlight.set(key, execPromise)
    const { value, etag } = await execPromise
    return { value, etag, isHit: false }
  }

  public invalidate(keyOrTag: string): void {
    if (this.cache.has(keyOrTag)) {
      this.cache.delete(keyOrTag)
    }

    // Also match by tags or prefix
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(keyOrTag) || key.startsWith(`${keyOrTag}:`)) {
        this.cache.delete(key)
      }
    }
  }

  public clear(): void {
    this.cache.clear()
  }
}

// Global singleton instance across Next.js API route evaluations
const globalCacheKey = Symbol.for('__8live_server_cache__')
const globalRef = global as unknown as { [globalCacheKey]?: MemoryServerCache }

export const serverCache: MemoryServerCache =
  globalRef[globalCacheKey] || (globalRef[globalCacheKey] = new MemoryServerCache(1000))

export function isETagFresh(request: Request, etag: string): boolean {
  const clientEtag = request.headers.get('if-none-match')
  if (!clientEtag) return false
  return clientEtag === etag || clientEtag === `W/${etag}` || clientEtag.includes(etag)
}

export function jsonWithETag(
  data: any,
  etag: string,
  request: Request,
  options: { status?: number; maxAgeSec?: number; headers?: Record<string, string> } = {}
): NextResponse {
  if (isETagFresh(request, etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': `private, no-cache, max-age=${options.maxAgeSec ?? 0}`,
        ...(options.headers || {}),
      },
    })
  }

  return NextResponse.json(data, {
    status: options.status || 200,
    headers: {
      ETag: etag,
      'Cache-Control': `private, no-cache, max-age=${options.maxAgeSec ?? 0}`,
      ...(options.headers || {}),
    },
  })
}
