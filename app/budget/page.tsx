import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import BudgetDashboard from "@/components/budget/BudgetDashboard";

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch user's budgets with related data
  const budgets = await prisma.budget.findMany({
    where: {
      userId: session.user.id,
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