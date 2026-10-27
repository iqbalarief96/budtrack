import prisma from '@/lib/prisma'
import { withComputedBalances } from '@/lib/walletBalance'
import { createQuickCaptureTransaction } from '@/lib/quick-capture'

/**
 * Two-way Telegram bot for BudTrack (suami-istri group capture).
 * Every write goes through the shared capture pipeline, except /edit which
 * performs a guarded balance-preserving update of an existing chat capture.
 */

export const TELEGRAM_COMMANDS = [
  '/start', '/help', '/whoami', '/sisa', '/batal', '/terakhir',
  '/hari', '/minggu', '/bulan', '/kategori', '/cari', '/budget', '/edit',
] as const

export interface BotIdentity {
  username?: string
  id?: number | string
}

function addressMatches(_text: string, token: string, identity: BotIdentity): boolean {
  const handle = token.slice(1).toLowerCase()
  const own = (identity.username ?? '').replace(/^@/, '').toLowerCase()
  return Boolean(own && handle === own)
}

export function isBotAddressed(
  msg: NonNullable<TelegramUpdate['message']>,
  identity: BotIdentity,
  opts: { requireMention: boolean },
): boolean {
  if (!opts.requireMention) return true
  if (!msg.chat.type || msg.chat.type === 'private') return true

  const text = (msg.text ?? '').trim()
  const replyFromId = msg.reply_to_message?.from?.id
  if (replyFromId != null && identity.id != null && String(replyFromId) === String(identity.id)) return true

  const tokens = text.split(/\s+/).filter(Boolean)
  const first = tokens[0] ?? ''
  if (first.startsWith('/')) {
    const at = first.indexOf('@')
    if (at > 0) return addressMatches(first, first.slice(at), identity)
    return false
  }
  return tokens.some((t) => t.startsWith('@') && addressMatches(text, t, identity))
}

function stripOwnMention(text: string, identity?: BotIdentity): string {
  const trimmed = (text ?? '').trim()
  const own = (identity?.username ?? '').replace(/^@/, '').trim()
  if (!own) return trimmed
  const escaped = own.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return trimmed.replace(new RegExp(`(^|\\s)@${escaped}\\b`, 'gi'), '$1').replace(/\s{2,}/g, ' ').trim()
}

