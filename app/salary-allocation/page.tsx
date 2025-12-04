import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import SalaryAllocationDashboard from '@/components/allocation/SalaryAllocationDashboard';

export default async function SalaryAllocationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // Fetch user's saved configs
  const configs = await prisma.salaryAllocationConfig.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch user's expense categories for mapping
  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      OR: [{ type: 'EXPENSE' }, { type: 'BOTH' }],
    },
    orderBy: { name: 'asc' },
  });

  // Fetch user's wallets
  const wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Alokasi Gaji</h1>
        <p className="text-gray-600 mt-2">
          Rencanakan pembagian gaji bulanan ke berbagai kategori pengeluaran
        </p>
      </div>

      <SalaryAllocationDashboard
        initialConfigs={configs}
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
}
