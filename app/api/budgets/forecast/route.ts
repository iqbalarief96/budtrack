import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllBudgetForecasts, calculateBudgetForecast } from '@/lib/budget-forecast';

export const dynamic = 'force-dynamic';

// GET /api/budgets/forecast - Get forecasts for all budgets or specific budget
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');

    if (budgetId) {
      // Get forecast for specific budget
      const forecast = await calculateBudgetForecast(session.user.id, budgetId);
      
      if (!forecast) {
        return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
      }

      return NextResponse.json(forecast);
    } else {
      // Get forecasts for all active budgets
      const forecasts = await getAllBudgetForecasts(session.user.id);
      return NextResponse.json(forecasts);
    }
  } catch (error) {
    console.error('Error calculating budget forecast:', error);
    return NextResponse.json(
      { error: 'Failed to calculate budget forecast' },
      { status: 500 }
    );
  }
}