const HELP_TEXT = [
  '*BudTrack Bot*',
  '',
  '*Catat transaksi*',
  '`makan siang 35rb`',
  '`gaji 8jt du`',
  '`tabungan emas 500rb kemarin`',
  '',
  '*Lihat data*',
  '`/terakhir [jumlah] [du|selly]`',
  '`/hari [du|selly]` — ringkasan hari ini',
  '`/minggu [du|selly]` — ringkasan 7 hari',
  '`/bulan [du|selly]` — ringkasan bulan ini',
  '`/kategori <nama> [wallet:du|wallet:selly]`',
  '`/cari <kata> [wallet:du|wallet:selly]`',
  '`/budget [du|selly]`',
  '`/sisa` — saldo & top pengeluaran',
  '',
  '*Ubah/batalkan*',
  'Reply balasan `✅ Tercatat`, lalu:',
  '`/edit kategori Makan`',
  '`/edit wallet du`',
  '`/edit kategori Makan wallet du`',
  '`/batal` — batalkan transaksi chat terakhir',
  '',
  '`/whoami` — cek akun yang terhubung',
].join('\n')

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const md = (value: string) => value.replace(/([_*`\[\]\\])/g, '\\$1')
const formatDate = (d: Date) => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
}).format(d)

export interface TelegramUpdate {
  message?: {
    message_id: number
    text?: string
    chat: { id: number | string; type?: string; title?: string }
    from?: { id: number | string; first_name?: string; username?: string }
    reply_to_message?: {
      message_id: number
      text?: string
      from?: { id: number | string; is_bot?: boolean; username?: string }
    }
  }
}

export interface BotReply {
  text: string | null
  replyTo?: number
}

async function resolveActor(telegramId: string) {
  return prisma.telegramActor.findUnique({
    where: { telegramId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
}

type MainWallet = { id: string; name: string; balance: number; isDefault: boolean; currencyCode: string | null }

function walletAlias(value: string): string {
  const q = value.trim().toLowerCase()
  if (q === 'du' || q === 'utama' || q === 'dompet utama') return 'dompet utama'
  if (q === 'selly' || q === 's') return 'selly'
  return q
}

async function resolveMainWallet(userId: string, requested?: string, actorDefault?: string | null): Promise<MainWallet | null> {
  const wallets = await prisma.wallet.findMany({
    where: { userId, type: 'MAIN' },
    select: { id: true, name: true, balance: true, isDefault: true, currencyCode: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  if (!wallets.length) return null
  const query = walletAlias(requested || actorDefault || '')
  if (query) {
    const exact = wallets.find((w) => w.name.toLowerCase() === query)
    if (exact) return exact
    if (query.length >= 3) {
      const partial = wallets.find((w) => w.name.toLowerCase().includes(query))
      if (partial) return partial
    }
    if (requested) return null
  }
  return wallets[0]
}

function extractWalletOption(input: string, allowBare = false): { rest: string; wallet?: string } {
  let rest = input.trim()
  const explicit = rest.match(/(?:^|\s)(?:wallet|dompet):\s*(du|selly)\s*$/i)
  if (explicit) return { rest: rest.slice(0, explicit.index).trim(), wallet: explicit[1] }
  const words = rest.split(/\s+/)
  if (allowBare && words.length && /^(du|selly)$/i.test(words[words.length - 1])) {
    return { rest: words.slice(0, -1).join(' '), wallet: words[words.length - 1] }
  }
  return { rest }
}

function commandArgs(raw: string): string {
  return raw.trim().split(/\s+/).slice(1).join(' ').trim()
}

function wibParts(now = new Date()) {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() }
}

function wibMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - 7 * 60 * 60 * 1000)
}

type Period = 'day' | 'week' | 'month'
function periodRange(period: Period, now = new Date()): { start: Date; end: Date; label: string } {
  const { y, m, d } = wibParts(now)
  if (period === 'day') {
    return { start: wibMidnight(y, m, d), end: wibMidnight(y, m, d + 1), label: 'Hari Ini' }
  }
  if (period === 'week') {
    return { start: wibMidnight(y, m, d - 6), end: wibMidnight(y, m, d + 1), label: '7 Hari Terakhir' }
  }
  return { start: wibMidnight(y, m, 1), end: wibMidnight(y, m + 1, 1), label: 'Bulan Ini' }
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  opts: { requireMention?: boolean; identity?: BotIdentity } = {},
): Promise<BotReply> {
  const msg = update.message
  if (!msg?.text) return { text: null }

  const chatId = String(msg.chat.id)
  const telegramId = String(msg.from?.id ?? '')
  const raw = stripOwnMention(msg.text, opts.identity)
  if (!telegramId) return { text: null }

  if (opts.requireMention && opts.identity && !isBotAddressed(msg, opts.identity, { requireMention: true })) {
    return { text: null }
  }

  const actor = await resolveActor(telegramId)
  const [firstToken = ''] = raw.toLowerCase().split(/\s+/)
  const cmd = firstToken.startsWith('/') ? firstToken.split('@')[0] : firstToken

  if (cmd === '/start' || cmd === '/help') return { text: HELP_TEXT, replyTo: msg.message_id }

  if (cmd === '/whoami') {
    if (!actor) return { text: `Telegram ID lo *${telegramId}* belum ke-map ke akun BudTrack.\nMinta admin daftarin dulu.`, replyTo: msg.message_id }
    return {
      text: `Ke-map ke: *${md(actor.user.name ?? actor.user.email)}*\nRole: \`${actor.role}\`\nWallet default: *${md(actor.defaultWalletName ?? 'Dompet Utama')}*`,
      replyTo: msg.message_id,
    }
  }

  if (!actor) {
    return { text: `Akun Telegram ini belum terdaftar.\nID lo: \`${telegramId}\`\nKirim ID ini ke admin BudTrack.`, replyTo: msg.message_id }
  }

  const args = commandArgs(raw)
  if (cmd === '/sisa') return { text: await buildSummary(actor.user.id), replyTo: msg.message_id }
  if (cmd === '/batal') return { text: await revertLastCapture(chatId, telegramId), replyTo: msg.message_id }
  if (cmd === '/terakhir') return { text: await buildLatest(actor.user.id, actor.defaultWalletName, args), replyTo: msg.message_id }
  if (cmd === '/hari') return { text: await buildPeriodSummary(actor.user.id, actor.defaultWalletName, 'day', args), replyTo: msg.message_id }
  if (cmd === '/minggu') return { text: await buildPeriodSummary(actor.user.id, actor.defaultWalletName, 'week', args), replyTo: msg.message_id }
  if (cmd === '/bulan') return { text: await buildPeriodSummary(actor.user.id, actor.defaultWalletName, 'month', args), replyTo: msg.message_id }
  if (cmd === '/kategori') return { text: await buildCategoryReport(actor.user.id, actor.defaultWalletName, args), replyTo: msg.message_id }
  if (cmd === '/cari') return { text: await buildSearch(actor.user.id, actor.defaultWalletName, args), replyTo: msg.message_id }
  if (cmd === '/budget') return { text: await buildBudget(actor.user.id, actor.defaultWalletName, args), replyTo: msg.message_id }
  if (cmd === '/edit') return { text: await editCapture(telegramId, msg.reply_to_message?.text, args), replyTo: msg.message_id }

  if (firstToken.startsWith('/')) {
    return { text: `Perintah tidak dikenal: \`${md(cmd)}\`. Ketik /help@${opts.identity?.username ?? 'budtrack_auto_bot'}.`, replyTo: msg.message_id }
  }

  try {
    const walletHint = actor.defaultWalletName ? { defaultWalletName: actor.defaultWalletName } : undefined
    const result = await createQuickCaptureTransaction(actor.user.id, raw, walletHint)
    const tx = result.data
    const log = await prisma.telegramCaptureLog.create({
      data: {
        chatId, telegramId, actorId: actor.id, rawText: raw,
        transactionId: tx?.id ?? null, amount: typeof tx?.amount === 'number' ? tx.amount : null,
        status: 'COMMITTED',
      },
    })
    return { text: [`✅ *Tercatat* (#${log.id.slice(-6)})`, result.message || ''].filter(Boolean).join('\n'), replyTo: msg.message_id }
  } catch (err: any) {
    return { text: `❌ Gagal catat: ${err?.message ?? 'format tidak dikenali'}`, replyTo: msg.message_id }
  }
}

