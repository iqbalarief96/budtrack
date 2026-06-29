import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { parse } from 'csv-parse/sync'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAutoSavingsTransfer } from '@/lib/savings/auto-route'

export const dynamic = 'force-dynamic'

type CsvRow = Record<string, string>

type NormalizedRow = {
  rowNumber: number
  date: Date
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  categoryName?: string
  rawRow: CsvRow
  rowHash: string
}

const FIELD_ALIASES = {
  date: ['date', 'tanggal', 'transaction_date', 'posted_date', 'posting date', 'tgl'],
  description: ['description', 'desc', 'keterangan', 'memo', 'merchant', 'details', 'narration', 'uraian'],
  amount: ['amount', 'nominal', 'jumlah', 'value', 'transaction amount', 'mutasi'],
  debit: ['debit', 'withdrawal', 'out', 'keluar', 'pengeluaran'],
  credit: ['credit', 'deposit', 'in', 'masuk', 'pemasukan'],
  type: ['type', 'jenis', 'direction'],
  category: ['category', 'kategori'],
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[\s_\-.]+/g, ' ').trim()
}

function valueFor(row: CsvRow, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeKey))
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeKey(key))) {
      return value?.trim()
    }
  }
  return undefined
}

function parseAmount(value?: string) {
  if (!value) return null
  const raw = value.replace(/[^0-9,.-]/g, '')
  if (!raw) return null

  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')
  let normalized = raw

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    normalized = lastComma > lastDot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '')
  } else if (hasComma) {
    const parts = raw.split(',')
    normalized = parts.at(-1)?.length === 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '')
  } else if (hasDot) {
    const parts = raw.split('.')
    normalized = parts.at(-1)?.length === 2 ? raw.replace(/,/g, '') : raw.replace(/\./g, '')
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function parseDate(value?: string) {
  if (!value) return null
  const trimmed = value.trim()
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) return direct

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!match) return null

  const [, dd, mm, yyyy] = match
  const year = yyyy.length === 2 ? Number(`20${yyyy}`) : Number(yyyy)
  const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)))
  return Number.isNaN(date.getTime()) ? null : date
}

function detectType(row: CsvRow, signedAmount: number): 'INCOME' | 'EXPENSE' {
  const explicitType = valueFor(row, FIELD_ALIASES.type)?.toUpperCase()
  if (explicitType) {
    if (['INCOME', 'CREDIT', 'CR', 'MASUK', 'PEMASUKAN'].includes(explicitType)) return 'INCOME'
    if (['EXPENSE', 'DEBIT', 'DR', 'KELUAR', 'PENGELUARAN'].includes(explicitType)) return 'EXPENSE'
  }
  if (valueFor(row, FIELD_ALIASES.credit)) return 'INCOME'
  if (valueFor(row, FIELD_ALIASES.debit)) return 'EXPENSE'
  return signedAmount < 0 ? 'EXPENSE' : 'INCOME'
}

function normalizeRow(row: CsvRow, rowNumber: number): NormalizedRow {
  const date = parseDate(valueFor(row, FIELD_ALIASES.date))
  if (!date) throw new Error('Invalid or missing date')

  const debit = parseAmount(valueFor(row, FIELD_ALIASES.debit))
  const credit = parseAmount(valueFor(row, FIELD_ALIASES.credit))
  const genericAmount = parseAmount(valueFor(row, FIELD_ALIASES.amount))
  const signedAmount = credit ?? (debit != null ? -Math.abs(debit) : genericAmount)

  if (signedAmount == null || signedAmount === 0) throw new Error('Invalid or missing amount')

  const type = detectType(row, signedAmount)
  const description = valueFor(row, FIELD_ALIASES.description) || `Bank import row ${rowNumber}`
  const amount = Math.abs(signedAmount)
  const categoryName = valueFor(row, FIELD_ALIASES.category)
  const rawRow = Object.fromEntries(
    Object.entries(row).map(([key, value]: [string, string]) => [key, String(value ?? '')])
  )
  const rowHash = createHash('sha256')
    .update(JSON.stringify({ date: date.toISOString().slice(0, 10), description, amount, type, rawRow }))
    .digest('hex')

  return { rowNumber, date, description, amount, type, categoryName, rawRow, rowHash }
}

