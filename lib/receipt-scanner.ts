import { generateVisionResponse } from './ai';

export type ReceiptData = {
    header: {
        store_name: string;
        transaction_date: string;
        total_amount: number;
        category: string;
        description_default: string;
    };
    items_as_transactions: Array<{
        tanggal: string;
        deskripsi: string;
        kategori: string;
        dompet: string;
        jumlah: number;
    }>;
};

export async function processReceipt(
    imageBase64: string,
    model: string,
    keys: {
        openaiApiKey?: string | null;
        geminiApiKey?: string | null;
        defaultApiKey?: string | null;
        defaultProvider?: string | null;
    }
): Promise<ReceiptData> {
    // Determine which key to use based on the model
    let apiKey = keys.defaultApiKey;
    let provider = keys.defaultProvider || 'openrouter';

    // Check if model is meant for OpenRouter (has :free suffix or other OpenRouter-specific suffixes)
    const isOpenRouterModel = model.includes(':free') || model.includes(':extended');

    // Choose API key and provider based on model
    if (!isOpenRouterModel && model.includes('gpt') && keys.openaiApiKey) {
        // Use direct OpenAI API for GPT models if OpenAI key is configured
        apiKey = keys.openaiApiKey;
        provider = 'openai';
        console.log('[DEBUG] Using direct OpenAI API for GPT model');
    } else if (!isOpenRouterModel && model.includes('gemini') && keys.geminiApiKey) {
        // Use direct Gemini API for Gemini models if Gemini key is configured
        apiKey = keys.geminiApiKey;
        provider = 'google';
        console.log('[DEBUG] Using direct Gemini API for Gemini model');
    } else if (keys.defaultApiKey) {
        // Use OpenRouter/DeepSeek for free models or as fallback
        apiKey = keys.defaultApiKey;
        provider = keys.defaultProvider || 'openrouter';
        console.log('[DEBUG] Using default API key (OpenRouter/DeepSeek)');
    }

    if (!apiKey) {
        throw new Error('API Key not found. Please configure an API key in Settings.');
    }

    const prompt = `
Dari teks struk di bawah ini, ekstrak:
1) Info utama struk
2) Daftar item belanja dalam format transaksi

Balas HANYA dengan JSON yang valid seperti contoh ini:

{
  "header": {
    "store_name": "Alfamart",
    "transaction_date": "2025-11-19",
    "total_amount": 73500,
    "category": "Belanja",
    "description_default": "Belanja Alfamart"
  },
  "items_as_transactions": [
    {
      "tanggal": "2025-11-19",
      "deskripsi": "Belanja Alfamart - Indomie Goreng 5pcs",
      "kategori": "Belanja",
      "dompet": "DEFAULT",
      "jumlah": 25000
    }
  ]
}

PENJELASAN FIELD:

1. header:
   - "store_name": nama toko dari header struk.
   - "transaction_date": tanggal transaksi dalam format "YYYY-MM-DD".
   - "total_amount": total belanja dari struk (angka desimal).
   - "category": Default "Belanja".
   - "description_default": "Belanja {store_name}".

2. items_as_transactions:
   - "tanggal": sama dengan transaction_date.
   - "deskripsi": "Belanja {store_name} - {nama_item}".
   - "kategori": "Belanja".
   - "dompet": "DEFAULT".
   - "jumlah": harga total per item (qty x harga).

PENTING:
- Balas HANYA JSON tanpa penjelasan tambahan.
- Jangan pakai markdown block (\`\`\`json).
`;

    try {
        const response = await generateVisionResponse({
            prompt,
            imageBase64,
            provider,
            apiKey,
            model
        });

        // Clean up response if it contains markdown blocks
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Error processing receipt:', error);
        // Pass through the actual error message if available
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to process receipt image. Please try again.');
    }
}