async function buildLatest(userId: string, actorDefault: string | null, input: string): Promise<string> {
  const option = extractWalletOption(input, true)
  const nToken = option.rest.match(/^\d+$/)?.[0]
  const limit = Math.min(Math.max(Number(nToken || 10), 1), 20)
  const wallet = await resolveMainWallet(userId, option.wallet, actorDefault)
  if (!wallet) return 'Wallet tidak ditemukan. Pakai `du` atau `selly`.'
  const txs = await prisma.transaction.findMany({
    where: { userId, walletId: wallet.id }, include: { category: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: limit,
  })
  if (!txs.length) return `Belum ada transaksi di *${md(wallet.name)}*.`
  const lines = [`🧾 *${txs.length} Transaksi Terakhir — ${md(wallet.name)}*`, '']
  txs.forEach((t, i) => lines.push(
    `${i + 1}. ${formatDate(t.date)} • ${t.type === 'INCOME' ? '+' : '-'}${rupiah(t.amount)}\n   ${md(t.description || 'Tanpa deskripsi')} • _${md(t.category?.name || 'Tanpa kategori')}_`,
  ))
  return lines.join('\n')
}

async function buildPeriodSummary(userId: string, actorDefault: string | null, period: Period, input: string): Promise<string> {
  const option = extractWalletOption(input, true)
  const wallet = await resolveMainWallet(userId, option.wallet, actorDefault)
  if (!wallet) return 'Wallet tidak ditemukan. Pakai `du` atau `selly`.'
  const range = periodRange(period)
  const txs = await prisma.transaction.findMany({
    where: { userId, walletId: wallet.id, date: { gte: range.start, lt: range.end } },
    include: { category: true }, orderBy: { date: 'desc' },
  })
  const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const byCategory = new Map<string, number>()
  for (const t of txs.filter(t => t.type === 'EXPENSE')) {
    const name = t.category?.name || 'Tanpa kategori'
    byCategory.set(name, (byCategory.get(name) ?? 0) + t.amount)
  }
  const lines = [
    `📊 *${range.label} — ${md(wallet.name)}*`,
    `• Pemasukan: *+${rupiah(income)}*`,
    `• Pengeluaran: *-${rupiah(expense)}*`,
    `• Net: *${income - expense >= 0 ? '+' : '-'}${rupiah(Math.abs(income - expense))}*`,
    `• Jumlah transaksi: ${txs.length}`,
  ]
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  if (top.length) {
    lines.push('', '*Top Pengeluaran*')
    top.forEach(([name, total]) => lines.push(`• ${md(name)}: ${rupiah(total)}`))
  }
  return lines.join('\n')
}

async function buildCategoryReport(userId: string, actorDefault: string | null, input: string): Promise<string> {
  const option = extractWalletOption(input)
  const query = option.rest.trim().toLowerCase()
  if (!query) return 'Format: `/kategori makan` atau `/kategori makan wallet:selly`.'
  const wallet = await resolveMainWallet(userId, option.wallet, actorDefault)
  if (!wallet) return 'Wallet tidak ditemukan. Pakai `wallet:du` atau `wallet:selly`.'
  const categories = await prisma.category.findMany({ where: { userId }, select: { id: true, name: true } })
  const matches = categories.filter(c => c.name.toLowerCase() === query)
  const selected = matches.length ? matches : categories.filter(c => c.name.toLowerCase().includes(query))
  if (!selected.length) return `Kategori "${md(option.rest)}" tidak ditemukan.`
  const range = periodRange('month')
  const txs = await prisma.transaction.findMany({
    where: { userId, walletId: wallet.id, categoryId: { in: selected.map(c => c.id) }, date: { gte: range.start, lt: range.end } },
    include: { category: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 10,
  })
  const total = txs.reduce((s, t) => s + t.amount, 0)
  const lines = [`🏷️ *Kategori ${md(selected.map(c => c.name).join(', '))} — ${md(wallet.name)}*`, `Bulan ini: *${rupiah(total)}* (${txs.length} transaksi)`]
  if (!txs.length) lines.push('_Belum ada transaksi bulan ini._')
  else txs.forEach(t => lines.push(`• ${formatDate(t.date)} • ${rupiah(t.amount)} • ${md(t.description || 'Tanpa deskripsi')}`))
  return lines.join('\n')
}

async function buildSearch(userId: string, actorDefault: string | null, input: string): Promise<string> {
  const option = extractWalletOption(input)
  const query = option.rest.trim()
  if (!query) return 'Format: `/cari bensin` atau `/cari makan wallet:du`.'
  const wallet = await resolveMainWallet(userId, option.wallet, actorDefault)
  if (!wallet) return 'Wallet tidak ditemukan. Pakai `wallet:du` atau `wallet:selly`.'
  const txs = await prisma.transaction.findMany({
    where: { userId, walletId: wallet.id, description: { contains: query } },
    include: { category: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 15,
  })
  if (!txs.length) return `Nggak nemu transaksi "${md(query)}" di *${md(wallet.name)}*.`
  const lines = [`🔎 *Hasil "${md(query)}" — ${md(wallet.name)}*`, '']
  txs.forEach(t => lines.push(`• ${formatDate(t.date)} • ${t.type === 'INCOME' ? '+' : '-'}${rupiah(t.amount)} • ${md(t.description || '')} • _${md(t.category?.name || 'Tanpa kategori')}_`))
  return lines.join('\n')
}

async function buildBudget(userId: string, actorDefault: string | null, input: string): Promise<string> {
  const option = extractWalletOption(input, true)
  const wallet = await resolveMainWallet(userId, option.wallet, actorDefault)
  if (!wallet) return 'Wallet tidak ditemukan. Pakai `du` atau `selly`.'
  const now = new Date()
  const budgets = await prisma.budget.findMany({
    where: { userId, walletId: wallet.id, startDate: { lte: now }, endDate: { gte: now } },
    include: { category: true }, orderBy: { amount: 'desc' }, take: 20,
  })
  if (!budgets.length) return `Belum ada budget aktif untuk *${md(wallet.name)}*.`
  const rows = await Promise.all(budgets.map(async b => {
    const sum = await prisma.transaction.aggregate({
      where: { userId, walletId: wallet.id, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: b.startDate, lte: b.endDate } },
      _sum: { amount: true },
    })
    const spent = sum._sum.amount ?? 0
    return { name: b.category.name, amount: b.amount, spent, pct: b.amount > 0 ? spent / b.amount * 100 : 0 }
  }))
  const lines = [`🎯 *Budget Aktif — ${md(wallet.name)}*`, '']
  rows.forEach(r => lines.push(`• ${md(r.name)}: ${rupiah(r.spent)} / ${rupiah(r.amount)} (${r.pct.toFixed(0)}%)${r.spent > r.amount ? ' ⚠️' : ''}`))
  return lines.join('\n')
}

function parseEditArgs(input: string): { category?: string; wallet?: string } | null {
  const markers = [...input.matchAll(/(?:^|\s)(kategori|wallet|dompet)\s+/gi)]
  if (!markers.length) return null
  const result: { category?: string; wallet?: string } = {}
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const key = marker[1].toLowerCase()
    const start = (marker.index ?? 0) + marker[0].length
    const end = i + 1 < markers.length ? markers[i + 1].index! : input.length
    const value = input.slice(start, end).trim()
    if (!value) continue
    if (key === 'kategori') result.category = value
    else result.wallet = value
  }
  return result.category || result.wallet ? result : null
}

async function editCapture(telegramId: string, repliedText: string | undefined, input: string): Promise<string> {
  const suffix = repliedText?.match(/#([a-z0-9]{6})/i)?.[1]
  if (!suffix) return 'Reply balasan `✅ Tercatat (#xxxxxx)`, lalu ketik `/edit kategori Makan`, `/edit wallet du`, atau keduanya.'
  const changes = parseEditArgs(input)
  if (!changes) return 'Format: `/edit kategori Makan`, `/edit wallet du`, atau `/edit kategori Makan wallet du`.'

  const log = await prisma.telegramCaptureLog.findFirst({
    where: { telegramId, status: 'COMMITTED', id: { endsWith: suffix } },
    orderBy: { createdAt: 'desc' },
  })
  if (!log?.transactionId) return `Capture #${suffix} tidak ditemukan atau bukan milik akun ini.`
  const tx = await prisma.transaction.findUnique({ where: { id: log.transactionId }, include: { category: true, wallet: true } })
  if (!tx) return `Transaksi capture #${suffix} sudah tidak ada.`

  let targetWallet: { id: string; name: string } = { id: tx.wallet.id, name: tx.wallet.name }
  if (changes.wallet) {
    const resolved = await resolveMainWallet(tx.userId, changes.wallet)
    if (!resolved) return `Wallet "${md(changes.wallet)}" tidak ditemukan. Pakai \`du\` atau \`selly\`.`
    targetWallet = { id: resolved.id, name: resolved.name }
  }

  let targetCategory: { id: string; name: string } | null =
    tx.category ? { id: tx.category.id, name: tx.category.name } : null
  if (changes.category) {
    const categories = await prisma.category.findMany({ where: { userId: tx.userId }, select: { id: true, name: true, type: true } })
    const q = changes.category.toLowerCase()
    const exact = categories.filter(c => c.name.toLowerCase() === q)
    const partial = exact.length ? exact : categories.filter(c => c.name.toLowerCase().includes(q))
    if (partial.length !== 1) return partial.length ? `Kategori "${md(changes.category)}" ambigu. Tulis nama lengkap.` : `Kategori "${md(changes.category)}" tidak ditemukan.`
    if (partial[0].type !== tx.type) return `Kategori ${md(partial[0].name)} bertipe ${partial[0].type}, sedangkan transaksi ini ${tx.type}.`
    targetCategory = partial[0]
  }

  await prisma.$transaction(async db => {
    if (targetWallet.id !== tx.walletId) {
      const restoreOld = tx.type === 'EXPENSE' ? tx.amount : -tx.amount
      const applyNew = -restoreOld
      await db.wallet.update({ where: { id: tx.walletId }, data: { balance: { increment: restoreOld } } })
      await db.wallet.update({ where: { id: targetWallet.id }, data: { balance: { increment: applyNew } } })
    }
    await db.transaction.update({
      where: { id: tx.id },
      data: { walletId: targetWallet.id, categoryId: targetCategory?.id ?? null },
    })
  })
  return `✏️ Diubah: *${md(tx.description || 'transaksi')}* ${rupiah(tx.amount)}\n• Wallet: ${md(tx.wallet.name)} → *${md(targetWallet.name)}*\n• Kategori: ${md(tx.category?.name || '-')} → *${md(targetCategory?.name || '-')}*`
}

/** Ringkasan budget + saldo untuk /sisa. */
async function buildSummary(userId: string): Promise<string> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const [budgets, wallets] = await Promise.all([
    prisma.budget.findMany({ where: { userId, endDate: { gte: now } }, include: { category: true }, orderBy: { endDate: 'asc' }, take: 8 }).catch(() => [] as any[]),
    prisma.wallet.findMany({ where: { userId, type: 'MAIN' }, select: { id: true, name: true, currencyCode: true }, orderBy: { isDefault: 'desc' } }).then(withComputedBalances),
  ])
  const lines: string[] = ['📊 *Ringkasan Bulan Ini*', '', '*Saldo Dompet*']
  for (const w of wallets) lines.push(`• ${md(w.name)}: ${rupiah(w.balance)}`)
  lines.push('')
  const spent = await prisma.transaction.groupBy({
    by: ['categoryId'], where: { userId, type: 'EXPENSE', date: { gte: monthStart, lt: monthEnd }, wallet: { type: 'MAIN' } }, _sum: { amount: true },
  })
  if (spent.length) {
    lines.push('*Top Pengeluaran*')
    const cats = await prisma.category.findMany({ where: { id: { in: spent.map(s => s.categoryId!).filter(Boolean) } }, select: { id: true, name: true } })
    const nameOf = new Map(cats.map(c => [c.id, c.name]))
    spent.map(s => ({ name: nameOf.get(s.categoryId ?? '') ?? 'Tanpa kategori', total: s._sum.amount ?? 0 }))
      .sort((a, b) => b.total - a.total).slice(0, 5)
      .forEach(s => lines.push(`• ${md(s.name)}: ${rupiah(s.total)}`))
  } else lines.push('_Belum ada pengeluaran bulan ini._')
  void budgets
  return lines.join('\n')
}

/** Revert the last committed capture in this chat, including automation children. */
async function revertLastCapture(chatId: string, telegramId: string): Promise<string> {
  const last = await prisma.telegramCaptureLog.findFirst({ where: { chatId, telegramId, status: 'COMMITTED' }, orderBy: { createdAt: 'desc' } })
  if (!last) return 'Tidak ada transaksi chat yang bisa dibatalkan.'
  if (!last.transactionId) {
    await prisma.telegramCaptureLog.update({ where: { id: last.id }, data: { status: 'REVERTED', revertedAt: new Date() } })
    return `Log #${last.id.slice(-6)} ditandai batal (transaksi tidak ada).`
  }
  const tx = await prisma.transaction.findUnique({ where: { id: last.transactionId } })
  if (!tx) {
    await prisma.telegramCaptureLog.update({ where: { id: last.id }, data: { status: 'REVERTED', revertedAt: new Date() } })
    return `Transaksi sudah tidak ada. Log #${last.id.slice(-6)} ditutup.`
  }

  await prisma.$transaction(async db => {
    const children = await db.transaction.findMany({ where: { migrationSourceTransactionId: tx.id } })
    for (const child of children) {
      const childDelta = child.type === 'EXPENSE' ? child.amount : -child.amount
      await db.wallet.update({ where: { id: child.walletId }, data: { balance: { increment: childDelta } } })
      await db.transaction.delete({ where: { id: child.id } })
    }
    const delta = tx.type === 'EXPENSE' ? tx.amount : -tx.amount
    await db.wallet.update({ where: { id: tx.walletId }, data: { balance: { increment: delta } } })
    const activities = await db.goalActivity.findMany({ where: { transactionId: tx.id } })
    for (const a of activities) {
      await db.goal.update({ where: { id: a.goalId }, data: { current: { decrement: a.amount } } })
      await db.goalActivity.delete({ where: { id: a.id } })
    }
    await db.transaction.delete({ where: { id: tx.id } })
    await db.telegramCaptureLog.update({ where: { id: last.id }, data: { status: 'REVERTED', revertedAt: new Date() } })
  })
  return `🗑️ Dibatalkan: *${md(tx.description ?? 'transaksi')}* ${rupiah(tx.amount)} (log #${last.id.slice(-6)}).`
}
