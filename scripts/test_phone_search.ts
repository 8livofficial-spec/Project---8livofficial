import { supabaseAdmin } from '../frontend/lib/supabaseServer'

async function testSearch(rawQuery: string) {
  console.log('\n--- Testing with query:', JSON.stringify(rawQuery))
  
  // 1. Clean query
  const trimmed = rawQuery.trim()
  const digitsOnly = trimmed.replace(/\D/g, '')
  const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly

  console.log('Digits only:', digitsOnly, 'Last 10:', last10)

  // Build OR conditions
  const orConditions: string[] = []
  
  // Text conditions
  const cleanText = trimmed.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (cleanText) {
    orConditions.push(`first_name.ilike.%${cleanText}%`)
    orConditions.push(`last_name.ilike.%${cleanText}%`)
    orConditions.push(`email.ilike.%${cleanText}%`)
  }

  // Phone conditions
  if (last10 && last10.length >= 5) {
    orConditions.push(`phone_number.ilike.%${last10}%`)
  }
  if (digitsOnly && digitsOnly.length >= 5 && digitsOnly !== last10) {
    orConditions.push(`phone_number.ilike.%${digitsOnly}%`)
  }

  const orFilter = orConditions.join(',')
  console.log('PostgREST OR filter:', orFilter)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone_number, email')
    .or(orFilter)

  console.log('Result count:', data?.length, 'Error:', error)
  if (data?.length) {
    console.log('Matches:', data.map(d => ({ name: `${d.first_name} ${d.last_name}`, phone: d.phone_number })))
  }
}

async function run() {
  await testSearch('+91 8220470829')
  await testSearch('+918220470829')
  await testSearch(' 91 8220470829')
  await testSearch('8220470829')
}

run()

