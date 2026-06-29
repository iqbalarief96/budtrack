import prisma from '@/lib/prisma'

const VALID_STATUSES = new Set(['open', 'partially_paid', 'paid', 'cancelled'])
const VALID_PARTICIPANT_STATUSES = new Set(['unpaid', 'partial', 'paid', 'waived'])
const VALID_SPLIT_METHODS = new Set(['equal', 'fixed', 'percentage'])
const VALID_RECURRENCES = new Set(['none', 'weekly', 'monthly', 'yearly'])
const VALID_OWNERSHIPS = new Set(['HIS', 'HERS', 'SHARED'])

type ParticipantInput = {
  id?: string
  userId?: string | null
  name: string
  email?: string | null
  shareAmount?: number | string | null
  sharePercent?: number | string | null
  paidAmount?: number | string | null
  status?: string | null
  ownerRole?: string | null
  settlementNote?: string | null
}

type SharedBillInput = {
  walletId?: string | null
  walletGroupId?: string | null
  title: string
  description?: string | null
  category?: string | null
  totalAmount: number | string
  currencyCode?: string | null
  dueDate?: string | null
  paidAt?: string | null
  status?: string | null
  ownership?: string | null
  splitMethod?: string | null
  recurrence?: string | null
  notes?: string | null
  participants?: ParticipantInput[]
}

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback)
  return Number.isFinite(num) ? num : fallback
}

function parseDate(value: unknown) {
  if (!value || typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function assertSharedBillScope(sharedBillId: string, userId: string) {
  return prisma.sharedBill.findFirst({
    where: { id: sharedBillId, userId },
    include: sharedBillInclude,
  })
}

export async function assertWalletScope(walletId: string | null | undefined, userId: string) {
  if (!walletId) return true
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } })
  return Boolean(wallet)
}

export async function assertWalletGroupScope(walletGroupId: string | null | undefined, userId: string) {
  if (!walletGroupId) return true
  const group = await prisma.walletGroup.findFirst({ where: { id: walletGroupId, userId }, select: { id: true } })
  return Boolean(group)
}

export const sharedBillInclude = {
  wallet: { select: { id: true, name: true, color: true, currencyCode: true } },
  walletGroup: { select: { id: true, name: true, color: true, icon: true } },
  participants: { orderBy: { createdAt: 'asc' as const } },
}

export function normalizeParticipants(input: ParticipantInput[] | undefined, totalAmount: number, splitMethod: string) {
  const source = Array.isArray(input) ? input : []
  const participants = source
    .map((participant) => ({
      id: participant.id,
      userId: participant.userId || null,
      name: cleanString(participant.name),
      email: participant.email ? cleanString(participant.email) : null,
      shareAmount: toNumber(participant.shareAmount, 0),
      sharePercent: participant.sharePercent === null || participant.sharePercent === undefined || participant.sharePercent === ''
        ? null
        : toNumber(participant.sharePercent, 0),
      paidAmount: Math.max(0, toNumber(participant.paidAmount, 0)),
      status: participant.status && VALID_PARTICIPANT_STATUSES.has(participant.status) ? participant.status : 'unpaid',
      ownerRole: participant.ownerRole && VALID_OWNERSHIPS.has(participant.ownerRole.toUpperCase()) ? participant.ownerRole.toUpperCase() : 'SHARED',
      settlementNote: participant.settlementNote ? cleanString(participant.settlementNote) : null,
    }))
    .filter((participant) => participant.name.length > 0)

  if (participants.length === 0) return []

  if (splitMethod === 'equal') {
    const baseShare = Math.floor((totalAmount / participants.length) * 100) / 100
    const remainder = Math.round((totalAmount - baseShare * participants.length) * 100) / 100
    return participants.map((participant, index) => ({
      ...participant,
      shareAmount: index === 0 ? Math.round((baseShare + remainder) * 100) / 100 : baseShare,
      sharePercent: Math.round((100 / participants.length) * 100) / 100,
    }))
  }

  if (splitMethod === 'percentage') {
    return participants.map((participant) => {
      const percent = participant.sharePercent ?? 0
      return {
        ...participant,
        sharePercent: percent,
        shareAmount: Math.round(totalAmount * (percent / 100) * 100) / 100,
      }
    })
  }

  return participants
}

