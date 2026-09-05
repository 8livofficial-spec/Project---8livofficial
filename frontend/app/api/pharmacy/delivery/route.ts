import { gone } from '@/lib/gone'

export async function GET() {
  return gone('Direct pharmacy delivery endpoints have been retired. Order fulfillment is managed via /api/pharmacy/orders.')
}

export async function PATCH() {
  return gone('Direct pharmacy delivery endpoints have been retired. Order fulfillment is managed via /api/pharmacy/orders.')
}

export async function POST() {
  return gone('Direct pharmacy delivery endpoints have been retired. Order fulfillment is managed via /api/pharmacy/orders.')
}
