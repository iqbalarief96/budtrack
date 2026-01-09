import prisma from '@/lib/prisma'

// Constants
export const MAX_GROUPS_PER_USER = 5
export const MAX_WALLETS_PER_GROUP = 10
export const MAX_GROUP_NAME_LENGTH = 50

// Types
export interface WalletGroup {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  wallets: WalletGroupMember[]
}

export interface WalletGroupMember {
  id: string
  walletGroupId: string
  walletId: string
  addedAt: Date
  wallet: {
    id: string
    name: string
    balance: number
    calculatedBalance?: number // Real-time balance from transactions
    currencyCode: string
    icon: string | null
    color: string | null
    type: string
  }
}

export interface CreateWalletGroupInput {
  name: string
  description?: string
  icon?: string
  color?: string
  walletIds?: string[]
}

export interface UpdateWalletGroupInput {
  name?: string
  description?: string
  icon?: string
  color?: string
  walletIds?: string[]
}

// Error types
export class WalletGroupError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'WalletGroupError'
  }
}

/**
 * Calculate wallet balance from transactions in real-time
 * This is more accurate than the stored balance field
 */
export async function calculateWalletBalance(walletId: string): Promise<number> {
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        walletId,
        type: { in: ['income', 'INCOME'] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        walletId,
        type: { in: ['expense', 'EXPENSE'] },
      },
      _sum: { amount: true },
    }),
  ])

  const income = incomeResult._sum.amount || 0
  const expense = expenseResult._sum.amount || 0

  return income - expense
}

/**
 * Calculate balances for multiple wallets in parallel
 */
export async function calculateWalletBalances(walletIds: string[]): Promise<Map<string, number>> {
  const balanceMap = new Map<string, number>()
  
  await Promise.all(
    walletIds.map(async (walletId) => {
      const balance = await calculateWalletBalance(walletId)
      balanceMap.set(walletId, balance)
    })
  )
  
  return balanceMap
}

/**
 * Enrich wallet group with calculated balances
 */
async function enrichGroupWithCalculatedBalances(group: any): Promise<WalletGroup> {
  if (!group.wallets || group.wallets.length === 0) {
    return group as WalletGroup
  }

  const walletIds = group.wallets.map((m: any) => m.walletId)
  const balanceMap = await calculateWalletBalances(walletIds)

  return {
    ...group,
    wallets: group.wallets.map((member: any) => ({
      ...member,
      wallet: {
        ...member.wallet,
        balance: balanceMap.get(member.walletId) ?? member.wallet.balance,
        calculatedBalance: balanceMap.get(member.walletId) ?? member.wallet.balance,
      },
    })),
  } as WalletGroup
}

/**
 * Validate group name
 * - Must not be empty or whitespace only
 * - Must be 50 characters or less
 */
export function validateGroupName(name: string): { valid: boolean; error?: string; code?: string } {
  const trimmedName = name?.trim()
  
  if (!trimmedName || trimmedName.length === 0) {
    return { valid: false, error: 'Group name cannot be empty', code: 'INVALID_NAME' }
  }
  
  if (trimmedName.length > MAX_GROUP_NAME_LENGTH) {
    return { valid: false, error: 'Group name must be 50 characters or less', code: 'NAME_TOO_LONG' }
  }
  
  return { valid: true }
}

/**
 * Create a new wallet group
 * Requirements: 1.1, 1.2, 1.4
 */
