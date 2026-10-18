import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createQuickCaptureTransaction } from '@/lib/quick-capture'

export const dynamic = 'force-dynamic'

/**
 * Session-authenticated quick capture for the web UI.
 *
 * Same one-line format as the iOS Shortcut route, but the user is taken from
 * the logged-in session instead of an API key, so no secret ever reaches the
 * browser. The client-supplied body only carries the text.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: silakan login dulu.' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const rawText = body?.text

    if (typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Teks kosong. Contoh: Kopi Kenangan-Makanan-Dompet Utama-28000' },
        { status: 400 }
      )
    }

    const result = await createQuickCaptureTransaction(session.user.id, rawText)

    try {
      revalidatePath('/dashboard')
      revalidatePath('/transactions')
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Quick text capture error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat memproses transaksi.',
      },
      { status: 400 }
    )
  }
}
