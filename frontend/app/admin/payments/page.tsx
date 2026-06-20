import { redirect } from 'next/navigation';

export default function AdminPaymentsRoute() {
  redirect('/admin?tab=payments');
}
