import { NextRequest, NextResponse } from 'next/server'
import { ingestBankEmail, UnknownWalletError } from '@/lib/bank-email-parser'
import { timingSafeEqual } from 'crypto'

/**
 * Bank notification email webhook.
 *
 * Called by the Gmail Apps Script forwarder (scripts/gmail-auto-forwarder.gs).
 * Auth is a shared secret in the `x-webhook-secret` header, compared in
 * constant time. The forwarded email body is untrusted input: the parser
 * only ever extracts an amount + category hint, never executes anything.
 *
 * Deliberately returns 200 with `{ skipped }` for unparseable mail so the
 * Apps Script does not retry forever on non-transaction emails.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const expected = process.env.BANK_EMAIL_WEBHOOK_SECRET ?? ''
  if (!expected) {
    return NextResponse.json({ error: 'webhook secret belum dikonfigurasi' }, { status: 503 })
  }

  const provided = req.headers.get('x-webhook-secret') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'invalid webhook secret' }, { status: 403 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'body bukan JSON valid' }, { status: 400 })
  }

  const userId = process.env.BANK_EMAIL_USER_ID ?? ''
  if (!userId) {
    return NextResponse.json({ error: 'BANK_EMAIL_USER_ID belum diset' }, { status: 503 })
  }

  try {
    // Accept common field aliases so third-party forwarders (Zapier/IFTTT/Gmail
    // native) work without a shim. `sender` wins, then `from`, then `from_email`.
    const pickStr = (...keys: string[]): string => {
      for (const k of keys) {
        const v = payload?.[k]
        if (typeof v === 'string' && v.trim()) return v
      }
      return ''
    }

    // Optional wallet pin: each Gmail account's forwarder sends its owner's
    // wallet name (e.g. "Dompet Utama" vs "Selly").
    const walletName = pickStr('wallet', 'walletName').slice(0, 100) || undefined

    const result = await ingestBankEmail(
      userId,
      {
        sender: pickStr('sender', 'from', 'from_email', 'fromEmail').slice(0, 200),
        subject: pickStr('subject', 'title').slice(0, 300),
        body: pickStr('body', 'text', 'plain', 'content').slice(0, 8000),
      },
      walletName
    )

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    if (err instanceof UnknownWalletError) {
      // Config error on the forwarder side — reject loudly instead of
      // booking into the wrong person's wallet.
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    console.error('[bank-email] ingest gagal:', err?.message)
    return NextResponse.json({ error: 'gagal memproses email' }, { status: 500 })
  }
}
