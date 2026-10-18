import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { summarizeCreditCard } from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

function formatDateToICS(value: string | Date) {
  const d = new Date(value)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}T090000Z`
}

export async function GET(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const card = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const summary = summarizeCreditCard(card)
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const stmtDateICS = formatDateToICS(summary.nextStatementDate)
    const dueDateICS = formatDateToICS(summary.nextDueDate)

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BudTrack//Credit Card Reminders//ID
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:stmt-${card.id}-${stmtDateICS}
DTSTAMP:${now}
DTSTART:${stmtDateICS}
SUMMARY:Cetak Tagihan CC ${card.name}
DESCRIPTION:Tanggal cetak tagihan bulanan ${card.name}. Cek e-billing & periksa transaksi abnormal.
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Pengingat H-1 Cetak Tagihan CC ${card.name}
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:due-${card.id}-${dueDateICS}
DTSTAMP:${now}
DTSTART:${dueDateICS}
SUMMARY:JATUH TEMPO CC ${card.name} (Min: Rp${Math.round(summary.minimumPayment).toLocaleString('id-ID')})
DESCRIPTION:Batas pembayaran tagihan kartu ${card.name}. Tagihan berjalan: Rp${card.currentBalance.toLocaleString('id-ID')}.
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P3D
ACTION:DISPLAY
DESCRIPTION:Pengingat H-3 Jatuh Tempo CC ${card.name}
END:VALARM
END:VEVENT
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${card.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_due_dates.ics"`,
      },
    })
  } catch (error) {
    console.error('Error generating ics:', error)
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 })
  }
}
