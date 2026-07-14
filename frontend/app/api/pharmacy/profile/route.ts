import { gone } from '@/lib/gone'

export async function GET() {
  return gone('Pharmacy profiles no longer have active portal access.')
}
