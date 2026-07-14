import { gone } from '@/lib/gone'

export async function GET() {
  return gone('Pharmacy prescription queue has been retired. Use admin prescription fulfilment.')
}

export async function PATCH() {
  return gone('Pharmacy prescription queue has been retired. Use admin prescription fulfilment.')
}
