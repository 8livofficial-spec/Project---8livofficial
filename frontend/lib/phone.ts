export type NormalizedPhone = {
  raw: string
  e164: string | null
  whatsapp: string | null
  display: string
  isValid: boolean
}

export function normalizePhoneNumber(value: unknown, defaultCountryCode = '91'): NormalizedPhone {
  const raw = String(value || '').trim()
  let text = raw.replace(/[^\d+]/g, '')

  if (text.startsWith('00')) {
    text = `+${text.slice(2)}`
  }

  let digits = text.startsWith('+') ? text.slice(1).replace(/\D/g, '') : text.replace(/\D/g, '')

  if (!text.startsWith('+')) {
    if (digits.length === 10) {
      digits = `${defaultCountryCode}${digits}`
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = `${defaultCountryCode}${digits.slice(1)}`
    }
  }

  const isValid = digits.length >= 10 && digits.length <= 15
  const e164 = isValid ? `+${digits}` : null

  return {
    raw,
    e164,
    whatsapp: isValid ? digits : null,
    display: e164 || raw,
    isValid,
  }
}

