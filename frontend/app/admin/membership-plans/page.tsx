import { redirect } from 'next/navigation';

export default function AdminMembershipPlansRoute() {
  redirect('/admin?tab=memberships');
}
