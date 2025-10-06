import { NextRequest, NextResponse } from 'next/server'
// import { Ratelimit } from '@upstash/ratelimit' // Nonaktifkan import
// import { kv } from '@vercel/kv' // Nonaktifkan import

// --- Konfigurasi Rate Limiter (DINONAKTIFKAN) ---
// const ratelimit = new Ratelimit({
//   redis: kv,
//   limiter: Ratelimit.slidingWindow(10, '10 s'),
//   analytics: true, 
// });
// ---------------------------------------------

// --- Fungsi Helper untuk Fetch API Eksternal --- 

// Fungsi untuk fetch harga kripto dari CoinGecko (Contoh)
// Note: CoinGecko free API biasanya tidak butuh API key untuk simple price, tapi bisa ditambahkan jika perlu endpoint pro
// Note 2: CoinGecko menggunakan ID (e.g., 'bitcoin', 'ethereum') bukan simbol (e.g., 'BTC') untuk endpoint /simple/price
async function fetchCryptoPrice(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    console.log(`Fetching CoinGecko: ${coingeckoUrl}`);
    try {
        const response = await fetch(coingeckoUrl);
        if (!response.ok) {
            console.error('CoinGecko API Error:', response.status, await response.text());
            return {};
        }
        const data = await response.json();
        const prices: Record<string, number> = {};
        for (const id in data) {
            if (data[id]?.usd) {
                // Return with lowercase key for consistency
                prices[id.toLowerCase()] = data[id].usd;
            }
        }
        return prices;
    } catch (error) {
        console.error('Error fetching from CoinGecko:', error);
        return {};
    }
}

// Fungsi untuk fetch harga saham dari Alpha Vantage (Contoh)
async function fetchStockPrice(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
        console.error('Alpha Vantage API key not configured.');
        return {}; 
    }
    const prices: Record<string, number> = {};
    for (const symbol of symbols) {
        const alphaVantageUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        console.log(`Fetching Alpha Vantage for symbol: ${symbol}`);
        try {
            await new Promise(resolve => setTimeout(resolve, 1100)); 
            const response = await fetch(alphaVantageUrl);
            if (!response.ok) {
                console.error(`Alpha Vantage API Error for ${symbol}:`, response.status, await response.text());
                continue; 
            }
            const data = await response.json();
            if (data.Note) {
                console.warn(`Alpha Vantage Note for ${symbol}: ${data.Note}`);
                continue;
            }
            if (data['Global Quote'] && data['Global Quote']['05. price']) {
                // Return with lowercase key for consistency
                prices[symbol.toLowerCase()] = parseFloat(data['Global Quote']['05. price']);
            } else {
                console.warn(`Could not find price quote for symbol: ${symbol}`, data);
            }
        } catch (error) {
            console.error(`Error fetching ${symbol} from Alpha Vantage:`, error);
        }
    }
    return prices;
}

