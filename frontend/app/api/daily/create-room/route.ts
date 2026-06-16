import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const roomName = body.roomName || `8liv-session-${Date.now()}`

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_chat: true,
          enable_knocking: true,
          exp: Math.round(Date.now() / 1000) + 3600, // 1 hour expiry
          max_participants: 2,
          enable_screenshare: true,
          enable_recording: false
        }
      })
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Daily.co room creation failed:', err)
      return NextResponse.json({ error: err.info || 'Failed to create room' }, { status: res.status })
    }

    const room = await res.json()
    return NextResponse.json({ url: room.url, name: room.name })
  } catch (err: any) {
    console.error('API Error in /api/daily/create-room:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
