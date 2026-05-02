import { neon, neonConfig } from '@neondatabase/serverless'

// Reuse HTTP connections across invocations in serverless environments
neonConfig.fetchConnectionCache = true

let client: ReturnType<typeof neon>

export function getClient() {
  if (!process.env.DATABASE_URL) {
    return undefined
  }
  if (!client) {
    client = neon(process.env.DATABASE_URL!)
  }
  return client
}
