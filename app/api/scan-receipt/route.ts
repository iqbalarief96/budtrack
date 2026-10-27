import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { processReceipt } from '@/lib/receipt-scanner';
import { resolveProviderApiKey } from '@/lib/ai-settings';

export async function POST(request: NextRequest) {
    try {
        console.log('[SCAN-RECEIPT] Request received');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.log('[SCAN-RECEIPT] Unauthorized - no session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('[SCAN-RECEIPT] User authenticated:', session.user.id);

        // Support both JSON (ReceiptScanner.tsx) and FormData (ScanReceiptButton.tsx)
        const contentType = request.headers.get('content-type') || '';
        let imageBase64: string;
        let model: string | null = null;

        if (contentType.includes('application/json')) {
            // Handle JSON request (ReceiptScanner.tsx)
            console.log('[SCAN-RECEIPT] Processing JSON request');
            const body = await request.json();
            imageBase64 = body.imageBase64;
            model = body.model || null;

            console.log('[SCAN-RECEIPT] JSON data:', {
                hasImageBase64: !!imageBase64,
                base64Length: imageBase64?.length,
                base64Prefix: imageBase64?.substring(0, 50),
                model: model || 'default'
            });

            if (!imageBase64) {
                console.log('[SCAN-RECEIPT] Error: No imageBase64 provided in JSON');
                return NextResponse.json({ error: 'Image base64 is required' }, { status: 400 });
            }

            // Add data URL prefix if not present
            if (!imageBase64.startsWith('data:image')) {
                imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
                console.log('[SCAN-RECEIPT] Added data URL prefix');
            }
        } else {
            // Handle FormData request (ScanReceiptButton.tsx)
            console.log('[SCAN-RECEIPT] Processing FormData request');
            const formData = await request.formData();
            const file = formData.get('file') as File;
            model = formData.get('model') as string | null;

            console.log('[SCAN-RECEIPT] File info:', {
                hasFile: !!file,
                fileName: file?.name,
                fileType: file?.type,
                fileSize: file?.size,
                model: model || 'default'
            });

            if (!file) {
                console.log('[SCAN-RECEIPT] Error: No file provided in FormData');
                return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
            }

            // Convert file to base64
            console.log('[SCAN-RECEIPT] Converting file to base64...');
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
            console.log('[SCAN-RECEIPT] Base64 length:', imageBase64.length);
            console.log('[SCAN-RECEIPT] Base64 prefix:', imageBase64.substring(0, 50));
        }

        // Fetch user settings to get API keys
        console.log('[SCAN-RECEIPT] Fetching user settings...');
        const userSettings = await prisma.userSettings.findUnique({
            where: { userId: session.user.id }
        });

        if (!userSettings) {
            console.log('[SCAN-RECEIPT] Error: User settings not found');
            return NextResponse.json({ error: 'Settings not found. Please configure your AI settings first.' }, { status: 404 });
        }

        console.log('[SCAN-RECEIPT] User settings found:', {
            hasOpenAI: !!userSettings.openaiApiKey,
            hasGemini: !!userSettings.geminiApiKey,
            hasDefault: !!userSettings.apiKey,
            hasGoogleVision: !!userSettings.googleVisionCredentials,
            provider: userSettings.provider
        });

        const keys = {
            openaiApiKey: userSettings.openaiApiKey,
            geminiApiKey: userSettings.geminiApiKey,
            defaultApiKey: userSettings.apiKey,
            defaultProvider: userSettings.provider,
            googleVisionCredentials: userSettings.googleVisionCredentials,
            providerApiKey: resolveProviderApiKey(userSettings),
            customEndpoint: userSettings.provider === 'custom' ? userSettings.customEndpoint : null
        };

        console.log('[SCAN-RECEIPT] Processing receipt with model:', model || 'google/gemini-2.0-flash-exp:free');
        const receiptData = await processReceipt(imageBase64, model || 'google/gemini-2.0-flash-exp:free', keys);

        console.log('[SCAN-RECEIPT] Receipt data extracted:', JSON.stringify(receiptData, null, 2));

        // Return extracted data for preview (don't save yet)
        return NextResponse.json({
            success: true,
            data: receiptData,
            message: `Receipt scanned! Found ${receiptData.items.length} items.`
        });
    } catch (error) {
        console.error('[SCAN-RECEIPT] Error:', error);
        console.error('[SCAN-RECEIPT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
            { status: 500 }
        );
    }
}
