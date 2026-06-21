'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Coffee, Plus, Trash2 } from 'lucide-react'

export type AvailabilitySource = 'MANUAL' | 'GENERATED'

export type GeneratedSlot = {
  available_date: string
  time_slot: string
  end_time: string
  slot_duration: number
  source: AvailabilitySource
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type DaySchedule = { enabled: boolean; startTime: string; endTime: string; breakStart: string; breakEnd: string }

export type AvailabilitySubmission =
  | {
      scheduleMode: 'MANUAL'
      slots: GeneratedSlot[]
    }
  | {
      scheduleMode: 'RECURRING'
      startDate: string
      endDate: string
      workingDays: number[]
      startTime: string
      endTime: string
      slotDuration: number
      breakStart: string | null
      breakEnd: string | null
    }

type Props = {
  providerLabel?: string
  onGenerate: (submission: AvailabilitySubmission) => Promise<void>
  isSaving?: boolean
}

const days: Array<{ key: DayKey; label: string; short: string; jsDay: number }> = [
  { key: 'monday', label: 'Monday', short: 'Mon', jsDay: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', jsDay: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', jsDay: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', jsDay: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', jsDay: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', jsDay: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', jsDay: 0 },
]

const todayString = () => new Date().toISOString().split('T')[0]
const dateInputValue = (date: Date) => date.toISOString().split('T')[0]
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next }
const minutesFromTime = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes }
const timeFromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
const isPastSlot = (date: string, time: string) => new Date(`${date}T${time}`).getTime() <= Date.now()
const formatTime = (time: string) => new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const initialSchedules = Object.fromEntries(days.map(day => [day.key, {
  enabled: day.jsDay >= 1 && day.jsDay <= 5,
  startTime: '09:00',
  endTime: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
}])) as Record<DayKey, DaySchedule>

