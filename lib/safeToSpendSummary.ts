type MonthlySafeToSpendInput = {
  balance: number
  monthlyExpense: number
  outstandingBills?: number
  goalReserve?: number
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
  monthlyExpense,
  outstandingBills = 0,
  goalReserve = 0,
}: MonthlySafeToSpendInput) {
  return Math.max(
    money(balance) - money(monthlyExpense) - money(outstandingBills) - money(goalReserve),
    0
  )
}

export function calculateTransactionBalance({ totalIncome, totalExpense }: TransactionBalanceInput) {
  return money(totalIncome) - money(totalExpense)
}
