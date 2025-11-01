import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Wallet } from '@prisma/client';

const DEFAULT_SAVINGS_LABEL = 'Tabungan Lainnya';

const SAVINGS_KEYWORD_MAPPINGS = [
  { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'] },
  { label: 'Tabungan Pendidikan', keywords: ['pendidikan', 'school', 'kuliah', 'education'] },
  { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'] },
  { label: 'Tabungan Pensiun', keywords: ['pensiun', 'retirement'] },
  { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'] },
  { label: 'Tabungan Kendaraan', keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'] },
  { label: 'Tabungan Bank', keywords: ['bank', 'rekening', 'account'] },
  { label: 'Tabungan Emas', keywords: ['emas', 'gold', 'logam mulia'] },
  { label: 'Tabungan Crypto', keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'] },
  { label: 'Tabungan Investasi', keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond'] },
  { label: 'Tabungan Deposito', keywords: ['deposito', 'deposit', 'term deposit'] },
];

type TransactionWithRelations = Awaited<ReturnType<typeof prisma.transaction.findMany>>[number];

type WalletEmergencySummary = {
  walletId: string;
  walletName: string;
  currentAmount: number;
  walletBalance: number;
  targetRemaining: number;
  percentageOfTarget: number;
  totalSavings: number;
  savingsByType: Record<string, number>;
  currencyCode: string;
};

function normalizeSpace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function toTitleCase(value: string) {
  return normalizeSpace(value)
    .split(' ')
    .map(word => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ''))
    .join(' ')
    .trim();
}

function determineSavingsLabel(tx: TransactionWithRelations): string | null {
  const description = (tx.description ?? '').toLowerCase();
  // @ts-ignore - tx.category is available from the join
  const categoryName = (tx.category?.name ?? '').toLowerCase();
  const walletName = (tx as any)?.wallet?.name ? String((tx as any).wallet.name).toLowerCase() : '';

  // @ts-ignore - tx.category is available from the join
  const categoryType = tx.category?.type?.toUpperCase();

  const sources = [description, categoryName, walletName].filter(Boolean);

  const keywordMapping = SAVINGS_KEYWORD_MAPPINGS.find(mapping =>
    mapping.keywords.some(keyword => sources.some(source => source.includes(keyword)))
  );

  const hasTabunganPrefix = sources.some(source => source.includes('tabungan'));
  const explicitSavings = categoryType === 'SAVINGS';
  const hasSavingsKeyword =
    keywordMapping ||
    sources.some(source => source.includes('saving')) ||
    sources.some(source => source.includes('menabung'));

  if (!explicitSavings && !hasTabunganPrefix && !keywordMapping && !hasSavingsKeyword) {
    return null;
  }

  if (keywordMapping) {
    return keywordMapping.label;
  }

  const tabunganMatch = sources
    .map(source => source.match(/tabungan\s+([a-z0-9\s]+)/i))
    .find(Boolean);

  if (tabunganMatch && tabunganMatch[1]) {
    return `Tabungan ${toTitleCase(tabunganMatch[1])}`;
  }

  if (categoryName.includes('tabungan')) {
    const cleaned = categoryName.replace(/tabungan/gi, '').trim();
    return `Tabungan ${cleaned ? toTitleCase(cleaned) : 'Lainnya'}`;
  }

  if (walletName.includes('tabungan')) {
    const cleaned = walletName.replace(/tabungan/gi, '').trim();
    return `Tabungan ${cleaned ? toTitleCase(cleaned) : 'Lainnya'}`;
  }

  if (explicitSavings && categoryName) {
    return `Tabungan ${toTitleCase(categoryName)}`;
  }

  if (hasSavingsKeyword) {
    return DEFAULT_SAVINGS_LABEL;
  }

  return null;
}

async function calculateSavingsSummary(userId: string, walletId?: string | null) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      ...(walletId ? { walletId } : {})
    },
    include: {
      category: true,
      wallet: true
    },
    orderBy: {
      date: 'desc'
    }
  });

  const summary = {
    total: 0,
    byType: {} as Record<string, number>,
    debug: [] as Array<{ id: string; label: string; amount: number; error?: string }>
  };

  for (const tx of transactions) {
    const label = determineSavingsLabel(tx);
    if (!label) {
      continue;
    }

    const rawAmount = Number(tx.amount);
    if (!Number.isFinite(rawAmount)) {
      continue;
    }

    const amount = Math.abs(rawAmount);

    if (!summary.byType[label]) {
      summary.byType[label] = 0;
    }

    summary.byType[label] += amount;
    summary.total += amount;
    summary.debug.push({
      id: tx.id,
      label,
      amount
    });
  }

  return summary;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const walletId = url.searchParams.get('walletId');
    
    console.log('[DEBUG] Emergency fund API GET called with walletId:', walletId);
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[DEBUG] User found with emergency fund:', user.emergencyFund);
    
    // Get all emergency fund data
    let currentAmount = 0;
    let targetAmount = user.emergencyFund?.targetAmount ?? 0;
    
    // Make sure targetAmount is never set to 1 (the default/placeholder value)
    if (targetAmount <= 1 && user.emergencyFund) {
      console.log('[DEBUG] Target amount was <= 1, setting to 5,000,000');
      
      // Update it to a reasonable default
      await prisma.emergencyFund.update({
        where: { id: user.emergencyFund.id },
        data: { targetAmount: 5000000 }
      });
      
      // Use the updated value
      targetAmount = 5000000;
    }
    
    let selectedWallet: Wallet | null = null;

    // If walletId is specified, filter the emergency fund amount by wallet
    if (walletId) {
      try {
        const wallet = await prisma.wallet.findUnique({
          where: { 
            id: walletId,
            userId: user.id
          }
        });
        
        if (wallet) {
          selectedWallet = wallet;
          // We're assuming the wallet balance represents the emergency fund
          currentAmount = wallet.balance;
        }
      } catch (walletError) {
        console.error('Error fetching wallet:', walletError);
        // Continue with default values instead of failing
      }
    } else if (user.emergencyFund) {
      // Use the emergency fund data if available
      currentAmount = user.emergencyFund.currentAmount;
    }
    
    // Fetch savings transactions using simpler, more reliable logic
    let savingsByType: Record<string, number> = {};
    let totalSavings = 0;
    let savingsDebug: Array<{ id: string; label: string; amount: number }> | undefined;
    let baseSavingsSummary: Awaited<ReturnType<typeof calculateSavingsSummary>> | null = null;

    try {
      baseSavingsSummary = await calculateSavingsSummary(user.id, walletId);
      savingsByType = baseSavingsSummary.byType;
      totalSavings = baseSavingsSummary.total;
      if (process.env.NODE_ENV !== 'production' && url.searchParams.get('debug') === 'true') {
        savingsDebug = baseSavingsSummary.debug;
      }
    } catch (txError) {
      console.error('Error processing transactions, using fallback:', txError);
      savingsByType = {};
      totalSavings = 0;
      if (process.env.NODE_ENV !== 'production' && url.searchParams.get('debug') === 'true') {
          savingsDebug = [{
            id: 'error',
            label: 'ERROR: ' + (txError instanceof Error ? txError.message : 'Unknown error'),
            amount: 0
          }];
      }
    }
    
    totalSavings = Math.max(totalSavings, 0);

    // IMPORTANT: If walletId is provided, ALWAYS use wallet balance, never use totalSavings
    if (walletId) {
      // Keep currentAmount as wallet.balance (set earlier)
      console.log('[DEBUG] Using wallet balance only:', currentAmount);
    } else {
      // Only use totalSavings when no wallet is selected
      currentAmount = totalSavings;
      console.log('[DEBUG] No walletId, using totalSavings:', currentAmount);
    }

    // Make sure currentAmount is never negative
    currentAmount = Math.max(currentAmount, 0);
    
    // If no savings were found or error occurred, provide empty object
    if (Object.keys(savingsByType).length === 0) {
      console.log('No savings found, using empty object');
    }
    
    const mapWalletSummary = (
      wallet: Wallet,
      summary: Awaited<ReturnType<typeof calculateSavingsSummary>>
    ): WalletEmergencySummary => {
      const summaryTotal = Math.max(summary.total, 0);
      const currentAmountForWallet = summaryTotal > 0 ? summaryTotal : wallet.balance;
      const targetRemaining = Math.max(0, targetAmount - currentAmountForWallet);
      const percentageOfTarget =
        targetAmount > 0 ? Math.min(100, Math.round((currentAmountForWallet / targetAmount) * 100)) : 0;

      return {
        walletId: wallet.id,
        walletName: wallet.name,
        currentAmount: currentAmountForWallet,
        walletBalance: wallet.balance,
        targetRemaining,
        percentageOfTarget,
        totalSavings: summaryTotal,
        savingsByType: summary.byType,
        currencyCode: wallet.currencyCode,
      };
    };

    let walletBreakdown: WalletEmergencySummary[] = [];

    if (walletId && selectedWallet) {
      const summary = baseSavingsSummary ?? (await calculateSavingsSummary(user.id, selectedWallet.id));
      walletBreakdown = [mapWalletSummary(selectedWallet, summary)];
    }

    if (!walletId) {
      const userWallets = await prisma.wallet.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      walletBreakdown = await Promise.all(
        userWallets.map(async (wallet) => {
          const summary = await calculateSavingsSummary(user.id, wallet.id);
          return mapWalletSummary(wallet, summary);
        })
      );
    }
    
    // If no emergency fund exists, return default values
    if (!user.emergencyFund) {
      return NextResponse.json({
        targetAmount: 5000000, // Never use 0 or 1 as the default
        currentAmount: currentAmount,
        monthlyContribution: 500000, // Reasonable default
        isActive: false,
        totalSavings: totalSavings,
        savingsByType: savingsByType,
        walletBreakdown,
        ...(savingsDebug ? { debug: savingsDebug } : {})
      }, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      });
    }
    
    // Return emergency fund data
    return NextResponse.json({
      targetAmount: targetAmount,
      currentAmount: currentAmount,
      monthlyContribution: user.emergencyFund.monthlyContribution,
      isActive: user.emergencyFund.isActive,
      totalSavings: totalSavings,
      savingsByType: savingsByType,
      walletBreakdown,
      ...(savingsDebug ? { debug: savingsDebug } : {})
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error fetching emergency fund data:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request data
    const data = await request.json();
    const { walletId } = data;
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get all emergency fund data
    let currentAmount = 0;
    
    // If walletId is specified, filter the emergency fund amount by wallet
    if (walletId) {
      try {
        const wallet = await prisma.wallet.findUnique({
      where: {
            id: walletId,
            userId: user.id
          }
        });
        
        if (wallet) {
          // We're assuming the wallet balance represents the emergency fund
          currentAmount = wallet.balance;
        }
      } catch (walletError) {
        console.error('Error fetching wallet:', walletError);
        // Continue with default values instead of failing
      }
    } else if (user.emergencyFund) {
      // Use the emergency fund data if available
      currentAmount = user.emergencyFund.currentAmount;
    }
    
    // Fetch savings transactions using the shared helper for consistent classification
    let savingsByType: Record<string, number> = {};
    let totalSavings = 0;

    try {
      const savingsSummary = await calculateSavingsSummary(user.id, walletId);
      savingsByType = savingsSummary.byType;
      totalSavings = savingsSummary.total;
      
      // Only use totalSavings if walletId is not specified
      if (!walletId) {
        console.log('[DEBUG] POST: No walletId, using totalSavings for currentAmount:', totalSavings);
        currentAmount = Math.max(0, totalSavings);
      } else {
        console.log('[DEBUG] POST: Using wallet balance, not overriding with totalSavings');
      }
    } catch (txError) {
      console.error('Error processing transactions, using fallback:', txError);
      savingsByType = {};
      totalSavings = 0;
    }
    
    // If no emergency fund exists, return default values
    if (!user.emergencyFund) {
      return NextResponse.json({
        targetAmount: 0,
        currentAmount: currentAmount,
        monthlyContribution: 0,
        isActive: false,
        totalSavings: totalSavings,
        savingsByType: savingsByType
      });
    }
    
    // Return emergency fund data
    return NextResponse.json({
      targetAmount: user.emergencyFund.targetAmount,
      currentAmount: currentAmount,
      monthlyContribution: user.emergencyFund.monthlyContribution,
      isActive: user.emergencyFund.isActive,
      totalSavings: totalSavings,
      savingsByType: savingsByType
    });
  } catch (error) {
    console.error('Error processing emergency fund data:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[DEBUG] PUT request to emergency-fund received');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[DEBUG] PUT unauthorized - no session/email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request data and log it
    const data = await request.json();
    console.log('[DEBUG] PUT request body:', data);
    const { targetAmount, monthlyContribution } = data;
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      console.log('[DEBUG] PUT user not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[DEBUG] Found user:', user.id, 'Has emergency fund:', !!user.emergencyFund);
    
    let emergencyFund;
    
    // Create or update emergency fund
    if (user.emergencyFund) {
      // Update existing emergency fund
      const updateData: any = {};
      
      if (targetAmount !== undefined) {
        updateData.targetAmount = targetAmount;
        console.log('[DEBUG] Will update targetAmount to:', targetAmount);
      }
      
      if (monthlyContribution !== undefined) {
        updateData.monthlyContribution = monthlyContribution;
        console.log('[DEBUG] Will update monthlyContribution to:', monthlyContribution);
      }
      
      emergencyFund = await prisma.emergencyFund.update({
        where: { id: user.emergencyFund.id },
        data: updateData
      });
      
      console.log(`[DEBUG] Updated emergency fund for user ${user.id}`, emergencyFund);
    } else {
      // Create new emergency fund
      emergencyFund = await prisma.emergencyFund.create({
        data: {
          userId: user.id,
          targetAmount: targetAmount || 0,
          currentAmount: 0, // Start with 0
          monthlyContribution: monthlyContribution || 0,
          isActive: true
        }
      });
      
      console.log(`[DEBUG] Created emergency fund for user ${user.id}`, emergencyFund);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      emergencyFund
    });
    
  } catch (error) {
    console.error('[DEBUG] Error in PUT route:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 
