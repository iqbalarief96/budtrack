import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { processReceipt } from '@/lib/receipt-scanner';

export async function POST(request: NextRequest) {
    try {
        console.log('[SCAN-RECEIPT] Request received');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.log('[SCAN-RECEIPT] Unauthorized - no session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('[SCAN-RECEIPT] User authenticated:', session.user.id);

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const model = formData.get('model') as string | null;

        console.log('[SCAN-RECEIPT] File info:', {
            hasFile: !!file,
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size,
            model: model || 'default'
        });

        if (!file) {
            console.log('[SCAN-RECEIPT] Error: No file provided');
            return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
        }

        // Convert file to base64
        console.log('[SCAN-RECEIPT] Converting file to base64...');
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
        console.log('[SCAN-RECEIPT] Base64 length:', imageBase64.length);
        console.log('[SCAN-RECEIPT] Base64 prefix:', imageBase64.substring(0, 50));

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
            provider: userSettings.provider
        });

        const keys = {
            openaiApiKey: userSettings.openaiApiKey,
            geminiApiKey: userSettings.geminiApiKey,
            defaultApiKey: userSettings.apiKey,
            defaultProvider: userSettings.provider
        };

        console.log('[SCAN-RECEIPT] Processing receipt with model:', model || 'google/gemini-2.0-flash-exp:free');
        const data = await processReceipt(imageBase64, model || 'google/gemini-2.0-flash-exp:free', keys);

        console.log('[SCAN-RECEIPT] Success! Data:', JSON.stringify(data, null, 2));
        return NextResponse.json(data);
    } catch (error) {
        console.error('[SCAN-RECEIPT] Error:', error);
        console.error('[SCAN-RECEIPT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
            { status: 500 }
        );
    }
}
