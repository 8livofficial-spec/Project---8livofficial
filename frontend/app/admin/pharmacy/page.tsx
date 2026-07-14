import { redirect } from 'next/navigation'

export default function AdminPharmacyRedirectPage() {
  redirect('/admin/pharmacy-orders')
}
