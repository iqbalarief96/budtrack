/**
 * Environment Variable Validation
 * Validates required environment variables on app startup
 */

// Required environment variables
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'DATABASE_URL',
] as const

// Validate each required variable
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Optional but recommended
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not set - AI features will not work')
}

// Export validated environment variables
export const env = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET as string,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  EMAIL_SERVER: process.env.EMAIL_SERVER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
} as const

console.log('✅ Environment variables validated')
