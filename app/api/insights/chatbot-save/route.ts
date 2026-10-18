import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/insights/chatbot-save
 *
 * Menyimpan insight yang dihasilkan chatbot ke tabel SpendingInsight
 * supaya persisten dan bisa dibaca lagi di halaman /insights.
 *
 * Body: { title: string, description: string, severity?: 'low'|'medium'|'high', walletId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const rawTitle = typeof body?.title === 'string' ? body.title.trim() : ''
    const rawDescription = typeof body?.description === 'string' ? body.description.trim() : ''
    const severityInput = typeof body?.severity === 'string' ? body.severity : 'medium'

    if (!rawDescription) {
      return NextResponse.json({ error: 'description wajib diisi' }, { status: 400 })
    }

    const severity = ['low', 'medium', 'high'].includes(severityInput) ? severityInput : 'medium'

    // Ambil baris pertama yang bermakna sebagai judul kalau title kosong.
    const title = (rawTitle || rawDescription.split('\n')[0] || 'Insight dari chatbot')
      .replace(/^#+\s*/, '')
      .replace(/[*_`]/g, '')
      .slice(0, 120)

    const walletId = typeof body?.walletId === 'string' && body.walletId ? body.walletId : null

    const insight = await prisma.spendingInsight.create({
      data: {
        userId: session.user.id,
        type: 'chatbot_insight',
        title,
        description: rawDescription,
        severity,
        data: JSON.stringify({ source: 'chatbot', walletId, savedAt: new Date().toISOString() }),
      },
      select: { id: true, title: true, createdAt: true },
    })

    return NextResponse.json({ insight }, { status: 201 })
  } catch (error) {
    console.error('Error saving chatbot insight:', error)
    return NextResponse.json({ error: 'Gagal menyimpan insight' }, { status: 500 })
  }
}