async function findCategory(userId: string, type: 'INCOME' | 'EXPENSE', categoryName?: string) {
  if (categoryName) {
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    })
    const exact = categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase())
    if (exact) return exact.id
  }

  const fallback = await prisma.category.findFirst({
    where: { userId, type },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  return fallback?.id ?? null
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const walletId = formData.get('walletId')?.toString()

  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
  if (!walletId) return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 })

  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } })
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  const csvContent = await file.text()
  if (!csvContent.trim()) return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })

  let rows: CsvRow[]
  try {
    rows = parse(csvContent, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as CsvRow[]
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse CSV', details: error instanceof Error ? error.message : 'Unknown parser error' },
      { status: 400 }
    )
  }

  if (!rows.length) return NextResponse.json({ error: 'No records found in CSV' }, { status: 400 })

  const created: Array<{ transactionId: string; importRecordId: string; rowNumber: number }> = []
  const skipped: Array<{ rowNumber: number; reason: string }> = []
  const failed: Array<{ rowNumber: number; error: string }> = []

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    try {
      const normalized = normalizeRow(row, rowNumber)
      const categoryId = await findCategory(userId, normalized.type, normalized.categoryName)

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.importRecord.findUnique({
          where: { userId_walletId_rowHash: { userId, walletId, rowHash: normalized.rowHash } },
          select: { id: true },
        })
        if (existing) {
          const linkedTransaction = await tx.transaction.findFirst({
            where: { importRecordId: existing.id },
            select: { id: true },
          })
          if (linkedTransaction) return { duplicate: true as const }

          const repairedTransaction = await tx.transaction.create({
            data: {
              amount: normalized.amount,
              description: normalized.description,
              date: normalized.date,
              type: normalized.type,
              userId,
              walletId,
              categoryId,
              importRecordId: existing.id,
            },
            select: { id: true },
          })

          await tx.wallet.update({
            where: { id: walletId },
            data: {
              balance: {
                increment: normalized.type === 'INCOME' ? normalized.amount : -normalized.amount,
              },
            },
          })

          return { duplicate: false as const, transactionId: repairedTransaction.id, importRecordId: existing.id, repaired: true as const }
        }

        const importRecord = await tx.importRecord.create({
          data: {
            userId,
            walletId,
            source: 'bank_csv',
            fileName: file.name,
            rowHash: normalized.rowHash,
            rawRow: JSON.stringify(normalized.rawRow),
            parsedDate: normalized.date,
            parsedAmount: normalized.amount,
            parsedType: normalized.type,
            status: 'IMPORTED',
          },
          select: { id: true },
        })

        const transaction = await tx.transaction.create({
          data: {
            amount: normalized.amount,
            description: normalized.description,
            date: normalized.date,
            type: normalized.type,
            userId,
            walletId,
            categoryId,
            importRecordId: importRecord.id,
          },
          select: { id: true },
        })

        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balance: {
              increment: normalized.type === 'INCOME' ? normalized.amount : -normalized.amount,
            },
          },
        })

        return { duplicate: false as const, transactionId: transaction.id, importRecordId: importRecord.id, repaired: false as const }
      })

      if (result.duplicate) {
        skipped.push({ rowNumber, reason: 'Duplicate import row' })
      } else if ('transactionId' in result) {
        if (normalized.type === 'EXPENSE') {
          await createAutoSavingsTransfer({
            userId,
            sourceTransactionId: result.transactionId,
            sourceWalletId: walletId,
            categoryId,
            amount: normalized.amount,
            date: normalized.date,
            description: normalized.description,
            categoryName: normalized.categoryName,
          })
        }
        created.push({ rowNumber, transactionId: result.transactionId, importRecordId: result.importRecordId })
      }
    } catch (error) {
      const message = error instanceof Prisma.PrismaClientKnownRequestError ? error.message : error instanceof Error ? error.message : 'Unknown import error'
      failed.push({ rowNumber, error: message })
    }
  }

  return NextResponse.json({
    message: `Imported ${created.length} transaction(s)`,
    summary: {
      totalRows: rows.length,
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    created,
    skipped,
    failed,
  })
}
