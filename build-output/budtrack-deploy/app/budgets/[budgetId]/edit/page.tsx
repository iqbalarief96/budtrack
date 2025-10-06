import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetForm from '@/components/budget/BudgetForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Fetch budget dan user data
async function getBudgetData(budgetId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  // Get budget data
  const budget = await prisma.budget.findUnique({
    where: {
      id: budgetId,
    },
  });
  
  if (!budget || budget.userId !== session.user.id) {
    return null;
  }

  // Get categories and wallets
  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      name: 'asc',
    },
  });
  
  const wallets = await prisma.wallet.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      name: 'asc',
    },
  });
  
  // Transform categories and wallets to match expected types
  const formattedCategories = categories.map(category => ({
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color || undefined,
    icon: category.icon || undefined,
  }));
  
  const formattedWallets = wallets.map(wallet => ({
    id: wallet.id,
    name: wallet.name,
    balance: wallet.balance,
    isDefault: wallet.isDefault || undefined,
  }));
  
  return {
    userId: session.user.id,
    budget,
    categories: formattedCategories,
    wallets: formattedWallets,
  };
}

export default async function EditBudgetPage({ params }: { params: { budgetId: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/api/auth/signin');
  }
  
  const data = await getBudgetData(params.budgetId);
  
  if (!data || !data.budget) {
    notFound();
  }
  
  // Format budget data for the form
  const initialData = {
    id: data.budget.id,
    amount: data.budget.amount,
    categoryId: data.budget.categoryId,
    walletId: data.budget.walletId,
    startDate: data.budget.startDate,
    endDate: data.budget.endDate,
  };
  
  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-4">
        <Link href={`/budgets/${params.budgetId}`} className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Kembali ke Detail Anggaran</span>
        </Link>
      </div>
    
      <h1 className="text-3xl font-bold mb-6">Edit Budget</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
          <CardDescription>
            Update your budget details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm 
            userId={data.userId}
            categories={data.categories}
            wallets={data.wallets}
            initialData={initialData}
            isEditing={true}
          />
        </CardContent>
      </Card>
    </div>
  );
} 