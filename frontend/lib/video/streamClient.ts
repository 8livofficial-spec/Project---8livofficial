export type StreamConfig = {
  apiKey: string
  secret: string
  defaultCallType: string
}

export function getStreamConfig(): StreamConfig {
  const apiKey = process.env.STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_API_KEY || ''
  const secret = process.env.STREAM_SECRET || process.env.STREAM_SECRET_KEY || ''
  const defaultCallType = process.env.STREAM_CALL_TYPE || 'default'

  if (!apiKey) {
    throw new Error('STREAM_API_KEY is not configured.')
  }
  if (!secret) {
    throw new Error('STREAM_SECRET is not configured.')
  }

  return { apiKey, secret, defaultCallType }
}

export function getPublicStreamApiKey() {
  return process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY || ''
}
