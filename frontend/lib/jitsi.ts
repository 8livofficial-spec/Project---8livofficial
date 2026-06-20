import { randomUUID } from 'crypto'

export const JITSI_PROVIDER = 'JITSI'
export const JITSI_BASE_URL = 'https://meet.jit.si'

export function createJitsiMeeting(appointmentId: string) {
  const meetingRoom = `8liv-${appointmentId}-${randomUUID()}`
  return {
    meetingProvider: JITSI_PROVIDER,
    meetingRoom,
    meetingUrl: `${JITSI_BASE_URL}/${meetingRoom}`,
  }
}
