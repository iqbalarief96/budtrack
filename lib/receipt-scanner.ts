import { generateVisionResponse } from './ai';
import { processReceiptWithGoogleVision, processReceiptWithGoogleVisionAI } from './google-vision-ocr';

export type ReceiptItem = {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
    category?: string;
};

export type ReceiptData = {
    transaction: {
        store_name: string;
        date: string;
        total_amount: number;
        category: string;
        description: string;
        payment_method?: string;
    };
    items: ReceiptItem[];
};

export async function processReceipt(
    imageBase64: string,
    model: string,
    keys: {
        openaiApiKey?: string | null;
        geminiApiKey?: string | null;
        defaultApiKey?: string | null;
        defaultProvider?: string | null;
        googleVisionCredentials?: string | null;
        providerApiKey?: string | null;
        customEndpoint?: string | null;
        /** Model chosen in Settings; used whenever we talk to the user's own provider. */
        selectedModel?: string | null;
    }
): Promise<ReceiptData> {
    const isCustomProvider = keys.defaultProvider === 'custom' && !!keys.customEndpoint;

    // Check if Google Cloud Vision + AI hybrid is requested
    if (model === 'google-vision-ai' || model === 'google-vision-deepseek') {
        console.log('[RECEIPT-SCANNER] Using Google Cloud Vision + AI hybrid');
        
        if (!keys.googleVisionCredentials) {
            throw new Error('Google Vision credentials belum diupload. Silakan upload di Settings.');
        }
        
        const hybridApiKey = keys.providerApiKey || keys.defaultApiKey;
        if (!hybridApiKey) {
            throw new Error('API key AI belum disetup. Silakan setup di Settings.');
        }

        // The OCR text is parsed by the user's configured provider. Only DeepSeek
        // is guaranteed to have 'deepseek-chat'; any other provider (incl. a
        // Custom Endpoint) must use the model chosen in Settings.
        const hybridProvider = keys.defaultProvider || 'deepseek';
        const hybridModel = hybridProvider === 'deepseek'
            ? 'deepseek-chat' // unchanged behaviour for DeepSeek users
            : (keys.selectedModel || 'deepseek-chat');
        
        try {
            const receiptData = await processReceiptWithGoogleVisionAI(
                imageBase64,
                keys.googleVisionCredentials,
                hybridProvider,
                hybridApiKey,
                hybridModel,
                keys.customEndpoint
            );
            
            console.log('[RECEIPT-SCANNER] Hybrid processing successful');
            return receiptData;
        } catch (error) {
            console.error('[RECEIPT-SCANNER] Hybrid failed:', error);
            throw error;
        }
    }
    
    // Check if Google Cloud Vision is requested
    if (model === 'google-vision' || model === 'google-cloud-vision') {
        console.log('[RECEIPT-SCANNER] Using Google Cloud Vision API');
        
        // Check if credentials are configured
        if (!keys.googleVisionCredentials) {
            console.warn('[RECEIPT-SCANNER] Google Vision credentials not configured');
            
            // Check if we have fallback API keys
            if (!keys.defaultApiKey && !keys.openaiApiKey && !keys.geminiApiKey && !keys.providerApiKey) {
                throw new Error(
                    'Google Vision credentials belum diupload. ' +
                    'Silakan upload credentials di Settings → AI & Integrations, ' +
                    'atau gunakan model AI lain (Gemini/GPT).'
                );
            }
            
            // Fallback to AI-based OCR
            console.log('[RECEIPT-SCANNER] Falling back to AI-based OCR (no Google Vision credentials)...');
            // Change model to a valid AI model for fallback
            model = 'google/gemini-2.0-flash-exp:free'; // Use free Gemini model as fallback
            console.log('[RECEIPT-SCANNER] Using fallback model:', model);
            // Continue to AI-based processing below
        } else {
            try {
                const receiptData = await processReceiptWithGoogleVision(
                    imageBase64,
                    keys.googleVisionCredentials
                );
                
                console.log('[RECEIPT-SCANNER] Google Vision processing successful');
                return receiptData;
            } catch (error) {
                console.error('[RECEIPT-SCANNER] Google Vision failed:', error);
                
                // Check if we have fallback API keys
                if (!keys.defaultApiKey && !keys.openaiApiKey && !keys.geminiApiKey && !keys.providerApiKey) {
                    // No fallback available, throw the error
                    throw new Error(
                        'Google Vision gagal: ' + (error instanceof Error ? error.message : 'Unknown error') +
                        '. Tidak ada API key fallback. Silakan setup API key di Settings.'
                    );
                }
                
                // Fallback to AI-based OCR if Google Vision fails
                console.log('[RECEIPT-SCANNER] Falling back to AI-based OCR...');
                // Change model to a valid AI model for fallback
                model = 'google/gemini-2.0-flash-exp:free'; // Use free Gemini model as fallback
                console.log('[RECEIPT-SCANNER] Using fallback model:', model);
                // Continue to AI-based processing below
            }
        }
    }

    // Determine which key to use based on the model. providerApiKey is the
    // active provider's dedicated key (falling back to the legacy apiKey), so
    // users who only set e.g. openrouterApiKey still get a key here.
    const defaultKey = keys.providerApiKey || keys.defaultApiKey;
    let apiKey = defaultKey;
    let provider = keys.defaultProvider || 'openrouter';
    let customEndpoint: string | null = null;

    // Check if model is meant for OpenRouter (has :free suffix or other OpenRouter-specific suffixes)
    const isOpenRouterModel = model.includes(':free') || model.includes(':extended');

    // Explicit "use my Custom Endpoint" option from the receipt scanner.
    if (model === 'custom-endpoint') {
        if (!isCustomProvider) {
            throw new Error('Custom Endpoint belum diatur. Pilih provider "Custom Endpoint" dan isi URL-nya di Settings.');
        }
        if (!keys.selectedModel) {
            throw new Error('Model AI belum dipilih di Settings.');
        }
    }

    // Choose API key and provider based on model
    if (model === 'custom-endpoint') {
        apiKey = keys.providerApiKey || keys.defaultApiKey;
        provider = 'custom';
        customEndpoint = keys.customEndpoint ?? null;
        model = keys.selectedModel as string;
        console.log('[DEBUG] Using Custom Endpoint (model from Settings)');
    } else if (!isOpenRouterModel && model.includes('gpt') && keys.openaiApiKey) {
        // Use direct OpenAI API for GPT models if OpenAI key is configured
        apiKey = keys.openaiApiKey;
        provider = 'openai';
        console.log('[DEBUG] Using direct OpenAI API for GPT model');
    } else if (!isOpenRouterModel && model.includes('gemini') && keys.geminiApiKey) {
        // Use direct Gemini API for Gemini models if Gemini key is configured
        apiKey = keys.geminiApiKey;
        provider = 'google';
        console.log('[DEBUG] Using direct Gemini API for Gemini model');
    } else if (isCustomProvider && (keys.providerApiKey || keys.defaultApiKey)) {
        // Fallback to the user's Custom Endpoint. The scanner's model ids are
        // OpenRouter/OpenAI/Google ids that won't exist there, so use the model
        // chosen in Settings. (Previously this fell through to OpenRouter with
        // the custom endpoint's key, which always failed.)
        apiKey = keys.providerApiKey || keys.defaultApiKey;
        provider = 'custom';
        customEndpoint = keys.customEndpoint ?? null;
        if (keys.selectedModel) model = keys.selectedModel;
        console.log('[DEBUG] Falling back to Custom Endpoint (model from Settings)');
    } else if (defaultKey) {
        // Use OpenRouter/DeepSeek for free models or as fallback
        apiKey = defaultKey;
        provider = keys.defaultProvider || 'openrouter';
        console.log('[DEBUG] Using default API key (OpenRouter/DeepSeek)');
    }

    if (!apiKey) {
        throw new Error('API Key not found. Please configure an API key in Settings.');
    }

    const prompt = `
Dari gambar struk belanja ini, ekstrak informasi berikut dalam format JSON:

{
  "transaction": {
    "store_name": "Nama Toko",
    "date": "YYYY-MM-DD",
    "total_amount": 500000,
    "category": "Belanja",
    "description": "Belanja [Nama Toko]",
    "payment_method": "Cash/Debit/Credit (optional)"
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

ATURAN PENTING:
1. transaction.total_amount HARUS sama dengan SUM dari semua items.total_price
2. Jika quantity tidak jelas di struk, set 1
3. Format tanggal: YYYY-MM-DD
4. Semua harga dalam angka (no currency symbol)
5. Jika item tidak ada harga detail, masukkan ke 1 item "Lain-lain" dengan total_price = total_amount
6. unit_price = total_price / quantity
7. Jika ada diskon, sudah masukkan ke total_price (harga final)

CONTOH:
Struk menunjukkan:
- Susu 2x @ Rp 15.000 = Rp 30.000
- Roti 1x @ Rp 12.000 = Rp 12.000
- Total: Rp 42.000

Harus extract sebagai:
{
  "transaction": {
    "store_name": "Indomaret",
    "date": "2025-11-21",
    "total_amount": 42000,
    "category": "Belanja",
    "description": "Belanja Indomaret"
  },
  "items": [
    {
      "name": "Susu",
      "quantity": 2,
      "unit_price": 15000,
      "total_price": 30000
    },
    {
      "name": "Roti",
      "quantity": 1,
      "unit_price": 12000,
      "total_price": 12000
    }
  ]
}

Balas HANYA dengan JSON yang valid, tanpa backticks atau penjelasan tambahan.
`;

    try {
        console.log('[RECEIPT-SCANNER] Calling AI vision API...');
        const response = await generateVisionResponse({
            prompt,
            imageBase64,
            provider,
            apiKey,
            model,
            customEndpoint
        });

        console.log('[RECEIPT-SCANNER] Raw AI response:', response);

        // Clean up response if it contains markdown blocks
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        // Parse JSON response
        let data: ReceiptData;
        try {
            data = JSON.parse(cleanResponse);
        } catch (parseError) {
            console.error('[RECEIPT-SCANNER] JSON parse error:', parseError);
            throw new Error('Failed to parse AI response as JSON');
        }

        // Validate response structure
        if (!data.transaction || !data.items || !Array.isArray(data.items)) {
            console.error('[RECEIPT-SCANNER] Invalid response structure:', data);
            throw new Error('Invalid receipt data structure from AI');
        }

        // Validate required fields
        if (!data.transaction.store_name || !data.transaction.date || !data.transaction.total_amount) {
            throw new Error('Missing required transaction fields');
        }

        // Validate items
        if (data.items.length === 0) {
            console.warn('[RECEIPT-SCANNER] No items found, creating default item');
            // Create a single item with total amount
            data.items = [{
                name: 'Belanja (detail tidak tersedia)',
                quantity: 1,
                unit_price: data.transaction.total_amount,
                total_price: data.transaction.total_amount
            }];
        }

        // Validate total matches sum of items
        const itemsTotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
        const difference = Math.abs(itemsTotal - data.transaction.total_amount);

        if (difference > 1) { // Allow 1 rupiah rounding difference
            console.warn('[RECEIPT-SCANNER] Total mismatch!', {
                transactionTotal: data.transaction.total_amount,
                itemsTotal,
                difference
            });

            // Auto-adjust: add/subtract difference to first item
            if (data.items.length > 0) {
                const adjustment = data.transaction.total_amount - itemsTotal;
                data.items[0].total_price += adjustment;
                data.items[0].unit_price = data.items[0].total_price / data.items[0].quantity;
                data.items[0].notes = (data.items[0].notes || '') + ' (disesuaikan)';
                console.log('[RECEIPT-SCANNER] Adjusted first item by:', adjustment);
            }
        }

        console.log('[RECEIPT-SCANNER] Validated receipt data:', data);
        return data;
    } catch (error) {
        console.error('[RECEIPT-SCANNER] Error processing receipt:', error);
        // Pass through the actual error message if available
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to process receipt image. Please try again.');
    }
}
