import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { FinancialAdvice } from '@prisma/client';
import { generateAIResponse } from '@/lib/ai';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'month';
  const walletId = searchParams.get('walletId');

  try {
    // Get user's financial data for AI analysis
    const financialData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        transactions: {
          where: walletId ? { walletId } : {},
          take: 100,
          orderBy: { date: 'desc' }
        },
        budgets: {
          where: walletId ? { walletId } : {}
        },
        wallets: true
      }
    });

    if (!financialData) {
      throw new Error('User financial data not found');
    }

    // Get user's AI settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    });

    if (!userSettings?.provider || !userSettings.apiKey || !userSettings.selectedModel) {
      throw new Error('AI settings not configured');
    }

    // Prepare prompt for AI
    const prompt = `Generate personalized financial advice in JSON format with these properties:
- title: string
- description: string
- type: 'saving'|'budgeting'|'investment'|'general'
- priority: 'high'|'medium'|'low'
- actionSteps: string[]
- resources: {title: string, url: string}[]
- detailedAnalysis: string
- estimatedImpact: number|null

For user ${session.user.id} with these details:
Timeframe: ${timeframe}
Wallet: ${walletId || 'All wallets'}
Transactions: ${financialData.transactions.length} recent transactions
Budgets: ${financialData.budgets.length} active budgets`;

    // Generate AI response
    const aiResponseText = await generateAIResponse({
      prompt,
      provider: userSettings.provider,
      apiKey: userSettings.apiKey,
      model: userSettings.selectedModel
    });

    if (typeof aiResponseText !== 'string') {
      throw new Error('AI response was not a string');
    }

    // Parse and validate AI response
    interface AIAdviceData {
      title?: string;
      description?: string;
      type?: string;
      priority?: string;
      actionSteps?: unknown;
      resources?: unknown;
      detailedAnalysis?: string;
      estimatedImpact?: unknown;
    }

    let parsedResponse: AIAdviceData = {
      title: 'Financial Advice',
      description: '',
      type: 'general',
      priority: 'medium',
      actionSteps: [],
      resources: [],
      detailedAnalysis: '',
      estimatedImpact: null
    };

    try {
      // First try to parse as JSON
      const jsonResponse = JSON.parse(aiResponseText);
      if (typeof jsonResponse === 'object' && jsonResponse !== null) {
        parsedResponse = {
          ...parsedResponse,
          ...jsonResponse
        };
      } else {
        // If not a JSON object, use as description
        parsedResponse.description = aiResponseText;
        parsedResponse.detailedAnalysis = aiResponseText;
      }
    } catch {
      // If not JSON at all, use the raw text
      parsedResponse.description = aiResponseText;
      parsedResponse.detailedAnalysis = aiResponseText;
    }

    // Safely handle type and priority enums
    const validTypes = ['saving', 'budgeting', 'investment', 'general'] as const;
    const validPriorities = ['high', 'medium', 'low'] as const;
    
    const responseType = parsedResponse.type?.toLowerCase();
    const responsePriority = parsedResponse.priority?.toLowerCase();

    // Create validated advice data
    const generatedAdvice = {
      title: parsedResponse.title || 'Financial Advice',
      description: parsedResponse.description || '',
      type: validTypes.includes(responseType as typeof validTypes[number])
        ? responseType
        : 'general',
      priority: validPriorities.includes(responsePriority as typeof validPriorities[number])
        ? responsePriority
        : 'medium',
      actionSteps: Array.isArray(parsedResponse.actionSteps)
        ? parsedResponse.actionSteps
        : [],
      resources: Array.isArray(parsedResponse.resources)
        ? parsedResponse.resources
        : [],
      detailedAnalysis: parsedResponse.detailedAnalysis || '',
      estimatedImpact: typeof parsedResponse.estimatedImpact === 'number'
        ? parsedResponse.estimatedImpact
        : null
    };

    // Save the generated advice
    const newAdvice = await prisma.financialAdvice.create({
      data: {
        title: generatedAdvice.title,
        description: generatedAdvice.description,
        type: generatedAdvice.type,
        priority: generatedAdvice.priority,
        timeframe: timeframe || 'month',
        walletId: walletId || undefined,
        userId: session.user.id,
        actionSteps: JSON.stringify(generatedAdvice.actionSteps),
        resources: JSON.stringify(generatedAdvice.resources),
        detailedAnalysis: generatedAdvice.detailedAnalysis,
        estimatedImpact: generatedAdvice.estimatedImpact
      } as any // Temporary type assertion
    }) as FinancialAdvice & {
      actionSteps?: string;
      resources?: string;
      detailedAnalysis?: string;
      updatedAt?: Date;
    };

    return NextResponse.json({
      ...newAdvice,
      detailedAnalysis: newAdvice.detailedAnalysis || '',
      actionSteps: newAdvice.actionSteps ? JSON.parse(newAdvice.actionSteps) : [],
      resources: newAdvice.resources ? JSON.parse(newAdvice.resources) : [],
      createdAt: newAdvice.createdAt.toISOString(),
      updatedAt: newAdvice.updatedAt?.toISOString() || newAdvice.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating advice:', error);
    return NextResponse.json(
      { error: 'Failed to generate advice' },
      { status: 500 }
    );
  }
}