/**
 * Script to fix transaction types
 * Run this once to fix existing data
 */

async function fixTransactionTypes() {
  try {
    console.log('Fixing transaction types...');
    
    const response = await fetch('http://localhost:3000/api/transactions/fix-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Successfully fixed transaction types!');
      console.log(`   - Fixed ${result.fixed.transactions.length} transactions`);
      console.log(`   - Fixed ${result.fixed.recurring.length} recurring transactions`);
      
      if (result.fixed.transactions.length > 0) {
        console.log('\nFixed transactions:');
        result.fixed.transactions.forEach((tx: any) => {
          console.log(`   - ${tx.description} (${tx.category}): Rp ${tx.amount.toLocaleString()}`);
        });
      }
      
      if (result.fixed.recurring.length > 0) {
        console.log('\nFixed recurring:');
        result.fixed.recurring.forEach((rec: any) => {
          console.log(`   - ${rec.name} (${rec.category}): Rp ${rec.amount.toLocaleString()}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTransactionTypes();