// --- NEW: Fungsi untuk fetch harga Logam dari MetalPriceAPI ---
async function fetchMetalPrice(symbols: string[]): Promise<Record<string, number>> {
    // Filter only symbols relevant for this API (e.g., XAU, XAG)
    const relevantSymbols = symbols.filter(s => ['XAU', 'XAG'].includes(s.toUpperCase()));
    if (relevantSymbols.length === 0) return {};
    
    const apiKey = process.env.METALPRICEAPI_KEY;
    if (!apiKey) {
        console.error('MetalPriceAPI key (METALPRICEAPI_KEY) not configured.');
        return {};
    }
    
    // We want price in USD per ounce, so base=USD, currencies=XAU,XAG etc.
    const apiUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=${relevantSymbols.join(',')}`;
    console.log(`Fetching MetalPriceAPI: ${apiUrl}`);
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error('MetalPriceAPI Error:', response.status, await response.text());
            return {};
        }
        const data = await response.json();
        
        if (!data.rates) {
             console.error('Invalid response format from MetalPriceAPI:', data);
             return {};
        }

        const prices: Record<string, number> = {};
        for (const symbol of relevantSymbols) {
            if (data.rates[symbol]) {
                // Response gives rate relative to base (e.g., 1 USD = X ounces of Gold)
                // We need the inverse to get USD per Ounce
                const rate = data.rates[symbol];
                if (rate > 0) {
                    // Return with lowercase key for consistency
                    prices[symbol.toLowerCase()] = 1 / rate; 
                }
            } else {
                console.warn(`Rate for ${symbol} not found in MetalPriceAPI response.`);
            }
        }
        return prices;
    } catch (error) {
        console.error('Error fetching from MetalPriceAPI:', error);
        return {};
    }
}

// Fungsi untuk fetch kurs USD/IDR
async function fetchUsdToIdrRate(): Promise<number | null> {
    const exchangeRateApiUrl = 'https://open.er-api.com/v6/latest/USD';
    console.log(`Fetching exchange rate: ${exchangeRateApiUrl}`);
    try {
        const response = await fetch(exchangeRateApiUrl, { cache: 'no-store' }); // No cache for latest rates
        if (!response.ok) {
            console.error('Exchange Rate API Error:', response.status, await response.text());
            return null;
        }
        const data = await response.json();
        if (data.rates && data.rates.IDR) {
            return data.rates.IDR;
        }
        console.warn('Could not find IDR rate in exchange rate API response:', data);
        return null;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
    }
}

// ---------------------------------------------

// GET /api/market-data
export async function GET(request: NextRequest) {
    // --- Rate Limiter Check (DINONAKTIFKAN) ---
    // const ip = request.ip ?? '127.0.0.1';
    // const { success, limit, remaining } = await ratelimit.limit(ip);
    // if (!success) {
    //     return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    // }
    // console.log(`Rate limit check: success=${success}, limit=${limit}, remaining=${remaining}`);
    // ------------------------------------------

    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
        return NextResponse.json({ error: 'Missing \'symbols\' query parameter' }, { status: 400 });
    }

    // Pisahkan dan bersihkan simbol/ID
    const requestedSymbols = symbolsParam.split(',')
                                        .map(s => s.trim().toLowerCase()) // Lowercase for consistency
                                        .filter(s => s.length > 0);
    
    if (requestedSymbols.length === 0) {
        return NextResponse.json({ prices: {}, usdToIdrRate: null }); // Return empty if no valid symbols
    }

    console.log('Requested symbols/ids:', requestedSymbols);

    // --- Klasifikasi Simbol (Diperbarui) ---
    const cryptoIds: string[] = [];
    const stockSymbols: string[] = [];
    const metalSymbols: string[] = []; // NEW

    // Pemetaan dari simbol umum ATAU ID ke ID CoinGecko
    const cryptoSymbolToIdMap: Record<string, string> = {
        // Simbol -> ID
        'btc': 'bitcoin',
        'btc-usd': 'bitcoin',
        'eth': 'ethereum',
        'eth-usd': 'ethereum',
        'doge': 'dogecoin',
        // ID -> ID (Tambahkan ini)
        'bitcoin': 'bitcoin',
        'ethereum': 'ethereum',
        'dogecoin': 'dogecoin',
        // Tambahkan pemetaan ID lain jika perlu
    };

    requestedSymbols.forEach(s => {
        const lowerSymbol = s.toLowerCase();
        // 1. Cek Logam Mulia (Gunakan simbol standar XAU, XAG)
        if (lowerSymbol === 'xau' || lowerSymbol === 'xag') { 
            metalSymbols.push(s.toUpperCase()); // MetalPriceAPI perlu uppercase?
        }
        // 2. Cek Kripto
        else if (cryptoSymbolToIdMap[lowerSymbol]) {
            cryptoIds.push(cryptoSymbolToIdMap[lowerSymbol]);
        }
        // 3. Sisanya anggap Saham/ETF
        else { 
             stockSymbols.push(s.toUpperCase()); 
        } 
    });
    console.log('Classified Metal Symbols:', metalSymbols);
    console.log('Classified Crypto IDs:', cryptoIds);
    console.log('Classified Stock Symbols:', stockSymbols);
    // ---------------------------------------------

    // --- Fetch Data (Termasuk Logam) ---
    try {
        // Fetch asset prices and exchange rate concurrently
        const [metalPrices, cryptoPrices, stockPrices, usdToIdrRate] = await Promise.all([
            fetchMetalPrice(metalSymbols), // Panggil fungsi baru
            fetchCryptoPrice(cryptoIds),
            fetchStockPrice(stockSymbols),
            fetchUsdToIdrRate()
        ]);

        // Gabungkan semua hasil (pastikan key konsisten lowercase)
        const allPrices = { ...metalPrices, ...cryptoPrices, ...stockPrices }; 
        console.log('Combined Prices:', allPrices);
        console.log('USD to IDR Rate:', usdToIdrRate);

        // Return both prices and the rate
        return NextResponse.json({
            prices: allPrices,
            usdToIdrRate: usdToIdrRate
        });

    } catch (error) {
        console.error('Error fetching market data or exchange rate:', error);
        return NextResponse.json({ error: 'Failed to fetch market data or exchange rate' }, { status: 503 }); // Service Unavailable
    }
} 