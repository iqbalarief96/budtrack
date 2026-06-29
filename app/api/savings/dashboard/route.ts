import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSavingsDashboard } from '@/lib/savings/savings-dashboard'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dashboard = await getSavingsDashboard(session.user.id)
  return NextResponse.json(dashboard)
}
