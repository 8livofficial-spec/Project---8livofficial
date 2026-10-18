import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedProvider } from '@/lib/providerServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'json'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for consent audit export' }, { status: 400 })
    }

    // Provider / Admin authentication check
    const auth = await getAuthenticatedProvider(request)
    if ('error' in auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Only compliance administrators can export consent audit records.' }, { status: 403 })
    }

    const [{ data: records, error }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true }),
      supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, display_id, email, phone_number, created_at')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (error) throw error

    const formattedRecords = (records || []).map((r) => {
      const utcDate = new Date(r.timestamp)
      const istString = utcDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })
      return {
        id: r.id,
        user_id: r.user_id,
        document_id: r.document_id,
        version: r.version,
        gate: r.gate,
        action: r.action,
        timestamp_utc: r.timestamp,
        timestamp_ist: istString,
        ip_address: r.ip_address || 'N/A',
        user_agent: r.user_agent || 'N/A',
        otp_verified: r.otp_verified ? 'YES' : 'NO',
        booking_id: r.booking_id || 'N/A',
        choices: JSON.stringify(r.choices || {}),
      }
    })

    if (format === 'csv') {
      const headers = [
        'Record ID',
        'User ID',
        'Document ID',
        'Version',
        'Gate',
        'Action',
        'Timestamp (UTC)',
        'Timestamp (IST)',
        'IP Address',
        'User Agent',
        'OTP Verified',
        'Booking ID',
        'Choices',
      ]

      const rows = formattedRecords.map((r) => [
        r.id,
        r.user_id,
        r.document_id,
        r.version,
        r.gate,
        r.action,
        `"${r.timestamp_utc}"`,
        `"${r.timestamp_ist}"`,
        `"${r.ip_address}"`,
        `"${r.user_agent.replace(/"/g, '""')}"`,
        r.otp_verified,
        r.booking_id,
        `"${r.choices.replace(/"/g, '""')}"`,
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="consent-audit-${userId}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      patient: profile,
      exportedAt: new Date().toISOString(),
      recordsCount: formattedRecords.length,
      records: formattedRecords,
    })
  } catch (err: any) {
    console.error('Consent export error:', err)
    return NextResponse.json({ error: err.message || 'Failed to export consent audit trail' }, { status: 500 })
  }
}
