import { existsSync } from 'fs'
import path from 'path'
import { loadEnvConfig } from '@next/env'

export type StreamConfig = {
  apiKey: string
  secret: string
  defaultCallType: string
}

let envLoaded = false

function ensureStreamEnvLoaded() {
  if (envLoaded) return

  envLoaded = true
  const cwd = process.cwd()
  const candidates = [cwd, path.join(cwd, 'frontend')]

  for (const projectDir of candidates) {
    if (existsSync(path.join(projectDir, '.env.local'))) {
      loadEnvConfig(projectDir)
      return
    }
  }
}

export function getStreamConfig(): StreamConfig {
  ensureStreamEnvLoaded()

  const apiKey = process.env.STREAM_API_KEY || process.env.NEXT_PUBLIC_STREAM_API_KEY || ''
  const secret = process.env.STREAM_SECRET || process.env.STREAM_SECRET_KEY || ''
  const defaultCallType = process.env.STREAM_CALL_TYPE || 'default'

  if (!apiKey) {
    throw new Error('STREAM_API_KEY is not configured.')
  }
  if (!secret) {
    throw new Error('STREAM_SECRET is not configured.')
  }

  return { apiKey, secret, defaultCallType }
}

export function getPublicStreamApiKey() {
  ensureStreamEnvLoaded()

  return process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY || ''
}
