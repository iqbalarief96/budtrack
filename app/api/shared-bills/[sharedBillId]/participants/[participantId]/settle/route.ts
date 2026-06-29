import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { settleParticipant } from '@/lib/shared-bills/shared-bill-service'

export const dynamic = 'force-dynamic'

type Params = { params: { sharedBillId: string; participantId: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const paidAmount = Number(body.paidAmount ?? 0)
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return NextResponse.json({ error: 'paidAmount must be a positive number' }, { status: 400 })
    }

    const sharedBill = await settleParticipant(
      session.user.id,
      params.sharedBillId,
      params.participantId,
      paidAmount,
      body.settlementNote ? String(body.settlementNote) : null
    )

    return NextResponse.json({ sharedBill, message: 'Participant settlement updated successfully' })
  } catch (error) {
    console.error('Error settling shared bill participant:', error)
    const message = error instanceof Error ? error.message : 'Failed to settle participant'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 400 })
  }
}
