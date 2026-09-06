import { redirect } from 'next/navigation'

export default function DoctorProfilePage() {
  redirect('/doctor/dashboard?tab=profile')
}
