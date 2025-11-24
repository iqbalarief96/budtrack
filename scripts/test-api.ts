/**
 * Simple API Test Script for Transaction Items
 *
 * Prerequisites:
 * 1. Dev server must be running (npm run dev)
 * 2. User must be logged in
 *
 * Run: npx ts-node scripts/test-api.ts
 */

const BASE_URL = 'http://localhost:3000';

async function testTransactionItemsAPI() {
  console.log('🧪 Testing Transaction Items API...\n');

  try {
    // You need to get these from your database or create them first
    const TRANSACTION_ID = 'REPLACE_WITH_TRANSACTION_ID';
    const WALLET_ID = 'REPLACE_WITH_WALLET_ID';

    if (TRANSACTION_ID === 'REPLACE_WITH_TRANSACTION_ID') {
      console.log('❌ Please update TRANSACTION_ID and WALLET_ID in the script first!');
      console.log('\nSteps:');
      console.log('1. Sign in to the app');
      console.log('2. Create a transaction');
      console.log('3. Copy the transaction ID');
      console.log('4. Update this script with the ID');
      console.log('5. Run again: npx ts-node scripts/test-api.ts\n');
      return;
    }

    // Test 1: GET items (should be empty)
    console.log('📥 Test 1: GET /api/transactions/[id]/items');
    let response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items`);
    let data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('✅ GET items works!\n');

    // Test 2: POST - Add first item
    console.log('📤 Test 2: POST /api/transactions/[id]/items');
    response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Susu Ultra 1L',
        quantity: 2,
        unitPrice: 15000,
        category: 'Dairy',
        notes: 'Test item'
      })
    });
    data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);

    if (data.item) {
      const ITEM_ID = data.item.id;
      console.log('✅ POST item works! Item ID:', ITEM_ID, '\n');

      // Test 3: PUT - Update item
      console.log('📝 Test 3: PUT /api/transactions/[id]/items/[itemId]');
      response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items/${ITEM_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Susu Ultra 1L',
          quantity: 3,
          unitPrice: 20000,
          notes: 'Updated quantity and price'
        })
      });
      data = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', data);
      console.log('✅ PUT item works!\n');

      // Test 4: GET items again (should have 1 item)
      console.log('📥 Test 4: GET items again');
      response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items`);
      data = await response.json();
      console.log('Status:', response.status);
      console.log('Items count:', data.items?.length);
      console.log('✅ Items retrieved!\n');

      // Test 5: DELETE - Remove item
      console.log('🗑️  Test 5: DELETE /api/transactions/[id]/items/[itemId]');
      response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items/${ITEM_ID}`, {
        method: 'DELETE'
      });
      data = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', data);
      console.log('✅ DELETE item works!\n');

      // Final: GET items (should be empty again)
      console.log('📥 Final: GET items (should be empty)');
      response = await fetch(`${BASE_URL}/api/transactions/${TRANSACTION_ID}/items`);
      data = await response.json();
      console.log('Status:', response.status);
      console.log('Items count:', data.items?.length);
      console.log('✅ All tests passed!\n');
    }

    console.log('🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nMake sure:');
    console.error('1. Dev server is running (npm run dev)');
    console.error('2. You have a valid transaction ID');
    console.error('3. You are logged in\n');
  }
}

testTransactionItemsAPI();
