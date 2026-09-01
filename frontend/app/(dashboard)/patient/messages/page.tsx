import { redirect } from 'next/navigation'

// Messages feature is not available. Redirect to the patient overview.
export default function MessagesPage() {
  redirect('/patient')
}
