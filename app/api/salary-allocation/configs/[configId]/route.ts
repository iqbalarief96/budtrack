import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { allocationService } from '@/lib/allocation/allocation-service';
import type { SaveConfigRequest } from '@/app/types/allocation';

interface RouteParams {
  params: Promise<{ configId: string }>;
}

// GET - Get single config
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await params;

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

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi' },
      { status: 500 }
    );
  }
}

// PUT - Update config
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await params;
    const body: SaveConfigRequest = await request.json();
    const { name, monthlyIncome, templateType, items } = body;

    // Check ownership
    const existing = await prisma.salaryAllocationConfig.findFirst({
      where: { id: configId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Konfigurasi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate
    const incomeValidation = allocationService.validateIncome(monthlyIncome);
    if (!incomeValidation.isValid) {
      return NextResponse.json({ error: incomeValidation.error }, { status: 400 });
    }

    const percentageValidation = allocationService.validatePercentages(items);
    if (!percentageValidation.isValid) {
      return NextResponse.json({ error: percentageValidation.error }, { status: 400 });
    }

    // Calculate amounts
    const calculatedItems = allocationService.calculateAllocation(monthlyIncome, items);

    // Update config - delete old items and create new ones
    await prisma.allocationItem.deleteMany({ where: { configId } });

    const config = await prisma.salaryAllocationConfig.update({
      where: { id: configId },
      data: {
        name,
        monthlyIncome,
        templateType,
        items: {
          create: calculatedItems.map((item) => ({
            categoryName: item.categoryName,
            categoryType: item.categoryType,
            percentage: item.percentage,
            amount: item.amount,
            icon: item.icon,
            color: item.color,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate konfigurasi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete config
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configId } = await params;

    // Check ownership
    const existing = await prisma.salaryAllocationConfig.findFirst({
      where: { id: configId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Konfigurasi tidak ditemukan' },
        { status: 404 }
      );
    }

    await prisma.salaryAllocationConfig.delete({ where: { id: configId } });

    return NextResponse.json({ success: true, message: 'Konfigurasi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting config:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus konfigurasi' },
      { status: 500 }
    );
  }
}
