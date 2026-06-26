import { createHmac } from 'crypto'
import { getStreamConfig } from '@/lib/video/streamClient'

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function createStreamUserToken(userId: string, expiresInSeconds = 60 * 60) {
  const { secret } = getStreamConfig()
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    user_id: userId,
    iat: now,
    exp: now + expiresInSeconds,
  }))
  const signature = base64Url(createHmac('sha256', secret).update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${signature}`
}
