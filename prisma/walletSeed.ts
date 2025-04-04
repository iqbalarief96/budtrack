import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first user to associate wallets with
  const user = await prisma.user.findFirst()
  
  if (!user) {
    console.error('No user found. Please register a user first.')
    return
  }

  // Sample wallets
  const wallets = [
    { 
      name: 'Dompet BCA',
      balance: 5000000,
      currencyCode: 'IDR',
      icon: 'FiCreditCard',
      color: '#2196F3',
      isDefault: false
    },
    { 
      name: 'Dompet Mandiri',
      balance: 2500000,
      currencyCode: 'IDR',
      icon: 'FiCreditCard',
      color: '#4CAF50',
      isDefault: false
    },
    { 
      name: 'Dompet Dana',
      balance: 1000000,
      currencyCode: 'IDR',
      icon: 'FiSmartphone',
      color: '#3F51B5',
      isDefault: false
    },
    { 
      name: 'Dompet OVO',
      balance: 750000,
      currencyCode: 'IDR',
      icon: 'FiSmartphone',
      color: '#9C27B0',
      isDefault: false
    },
    { 
      name: 'Dompet GoPay',
      balance: 500000,
      currencyCode: 'IDR',
      icon: 'FiSmartphone',
      color: '#009688',
      isDefault: false
    },
    { 
      name: 'Dompet Tunai',
      balance: 1500000,
      currencyCode: 'IDR',
      icon: 'FiDollarSign',
      color: '#FF9800',
      isDefault: false
    }
  ]

  // Count existing wallets
  const existingCount = await prisma.wallet.count({
    where: {
      userId: user.id
    }
  })

  console.log(`Found ${existingCount} existing wallets for user ${user.name}`)

  // Add wallets
  let addedCount = 0
  for (const wallet of wallets) {
    try {
      // Check if wallet already exists
      const existing = await prisma.wallet.findFirst({
        where: {
          name: wallet.name,
          userId: user.id
        }
      })

      if (!existing) {
        await prisma.wallet.create({
          data: {
            name: wallet.name,
            balance: wallet.balance,
            currencyCode: wallet.currencyCode,
            icon: wallet.icon,
            color: wallet.color,
            isDefault: wallet.isDefault,
            userId: user.id
          }
        })
        addedCount++
      }
    } catch (error) {
      console.error(`Error adding wallet ${wallet.name}:`, error)
    }
  }

  console.log(`Added ${addedCount} new wallets for user ${user.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 