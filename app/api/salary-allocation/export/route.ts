import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { allocationSerializer } from '@/lib/allocation/allocation-serializer';
import type { SalaryAllocationConfig, AllocationTemplateType } from '@/app/types/allocation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await request.json();

    if (!configId) {
      return NextResponse.json(
        { error: 'Config ID diperlukan' },
        { status: 400 }
      );
    }

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

    // Convert to proper type and serialize
    const typedConfig: SalaryAllocationConfig = {
      ...config,
      templateType: config.templateType as AllocationTemplateType,
      items: config.items.map((item: { id: string; configId: string; categoryName: string; categoryType: string; percentage: number; amount: number; mappedCategoryId: string | null; icon: string | null; color: string | null; createdAt: Date; updatedAt: Date }) => ({
        ...item,
        categoryType: item.categoryType as 'needs' | 'wants' | 'savings',
      })),
    };

    const json = allocationSerializer.serialize(typedConfig);

    return NextResponse.json({ json, filename: `${config.name.replace(/\s+/g, '-')}-allocation.json` });
  } catch (error) {
    console.error('Error exporting config:', error);
    return NextResponse.json(
      { error: 'Gagal mengekspor konfigurasi' },
      { status: 500 }
    );
  }
}
