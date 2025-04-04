import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import BudgetDashboard from "@/components/budget/BudgetDashboard";
import type { Budget } from "@/app/types/budget";
import type { Category } from "@/app/types/category";
import type { Wallet } from "@/app/types/wallet";

type BudgetWithRelations = Budget & {
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
    budgets.map(async (budget: Budget & { category: Category; wallet: Wallet }) => {
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
      } as BudgetWithRelations;
    })
  );

  return budgetsWithSpending;
}

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
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
  });

  // Fetch wallets for budget creation
  const wallets = await prisma.wallet.findMany({
    where: {
      userId: session.user.id
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Budget Planning</h1>
      <BudgetDashboard 
        initialBudgets={budgets}
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
} 