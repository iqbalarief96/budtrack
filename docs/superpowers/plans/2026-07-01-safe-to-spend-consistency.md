# Safe-to-spend consistency fix

## Problem

Chatbot InsightRail shows `safeToSpend` as raw `wallet.balance` from `app/api/ai/chatbot/summary/route.ts`, while Dashboard uses a more conservative formula:

```ts
Math.max(displayBalance - monthlyExpense - outstandingBills - goalReserve, 0)
```

This caused user-facing mismatch: chatbot showed `Rp 12.414.037`, wallet dashboards showed `Rp 0`.

## Goal

Make safe-to-spend consistent and reusable across surfaces without overbuilding.

## Scope

- Add one small pure helper for monthly safe-to-spend summary math.
- Use it in chatbot summary route.
- Keep dashboard behavior unchanged for now; helper mirrors its current formula shape.
- Add focused tests proving the mismatch is fixed.
- Run build/tests, browser/HTTP QA evidence, independent code review, then commit.

## Files

- `lib/safeToSpendSummary.ts` — new pure helper + goal reserve helper.
- `lib/__tests__/safeToSpendSummary.test.ts` — focused unit tests.
- `app/api/ai/chatbot/summary/route.ts` — wire helper instead of `safeToSpend: wallet.balance`.

## Acceptance Criteria

1. Chatbot summary no longer returns wallet balance as safe-to-spend when current-month expenses exceed balance.
2. Formula clamps negative values to `0`.
3. Active goals reserve is deducted similarly to dashboard heuristic.
4. Summary route fetches active goals and uses existing monthly expenses.
5. Tests pass.
6. Build passes.
7. Code review has no blocking issues.
8. QA table includes feature, status, evidence, blocker.

## Test-first steps

1. Write failing tests in `lib/__tests__/safeToSpendSummary.test.ts`:
   - balance `12_414_037`, expense `169_355_648` => `0`.
   - balance `20_000_000`, expense `5_000_000`, outstanding `2_000_000`, goal reserve `1_000_000` => `12_000_000`.
   - active goals reserve is `min(balance * 0.1, remainingGoals / 12)`.
2. Run tests and confirm fail because helper missing.
3. Implement helper.
4. Run tests and confirm pass.
5. Wire route and run build.
6. Run HTTP/browser QA.
7. Request independent code review.
8. Commit if clean.
