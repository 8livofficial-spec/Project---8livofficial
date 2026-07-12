import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_VERSION = process.env.PROVIDER_DATA_KEY_VERSION || 'local-v1'

function getKey() {
  const raw = process.env.PROVIDER_DATA_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!raw) {
    throw new Error('Provider encryption key is not configured.')
  }
  return createHash('sha256').update(raw).digest()
}

export function encryptSensitiveValue(value: string | null | undefined) {
  const plain = String(value || '').trim()
  if (!plain) return { ciphertext: null, keyVersion: KEY_VERSION }

  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: [KEY_VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':'),
    keyVersion: KEY_VERSION,
  }
}

export function decryptSensitiveValue(ciphertext: string) {
  const [version, ivText, tagText, encryptedText] = ciphertext.split(':')
  if (!version || !ivText || !tagText || !encryptedText) throw new Error('Invalid ciphertext.')

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function last4(value: string | null | undefined) {
  const normalized = String(value || '').replace(/\s+/g, '').toUpperCase()
  return normalized ? normalized.slice(-4) : null
}

export function maskLast4(value: string | null | undefined, prefix = '****') {
  const tail = last4(value)
  return tail ? `${prefix}${tail}` : null
}
