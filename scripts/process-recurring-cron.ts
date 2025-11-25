/**
 * Cron job script to process recurring transactions
 * 
 * Usage:
 * 1. Add to crontab: 0 0 * * * node scripts/process-recurring-cron.js
 * 2. Or use Vercel Cron: Add to vercel.json
 * 3. Or call via HTTP: curl -X POST https://your-domain.com/api/recurring/process?secret=YOUR_SECRET
 */

import { processRecurringTransactions } from '../lib/recurring-automation';

async function main() {
  console.log('[CRON] Starting recurring transaction processing...');
  console.log('[CRON] Time:', new Date().toISOString());

  try {
    const results = await processRecurringTransactions();
    
    console.log('[CRON] Results:', {
      processed: results.processed,
      failed: results.failed,
      errors: results.errors,
    });

    if (results.failed > 0) {
      console.error('[CRON] Some transactions failed:', results.errors);
      process.exit(1);
    }

    console.log('[CRON] Completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    process.exit(1);
  }
}

main();
