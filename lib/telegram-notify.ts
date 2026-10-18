/**
 * Helper pengiriman notifikasi Telegram via Hermes Gateway lokal
 */
export async function sendTelegramNotification(message: string, chatId?: string): Promise<boolean> {
  try {
    const targetChat = chatId || process.env.TELEGRAM_CHAT_ID || '-1001632714632'
    const gatewayUrl = process.env.HERMES_GATEWAY_URL || 'http://127.0.0.1:3001'

    const res = await fetch(`${gatewayUrl}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'telegram',
        chat_id: targetChat,
        text: message,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error(`[TelegramNotify] Gagal (${res.status}):`, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err: any) {
    console.error('[TelegramNotify] Error:', err.message)
    return false
  }
}
