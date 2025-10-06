import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { walletId, email, startDate, endDate, reportType, format } = await request.json()
    
    if (!walletId || !email) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    
    // Check if user has access to this wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    // In a real implementation, we would:
    // 1. Generate the report in the requested format
    // 2. Connect to an email service (e.g., SendGrid, Mailgun, or SMTP)
    // 3. Send the email with the report attached
    
    // For now, we'll just simulate success
    return NextResponse.json({ 
      success: true,
      message: `Report would be shared to ${email} (Email service not fully implemented in demo)`
    })
    
  } catch (error) {
    console.error('Error sharing report:', error)
    return NextResponse.json({ error: 'Failed to share report' }, { status: 500 })
  }
}

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
} 