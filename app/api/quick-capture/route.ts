import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createQuickCaptureTransaction } from '@/lib/quick-capture'

export const dynamic = 'force-dynamic'

/**
 * API-key authenticated quick capture (iOS Shortcuts, automation).
 *
 * The user is resolved from QUICK_CAPTURE_DEFAULT_USER, never from the
 * request body. Parsing and transaction creation live in lib/quick-capture.ts
 * so the session-authenticated web route behaves identically.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const queryKey = req.nextUrl.searchParams.get('key')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    let providedKey = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim()
    } else if (queryKey) {
      providedKey = queryKey.trim()
    }

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: API Key salah atau tidak ditemukan.' },
        { status: 401 }
      )
    }

    const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: `User dengan email ${defaultEmail} tidak ditemukan.` },
        { status: 404 }
      )
    }

    let rawText = ''
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      rawText = body.text || body.input || body.query || ''
    } else {
      rawText = await req.text()
    }

    if (typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payload kosong. Kirim teks atau json {"text": "DESKRIPSI-KATEGORI-DOMPET-JUMLAH"}' },
        { status: 400 }
      )
    }

    const result = await createQuickCaptureTransaction(user.id, rawText)

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
    console.error('Quick capture error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat memproses transaksi.',
      },
      { status: 400 }
    )
  }
}
