import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { migrateSavingsToWallets } from '@/scripts/migrate-savings-to-wallets'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dryRun = false } = await request.json()

    // Run migration
    const result = await migrateSavingsToWallets(session.user.id, dryRun)

    return NextResponse.json({ 
      success: true,
      message: dryRun 
        ? 'Dry run completed. Check console for details.' 
        : 'Migration completed successfully!',
      data: result
    })
    
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
