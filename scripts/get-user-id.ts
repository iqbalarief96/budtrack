/**
 * Get user ID by email
 */

import prisma from '@/lib/prisma'

async function getUserId(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    console.log(`User not found: ${email}`)
    return
  }

  console.log(`User ID: ${user.id}`)
  console.log(`Name: ${user.name}`)
  console.log(`Email: ${user.email}`)
  
  return user.id
}

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: npx tsx scripts/get-user-id.ts <email>')
    process.exit(1)
  }

  try {
    await getUserId(email)
  } catch (error) {
    console.error('Failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
