import { NextResponse } from 'next/server'
import { WhatsAppOutbox } from '@/lib/whatsapp/whatsappOutbox'

export const dynamic = 'force-dynamic'

/**
 * GET/POST /api/cron/whatsapp-outbox
 * Background worker endpoint for flushing WhatsApp transactional outbox queue
 */
export async function GET(request: Request) {
  return handleOutboxWorker(request)
}

export async function POST(request: Request) {
  return handleOutboxWorker(request)
}

async function handleOutboxWorker(request: Request) {
  // Authorization check via CRON_SECRET or Bearer token if configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await WhatsAppOutbox.processBatch(25)
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    })
  } catch (err: any) {
    console.error('[WhatsAppOutboxCron] Error processing outbox batch:', err)
    return NextResponse.json({ error: err.message || 'Worker error' }, { status: 500 })
  }
}
