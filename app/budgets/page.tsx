import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import BudgetPageClient from "@/components/budget/BudgetPageClient";
import { checkAndResetBudgets } from "@/lib/budgetReset";
import { calculateBudgetDetails } from "@/lib/budgetCalculations";
import type { Budget } from "@/app/types/budget";
import type { Category } from "@/app/types/category";
import type { Wallet } from "@/app/types/wallet";

interface BudgetWithRelations extends Budget {
  category: Category;
  wallet: Wallet;
  spent: number;
  percentage: number;
}

async function getBudgets(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const budgets = await prisma.budget.findMany({
    where: {
      userId: userId,
      endDate: {
        gte: today // Only active budgets, including budgets ending today
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
      const { spent, percentage } = await calculateBudgetDetails({
        id: budget.id,
        userId,
        walletId: budget.walletId,
        categoryId: budget.categoryId,
        amount: budget.amount,
        startDate: budget.startDate,
        endDate: budget.endDate,
      });

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
  await checkAndResetBudgets();
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

      <BudgetPageClient 
        initialBudgets={budgets}
        categories={categories}
        wallets={wallets}
      />
    </div>
  );
} 