import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { FinancialAdvice } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const advice = await prisma.financialAdvice.findUnique({
      where: { id: params.id }
    }) as FinancialAdvice & {
      actionSteps?: string;
      resources?: string;
      detailedAnalysis?: string;
      updatedAt?: Date;
    };

    if (!advice) {
      return NextResponse.json(
        { error: 'Advice not found' },
        { status: 404 }
      );
    }

    try {
      // Parse JSON strings for actionSteps and resources
      const parsedActionSteps = advice.actionSteps ? JSON.parse(advice.actionSteps) : [];
      const parsedResources = advice.resources ? JSON.parse(advice.resources) : [];

      return NextResponse.json({
        id: advice.id,
        title: advice.title,
        description: advice.description,
        detailedAnalysis: advice.detailedAnalysis || '',
        actionSteps: parsedActionSteps,
        resources: parsedResources,
        type: advice.type,
        priority: advice.priority,
        estimatedImpact: advice.estimatedImpact,
        walletId: advice.walletId,
        timeframe: advice.timeframe,
        createdAt: advice.createdAt.toISOString(),
        updatedAt: advice.updatedAt?.toISOString() || advice.createdAt.toISOString(),
        userId: advice.userId
      });
    } catch (parseError) {
      console.error('Error parsing advice data:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse advice data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching advice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advice' },
      { status: 500 }
    );
  }
}