/**
 * Map an AI provider error to a short, user-safe category for the browser.
 * Never forward provider response bodies or raw messages to the client: they
 * can contain credentials or private data. Log the full error server-side.
 */
export function describeAIError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (/timed out/i.test(raw)) return 'Timeout: AI gak merespons dalam batas waktu.'
  if (/Custom endpoint is required/i.test(raw)) return 'Custom endpoint belum diisi di Pengaturan.'
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|fetch failed|network/i.test(raw)) {
    return 'Gak bisa terhubung ke endpoint AI.'
  }
  const status = Number(raw.match(/->\s*(\d{3})\b/)?.[1])
  if (status === 401 || status === 403) return `API key ditolak provider (HTTP ${status}).`
  if (status === 404) return 'Endpoint atau model gak ditemukan (HTTP 404).'
  if (status === 429) return 'Kena rate limit provider (HTTP 429).'
  if (status >= 500) return `Server AI error (HTTP ${status}).`
  if (status) return `Provider menolak request (HTTP ${status}).`
  if (/Invalid AI response format/i.test(raw)) return 'Format respons AI gak valid.'
  return 'Error tidak dikenal, cek log server.'
}
