import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import BudgetDashboard from "@/components/budget/BudgetDashboard";

// Define proper types if not imported
interface Budget {
  id: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  walletId: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface Wallet {
  id: string;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface BudgetWithRelations extends Budget {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

async function getBudgets(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId: userId,
      endDate: {
        gte: new Date() // Only active budgets
      }
    },
    include: {
      category: true,
      wallet: true
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  // Calculate spending for each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId: userId,
          categoryId: budget.categoryId,
          walletId: budget.walletId,
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          },
          type: "EXPENSE"
        },
        _sum: {
          amount: true
        }
      });

      const spent = spending._sum.amount || 0;
      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget,
        spent,
        percentage
      } as unknown as BudgetWithRelations;
    })
  );

  return budgetsWithSpending;
}

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch budgets with spending calculations
  const budgets = await getBudgets(session.user.id);

  // Fetch categories for budget creation
  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { type: "EXPENSE" },
        { type: "BOTH" }
      ]
    }
  }) as unknown as Category[];

  // Fetch wallets for budget creation
  const wallets = await prisma.wallet.findMany({
    where: {
      userId: session.user.id
    }
  }) as unknown as Wallet[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Budget Planning</h1>
      </div>

      <BudgetDashboard 
        initialBudgets={budgets}
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
} 