export function deriveParticipantStatus(shareAmount: number, paidAmount: number, requestedStatus?: string | null) {
  if (requestedStatus === 'waived') return { status: 'waived', paidAt: null }
  if (paidAmount <= 0) return { status: 'unpaid', paidAt: null }
  if (paidAmount >= shareAmount) return { status: 'paid', paidAt: new Date() }
  return { status: 'partial', paidAt: null }
}

export function deriveBillStatus(participants: Array<{ status: string; paidAmount: number; shareAmount: number }>, fallbackStatus = 'open') {
  if (fallbackStatus === 'cancelled') return 'cancelled'
  if (participants.length === 0) return fallbackStatus
  const allSettled = participants.every((participant) => participant.status === 'paid' || participant.status === 'waived')
  if (allSettled) return 'paid'
  const hasPayment = participants.some((participant) => participant.paidAmount > 0 || participant.status === 'partial' || participant.status === 'paid')
  return hasPayment ? 'partially_paid' : 'open'
}

export function normalizeSharedBillPayload(body: SharedBillInput) {
  const totalAmount = Math.max(0, toNumber(body.totalAmount, 0))
  const splitMethod = body.splitMethod && VALID_SPLIT_METHODS.has(body.splitMethod) ? body.splitMethod : 'equal'
  const status = body.status && VALID_STATUSES.has(body.status) ? body.status : 'open'
  const recurrence = body.recurrence && VALID_RECURRENCES.has(body.recurrence) ? body.recurrence : 'none'
  const ownership = body.ownership && VALID_OWNERSHIPS.has(body.ownership.toUpperCase()) ? body.ownership.toUpperCase() : 'SHARED'
  const participants = normalizeParticipants(body.participants, totalAmount, splitMethod).map((participant) => {
    const derived = deriveParticipantStatus(participant.shareAmount, participant.paidAmount, participant.status)
    return { ...participant, status: participant.status === 'waived' ? 'waived' : derived.status, paidAt: derived.paidAt }
  })
  const derivedStatus = deriveBillStatus(participants, status)

  return {
    walletId: body.walletId || null,
    walletGroupId: body.walletGroupId || null,
    title: cleanString(body.title),
    description: body.description ? cleanString(body.description) : null,
    category: body.category ? cleanString(body.category) : 'household',
    totalAmount,
    currencyCode: body.currencyCode ? cleanString(body.currencyCode).toUpperCase() : 'IDR',
    dueDate: parseDate(body.dueDate),
    paidAt: derivedStatus === 'paid' ? parseDate(body.paidAt) ?? new Date() : parseDate(body.paidAt),
    status: derivedStatus,
    ownership,
    splitMethod,
    recurrence,
    notes: body.notes ? cleanString(body.notes) : null,
    participants,
  }
}

