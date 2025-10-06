/**
 * THIS ENDPOINT IS FOR DEVELOPMENT USE ONLY
 * 
 * This endpoint generates test alerts with an API key for easier testing.
 * Keep this file for future development needs but do not expose
 * it in the production UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Simple API key for development purposes only
const DEV_API_KEY = 'dev-budtrack-2024';

// POST /api/dev/generate-alerts - Generate test alerts for testing
export async function POST(request: NextRequest) {
  // Prevent access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
  }

  try {
    // Simple API key check
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== DEV_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized - Invalid API key' }, { status: 401 });
    }
    
    // Get user ID from request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if Alert model exists in prisma
    if (typeof (prisma as any).alert !== 'undefined') {
      const dummyAlerts = [
        {
          userId,
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
          userId,
          type: 'BUDGET_LIMIT',
          title: 'Budget limit reached',
          message: 'You have reached 90% of your Entertainment budget for this month.',
          isRead: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          userId,
          type: 'TRANSACTION_LARGE',
          title: 'Large transaction alert',
          message: 'A transaction of Rp 2,500,000 was added to your account.',
          isRead: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ];
      
      // Create the dummy alerts
      const createdAlerts = await Promise.all(
        dummyAlerts.map(alert => 
          (prisma as any).alert.create({
            data: alert
          })
        )
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Dummy alerts created successfully',
        count: createdAlerts.length
      });
    } else {
      return NextResponse.json(
        { error: 'Alert functionality not available' },
        { status: 501 }
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