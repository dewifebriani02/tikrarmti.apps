/**
 * Environment Variable Validation
 *
 * Runtime validation for required environment variables.
 * Fails fast on startup if critical variables are missing.
 *
 * Usage:
 * import { validateEnv } from '@/lib/env'
 * validateEnv()
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
}

const envVars: EnvVar[] = [
  // Auth
  { name: 'AUTH_SECRET', required: true, description: 'JWT signing secret for sessions (min 32 chars)' },

  // Application
  { name: 'OWNER_EMAIL', required: false, description: 'Owner email for super-admin access' },

  // Optional: Email
  { name: 'RESEND_API_KEY', required: false, description: 'Resend API key for emails' },
  { name: 'EMAIL_FROM', required: false, description: 'Sender address for emails, e.g. "MTI <noreply@markaztikrar.id>"' },

  // Optional: reCAPTCHA
  { name: 'RECAPTCHA_SECRET_KEY', required: false, description: 'reCAPTCHA secret key' },
  { name: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY', required: false, description: 'reCAPTCHA site key' },

  // Optional: Sentry
  { name: 'NEXT_PUBLIC_SENTRY_DSN', required: false, description: 'Sentry DSN for error tracking' },
  { name: 'SENTRY_AUTH_TOKEN', required: false, description: 'Sentry auth token' },
  { name: 'NEXT_PUBLIC_APP_VERSION', required: false, description: 'App version for Sentry releases' },

  // Optional: Analytics
  { name: 'NEXT_PUBLIC_GA_ID', required: false, description: 'Google Analytics ID' },
]

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const missing: string[] = []
  const present: string[] = []

  for (const envVar of envVars) {
    const value = process.env[envVar.name]

    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(envVar.name)
      }
    } else {
      present.push(`[OK] ${envVar.name}`)
    }
  }

  // Log warnings for missing required variables
  if (missing.length > 0) {
    console.error('\n[ERROR] MISSING REQUIRED ENVIRONMENT VARIABLES:')
    missing.forEach(name => {
      const env = envVars.find(e => e.name === name)
      console.error(`   - ${name}: ${env?.description}`)
    })
    console.error('\nPlease check your .env.local file.\n')
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    console.log('\n[CONFIG] Environment Configuration:')
    present.forEach(log => console.log(`   ${log}`))
    console.log(`\n   [OK] Node environment: ${process.env.NODE_ENV}`)
    console.log(`\n`)
  }
}

/**
 * Get validated environment variable
 */
export function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

/**
 * Get owner email(s) for super-admin access
 * Returns array of emails or empty array if not configured
 */
export function getOwnerEmails(): string[] {
  const emails = process.env.OWNER_EMAIL || ''
  if (!emails.trim()) return []
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

// Auto-validate on import
if (typeof window === 'undefined') {
  // Only validate on server side
  validateEnv()
}
