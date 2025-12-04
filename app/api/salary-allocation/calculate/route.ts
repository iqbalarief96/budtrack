import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allocationService } from '@/lib/allocation/allocation-service';
import { templateService } from '@/lib/allocation/template-service';
import type { CalculateAllocationRequest, CalculateAllocationResponse } from '@/app/types/allocation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CalculateAllocationRequest = await request.json();
    const { monthlyIncome, templateType, customItems } = body;

    // Validate income
    const incomeValidation = allocationService.validateIncome(monthlyIncome);
    if (!incomeValidation.isValid) {
      return NextResponse.json(
        { error: incomeValidation.error },
        { status: 400 }
      );
    }

    // Validate template type
    if (!templateService.isValidTemplateType(templateType)) {
      return NextResponse.json(
        { error: 'Template type tidak valid' },
        { status: 400 }
      );
    }

    // Get allocation items based on template or custom
    let items: { categoryName: string; categoryType: 'needs' | 'wants' | 'savings'; percentage: number; icon?: string; color?: string }[];
    if (templateType === 'custom' && customItems) {
      items = customItems;
    } else {
      const templateCategories = templateService.getTemplateCategories(templateType);
      items = templateCategories.map(cat => ({
        categoryName: cat.name,
        categoryType: cat.type,
        percentage: cat.percentage,
        icon: cat.icon,
        color: cat.color,
      }));
    }

    // Validate percentages
    const percentageValidation = allocationService.validatePercentages(items);
    if (!percentageValidation.isValid) {
      return NextResponse.json(
        { error: percentageValidation.error },
        { status: 400 }
      );
    }

    // Calculate allocation
    const results = allocationService.calculateAllocation(monthlyIncome, items);

    const response: CalculateAllocationResponse = {
      results,
      totalAllocated: percentageValidation.totalPercentage,
      unallocatedPercentage: percentageValidation.unallocatedPercentage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating allocation:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghitung alokasi' },
      { status: 500 }
    );
  }
}
