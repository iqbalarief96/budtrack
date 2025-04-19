/**
 * Helper functions for transactions and goals integration
 */

/**
 * Track a transaction to a goal
 * @param transactionId The ID of the transaction
 * @param goalId The ID of the goal
 * @param amount The amount of the transaction
 * @param type The type of transaction ('INCOME' or 'EXPENSE')
 * @param description The description of the transaction
 * @param date The date of the transaction
 * @returns Promise
 */
export async function trackTransactionToGoal(
  transactionId: string,
  goalId: string,
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  description: string,
  date: string
): Promise<void> {
  // First, update the transaction to link it to the goal
  const transactionResponse = await fetch(`/api/transactions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: transactionId,
      goalId: goalId
    }),
  });

  if (!transactionResponse.ok) {
    throw new Error('Failed to update transaction');
  }

  // Then create an activity in the goal
  // For EXPENSE, we want to add to the goal (positive amount) since it's savings
  // For INCOME, we also want to add to the goal (positive amount)
  // This ensures all transactions contribute positively to goals
  const activityAmount = Math.abs(amount);
  
  const activityResponse = await fetch('/api/goals/activities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      goalId: goalId,
      amount: activityAmount,
      description: `Tracked from transaction: ${description || type}`,
      date: date,
      transactionId: transactionId,
    }),
  });

  if (!activityResponse.ok) {
    throw new Error('Failed to create goal activity');
  }
}

/**
 * Track a goal activity to a transaction
 * @param goalId The ID of the goal
 * @param activityAmount The amount of the activity
 * @param description The description of the activity
 * @param date The date of the activity
 * @param walletId The ID of the wallet to use
 * @returns Promise
 */
export async function trackGoalActivityToTransaction(
  goalId: string,
  activityAmount: number,
  description: string,
  date: string,
  walletId: string
): Promise<void> {
  // Create a new transaction for the goal activity
  // For goal activities, we consider positive amounts as EXPENSE (money going to the goal)
  // And negative amounts as INCOME (money coming from the goal)
  const transactionResponse = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.abs(activityAmount),
      description: description || `Goal activity`,
      date: date,
      type: activityAmount > 0 ? 'EXPENSE' : 'INCOME', // Reversed from previous logic
      categoryId: null,
      walletId: walletId,
      goalId: goalId,
    }),
  });

  if (!transactionResponse.ok) {
    throw new Error('Failed to create transaction for goal activity');
  }
} 