export default function ProviderAvailabilityScheduler({ providerLabel = 'provider', onGenerate, isSaving = false }: Props) {
  const [mode, setMode] = useState<AvailabilitySource>('GENERATED')
  const [startDate, setStartDate] = useState(todayString())
  const [endDate, setEndDate] = useState(dateInputValue(addDays(new Date(), 14)))
  const [slotDuration, setSlotDuration] = useState(30)
  const [schedules, setSchedules] = useState(initialSchedules)
  const [manualDate, setManualDate] = useState(todayString())
  const [manualTime, setManualTime] = useState('09:00')
  const [manualDuration, setManualDuration] = useState(30)
  const [manualSlots, setManualSlots] = useState<GeneratedSlot[]>([])
  const [message, setMessage] = useState('')

  const generatedResult = useMemo(
    () => generateSlots(schedules, startDate, endDate, slotDuration),
    [schedules, startDate, endDate, slotDuration]
  )

  const updateDay = (key: DayKey, patch: Partial<DaySchedule>) => {
    setSchedules(current => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  const addManualSlot = () => {
    setMessage('')
    const start = minutesFromTime(manualTime)
    if (!manualDate || manualDate < todayString() || !Number.isFinite(start) || isPastSlot(manualDate, manualTime)) {
      setMessage('Select a future date and time.')
      return
    }
    if (!Number.isInteger(manualDuration) || manualDuration < 5 || manualDuration > 240 || start + manualDuration > 1440) {
      setMessage('Duration must be 5-240 minutes and end on the selected date.')
      return
    }
    const candidate: GeneratedSlot = {
      available_date: manualDate,
      time_slot: timeFromMinutes(start),
      end_time: timeFromMinutes(start + manualDuration),
      slot_duration: manualDuration,
      source: 'MANUAL',
    }
    const overlap = manualSlots.some(slot => slot.available_date === candidate.available_date
      && minutesFromTime(slot.time_slot) < minutesFromTime(candidate.end_time)
      && minutesFromTime(slot.end_time) > minutesFromTime(candidate.time_slot))
    if (overlap) {
      setMessage('This manual slot overlaps another slot in the preview.')
      return
    }
    setManualSlots(current => [...current, candidate].sort((a, b) => `${a.available_date}${a.time_slot}`.localeCompare(`${b.available_date}${b.time_slot}`)))
  }

  const save = async () => {
    setMessage('')
    try {
      if (mode === 'MANUAL') {
        if (!manualSlots.length) return setMessage('Add at least one manual slot.')
        await onGenerate({ scheduleMode: 'MANUAL', slots: manualSlots })
        setManualSlots([])
        return
      }

      const workingDays = days.filter(day => schedules[day.key].enabled).map(day => day.jsDay)
      const firstEnabledDay = days.find(day => schedules[day.key].enabled)
      const sched = firstEnabledDay ? schedules[firstEnabledDay.key] : null

      if (!workingDays.length || !sched) {
        return setMessage('Enable at least one working day.')
      }

      await onGenerate({
        scheduleMode: 'RECURRING',
        startDate,
        endDate,
        workingDays,
        startTime: sched.startTime,
        endTime: sched.endTime,
        slotDuration,
        breakStart: sched.breakStart || null,
        breakEnd: sched.breakEnd || null
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save availability.')
    }
  }

  const preview = mode === 'MANUAL' ? manualSlots : generatedResult.slots

  return (
    <section className="rounded-[28px] border border-[#E8DED4] bg-white p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#1A1F36] p-3 text-white"><CalendarDays className="h-5 w-5" /></span>
          <div><h3 className="text-xl font-black text-[#1A1F36]">Provider Availability</h3><p className="text-sm font-semibold text-[#6B7A90]">Publish bookable slots for this {providerLabel}.</p></div>
        </div>
        <div className="inline-flex rounded-xl bg-[#F5F0EB] p-1">
          {(['GENERATED', 'MANUAL'] as AvailabilitySource[]).map(value => (
            <button key={value} type="button" onClick={() => { setMode(value); setMessage('') }} className={`rounded-lg px-4 py-2 text-sm font-black ${mode === value ? 'bg-white text-[#C4622D] shadow-sm' : 'text-[#6B7A90]'}`}>
              {value === 'GENERATED' ? 'Recurring Schedule' : 'Manual Slots'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'GENERATED' ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Start Date" type="date" min={todayString()} value={startDate} onChange={setStartDate} />
            <Input label="End Date" type="date" min={startDate || todayString()} value={endDate} onChange={setEndDate} />
            <Duration value={slotDuration} onChange={setSlotDuration} />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {days.map(day => {
              const schedule = schedules[day.key]
              return <div key={day.key} className={`rounded-2xl border p-4 ${schedule.enabled ? 'border-[#C4622D]/25 bg-[#F9F6F0]' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div><p className="font-black text-[#1A1F36]">{day.label}</p><p className="text-xs font-bold text-[#6B7A90]">{schedule.enabled ? 'Working day' : 'OFF - no slots generated'}</p></div>
                  <button type="button" onClick={() => updateDay(day.key, { enabled: !schedule.enabled })} className={`h-7 w-12 rounded-full p-1 transition ${schedule.enabled ? 'bg-[#5C7A6B]' : 'bg-slate-300'}`} aria-label={`Toggle ${day.label}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${schedule.enabled ? 'translate-x-5' : ''}`} /></button>
                </div>
                {schedule.enabled && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Input label="Start" type="time" value={schedule.startTime} onChange={value => updateDay(day.key, { startTime: value })} />
                  <Input label="End" type="time" value={schedule.endTime} onChange={value => updateDay(day.key, { endTime: value })} />
                  <Input label="Break Start" type="time" value={schedule.breakStart} onChange={value => updateDay(day.key, { breakStart: value })} icon={<Coffee className="h-3 w-3" />} />
                  <Input label="Break End" type="time" value={schedule.breakEnd} onChange={value => updateDay(day.key, { breakEnd: value })} icon={<Coffee className="h-3 w-3" />} />
                </div>}
              </div>
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Input label="Specific Date" type="date" min={todayString()} value={manualDate} onChange={setManualDate} />
          <Input label="Start Time" type="time" value={manualTime} onChange={setManualTime} />
          <Duration value={manualDuration} onChange={setManualDuration} />
          <button type="button" onClick={addManualSlot} className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#1A1F36] px-5 text-sm font-black text-white"><Plus className="h-4 w-4" />Add Slot</button>
        </div>
      )}

      {message && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{message}</p>}

      <div className="mt-6 rounded-2xl border border-[#E8DED4] bg-[#F9F6F0] p-4">
        <div className="flex items-center justify-between"><h4 className="font-black text-[#1A1F36]">Slot Preview</h4><span className="text-xs font-black text-[#6B7A90]">{preview.length} SLOT{preview.length === 1 ? '' : 'S'}</span></div>
        {preview.length ? <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {preview.map((slot, index) => <div key={`${slot.available_date}-${slot.time_slot}`} className="flex items-center justify-between rounded-xl bg-white p-3">
            <div><p className="text-sm font-black text-[#1A1F36]">{new Date(`${slot.available_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p><p className="text-xs font-bold text-[#6B7A90]">{formatTime(slot.time_slot)} - {formatTime(slot.end_time)} | {slot.source} | AVAILABLE</p></div>
            {mode === 'MANUAL' && <button type="button" onClick={() => setManualSlots(current => current.filter((_, itemIndex) => itemIndex !== index))} title="Remove slot" className="p-2 text-rose-600"><Trash2 className="h-4 w-4" /></button>}
          </div>)}
        </div> : <p className="mt-3 text-sm font-semibold text-[#6B7A90]">No slots in preview.</p>}
      </div>

      <div className="mt-5 flex justify-end"><button type="button" onClick={save} disabled={isSaving || !preview.length} className="rounded-xl bg-[#C4622D] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving...' : mode === 'MANUAL' ? 'Save Manual Slots' : 'Generate Availability'}</button></div>
    </section>
  )
}

function Input({ label, icon, ...props }: { label: string; icon?: React.ReactNode; type: string; value: string; min?: string; onChange: (value: string) => void }) {
  return <label className="space-y-1"><span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#6B7A90]">{icon}{label}</span><input {...props} onChange={event => props.onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#C4622D]" /></label>
}

function Duration({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="space-y-1"><span className="text-[10px] font-black uppercase text-[#6B7A90]">Duration (minutes)</span><input type="number" min={5} max={240} step={5} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#C4622D]" /></label>
}

function generateSlots(schedules: Record<DayKey, DaySchedule>, startDate: string, endDate: string, duration: number): { slots: GeneratedSlot[]; error?: string } {
  if (!startDate || !endDate) return { slots: [], error: 'Select a start and end date.' }
  if (startDate < todayString()) return { slots: [], error: 'Start date cannot be in the past.' }
  if (endDate < startDate) return { slots: [], error: 'End date cannot be before start date.' }
  if (!Number.isInteger(duration) || duration < 5 || duration > 240) return { slots: [], error: 'Duration must be between 5 and 240 minutes.' }
  const enabled = days.filter(day => schedules[day.key].enabled)
  if (!enabled.length) return { slots: [], error: 'Enable at least one working day.' }

  for (const day of enabled) {
    const schedule = schedules[day.key]
    const start = minutesFromTime(schedule.startTime)
    const end = minutesFromTime(schedule.endTime)
    if (end <= start) return { slots: [], error: `${day.label}: end time must be after start time.` }
    if (schedule.breakStart || schedule.breakEnd) {
      if (!schedule.breakStart || !schedule.breakEnd) return { slots: [], error: `${day.label}: enter both break times or clear both.` }
      const breakStart = minutesFromTime(schedule.breakStart)
      const breakEnd = minutesFromTime(schedule.breakEnd)
      if (breakEnd <= breakStart || breakStart < start || breakEnd > end) return { slots: [], error: `${day.label}: break must be inside working hours.` }
    }
  }

  const slots: GeneratedSlot[] = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const finalDate = new Date(`${endDate}T00:00:00`)
  while (cursor <= finalDate) {
    const day = days.find(item => item.jsDay === cursor.getDay())
    if (day && schedules[day.key].enabled) {
      const schedule = schedules[day.key]
      const start = minutesFromTime(schedule.startTime)
      const end = minutesFromTime(schedule.endTime)
      const breakStart = schedule.breakStart ? minutesFromTime(schedule.breakStart) : null
      const breakEnd = schedule.breakEnd ? minutesFromTime(schedule.breakEnd) : null
      const date = dateInputValue(cursor)
      for (let minute = start; minute + duration <= end; minute += duration) {
        const overlapsBreak = breakStart !== null && breakEnd !== null && minute < breakEnd && minute + duration > breakStart
        const time = timeFromMinutes(minute)
        if (!overlapsBreak && !isPastSlot(date, time)) slots.push({ available_date: date, time_slot: time, end_time: timeFromMinutes(minute + duration), slot_duration: duration, source: 'GENERATED' })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return slots.length ? { slots } : { slots: [], error: 'No future slots match this schedule.' }
}