export async function createGroup(
  userId: string,
  input: CreateWalletGroupInput
): Promise<WalletGroup> {
  // Validate name
  const nameValidation = validateGroupName(input.name)
  if (!nameValidation.valid) {
    throw new WalletGroupError(nameValidation.error!, nameValidation.code!)
  }

  // Check max groups constraint
  const existingGroupCount = await prisma.walletGroup.count({
    where: { userId },
  })

  if (existingGroupCount >= MAX_GROUPS_PER_USER) {
    throw new WalletGroupError(
      'Maximum of 5 wallet groups allowed',
      'MAX_GROUPS_EXCEEDED'
    )
  }

  // Create the group
  const group = await prisma.walletGroup.create({
    data: {
      name: input.name.trim(),
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      userId,
    },
    include: {
      wallets: {
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              balance: true,
              currencyCode: true,
              icon: true,
              color: true,
              type: true,
            },
          },
        },
      },
    },
  })

  // Add initial wallets if provided
  if (input.walletIds && input.walletIds.length > 0) {
    // Validate wallet count
    if (input.walletIds.length > MAX_WALLETS_PER_GROUP) {
      // Rollback by deleting the group
      await prisma.walletGroup.delete({ where: { id: group.id } })
      throw new WalletGroupError(
        'Maximum of 10 wallets per group allowed',
        'MAX_WALLETS_EXCEEDED'
      )
    }

    // Verify all wallets belong to the user
    const wallets = await prisma.wallet.findMany({
      where: {
        id: { in: input.walletIds },
        userId,
      },
    })

    if (wallets.length !== input.walletIds.length) {
      await prisma.walletGroup.delete({ where: { id: group.id } })
      throw new WalletGroupError('One or more wallets not found', 'WALLET_NOT_FOUND')
    }

    // Add wallets to group
    await prisma.walletGroupMember.createMany({
      data: input.walletIds.map((walletId) => ({
        walletGroupId: group.id,
        walletId,
      })),
    })

    // Fetch updated group with wallets (includes calculated balances)
    return getGroupById(group.id, userId) as Promise<WalletGroup>
  }

  return enrichGroupWithCalculatedBalances(group)
}

/**
 * Get all wallet groups for a user
 * Requirements: 1.1
 * Returns groups with real-time calculated balances
 */
export async function getGroups(userId: string): Promise<WalletGroup[]> {
  const groups = await prisma.walletGroup.findMany({
    where: { userId },
    include: {
      wallets: {
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              balance: true,
              currencyCode: true,
              icon: true,
              color: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Enrich all groups with calculated balances
  const enrichedGroups = await Promise.all(
    groups.map(group => enrichGroupWithCalculatedBalances(group))
  )

  return enrichedGroups
}

/**
 * Get a single wallet group by ID
 * Requirements: 1.1
 * Returns group with real-time calculated balances
 */
export async function getGroupById(
  groupId: string,
  userId: string
): Promise<WalletGroup | null> {
  const group = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
    include: {
      wallets: {
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              balance: true,
              currencyCode: true,
              icon: true,
              color: true,
              type: true,
            },
          },
        },
      },
    },
  })

  if (!group) return null

  return enrichGroupWithCalculatedBalances(group)
}

/**
 * Update a wallet group
 * Requirements: 5.2
 */
export async function updateGroup(
  groupId: string,
  userId: string,
  input: UpdateWalletGroupInput
): Promise<WalletGroup> {
  // Verify ownership
  const existing = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
  })

  if (!existing) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Validate name if provided
  if (input.name !== undefined) {
    const nameValidation = validateGroupName(input.name)
    if (!nameValidation.valid) {
      throw new WalletGroupError(nameValidation.error!, nameValidation.code!)
    }
  }

  const updateData: any = {}
  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.description !== undefined) updateData.description = input.description || null
  if (input.icon !== undefined) updateData.icon = input.icon || null
  if (input.color !== undefined) updateData.color = input.color || null

  // Handle wallet membership updates
  if (input.walletIds !== undefined) {
    // Validate wallet count
    if (input.walletIds.length > 10) {
      throw new WalletGroupError('Maximum of 10 wallets per group allowed', 'MAX_WALLETS_EXCEEDED')
    }

    // Verify all wallets belong to user
    if (input.walletIds.length > 0) {
      const wallets = await prisma.wallet.findMany({
        where: {
          id: { in: input.walletIds },
          userId,
        },
      })

      if (wallets.length !== input.walletIds.length) {
        throw new WalletGroupError('One or more wallets not found or not owned by user', 'WALLET_NOT_FOUND')
      }
    }

    // Delete existing memberships and create new ones
    await prisma.walletGroupMember.deleteMany({
      where: { walletGroupId: groupId },
    })

    if (input.walletIds.length > 0) {
      await prisma.walletGroupMember.createMany({
        data: input.walletIds.map(walletId => ({
          walletGroupId: groupId,
          walletId,
        })),
      })
    }
  }

  // Always update the group (even if just to refresh updatedAt)
  const hasUpdates = Object.keys(updateData).length > 0
  const group = await prisma.walletGroup.update({
    where: { id: groupId },
    data: hasUpdates ? updateData : { updatedAt: new Date() },
    include: {
      wallets: {
        include: {
          wallet: {
            select: {
              id: true,
              name: true,
              balance: true,
              currencyCode: true,
              icon: true,
              color: true,
              type: true,
            },
          },
        },
      },
    },
  })

  return enrichGroupWithCalculatedBalances(group)
}

