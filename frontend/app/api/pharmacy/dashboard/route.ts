import { gone } from '@/lib/gone'

export async function GET() {
  return gone('Standalone pharmacy portal APIs have been retired. Use admin prescription fulfilment.')
}
