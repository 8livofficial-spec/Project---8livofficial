import { gone } from '@/lib/gone'

export async function GET() {
  return gone('Standalone pharmacy order APIs have been retired. Use admin Apollo fulfilment.')
}

export async function PATCH() {
  return gone('Standalone pharmacy order APIs have been retired. Use admin Apollo fulfilment.')
}
