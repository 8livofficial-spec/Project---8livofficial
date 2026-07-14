import { supabaseAdmin } from './supabaseServer'
import { getAuthenticatedUser } from './apiSecurity'

export type AuthenticatedActor = {
  user: { id: string; email?: string | null }
  role: string
}

export async function assertAuthenticatedUser(request: Request): Promise<AuthenticatedActor> {
  const auth = await getAuthenticatedUser(request)
  if (!auth) throw new Error('Unauthorized')
  return { user: auth.user, role: String(auth.role || '').toLowerCase() }
}

export async function assertAdmin(request: Request): Promise<AuthenticatedActor> {
  const auth = await assertAuthenticatedUser(request)
  if (auth.role !== 'admin') throw new Error('Forbidden')
  return auth
}

export async function assertDoctor(request: Request): Promise<AuthenticatedActor> {
  const auth = await assertAuthenticatedUser(request)
  if (auth.role !== 'doctor') throw new Error('Forbidden')
  return auth
}

export async function assertPatient(request: Request): Promise<AuthenticatedActor> {
  const auth = await assertAuthenticatedUser(request)
  if (auth.role !== 'patient') throw new Error('Forbidden')
  return auth
}

export async function assertConsultationDoctorOwnership(consultationId: string, doctorId: string) {
  const { data, error } = await supabaseAdmin
    .from('doctor_consultations')
    .select('id, patient_id, doctor_id, status, booking_date, booking_time, appointment_type')
    .eq('id', consultationId)
    .eq('doctor_id', doctorId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Consultation not found for this doctor.')
  return data
}

export async function assertPrescriptionOwnership(prescriptionId: string, doctorId: string) {
  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .eq('id', prescriptionId)
    .eq('doctor_id', doctorId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Prescription not found for this doctor.')
  return data
}

export async function assertPatientPrescriptionOwnership(prescriptionId: string, patientId: string) {
  const { data, error } = await supabaseAdmin
    .from('prescriptions')
    .select('*, prescription_items(*), pharmacy_orders(*)')
    .eq('id', prescriptionId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Prescription not found.')
  return data
}

export async function assertPatientOrderOwnership(orderId: string, patientId: string) {
  const { data, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('*, prescriptions(*, prescription_items(*)), pharmacy_order_status_history(*)')
    .eq('id', orderId)
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Medicine order not found.')
  return data
}

export async function assertAdminFulfilmentAccess(orderId?: string) {
  if (!orderId) return null
  const { data, error } = await supabaseAdmin
    .from('pharmacy_orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Medicine order not found.')
  return data
}

export function errorResponse(message: string) {
  if (message === 'Unauthorized') return { error: message, status: 401 }
  if (message === 'Forbidden') return { error: message, status: 403 }
  if (message.toLowerCase().includes('not found')) return { error: message, status: 404 }
  if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required')) return { error: message, status: 400 }
  if (message.toLowerCase().includes('immutable') || message.toLowerCase().includes('already')) return { error: message, status: 409 }
  return { error: message || 'Internal Server Error', status: 500 }
}