/**
 * Delete a wallet group
 * Requirements: 5.3 - Deleting a group does not affect individual wallets
 */
export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  // Verify ownership
  const existing = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
  })

  if (!existing) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Delete the group (cascade will remove WalletGroupMember entries)
  // Individual wallets are NOT affected due to the schema design
  await prisma.walletGroup.delete({
    where: { id: groupId },
  })
}


/**
 * Add a wallet to a group
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * - Wallets can belong to multiple groups (2.2)
 * - Wallet data is preserved (2.3)
 * - Max 10 wallets per group (2.4)
 */
export async function addWalletToGroup(
  groupId: string,
  walletId: string,
  userId: string
): Promise<WalletGroupMember> {
  // Verify group ownership
  const group = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
    include: {
      wallets: true,
    },
  })

  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Verify wallet ownership
  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  })

  if (!wallet) {
    throw new WalletGroupError('Wallet not found', 'WALLET_NOT_FOUND')
  }

  // Check if wallet is already in this group
  const existingMember = group.wallets.find((m: { walletId: string }) => m.walletId === walletId)
  if (existingMember) {
    throw new WalletGroupError('Wallet is already in this group', 'WALLET_ALREADY_IN_GROUP')
  }

  // Check max wallets constraint
  if (group.wallets.length >= MAX_WALLETS_PER_GROUP) {
    throw new WalletGroupError(
      'Maximum of 10 wallets per group allowed',
      'MAX_WALLETS_EXCEEDED'
    )
  }

  // Add wallet to group
  const member = await prisma.walletGroupMember.create({
    data: {
      walletGroupId: groupId,
      walletId,
    },
    include: {
      wallet: {
        select: {
          id: true,
          name: true,
          balance: true,
          currencyCode: true,
          icon: true,
          color: true,
          type: true,
        },
      },
    },
  })

  return member as WalletGroupMember
}

/**
 * Remove a wallet from a group
 * Requirements: 5.1 - Wallet data is preserved after removal
 */
export async function removeWalletFromGroup(
  groupId: string,
  walletId: string,
  userId: string
): Promise<void> {
  // Verify group ownership
  const group = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
  })

  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  // Find the membership
  const member = await prisma.walletGroupMember.findFirst({
    where: {
      walletGroupId: groupId,
      walletId,
    },
  })

  if (!member) {
    throw new WalletGroupError('Wallet is not in this group', 'WALLET_NOT_IN_GROUP')
  }

  // Remove the membership (wallet data is preserved due to schema design)
  await prisma.walletGroupMember.delete({
    where: { id: member.id },
  })
}

/**
 * Get all wallets in a group
 */
export async function getGroupWallets(
  groupId: string,
  userId: string
): Promise<WalletGroupMember[]> {
  // Verify group ownership
  const group = await prisma.walletGroup.findFirst({
    where: { id: groupId, userId },
  })

  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const members = await prisma.walletGroupMember.findMany({
    where: { walletGroupId: groupId },
    include: {
      wallet: {
        select: {
          id: true,
          name: true,
          balance: true,
          currencyCode: true,
          icon: true,
          color: true,
          type: true,
        },
      },
    },
    orderBy: { addedAt: 'asc' },
  })

  return members as WalletGroupMember[]
}

/**
 * Check if a wallet can be added to a group
 * Returns validation result without modifying data
 */
