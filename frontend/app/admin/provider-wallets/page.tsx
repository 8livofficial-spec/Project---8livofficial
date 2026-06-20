import { redirect } from 'next/navigation';

export default function AdminProviderWalletsRoute() {
  redirect('/admin?tab=provider-wallets');
}
