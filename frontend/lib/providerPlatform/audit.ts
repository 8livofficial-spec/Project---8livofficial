import { supabaseAdmin } from '@/lib/supabaseServer'
import { getClientIp } from '@/lib/authSecurity'

type AuditInput = {
  request?: Request
  actorId?: string | null
  actorRole?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  providerId?: string | null
  previousValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  reason?: string | null
}

function redact(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/pan|account|ifsc|ciphertext|token|password|document/i.test(key)) {
      result[key] = '[REDACTED]'
    } else {
      result[key] = redact(item)
    }
  }
  return result
}

export async function writeProviderAudit(input: AuditInput) {
  try {
    await supabaseAdmin.from('provider_audit_logs').insert({
      actor_id: input.actorId || null,
      actor_role: input.actorRole || null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      provider_id: input.providerId || null,
      previous_values: redact(input.previousValues || null),
      new_values: redact(input.newValues || null),
      reason: input.reason || null,
      ip_address: input.request ? getClientIp(input.request) : null,
      user_agent: input.request?.headers.get('user-agent') || null,
      request_id: input.request?.headers.get('x-request-id') || null,
    })
  } catch (error) {
    console.error('Failed to write provider audit log:', error)
  }
}
