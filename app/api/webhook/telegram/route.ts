import { NextRequest, NextResponse } from 'next/server'
import { handleTelegramUpdate, type BotIdentity, type TelegramUpdate } from '@/lib/telegram-bot'

export const dynamic = 'force-dynamic'

/**
 * Telegram webhook receiver for BudTrack.
 *
 * Trust model:
 * - Telegram sends X-Telegram-Bot-Api-Secret-Token; we compare it timing-safe
 *   against TELEGRAM_WEBHOOK_SECRET. Missing/wrong secret = 403, no parsing.
 * - Chat allowlist (TELEGRAM_ALLOWED_CHATS) is enforced after the secret check
 *   so a leaked secret alone cannot inject into arbitrary chats.
 * - Always answers 200 to accepted updates so Telegram does not retry-storm;
 *   real errors are logged, not surfaced in the response body.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) {
    console.error('[TelegramWebhook] TELEGRAM_WEBHOOK_SECRET belum diset')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
  if (!timingSafeEqual(got, expected)) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: true }) // malformed body: ack, drop
  }

  const chatId = update?.message?.chat?.id

  // Allowlist: kalau env diisi, hanya chat itu yang dilayani.
  const allow = (process.env.TELEGRAM_ALLOWED_CHATS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allow.length && chatId !== undefined && !allow.includes(String(chatId))) {
    console.warn(`[TelegramWebhook] chat ${chatId} tidak ada di allowlist`)
    return NextResponse.json({ ok: true })
  }

  let reply: Awaited<ReturnType<typeof handleTelegramUpdate>>
  try {
    reply = await handleTelegramUpdate(update, {
      requireMention: requireMentionEnabled(),
      identity: await getBotIdentity(),
    })
  } catch (err: any) {
    console.error('[TelegramWebhook] handler error:', err?.message)
    return NextResponse.json({ ok: true })
  }

  if (reply.text && chatId !== undefined) {
    await sendTelegramMessage(String(chatId), reply.text, reply.replyTo).catch((e) =>
      console.error('[TelegramWebhook] send error:', e?.message)
    )
  }

  return NextResponse.json({ ok: true })
}

/**
 * Group gate switch. Default ON: in groups the bot only reacts when it is
 * @mentioned, when the message replies to one of its own messages, or when a
 * slash command carries its @username suffix. Set TELEGRAM_REQUIRE_MENTION=false
 * to restore the old "parse every message" behaviour.
 */
function requireMentionEnabled(): boolean {
  const raw = process.env.TELEGRAM_REQUIRE_MENTION
  if (raw === undefined || raw === '') return true
  return !['false', '0', 'no', 'off'].includes(raw.trim().toLowerCase())
}

let botIdentityCache: { value: BotIdentity; at: number } | null = null
const BOT_IDENTITY_TTL_MS = 10 * 60 * 1000

/** Resolve our own @username + id via getMe; cached, never throws. */
async function getBotIdentity(): Promise<BotIdentity> {
  const now = Date.now()
  if (botIdentityCache && now - botIdentityCache.at < BOT_IDENTITY_TTL_MS) {
    return botIdentityCache.value
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('[TelegramWebhook] TELEGRAM_BOT_TOKEN belum diset, gate mention nonaktif')
    return {}
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(10000),
    })
    const body: any = await res.json().catch(() => null)
    const value: BotIdentity = {
      username: body?.result?.username,
      id: body?.result?.id,
    }
    if (value.username && value.id != null) {
      botIdentityCache = { value, at: now }
    }
    return value
  } catch (err: any) {
    console.error('[TelegramWebhook] getMe error:', err?.message)
    return {}
  }
}

/** Kirim balasan via Bot API langsung (bukan lewat Hermes gateway). */
async function sendTelegramMessage(chatId: string, text: string, replyTo?: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('[TelegramWebhook] TELEGRAM_BOT_TOKEN belum diset')
    return
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...(replyTo ? { reply_to_message_id: replyTo, allow_sending_without_reply: true } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[TelegramWebhook] sendMessage ${res.status}: ${body.slice(0, 300)}`)
  }
}
