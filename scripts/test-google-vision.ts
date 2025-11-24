/**
 * Test script for Google Cloud Vision OCR integration
 * 
 * Usage:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 2. Run: npx ts-node scripts/test-google-vision.ts
 */

import { processReceiptWithGoogleVision } from '../lib/google-vision-ocr';
import * as fs from 'fs';
import * as path from 'path';

async function testGoogleVision() {
    try {
        console.log('=== Google Cloud Vision OCR Test ===\n');

        // Check if credentials are set
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!credentialsPath) {
            console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
            console.log('\nPlease set it using:');
            console.log('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"');
            process.exit(1);
        }

        console.log('✓ Credentials path:', credentialsPath);

        // Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
            console.error('❌ Credentials file not found:', credentialsPath);
            process.exit(1);
        }

        console.log('✓ Credentials file exists\n');

        // Example: Test with a sample image
        // You need to provide your own receipt image for testing
        const testImagePath = process.argv[2];
        
        if (!testImagePath) {
            console.log('Usage: npx ts-node scripts/test-google-vision.ts <path-to-receipt-image>');
            console.log('\nExample:');
            console.log('npx ts-node scripts/test-google-vision.ts ./test-receipt.jpg');
            process.exit(1);
        }

        if (!fs.existsSync(testImagePath)) {
            console.error('❌ Image file not found:', testImagePath);
            process.exit(1);
        }

        console.log('✓ Test image:', testImagePath);
        console.log('\n--- Processing receipt ---\n');

        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(testImagePath);
        const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        // Process receipt
        const startTime = Date.now();
        const result = await processReceiptWithGoogleVision(imageBase64, credentialsPath);
        const endTime = Date.now();

        console.log('✓ Processing completed in', (endTime - startTime) / 1000, 'seconds\n');
        console.log('=== Results ===\n');
        console.log(JSON.stringify(result, null, 2));

        console.log('\n=== Summary ===');
        console.log('Store:', result.transaction.store_name);
        console.log('Date:', result.transaction.date);
        console.log('Total:', result.transaction.total_amount);
        console.log('Items:', result.items.length);
        console.log('\nItems breakdown:');
        result.items.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.name} (${item.quantity}x @ ${item.unit_price}) = ${item.total_price}`);
        });

        console.log('\n✓ Test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run test
testGoogleVision();
