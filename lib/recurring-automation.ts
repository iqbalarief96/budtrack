import prisma from './prisma';

/**
 * Process all due recurring transactions
 * Should be called daily via cron job
 */
export async function processRecurringTransactions() {
  const now = new Date();
  
  // Find all active recurring transactions that are due
  const dueRecurring = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextPaymentDate: {
        lte: now,
      },
    },
    include: {
      wallet: true,
      user: true,
    },
  });

  console.log(`[RECURRING] Found ${dueRecurring.length} due recurring transactions`);

  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const recurring of dueRecurring) {
    try {
      await processRecurringTransaction(recurring.id);
      results.processed++;
    } catch (error) {
      console.error(`[RECURRING] Error processing ${recurring.id}:`, error);
      results.failed++;
      results.errors.push(`${recurring.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`[RECURRING] Processed: ${results.processed}, Failed: ${results.failed}`);
  return results;
}

/**
 * Process a single recurring transaction
 */
export async function processRecurringTransaction(recurringId: string) {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id: recurringId },
    include: {
      wallet: true,
    },
  });

  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }

  if (!recurring.isActive) {
    throw new Error('Recurring transaction is not active');
  }

  const now = new Date();
  if (recurring.nextPaymentDate > now) {
    throw new Error('Not yet due');
  }

  // Find category by name or use default
  let category = null;
  if (recurring.category) {
    category = await prisma.category.findFirst({
      where: {
        userId: recurring.userId,
        name: recurring.category,
      },
    });
  }

  // Create the transaction with proper description
  const description = recurring.description || recurring.name || 'Recurring Transaction';
  
  const transaction = await prisma.transaction.create({
    data: {
      userId: recurring.userId,
      walletId: recurring.walletId,
      categoryId: category?.id,
      description: description,
      amount: recurring.amount,
      type: recurring.type as 'INCOME' | 'EXPENSE',
      date: recurring.nextPaymentDate,
    },
  });

  console.log(`[RECURRING] Created transaction: ${description}, amount: ${recurring.amount}, type: ${recurring.type}, walletId: ${recurring.walletId}, userId: ${recurring.userId}`);

  // Update wallet balance based on transaction type
  const shouldIncrement = recurring.type === 'INCOME';
  await prisma.wallet.update({
    where: { id: recurring.walletId },
    data: {
      balance: {
        [shouldIncrement ? 'increment' : 'decrement']: recurring.amount,
      },
    },
  });

  console.log(`[RECURRING] Updated wallet balance: ${shouldIncrement ? '+' : '-'}${recurring.amount}`);

  // Create history record
  await prisma.recurringTransactionHistory.create({
    data: {
      recurringTransactionId: recurring.id,
      transactionId: transaction.id,
      targetDate: recurring.nextPaymentDate,
      amount: recurring.amount,
      status: 'CREATED',
    },
  });

  // Calculate next payment date
  const nextDate = calculateNextPaymentDate(recurring.nextPaymentDate, recurring.frequency);

  // Update recurring transaction
  await prisma.recurringTransaction.update({
    where: { id: recurring.id },
    data: {
      nextPaymentDate: nextDate,
    },
  });

  console.log(`[RECURRING] Created transaction for ${recurring.name}, next: ${nextDate.toISOString()}`);

  return transaction;
}

/**
 * Calculate next payment date based on frequency
 */
export function calculateNextPaymentDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

  switch (frequency.toUpperCase()) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      // Default to monthly
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Get upcoming recurring transactions (next 30 days)
 */
export async function getUpcomingRecurring(userId: string, days: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const upcoming = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextPaymentDate: {
        gte: now,
        lte: futureDate,
      },
    },
    orderBy: {
      nextPaymentDate: 'asc',
    },
  });

  return upcoming;
}

/**
 * Preview what transactions will be created
 */
export async function previewRecurringTransactions(userId: string, days: number = 30) {
  const upcoming = await getUpcomingRecurring(userId, days);

  return upcoming.map(recurring => ({
    id: recurring.id,
    name: recurring.name,
    amount: recurring.amount,
    type: recurring.type.toUpperCase(), // Ensure uppercase for consistency
    frequency: recurring.frequency,
    nextDate: recurring.nextPaymentDate,
    daysUntil: Math.ceil(
      (recurring.nextPaymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));
}

/**
 * Check if user should be notified about upcoming recurring
 */
export async function getRecurringNotifications(userId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const upcomingTomorrow = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextPaymentDate: {
        gte: new Date(),
        lte: tomorrow,
      },
    },
  });

  return upcomingTomorrow.map(recurring => ({
    id: recurring.id,
    name: recurring.name,
    amount: recurring.amount,
    type: recurring.type,
    date: recurring.nextPaymentDate,
    message: `${recurring.name} (${recurring.type === 'EXPENSE' ? '-' : '+'}Rp ${recurring.amount.toLocaleString()}) will be processed tomorrow`,
  }));
}

/**
 * Manually trigger a recurring transaction (create immediately)
 * Based on sync-recurring logic that works correctly
 */
export async function triggerRecurringNow(recurringId: string, userId: string) {
  const recurring = await prisma.recurringTransaction.findFirst({
    where: {
      id: recurringId,
      userId,
    },
  });

  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }

  if (!recurring.isActive) {
    throw new Error('Recurring transaction is not active');
  }

  // Get wallet
  const wallet = await prisma.wallet.findUnique({
    where: { id: recurring.walletId },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // Find category by name or ID
  let categoryId = null;
  if (recurring.category) {
    // Try to find by ID first
    let category = await prisma.category.findFirst({
      where: {
        id: recurring.category,
        userId: recurring.userId,
      },
    });

    // If not found by ID, try by name
    if (!category) {
      category = await prisma.category.findFirst({
        where: {
          name: recurring.category,
          userId: recurring.userId,
        },
      });
    }

    if (category) {
      categoryId = category.id;
      console.log(`[RECURRING-MANUAL] Category '${category.name}' found with id: ${categoryId}`);
    } else {
      console.log(`[RECURRING-MANUAL] Category '${recurring.category}' not found`);
    }
  }

  // Create transaction with current date
  const now = new Date();
  const description = recurring.description || recurring.name;
  const formattedType = recurring.type.toUpperCase() as 'INCOME' | 'EXPENSE';
  
  console.log(`[RECURRING-MANUAL] Creating transaction type '${formattedType}' for ${description}`);
  console.log(`[RECURRING-MANUAL] Amount: ${recurring.amount}`);
  
  const transaction = await prisma.transaction.create({
    data: {
      amount: recurring.amount,
      description: description,
      date: now,
      type: formattedType,
      categoryId: categoryId,
      walletId: recurring.walletId,
      userId: recurring.userId,
    },
  });

  console.log(`[RECURRING-MANUAL] Transaction created: ${transaction.id}`);

  // Create history record
  await prisma.recurringTransactionHistory.create({
    data: {
      recurringTransactionId: recurring.id,
      transactionId: transaction.id,
      processedDate: now,
      targetDate: now,
      amount: recurring.amount,
      status: 'CREATED',
      notes: 'Manually triggered by user',
    },
  });

  // Update wallet balance (same logic as sync-recurring)
  let newBalance = wallet.balance;
  
  if (formattedType === 'INCOME') {
    newBalance = wallet.balance + recurring.amount;
    console.log(`[RECURRING-MANUAL] Income: Adding ${recurring.amount} to wallet balance. New balance: ${newBalance}`);
  } else {
    newBalance = wallet.balance - recurring.amount;
    console.log(`[RECURRING-MANUAL] Expense: Subtracting ${recurring.amount} from wallet balance. New balance: ${newBalance}`);
  }
  
  await prisma.wallet.update({
    where: { id: recurring.walletId },
    data: { balance: newBalance },
  });

  // Calculate and update next payment date
  const nextDate = calculateNextPaymentDate(recurring.nextPaymentDate, recurring.frequency);
  await prisma.recurringTransaction.update({
    where: { id: recurring.id },
    data: {
      nextPaymentDate: nextDate,
    },
  });

  console.log(`[RECURRING-MANUAL] Next payment date updated to: ${nextDate.toISOString()}`);

  return transaction;
}

/**
 * Skip next occurrence of recurring transaction
 */
export async function skipNextRecurring(recurringId: string, userId: string) {
  const recurring = await prisma.recurringTransaction.findFirst({
    where: {
      id: recurringId,
      userId,
    },
  });

  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }

  // Calculate next date after the current next date
  const nextDate = calculateNextPaymentDate(recurring.nextPaymentDate, recurring.frequency);

  await prisma.recurringTransaction.update({
    where: { id: recurringId },
    data: {
      nextPaymentDate: nextDate,
    },
  });

  // Create history record for skipped
  await prisma.recurringTransactionHistory.create({
    data: {
      recurringTransactionId: recurring.id,
      targetDate: recurring.nextPaymentDate,
      amount: recurring.amount,
      status: 'SKIPPED',
      notes: 'Manually skipped by user',
    },
  });

  return nextDate;
}
