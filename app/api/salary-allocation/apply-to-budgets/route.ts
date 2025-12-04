import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { budgetMapperService } from '@/lib/allocation/budget-mapper-service';
import type { ApplyToBudgetsRequest, SalaryAllocationConfig, AllocationTemplateType } from '@/app/types/allocation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ApplyToBudgetsRequest = await request.json();
    const { configId, walletId, categoryMappings } = body;

    // Validate required fields
    if (!configId || !walletId || !categoryMappings) {
      return NextResponse.json(
        { error: 'configId, walletId, dan categoryMappings diperlukan' },
        { status: 400 }
      );
    }

    // Fetch the config
    const config = await prisma.salaryAllocationConfig.findFirst({
      where: {
        id: configId,
        userId: session.user.id,
      },
      include: { items: true },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet tidak ditemukan' },
        { status: 404 }
      );
    }

    // Convert to typed config
    const typedConfig: SalaryAllocationConfig = {
      ...config,
      templateType: config.templateType as AllocationTemplateType,
      items: config.items.map((item) => ({
        ...item,
        categoryType: item.categoryType as 'needs' | 'wants' | 'savings',
      })),
    };

    // Validate mappings
    const mappingValidation = budgetMapperService.validateMappings(typedConfig, categoryMappings);
    if (!mappingValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Beberapa kategori belum dipetakan',
          unmappedCategories: mappingValidation.unmappedCategories,
        },
        { status: 400 }
      );
    }

    // Create budgets
    const createdBudgets = await budgetMapperService.createBudgetsFromAllocation(
      typedConfig,
      walletId,
      categoryMappings,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `${createdBudgets.length} budget berhasil dibuat`,
      budgets: createdBudgets,
    });
  } catch (error) {
    console.error('Error applying allocation to budgets:', error);
    return NextResponse.json(
      { error: 'Gagal membuat budget dari alokasi' },
      { status: 500 }
    );
  }
}
