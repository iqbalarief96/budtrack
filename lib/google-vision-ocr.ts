import vision from '@google-cloud/vision';
import { ReceiptData } from './receipt-scanner';
import { generateAIResponse } from './ai';

/**
 * Process receipt image using Google Cloud Vision API
 * @param imageBase64 - Base64 encoded image string (with or without data URL prefix)
 * @param credentialsPath - Path to Google Cloud service account JSON file
 * @returns Structured receipt data
 */
export async function processReceiptWithGoogleVision(
    imageBase64: string,
    credentialsPath?: string
): Promise<ReceiptData> {
    try {
        console.log('[GOOGLE-VISION] Starting OCR processing...');

        // Initialize Google Vision client
        const clientConfig: any = {};
        
        if (credentialsPath) {
            // Check if path is absolute or relative
            const path = require('path');
            const fs = require('fs');
            
            let finalPath = credentialsPath;
            
            console.log('[GOOGLE-VISION] Original credentials path:', credentialsPath);
            
            // If relative path, make it absolute from project root
            if (!path.isAbsolute(credentialsPath)) {
                finalPath = path.join(process.cwd(), credentialsPath);
                console.log('[GOOGLE-VISION] Converted to absolute path:', finalPath);
            }
            
            // Check if file exists
            if (!fs.existsSync(finalPath)) {
                console.error('[GOOGLE-VISION] File not found at:', finalPath);
                console.error('[GOOGLE-VISION] Current working directory:', process.cwd());
                throw new Error(`Credentials file not found: ${finalPath}`);
            }
            
            console.log('[GOOGLE-VISION] ✓ Credentials file exists');
            
            // Try to read and validate the file
            try {
                const fileContent = fs.readFileSync(finalPath, 'utf8');
                const credentials = JSON.parse(fileContent);
                console.log('[GOOGLE-VISION] ✓ Credentials file is valid JSON');
                console.log('[GOOGLE-VISION] Project ID:', credentials.project_id);
            } catch (readError) {
                console.error('[GOOGLE-VISION] Error reading credentials file:', readError);
                throw new Error(`Failed to read credentials file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
            }
            
            clientConfig.keyFilename = finalPath;
            console.log('[GOOGLE-VISION] Using credentials from:', finalPath);
        } else {
            // Try to use GOOGLE_APPLICATION_CREDENTIALS environment variable
            console.log('[GOOGLE-VISION] Using default credentials from environment');
        }

        const client = new vision.ImageAnnotatorClient(clientConfig);

        // Strip data URL prefix if present
        const base64Only = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Only, 'base64');
        console.log('[GOOGLE-VISION] Image buffer size:', imageBuffer.length, 'bytes');

        // Perform text detection
        console.log('[GOOGLE-VISION] Calling Vision API for text detection...');
        const [result] = await client.textDetection(imageBuffer);
        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            throw new Error('No text detected in the image');
        }

        // First annotation contains all detected text
        const fullText = detections[0].description || '';
        console.log('[GOOGLE-VISION] Detected text:', fullText);
        console.log('[GOOGLE-VISION] Text length:', fullText.length, 'characters');

        // Parse the detected text to extract receipt information
        const receiptData = parseReceiptText(fullText);
        
        console.log('[GOOGLE-VISION] Parsed receipt data:', JSON.stringify(receiptData, null, 2));
        
        // Log parsing quality
        if (receiptData.items.length === 0) {
            console.warn('[GOOGLE-VISION] ⚠️ No items parsed - consider using AI for better accuracy');
        } else if (receiptData.items.length === 1 && receiptData.items[0].name.includes('tidak tersedia')) {
            console.warn('[GOOGLE-VISION] ⚠️ Only default item created - consider using AI for better accuracy');
        }
        
        return receiptData;

    } catch (error) {
        console.error('[GOOGLE-VISION] Error:', error);
        throw new Error(
            error instanceof Error 
                ? `Google Vision API error: ${error.message}` 
                : 'Failed to process receipt with Google Vision'
        );
    }
}

/**
 * Parse raw OCR text into structured receipt data
 * This is a basic parser - you may need to customize based on your receipt formats
 */
function parseReceiptText(text: string): ReceiptData {
    console.log('[GOOGLE-VISION] Parsing receipt text...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Initialize receipt data with defaults
    const receiptData: ReceiptData = {
        transaction: {
            store_name: 'Unknown Store',
            date: new Date().toISOString().split('T')[0], // Today's date as default
            total_amount: 0,
            category: 'Belanja',
            description: 'Belanja',
            payment_method: 'Cash'
        },
        items: []
    };

    // Extract store name (usually first few lines)
    if (lines.length > 0) {
        receiptData.transaction.store_name = lines[0];
        receiptData.transaction.description = `Belanja ${lines[0]}`;
    }

    // Try to find date (common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    for (const line of lines) {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const parsedDate = parseDateString(dateStr);
            if (parsedDate) {
                receiptData.transaction.date = parsedDate;
                console.log('[GOOGLE-VISION] Found date:', parsedDate);
                break;
            }
        }
    }

    // Try to find total amount (look for keywords like "TOTAL", "GRAND TOTAL", etc.)
    const totalRegex = /(total|grand total|amount|jumlah|bayar)[:\s]*[Rp.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
    for (const line of lines) {
        const totalMatch = line.match(totalRegex);
        if (totalMatch) {
            const amountStr = totalMatch[2].replace(/[.,]/g, '');
            const amount = parseInt(amountStr, 10);
            if (!isNaN(amount) && amount > 0) {
                receiptData.transaction.total_amount = amount;
                console.log('[GOOGLE-VISION] Found total:', amount);
                break;
            }
        }
    }

    // Try to extract line items (look for patterns like: item name + price)
    // This is a simplified parser - customize based on your receipt formats
    const itemRegex = /^(.+?)\s+[Rp.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)$/;
    
    for (const line of lines) {
        const itemMatch = line.match(itemRegex);
        if (itemMatch) {
            const itemName = itemMatch[1].trim();
            const priceStr = itemMatch[2].replace(/[.,]/g, '');
            const price = parseInt(priceStr, 10);
            
            // Skip if it looks like a total line or invalid price
            if (isNaN(price) || price <= 0 || 
                /total|subtotal|tax|pajak|diskon|discount/i.test(itemName)) {
                continue;
            }

            // Check if item name contains quantity (e.g., "2x Item Name")
            const qtyMatch = itemName.match(/^(\d+)\s*x\s*(.+)/i);
            let quantity = 1;
            let name = itemName;
            
            if (qtyMatch) {
                quantity = parseInt(qtyMatch[1], 10);
                name = qtyMatch[2].trim();
            }

            receiptData.items.push({
                name: name,
                quantity: quantity,
                unit_price: Math.round(price / quantity),
                total_price: price
            });
        }
    }

    // If no items found, create a single default item
    if (receiptData.items.length === 0 && receiptData.transaction.total_amount > 0) {
        console.log('[GOOGLE-VISION] No items parsed, creating default item');
        receiptData.items.push({
            name: 'Belanja (detail tidak tersedia)',
            quantity: 1,
            unit_price: receiptData.transaction.total_amount,
            total_price: receiptData.transaction.total_amount
        });
    }

    // Validate and adjust totals
    const itemsTotal = receiptData.items.reduce((sum, item) => sum + item.total_price, 0);
    
    if (receiptData.transaction.total_amount === 0 && itemsTotal > 0) {
        // If we found items but no total, use items total
        receiptData.transaction.total_amount = itemsTotal;
    } else if (itemsTotal > 0 && Math.abs(itemsTotal - receiptData.transaction.total_amount) > 1) {
        // If totals don't match, adjust first item
        console.log('[GOOGLE-VISION] Total mismatch, adjusting...');
        const adjustment = receiptData.transaction.total_amount - itemsTotal;
        receiptData.items[0].total_price += adjustment;
        receiptData.items[0].unit_price = Math.round(receiptData.items[0].total_price / receiptData.items[0].quantity);
        receiptData.items[0].notes = (receiptData.items[0].notes || '') + ' (disesuaikan)';
    }

    return receiptData;
}

/**
 * Process receipt using Google Vision OCR + AI parsing (hybrid approach)
 * Fast OCR from Google Vision, smart parsing from AI
 */
export async function processReceiptWithGoogleVisionAI(
    imageBase64: string,
    credentialsPath: string | undefined,
    aiProvider: string,
    aiApiKey: string,
    aiModel: string,
    aiCustomEndpoint?: string | null
): Promise<ReceiptData> {
    try {
        console.log('[GOOGLE-VISION-AI] Starting hybrid OCR + AI parsing...');

        // Step 1: Use Google Vision for fast OCR
        const path = require('path');
        const fs = require('fs');
        
        let finalPath = credentialsPath;
        
        if (credentialsPath) {
            if (!path.isAbsolute(credentialsPath)) {
                finalPath = path.join(process.cwd(), credentialsPath);
            }
            
            if (!fs.existsSync(finalPath)) {
                throw new Error(`Credentials file not found: ${finalPath}`);
            }
        }

        const clientConfig: any = finalPath ? { keyFilename: finalPath } : {};
        const client = new vision.ImageAnnotatorClient(clientConfig);

        // Extract text with Google Vision
        const base64Only = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Only, 'base64');
        
        console.log('[GOOGLE-VISION-AI] Calling Google Vision for OCR...');
        const [result] = await client.textDetection(imageBuffer);
        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            throw new Error('No text detected in the image');
        }

        const ocrText = detections[0].description || '';
        console.log('[GOOGLE-VISION-AI] ✓ OCR complete, text length:', ocrText.length);

        // Step 2: Use AI to parse the OCR text
        console.log('[GOOGLE-VISION-AI] Parsing with AI:', aiProvider, aiModel);
        
        const prompt = `
Dari text struk belanja berikut (hasil OCR), ekstrak informasi dalam format JSON:

TEXT STRUK:
${ocrText}

FORMAT OUTPUT:
{
  "transaction": {
    "store_name": "Nama Toko",
    "date": "YYYY-MM-DD",
    "total_amount": 500000,
    "category": "Belanja",
    "description": "Belanja [Nama Toko]",
    "payment_method": "Cash/Debit/Credit"
  },
  "items": [
    {
      "name": "Nama Item",
      "quantity": 2,
      "unit_price": 15000,
      "total_price": 30000,
      "notes": "ukuran/varian jika ada"
    }
  ]
}

ATURAN:
1. transaction.total_amount HARUS sama dengan SUM dari semua items.total_price
2. Jika quantity tidak jelas, set 1
3. Format tanggal: YYYY-MM-DD
4. Semua harga dalam angka (no currency symbol)
5. Jika item tidak ada detail, buat 1 item "Lain-lain" dengan total_price = total_amount
6. unit_price = total_price / quantity

Balas HANYA dengan JSON yang valid, tanpa backticks atau penjelasan.
`;

        const aiResponse = await generateAIResponse({
            prompt,
            provider: aiProvider,
            apiKey: aiApiKey,
            model: aiModel,
            customEndpoint: aiCustomEndpoint
        });

        // Parse AI response
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        const data: ReceiptData = JSON.parse(cleanResponse);

        // Validate
        if (!data.transaction || !data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid receipt data structure from AI');
        }

        if (data.items.length === 0) {
            data.items = [{
                name: 'Belanja (detail tidak tersedia)',
                quantity: 1,
                unit_price: data.transaction.total_amount,
                total_price: data.transaction.total_amount
            }];
        }

        console.log('[GOOGLE-VISION-AI] ✓ Hybrid processing complete!');
        return data;

    } catch (error) {
        console.error('[GOOGLE-VISION-AI] Error:', error);
        throw new Error(
            error instanceof Error 
                ? `Google Vision + AI error: ${error.message}` 
                : 'Failed to process receipt with hybrid approach'
        );
    }
}

/**
 * Parse date string in various formats to YYYY-MM-DD
 */
function parseDateString(dateStr: string): string | null {
    try {
        // Try DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyyMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
        if (ddmmyyyyMatch) {
            let day = parseInt(ddmmyyyyMatch[1], 10);
            let month = parseInt(ddmmyyyyMatch[2], 10);
            let year = parseInt(ddmmyyyyMatch[3], 10);
            
            // Handle 2-digit year
            if (year < 100) {
                year += 2000;
            }
            
            // Validate
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }

        // Try YYYY-MM-DD or YYYY/MM/DD
        const yyyymmddMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (yyyymmddMatch) {
            const year = parseInt(yyyymmddMatch[1], 10);
            const month = parseInt(yyyymmddMatch[2], 10);
            const day = parseInt(yyyymmddMatch[3], 10);
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }

        return null;
    } catch (error) {
        console.error('[GOOGLE-VISION] Error parsing date:', error);
        return null;
    }
}
