import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteSharedBill, updateSharedBill, assertSharedBillScope } from '@/lib/shared-bills/shared-bill-service'

export const dynamic = 'force-dynamic'

type Params = { params: { sharedBillId: string } }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sharedBill = await assertSharedBillScope(params.sharedBillId, session.user.id)
    if (!sharedBill) {
      return NextResponse.json({ error: 'Shared bill not found' }, { status: 404 })
    }

    return NextResponse.json({ sharedBill })
  } catch (error) {
    console.error('Error fetching shared bill:', error)
    return NextResponse.json({ error: 'Failed to fetch shared bill' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sharedBill = await updateSharedBill(session.user.id, params.sharedBillId, body)
    return NextResponse.json({ sharedBill, message: 'Shared bill updated successfully' })
  } catch (error) {
    console.error('Error updating shared bill:', error)
    const message = error instanceof Error ? error.message : 'Failed to update shared bill'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteSharedBill(session.user.id, params.sharedBillId)
    return NextResponse.json({ message: 'Shared bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting shared bill:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete shared bill'
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 400 })
  }
}
