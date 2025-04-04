import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first user to associate categories with
  const user = await prisma.user.findFirst()
  
  if (!user) {
    console.error('No user found. Please register a user first.')
    return
  }

  // Extended categories list
  const extendedCategories = [
    // Expense Categories
    { name: 'Makanan', type: 'EXPENSE', color: '#F44336', icon: 'FiCoffee' },
    { name: 'Transportasi', type: 'EXPENSE', color: '#FF9800', icon: 'FiTruck' },
    { name: 'Hiburan', type: 'EXPENSE', color: '#9C27B0', icon: 'FiFilm' },
    { name: 'Belanja', type: 'EXPENSE', color: '#4CAF50', icon: 'FiShoppingBag' },
    { name: 'Tagihan', type: 'EXPENSE', color: '#2196F3', icon: 'FiFileText' },
    { name: 'Kebutuhan', type: 'EXPENSE', color: '#607D8B', icon: 'FiHome' },
    { name: 'Pendidikan', type: 'EXPENSE', color: '#795548', icon: 'FiBook' },
    { name: 'Kesehatan', type: 'EXPENSE', color: '#E91E63', icon: 'FiActivity' },
    { name: 'Olahraga', type: 'EXPENSE', color: '#00BCD4', icon: 'FiActivity' },
    { name: 'Keluarga', type: 'EXPENSE', color: '#8BC34A', icon: 'FiUsers' },
    { name: 'Asuransi', type: 'EXPENSE', color: '#3F51B5', icon: 'FiShield' },
    { name: 'Donasi', type: 'EXPENSE', color: '#FF5722', icon: 'FiHeart' },
    { name: 'Tabungan', type: 'EXPENSE', color: '#673AB7', icon: 'FiSave' },
    { name: 'Investasi', type: 'EXPENSE', color: '#009688', icon: 'FiTrendingUp' },
    { name: 'Pakaian', type: 'EXPENSE', color: '#9E9E9E', icon: 'FiShoppingCart' },
    { name: 'Teknologi', type: 'EXPENSE', color: '#212121', icon: 'FiSmartphone' },
    { name: 'Hobi', type: 'EXPENSE', color: '#FFC107', icon: 'FiCamera' },
    { name: 'Hewan Peliharaan', type: 'EXPENSE', color: '#CDDC39', icon: 'FiHeart' },
    { name: 'Pajak', type: 'EXPENSE', color: '#F44336', icon: 'FiDollarSign' },
    { name: 'Perjalanan', type: 'EXPENSE', color: '#00BCD4', icon: 'FiMap' },
    { name: 'Kecantikan', type: 'EXPENSE', color: '#FF4081', icon: 'FiStar' },
    { name: 'Anak', type: 'EXPENSE', color: '#4FC3F7', icon: 'FiUsers' },
    { name: 'Langganan', type: 'EXPENSE', color: '#7E57C2', icon: 'FiRepeat' },
    { name: 'Lain-lain', type: 'EXPENSE', color: '#757575', icon: 'FiMoreHorizontal' },
    
    // Income Categories
    { name: 'Gaji', type: 'INCOME', color: '#4CAF50', icon: 'FiDollarSign' },
    { name: 'Bonus', type: 'INCOME', color: '#8BC34A', icon: 'FiPlus' },
    { name: 'Hadiah', type: 'INCOME', color: '#CDDC39', icon: 'FiGift' },
    { name: 'Pendapatan Lain', type: 'INCOME', color: '#009688', icon: 'FiZap' },
    { name: 'Investasi', type: 'INCOME', color: '#673AB7', icon: 'FiTrendingUp' },
    { name: 'Penjualan', type: 'INCOME', color: '#FF9800', icon: 'FiShoppingCart' },
    { name: 'Dividen', type: 'INCOME', color: '#3F51B5', icon: 'FiDollarSign' },
    { name: 'Bunga', type: 'INCOME', color: '#00BCD4', icon: 'FiPercent' },
    { name: 'Bisnis', type: 'INCOME', color: '#795548', icon: 'FiBriefcase' },
    { name: 'Freelance', type: 'INCOME', color: '#4DB6AC', icon: 'FiCode' },
    { name: 'Pengembalian Dana', type: 'INCOME', color: '#FFA726', icon: 'FiRefreshCw' },
    { name: 'Sewa', type: 'INCOME', color: '#26A69A', icon: 'FiHome' },
    { name: 'Royalti', type: 'INCOME', color: '#7E57C2', icon: 'FiFileText' },
  ]

  // Count existing categories
  const existingCount = await prisma.category.count({
    where: {
      userId: user.id
    }
  })

  console.log(`Found ${existingCount} existing categories for user ${user.name}`)

  // Add categories
  let addedCount = 0
  for (const category of extendedCategories) {
    try {
      // Check if category already exists
      const existing = await prisma.category.findFirst({
        where: {
          name: category.name,
          userId: user.id
        }
      })

      if (!existing) {
        await prisma.category.create({
          data: {
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon,
            isDefault: false,
            userId: user.id
          }
        })
        addedCount++
      }
    } catch (error) {
      console.error(`Error adding category ${category.name}:`, error)
    }
  }

  console.log(`Added ${addedCount} new categories for user ${user.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 