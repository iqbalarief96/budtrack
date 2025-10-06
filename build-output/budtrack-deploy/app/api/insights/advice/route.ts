import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { FinancialAdvice } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'month';
  const walletId = searchParams.get('walletId');

  try {
    const advice = await prisma.financialAdvice.findMany({
      where: {
        timeframe: timeframe as any,
        ...(walletId ? { walletId } : {})
      },
      orderBy: {
        priority: 'asc'
      }
    }) as (FinancialAdvice & {
      actionSteps?: string;
      resources?: string;
      detailedAnalysis?: string;
      updatedAt?: Date;
    })[];

    return NextResponse.json(advice.map(item => ({
      ...item,
      detailedAnalysis: item.detailedAnalysis || '',
      actionSteps: item.actionSteps ? JSON.parse(item.actionSteps) : [],
      resources: item.resources ? JSON.parse(item.resources) : [],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt?.toISOString() || item.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('Error fetching advice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advice' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { timeframe, walletId } = await request.json();

  try {
    // Generate new advice logic would go here
    // This is just a placeholder implementation
    // First create without the new fields
    const newAdvice = await prisma.financialAdvice.create({
      data: {
        title: 'New Financial Advice',
        description: 'This is a newly generated financial advice',
        type: 'general',
        priority: 'medium',
        timeframe: timeframe || 'month',
        walletId: walletId || null,
        userId: 'user-id-placeholder' // Should be replaced with actual user ID
      }
    });

    // Then update with the new fields using type assertion
    const updatedAdvice = await prisma.financialAdvice.update({
      where: { id: newAdvice.id },
      data: {
        actionSteps: '[]',
        resources: '[]',
        detailedAnalysis: '',
        updatedAt: new Date() // Explicitly set updatedAt
      } as any // Temporary type assertion to bypass Prisma type checking
    }) as FinancialAdvice & {
      actionSteps?: string;
      resources?: string;
      detailedAnalysis?: string;
      updatedAt?: Date;
    };

    return NextResponse.json({
      ...updatedAdvice,
      detailedAnalysis: updatedAdvice.detailedAnalysis || '',
      actionSteps: updatedAdvice.actionSteps ? JSON.parse(updatedAdvice.actionSteps) : [],
      resources: updatedAdvice.resources ? JSON.parse(updatedAdvice.resources) : [],
      createdAt: updatedAdvice.createdAt.toISOString(),
      updatedAt: updatedAdvice.updatedAt?.toISOString() || updatedAdvice.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating advice:', error);
    return NextResponse.json(
      { error: 'Failed to generate advice' },
      { status: 500 }
    );
  }
}