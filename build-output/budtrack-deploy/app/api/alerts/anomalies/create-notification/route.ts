import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SpendingAnomaly } from '@/lib/anomaly-detection';

// POST /api/alerts/anomalies/create-notification
// Creates alert notifications from anomaly detection results
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get anomaly data from request body
    const { anomalies } = await request.json();
    
    if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
      return NextResponse.json({ error: 'No anomalies provided' }, { status: 400 });
    }
    
    try {
      // Create alerts for each anomaly (focusing on high severity first)
      const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      
      const prioritizedAnomalies = [...anomalies].sort((a, b) => {
        const aSeverity = a.severity as string;
        const bSeverity = b.severity as string;
        return (severityOrder[bSeverity] || 0) - (severityOrder[aSeverity] || 0);
      }).slice(0, 5); // Only create alerts for top 5 anomalies to avoid notification spam
      
      let createdCount = 0;
      for (const anomaly of prioritizedAnomalies) {
        // Format messages based on severity
        let title, message, recommendation;
        
        if (anomaly.severity === 'high') {
          title = `Pengeluaran tidak biasa terdeteksi: ${anomaly.category.name}`;
          message = `Pengeluaran ${anomaly.category.name} Rp ${numberWithCommas(anomaly.amount)} (${Math.round(anomaly.percentAboveAverage)}% di atas rata-rata)`;
          recommendation = `Coba cek pengeluaran ini dan pertimbangkan untuk mengatur budget untuk kategori ini.`;
        } else {
          title = `Anomali terdeteksi: ${anomaly.category.name}`;
          message = `Pengeluaran ${anomaly.category.name} ${Math.round(anomaly.percentAboveAverage)}% di atas rata-rata`;
          recommendation = `Pertimbangkan untuk menyesuaikan budget Anda`;
        }
        
        // Create alert for this anomaly
        await prisma.$executeRaw`
          INSERT INTO Alert (
            id, userId, type, title, message, 
            additionalData, isRead, createdAt
          ) VALUES (
            ${crypto.randomUUID()}, 
            ${session.user.id}, 
            ${'UNUSUAL_SPENDING'}, 
            ${title}, 
            ${message}, 
            ${JSON.stringify({ recommendation, anomalyId: anomaly.id })}, 
            ${0}, 
            ${new Date().toISOString()}
          )
        `;
        createdCount++;
      }
      
      return NextResponse.json({
        success: true,
        message: `Created ${createdCount} alerts from anomalies`,
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
    console.error('Error creating alerts from anomalies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to format numbers with commas
function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
} 