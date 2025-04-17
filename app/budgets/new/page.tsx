import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetForm from '@/components/budget/BudgetForm';

// Fetch categories and wallets for the user
async function getUserData() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
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
    categories: formattedCategories,
    wallets: formattedWallets,
  };
}

export default async function NewBudgetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/api/auth/signin');
  }
  
  const userData = await getUserData();
  
  if (!userData) {
    redirect('/api/auth/signin');
  }
  
  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Budget</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
          <CardDescription>
            Set up a budget to track your spending in specific categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetForm 
            userId={userData.userId}
            categories={userData.categories}
            wallets={userData.wallets}
          />
        </CardContent>
      </Card>
    </div>
  );
} 