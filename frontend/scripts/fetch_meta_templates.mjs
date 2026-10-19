import https from 'https'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
const token = process.env.WHATSAPP_ACCESS_TOKEN
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0'

console.log('Fetching templates for WABA:', wabaId, 'API Version:', apiVersion)

if (!wabaId || !token) {
  console.error('Missing WHATSAPP_BUSINESS_ACCOUNT_ID or WHATSAPP_ACCESS_TOKEN')
  process.exit(1)
}

const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?limit=100`

const req = https.get(
  url,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': '8LIV-Health-Audit/1.0',
    },
    timeout: 15000,
  },
  (res) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      try {
        const json = JSON.parse(data)
        if (res.statusCode !== 200) {
          console.error(`Meta API Error (${res.statusCode}):`, JSON.stringify(json, null, 2))
          process.exit(1)
        }
        console.log('STATUS:', res.statusCode)
        console.log(JSON.stringify(json, null, 2))
      } catch (err) {
        console.error('Failed to parse response:', data)
      }
    })
  }
)

req.on('error', (err) => {
  console.error('Request error:', err)
})
