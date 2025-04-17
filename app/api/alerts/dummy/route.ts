/**
 * THIS ENDPOINT IS FOR DEVELOPMENT USE ONLY
 * 
 * This endpoint generates test alerts for the current user.
 * Keep this file for future development needs but do not expose
 * it in the production UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/alerts/dummy - Generate test alerts for the current user
export async function POST(request: NextRequest) {
  // Prevent access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
    }
    
    try {
      // First clean up any existing alerts for simplicity
      try {
        await prisma.$executeRaw`DELETE FROM Alert WHERE userId = ${session.user.id}`;
      } catch (cleanupError) {
        console.log('Cleanup error (non-fatal):', cleanupError);
      }
      
      const dummyAlerts = [
        {
          userId: session.user.id,
          type: 'UNUSUAL_SPENDING',
          title: 'Unusual spending detected',
          message: 'You spent 75% more than usual in Food & Drinks category this month.',
          additionalData: JSON.stringify({
            recommendation: 'Consider setting a budget for this category.'
          }),
          isRead: false,
          createdAt: new Date()
        },
        {
          userId: session.user.id,
          type: 'BUDGET_LIMIT',
          title: 'Budget limit reached',
          message: 'You have reached 90% of your Entertainment budget for this month.',
          isRead: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          userId: session.user.id,
          type: 'TRANSACTION_LARGE',
          title: 'Large transaction alert',
          message: 'A transaction of Rp 2,500,000 was added to your account.',
          isRead: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ];
      
      // Use direct SQL insert instead of Prisma model
      let createdCount = 0;
      for (const alert of dummyAlerts) {
        await prisma.$executeRaw`
          INSERT INTO Alert (
            id, userId, type, title, message, 
            additionalData, isRead, createdAt
          ) VALUES (
            ${crypto.randomUUID()}, 
            ${alert.userId}, 
            ${alert.type}, 
            ${alert.title}, 
            ${alert.message}, 
            ${alert.additionalData || null}, 
            ${alert.isRead ? 1 : 0}, 
            ${alert.createdAt.toISOString()}
          )
        `;
        createdCount++;
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Dummy alerts created successfully',
        count: createdCount
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json(
        { error: 'Database operation failed: ' + (dbError instanceof Error ? dbError.message : String(dbError)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating dummy alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 