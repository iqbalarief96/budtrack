type MonthlySafeToSpendInput = {
  /** Current actual balance. Already net of every expense recorded so far. */
  balance: number
  /**
   * Income expected to arrive before the horizon ends (e.g. recurring salary).
   * Only set this in "forward" mode; leave 0 for the conservative view.
   */
  expectedIncome?: number
  /**
   * Real commitments that fall due before the horizon ends: unpaid bills,
   * recurring expenses, subscription charges, credit-card minimums, and
   * outstanding shared bills. NOTE: do NOT include budgets here — a budget is
   * permission to spend discretionary money, not an obligation to set aside.
   */
  upcomingObligations?: number
  /** A monthly slice set aside toward goals / emergency fund. */
  goalReserve?: number
  /** Minimum cash floor to keep (so safe-to-spend never drains you to zero). */
  buffer?: number
}

type BudgetLike = { amount?: number | null; spent?: number | null }

/**
 * Sum of what is still left to spend across budgets (overspent budgets count
 * as 0). Kept for budget-usage displays; it is intentionally NOT part of the
 * safe-to-spend formula anymore (see MonthlySafeToSpendInput.upcomingObligations).
 */
export function calculateRemainingBudget(budgets: BudgetLike[]) {
  return budgets.reduce((sum, b) => sum + Math.max(money(b.amount ?? 0) - money(b.spent ?? 0), 0), 0)
}

type GoalReserveInput = {
  balance: number
  remainingGoalAmount: number
}

type TransactionBalanceInput = {
  totalIncome: number
  totalExpense: number
}

function money(value: number | undefined) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value ?? 0 : 0))
}

export function calculateGoalReserve({ balance, remainingGoalAmount }: GoalReserveInput) {
  const safeBalance = money(balance)
  const remaining = money(remainingGoalAmount)
  if (safeBalance <= 0 || remaining <= 0) return 0

  return Math.round(Math.min(safeBalance * 0.1, remaining / 12))
}

/**
 * Safe to spend = what you can freely spend until the horizon (end of month)
 * without endangering known obligations and savings commitments.
 *
 *   balance (+ expected income) − upcoming obligations − goal reserve − buffer
 *
 * Expenses already made are NOT subtracted: they are already out of `balance`.
 * Budgets are NOT subtracted: they are a plan for discretionary spending, i.e.
 * the very money this number represents.
 */
export function calculateMonthlySafeToSpend({
  balance,
  expectedIncome = 0,
  upcomingObligations = 0,
  goalReserve = 0,
  buffer = 0,
}: MonthlySafeToSpendInput) {
  return Math.max(
    money(balance) + money(expectedIncome) - money(upcomingObligations) - money(goalReserve) - money(buffer),
    0
  )
}

export function calculateTransactionBalance({ totalIncome, totalExpense }: TransactionBalanceInput) {
  return money(totalIncome) - money(totalExpense)
}
