import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Special force update endpoint for debugging/fixing emergency fund
export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Force update emergency fund GET called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[DEBUG] Force update: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      console.log('[DEBUG] Force update: User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[DEBUG] Force update found user:', user.id);
    
    // Default values for fixing the emergency fund
    const defaultEmergencyFundTarget = 5000000; // 5 juta rupiah
    const defaultMonthlyContribution = 500000; // 500 ribu rupiah/bulan
    
    if (user.emergencyFund) {
      // Only update if target is less than minimum
      if (user.emergencyFund.targetAmount < defaultEmergencyFundTarget) {
        await prisma.emergencyFund.update({
          where: {
            id: user.emergencyFund.id,
          },
          data: {
            targetAmount: defaultEmergencyFundTarget,
            monthlyContribution: defaultMonthlyContribution,
          },
        });
        
        console.log(`Updated emergency fund target for user ${user.id} to ${defaultEmergencyFundTarget}`);
      } else {
        console.log(`Emergency fund target already adequate: ${user.emergencyFund.targetAmount}`);
      }
    } else {
      // Create an emergency fund if it doesn't exist
      await prisma.emergencyFund.create({
        data: {
          userId: user.id,
          targetAmount: defaultEmergencyFundTarget,
          monthlyContribution: defaultMonthlyContribution,
          isActive: true,
          currentAmount: 0,
        },
      });
      
      console.log(`Created emergency fund for user ${user.id} with target ${defaultEmergencyFundTarget}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Emergency fund updated successfully',
      targetAmount: defaultEmergencyFundTarget,
      monthlyContribution: defaultMonthlyContribution,
    });
  } catch (error) {
    console.error('Error updating emergency fund:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}