export function canAddWalletToGroup(
  currentWalletCount: number,
  walletAlreadyInGroup: boolean
): { canAdd: boolean; error?: string; code?: string } {
  if (walletAlreadyInGroup) {
    return {
      canAdd: false,
      error: 'Wallet is already in this group',
      code: 'WALLET_ALREADY_IN_GROUP',
    }
  }

  if (currentWalletCount >= MAX_WALLETS_PER_GROUP) {
    return {
      canAdd: false,
      error: 'Maximum of 10 wallets per group allowed',
      code: 'MAX_WALLETS_EXCEEDED',
    }
  }

  return { canAdd: true }
}

/**
 * Wallet data snapshot for preservation verification
 * Requirements: 5.1, 5.3
 */
export interface WalletSnapshot {
  id: string
  name: string
  balance: number
  currencyCode: string
  icon: string | null
  color: string | null
  type: string
  userId: string
  transactionCount: number
}

/**
 * Get a snapshot of wallet data for preservation verification
 * Requirements: 5.1, 5.3
 */
export async function getWalletSnapshot(walletId: string): Promise<WalletSnapshot | null> {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      _count: {
        select: { transactions: true }
      }
    }
  })

  if (!wallet) return null

  return {
    id: wallet.id,
    name: wallet.name,
    balance: wallet.balance,
    currencyCode: wallet.currencyCode,
    icon: wallet.icon,
    color: wallet.color,
    type: wallet.type,
    userId: wallet.userId,
    transactionCount: wallet._count.transactions
  }
}

/**
 * Compare two wallet snapshots for equality
 * Used to verify wallet data preservation after unlink/delete operations
 * Requirements: 5.1, 5.3
 */
export function compareWalletSnapshots(
  before: WalletSnapshot,
  after: WalletSnapshot
): { equal: boolean; differences: string[] } {
  const differences: string[] = []

  if (before.id !== after.id) differences.push('id')
  if (before.name !== after.name) differences.push('name')
  if (before.balance !== after.balance) differences.push('balance')
  if (before.currencyCode !== after.currencyCode) differences.push('currencyCode')
  if (before.icon !== after.icon) differences.push('icon')
  if (before.color !== after.color) differences.push('color')
  if (before.type !== after.type) differences.push('type')
  if (before.userId !== after.userId) differences.push('userId')
  if (before.transactionCount !== after.transactionCount) differences.push('transactionCount')

  return {
    equal: differences.length === 0,
    differences
  }
}

/**
 * Verify wallet exists and is unchanged after an operation
 * Requirements: 5.1, 5.3
 */
export async function verifyWalletPreserved(
  beforeSnapshot: WalletSnapshot
): Promise<{ preserved: boolean; error?: string }> {
  const afterSnapshot = await getWalletSnapshot(beforeSnapshot.id)

  if (!afterSnapshot) {
    return { preserved: false, error: 'Wallet no longer exists' }
  }

  const comparison = compareWalletSnapshots(beforeSnapshot, afterSnapshot)

  if (!comparison.equal) {
    return {
      preserved: false,
      error: `Wallet data changed: ${comparison.differences.join(', ')}`
    }
  }

  return { preserved: true }
}

/**
 * Get all wallet IDs in a group
 * Useful for verifying preservation after group deletion
 * Requirements: 5.3
 */
export async function getGroupWalletIds(groupId: string): Promise<string[]> {
  const members = await prisma.walletGroupMember.findMany({
    where: { walletGroupId: groupId },
    select: { walletId: true }
  })

  return members.map(m => m.walletId)
}

/**
 * Check if a wallet is a member of any group
 * Requirements: 5.4
 */
export async function isWalletInAnyGroup(walletId: string): Promise<boolean> {
  const count = await prisma.walletGroupMember.count({
    where: { walletId }
  })

  return count > 0
}

/**
 * Get all group memberships for a wallet
 * Requirements: 5.4
 */
export async function getWalletGroupMemberships(walletId: string): Promise<string[]> {
  const memberships = await prisma.walletGroupMember.findMany({
    where: { walletId },
    select: { walletGroupId: true }
  })

  return memberships.map(m => m.walletGroupId)
}
