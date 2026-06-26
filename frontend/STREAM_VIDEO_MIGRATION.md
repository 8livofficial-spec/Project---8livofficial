# Stream Video production migration

## Root cause replaced

The previous implementation stored permanent Jitsi URLs (`room_url`, `meeting_url`, `meeting_room`) on consultation records and reused those URLs across patient, doctor, and provider portals. That made access control dependent on possession of a URL and duplicated meeting logic across booking APIs.

The new implementation stores provider-independent meeting metadata and generates secure Stream user tokens server-side.

## Architecture

```text
Booking API
  -> createStreamMeeting()
  -> stores meeting_provider=STREAM, call_id, call_type, created_by, meeting_status

Join UI
  -> /api/video/token
  -> validates authenticated user + appointment ownership + 15-minute join window
  -> returns Stream apiKey, userToken, callId, callType
  -> StreamConsultationCall joins Stream Video SDK
```

## Environment variables

Required in production:

```env
STREAM_API_KEY=...
NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET=...
STREAM_CALL_TYPE=default
```

`STREAM_SECRET` must only exist server-side. Do not expose it to the browser.

## Database migration

Run:

```sql
Database/stream_video_migration.sql
```

Required columns:

- `meeting_provider`
- `call_id`
- `call_type`
- `created_by`
- `meeting_status`

## Meeting lifecycle

- `CREATED`: appointment booked
- `WAITING`: patient has joined
- `LIVE`: provider has joined/started call
- `COMPLETED`: consultation completed
- `CANCELLED`: consultation cancelled
- `MISSED`: consultation missed

## Security improvements

- Stream tokens are generated only by `/api/video/token`.
- Stream secret is never sent to the frontend.
- Join requires authenticated Supabase session.
- Join validates patient/provider/admin authorization against the appointment.
- Join is blocked before the 15-minute window and after terminal statuses.
- New appointments do not store permanent meeting URLs.

## Manual QA checklist

1. Doctor consultation
   - Book appointment.
   - Patient cannot join before 15-minute window.
   - Doctor cannot join before 15-minute window.
   - Patient and doctor join same Stream call.
   - Doctor ending session updates status.

2. Provider consultations
   - Dietitian session joins Stream.
   - Nutritionist session joins Stream.
   - Fitness Coach session joins Stream.
   - Unauthorized patient/provider cannot join another user’s call.

3. Existing appointment recovery
   - Open appointment without `call_id`.
   - Appointment details/token endpoint backfills Stream metadata.

4. Error handling
   - Missing Stream env vars return a clear server error.
   - Expired session prompts sign-in.
   - Completed/cancelled/missed appointments cannot join.

5. Mobile
   - `/patient/consultation/room?id=...` renders on mobile.
   - `/video/room?id=...` renders for provider users on mobile.

## Notes

The old `frontend/lib/jitsi.ts` utility has been removed. Legacy DB columns are tolerated only for migration lookup/backfill compatibility; new consultations use Stream metadata.
