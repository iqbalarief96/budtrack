const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const allCategories = await prisma.category.findMany();
  console.log("📦 Kategori yang tersedia di Budtrack:");
  allCategories.forEach((cat) => {
    console.log(`🟢 ${cat.name} → ${cat.id}`);
  });
  await prisma.$disconnect();
})();
