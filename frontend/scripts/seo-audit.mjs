import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appDir = path.join(root, 'app')

const requiredFiles = [
  'app/robots.ts',
  'app/sitemap.ts',
  'app/page.tsx',
  'app/layout.tsx',
  'app/manifest.ts',
  'lib/seo/site.ts',
]

const privatePrefixes = [
  '/admin',
  '/api',
  '/patient',
  '/provider',
  '/doctor',
  '/pharmacy',
  '/video',
  '/messages',
  '/wallet',
  '/payouts',
  '/documents',
]

function fail(message) {
  console.error(`SEO audit failed: ${message}`)
  process.exitCode = 1
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`missing ${file}`)
  }
}

const robotsPath = path.join(appDir, 'robots.ts')
const sitemapPath = path.join(appDir, 'sitemap.ts')
const layoutPath = path.join(appDir, 'layout.tsx')
const proxyPath = path.join(root, 'proxy.ts')

const robots = fs.readFileSync(robotsPath, 'utf8')
const sitemap = fs.readFileSync(sitemapPath, 'utf8')
const layout = fs.readFileSync(layoutPath, 'utf8')
const proxy = fs.readFileSync(proxyPath, 'utf8')
const siteConfig = fs.readFileSync(path.join(root, 'lib/seo/site.ts'), 'utf8')
const manifest = fs.readFileSync(path.join(appDir, 'manifest.ts'), 'utf8')

for (const prefix of privatePrefixes) {
  if (!siteConfig.includes(`'${prefix}'`)) {
    fail(`site config does not reference private prefix ${prefix}`)
  }
}

if (!robots.includes('privateRoutePrefixes')) {
  fail('robots.ts does not consume privateRoutePrefixes from site config')
}

for (const forbidden of ['/admin', '/api', '/patient', '/provider', '/doctor', '/pharmacy']) {
  if (sitemap.includes(`'${forbidden}`) || sitemap.includes(`"${forbidden}`)) {
    fail(`sitemap.ts appears to include private route ${forbidden}`)
  }
}

for (const required of ['metadataBase', 'openGraph', 'twitter', 'verification']) {
  if (!layout.includes(required)) {
    fail(`root metadata missing ${required}`)
  }
}

for (const required of ['https://8liv.in', "'8liv.in'", 'alternateNames']) {
  if (!siteConfig.includes(required)) {
    fail(`site config missing brand/canonical signal ${required}`)
  }
}

if (siteConfig.includes('www.8liv.com')) {
  fail('site config still references the old 8liv.com canonical fallback')
}

for (const required of ['name', 'short_name', 'description', 'start_url', 'theme_color']) {
  if (!manifest.includes(required)) {
    fail(`manifest missing ${required}`)
  }
}

for (const required of ['X-Robots-Tag', 'Cache-Control', 'noindex']) {
  if (!proxy.includes(required)) {
    fail(`proxy missing private SEO header guard ${required}`)
  }
}

if (!process.exitCode) {
  console.log('SEO audit passed')
}
