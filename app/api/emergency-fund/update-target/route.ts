import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] emergency-fund/update-target POST received');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[DEBUG] Update target unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const data = await request.json();
    console.log('[DEBUG] Update target request body:', data);
    const { targetAmount, monthlyContribution = 0, walletId } = data;

    // Better validation
    if (targetAmount === undefined) {
      console.log('[DEBUG] Missing targetAmount in request');
      return NextResponse.json({ error: 'Missing targetAmount' }, { status: 400 });
    }

    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      console.log('[DEBUG] Invalid targetAmount:', targetAmount);
      return NextResponse.json({ error: 'Invalid target amount' }, { status: 400 });
    }

    console.log(`[DEBUG] Updating emergency fund target to ${targetAmount} for walletId: ${walletId || 'general'}`);

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });

    if (!user) {
      console.log('[DEBUG] User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[DEBUG] Found user:', user.id);

    let emergencyFund;

    // If walletId is provided, use wallet-specific emergency fund
    if (walletId) {
      console.log('[DEBUG] Using wallet-specific emergency fund for walletId:', walletId);

      // Verify wallet belongs to user
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId: user.id
        }
      });

      if (!wallet) {
        console.log('[DEBUG] Wallet not found or does not belong to user:', walletId);
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
      }

      // Create or update wallet emergency fund
      emergencyFund = await prisma.walletEmergencyFund.upsert({
        where: { walletId },
        create: {
          walletId,
          userId: user.id,
          targetAmount,
          isActive: true
        },
        update: {
          targetAmount
        }
      });

      console.log(`[DEBUG] Upserted wallet emergency fund:`, emergencyFund);
    } else {
      // Fallback to general emergency fund if no walletId
      console.log('[DEBUG] Using general emergency fund');

      // Create or update emergency fund
      if (user.emergencyFund) {
        // Update existing emergency fund
        console.log('[DEBUG] Updating existing emergency fund:', user.emergencyFund.id);
        emergencyFund = await prisma.emergencyFund.update({
          where: { id: user.emergencyFund.id },
          data: {
            targetAmount: targetAmount,
            monthlyContribution: monthlyContribution
          }
        });

        console.log(`[DEBUG] Updated emergency fund:`, emergencyFund);
      } else {
        // Create new emergency fund
        console.log('[DEBUG] Creating new emergency fund');
        emergencyFund = await prisma.emergencyFund.create({
          data: {
            userId: user.id,
            targetAmount: targetAmount,
            currentAmount: 0, // Start with 0
            monthlyContribution: monthlyContribution,
            isActive: true
          }
        });

        console.log(`[DEBUG] Created emergency fund:`, emergencyFund);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      emergencyFund
    });
    
  } catch (error) {
    console.error('[DEBUG] Error updating emergency fund target:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 