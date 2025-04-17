import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting minimal seeding...');

    // Create a basic user
    const user = await prisma.user.create({
      data: {
        name: 'Demo User',
        email: 'demo@example.com',
        // No password as it would need hashing
      },
    });

    console.log('Created user with ID:', user.id);
    
    // Create a simple wallet
    const wallet = await prisma.wallet.create({
      data: {
        name: 'Main Wallet',
        balance: 5000000,
        currencyCode: 'IDR',
        isDefault: true,
        userId: user.id,
      },
    });
    
    console.log('Created wallet with ID:', wallet.id);

    console.log('Minimal seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 