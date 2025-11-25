import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset all wallets to MAIN type
    const result = await prisma.wallet.updateMany({
      where: { userId: session.user.id },
      data: { type: 'MAIN' }
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully reset ${result.count} wallet(s) to MAIN type`
    })
  } catch (error) {
    console.error('Error resetting wallet types:', error)
    return NextResponse.json(
      { error: 'Failed to reset wallet types' },
      { status: 500 }
    )
  }
}
