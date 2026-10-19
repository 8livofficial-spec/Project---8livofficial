import https from 'https'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
const token = process.env.WHATSAPP_ACCESS_TOKEN
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0'

async function get(path) {
  return new Promise((resolve, reject) => {
    https.get(
      `https://graph.facebook.com/${apiVersion}/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': '8LIV-Health/1.0',
        },
      },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) })
          } catch (e) {
            resolve({ status: res.statusCode, raw: d })
          }
        })
      }
    ).on('error', reject)
  })
}

async function main() {
  console.log('--- Inspecting Phone Number ID ---')
  const phoneRes = await get(`${phoneId}?fields=verified_name,display_phone_number,code_verification_status,quality_rating,whatsapp_business_account`)
  console.log('Phone Result:', JSON.stringify(phoneRes, null, 2))

  console.log('\n--- Inspecting User / System User & Businesses ---')
  const meRes = await get('me?fields=id,name')
  console.log('Me Result:', JSON.stringify(meRes, null, 2))

  const bizRes = await get('me/businesses')
  console.log('Businesses Result:', JSON.stringify(bizRes, null, 2))

  // If there are businesses, check client_whatsapp_business_accounts or owned_whatsapp_business_accounts
  if (bizRes?.data?.data) {
    for (const b of bizRes.data.data) {
      console.log(`\n--- Inspecting WABAs for Business ${b.id} (${b.name}) ---`)
      const ownedWabas = await get(`${b.id}/owned_whatsapp_business_accounts`)
      console.log('Owned WABAs:', JSON.stringify(ownedWabas, null, 2))

      const clientWabas = await get(`${b.id}/client_whatsapp_business_accounts`)
      console.log('Client WABAs:', JSON.stringify(clientWabas, null, 2))
    }
  }

  // Also check if there's any template endpoint with filtering
  const allTemplates = await get(`${wabaId}/message_templates?limit=250`)
  console.log('\nTotal templates returned count:', allTemplates.data?.data?.length)
}

main().catch(console.error)
