import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

type AuthOk = { userId: string; response?: undefined }
type AuthFail = { userId?: undefined; response: NextResponse }

/** Resolve the logged-in user's id, or a 401 response. */
export async function requireUserId(): Promise<AuthOk | AuthFail> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { userId }
}

/**
 * Ensure the logged-in user owns the wedding. Returns 401 when not logged in
 * and 404 (not 403, to avoid leaking existence) when the wedding is not theirs.
 */
export async function requireWeddingOwner(
  weddingId: string | null | undefined
): Promise<AuthOk | AuthFail> {
  const auth = await requireUserId()
  if (auth.response) return auth
  if (!weddingId) {
    return { response: NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 }) }
  }
  const wedding = await prisma.wedding.findFirst({
    where: { id: weddingId, userId: auth.userId },
    select: { id: true },
  })
  if (!wedding) {
    return { response: NextResponse.json({ error: 'Wedding not found' }, { status: 404 }) }
  }
  return { userId: auth.userId }
}
