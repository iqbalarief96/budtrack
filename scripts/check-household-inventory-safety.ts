import { existsSync, readFileSync } from 'fs'

for (const file of ['.env.production', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '')
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const prisma = require('../lib/prisma').default as typeof import('../lib/prisma').default

const HOUSEHOLD_TABLES = [
  'HouseholdInventoryCategory',
  'HouseholdInventoryLocation',
  'HouseholdInventoryItem',
  'HouseholdStockMovement',
  'HouseholdProductTemplate',
  'HouseholdShoppingListItem'
]

async function tableExists(name: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
    'table',
    name
  )
  return rows.length > 0
}

async function countTable(name: string) {
  if (!(await tableExists(name))) return null
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(`SELECT COUNT(*) as count FROM "${name}"`)
  return Number(rows[0]?.count || 0)
}

async function assertNoSampleItems() {
  if (!(await tableExists('HouseholdInventoryItem'))) return
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM "HouseholdInventoryItem" WHERE lower(name) LIKE '%sample%' OR lower(name) LIKE '%demo%' OR lower(name) LIKE '%contoh%'`
  )
  if (rows.length > 0) {
    throw new Error(`sample/demo/contoh household items found: ${rows.map(row => row.name).join(', ')}`)
  }
}

async function main() {
  const userCount = await countTable('User')
  const transactionCount = await countTable('Transaction')
  const expectedTransactions = process.env.EXPECTED_TRANSACTION_COUNT

  console.log(`User: ${userCount}`)
  console.log(`Transaction: ${transactionCount}`)

  if (expectedTransactions && Number(expectedTransactions) !== transactionCount) {
    throw new Error(`Transaction count changed: expected ${expectedTransactions}, got ${transactionCount}`)
  }

  for (const table of HOUSEHOLD_TABLES) {
    const count = await countTable(table)
    console.log(`${table}: ${count === null ? 'missing' : count}`)
  }

  await assertNoSampleItems()
  console.log('household inventory safety check: PASS')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
