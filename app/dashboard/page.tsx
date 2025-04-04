import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import DashboardContent from './DashboardContent'
import './styles.css'
import prisma from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch budgets for the user
  const budgets = await prisma.budget.findMany({
    where: {
      userId: session.user.id,
      endDate: {
        gte: new Date()
      }
    },
    include: {
      category: true,
      wallet: true,
    }
  });

  // Calculate spending for each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      // Get total spending for this budget's category in this wallet
      const spending = await prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          categoryId: budget.categoryId,
          walletId: budget.walletId,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
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
      };
    })
  );

  return <DashboardContent budgets={budgetsWithSpending} />
} 