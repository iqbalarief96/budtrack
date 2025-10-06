import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// DELETE /api/alerts/[alertId] - Delete an alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { alertId } = params;
    
    try {
      // Check if the alert exists and belongs to the current user
      const alertData = await prisma.$queryRaw`
        SELECT * FROM Alert 
        WHERE id = ${alertId} AND userId = ${session.user.id}
      `;
      
      const alert = Array.isArray(alertData) && alertData.length > 0 ? alertData[0] : null;
      
      if (!alert) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      
      // Delete the alert using direct SQL
      await prisma.$executeRaw`
        DELETE FROM Alert 
        WHERE id = ${alertId}
      `;
      
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json(
        { error: 'Database operation failed: ' + (dbError instanceof Error ? dbError.message : String(dbError)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 