export async function listSharedBills(userId: string, filters: { status?: string | null; walletId?: string | null; walletGroupId?: string | null }) {
  return prisma.sharedBill.findMany({
    where: {
      userId,
      ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.walletId ? { walletId: filters.walletId } : {}),
      ...(filters.walletGroupId ? { walletGroupId: filters.walletGroupId } : {}),
    },
    include: sharedBillInclude,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function createSharedBill(userId: string, body: SharedBillInput) {
  const data = normalizeSharedBillPayload(body)
  if (!data.title) throw new Error('Shared bill title is required')
  if (!(await assertWalletScope(data.walletId, userId))) throw new Error('Wallet not found')
  if (!(await assertWalletGroupScope(data.walletGroupId, userId))) throw new Error('Wallet group not found')

  return prisma.sharedBill.create({
    data: {
      userId,
      walletId: data.walletId,
      walletGroupId: data.walletGroupId,
      title: data.title,
      description: data.description,
      category: data.category,
      totalAmount: data.totalAmount,
      currencyCode: data.currencyCode,
      dueDate: data.dueDate,
      paidAt: data.paidAt,
      status: data.status,
      ownership: data.ownership,
      splitMethod: data.splitMethod,
      recurrence: data.recurrence,
      notes: data.notes,
      participants: {
        create: data.participants.map((participant) => ({
          userId: participant.userId,
          name: participant.name,
          email: participant.email,
          shareAmount: participant.shareAmount,
          sharePercent: participant.sharePercent,
          paidAmount: participant.paidAmount,
          status: participant.status,
          ownerRole: participant.ownerRole,
          paidAt: participant.paidAt,
          settlementNote: participant.settlementNote,
        })),
      },
    },
    include: sharedBillInclude,
  })
}

export async function updateSharedBill(userId: string, sharedBillId: string, body: SharedBillInput) {
  const existing = await assertSharedBillScope(sharedBillId, userId)
  if (!existing) throw new Error('Shared bill not found')
  const data = normalizeSharedBillPayload(body)
  if (!data.title) throw new Error('Shared bill title is required')
  if (!(await assertWalletScope(data.walletId, userId))) throw new Error('Wallet not found')
  if (!(await assertWalletGroupScope(data.walletGroupId, userId))) throw new Error('Wallet group not found')

  return prisma.$transaction(async (tx) => {
    await tx.sharedBillParticipant.deleteMany({ where: { sharedBillId } })
    return tx.sharedBill.update({
      where: { id: sharedBillId },
      data: {
        walletId: data.walletId,
        walletGroupId: data.walletGroupId,
        title: data.title,
        description: data.description,
        category: data.category,
        totalAmount: data.totalAmount,
        currencyCode: data.currencyCode,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        status: data.status,
        ownership: data.ownership,
        splitMethod: data.splitMethod,
        recurrence: data.recurrence,
        notes: data.notes,
        participants: {
          create: data.participants.map((participant) => ({
            userId: participant.userId,
            name: participant.name,
            email: participant.email,
            shareAmount: participant.shareAmount,
            sharePercent: participant.sharePercent,
            paidAmount: participant.paidAmount,
            status: participant.status,
            ownerRole: participant.ownerRole,
            paidAt: participant.paidAt,
            settlementNote: participant.settlementNote,
          })),
        },
      },
      include: sharedBillInclude,
    })
  })
}

export async function deleteSharedBill(userId: string, sharedBillId: string) {
  const existing = await assertSharedBillScope(sharedBillId, userId)
  if (!existing) throw new Error('Shared bill not found')
  await prisma.sharedBill.delete({ where: { id: sharedBillId } })
  return { success: true }
}

export async function settleParticipant(userId: string, sharedBillId: string, participantId: string, paidAmount: number, settlementNote?: string | null) {
  const bill = await assertSharedBillScope(sharedBillId, userId)
  if (!bill) throw new Error('Shared bill not found')
  const participant = bill.participants.find((item) => item.id === participantId)
  if (!participant) throw new Error('Participant not found')

  const newPaidAmount = Math.max(0, paidAmount)
  const derived = deriveParticipantStatus(participant.shareAmount, newPaidAmount)

  return prisma.$transaction(async (tx) => {
    await tx.sharedBillParticipant.update({
      where: { id: participantId },
      data: {
        paidAmount: newPaidAmount,
        status: derived.status,
        paidAt: derived.paidAt,
        settlementNote: settlementNote ?? participant.settlementNote,
      },
    })

    const updatedParticipants = await tx.sharedBillParticipant.findMany({ where: { sharedBillId } })
    const status = deriveBillStatus(updatedParticipants, bill.status)
    return tx.sharedBill.update({
      where: { id: sharedBillId },
      data: { status, paidAt: status === 'paid' ? new Date() : null },
      include: sharedBillInclude,
    })
  })
}
