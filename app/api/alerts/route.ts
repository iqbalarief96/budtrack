import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/alerts - Fetch all alerts for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      // Use direct SQL query instead of Prisma model
      const alertsData = await prisma.$queryRaw`
        SELECT * FROM Alert 
        WHERE userId = ${session.user.id} 
        ORDER BY createdAt DESC
      `;
      
      // Transform results to expected format
      const alerts = Array.isArray(alertsData) ? alertsData.map(alert => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        additionalData: alert.additionalData,
        isRead: alert.isRead === 1, // SQLite stores boolean as 0/1
        createdAt: alert.createdAt
      })) : [];
      
      return NextResponse.json({ alerts });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Return empty alerts if table doesn't exist yet
      return NextResponse.json({ alerts: [] });
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 