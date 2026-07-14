import { NextResponse } from 'next/server'

export function gone(message = 'This endpoint has been retired.') {
  return NextResponse.json({ error: message }, { status: 410 })
}
