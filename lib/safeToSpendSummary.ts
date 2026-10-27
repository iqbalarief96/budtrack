type MonthlySafeToSpendInput = {
  /** Current balance. Already net of every expense recorded so far. */
  balance: number
  /**
   * Money still committed for this period: budgeted but not yet spent.
   * Do NOT pass expenses that already happened — they are already out of
   * `balance`, so subtracting them again double-counts.
   */
  remainingBudget?: number
  outstandingBills?: number
  goalReserve?: number
}

type BudgetLike = { amount?: number | null; spent?: number | null }

/** Sum of what is still left to spend across budgets (overspent budgets count as 0). */
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

export function calculateMonthlySafeToSpend({
  balance,
  remainingBudget = 0,
  outstandingBills = 0,
  goalReserve = 0,
}: MonthlySafeToSpendInput) {
  return Math.max(
    money(balance) - money(remainingBudget) - money(outstandingBills) - money(goalReserve),
    0
  )
}

export function calculateTransactionBalance({ totalIncome, totalExpense }: TransactionBalanceInput) {
  return money(totalIncome) - money(totalExpense)
}
