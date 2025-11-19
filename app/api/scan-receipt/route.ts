import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { processReceipt } from '@/lib/receipt-scanner';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { imageBase64, model } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // Fetch user settings to get API keys
        const userSettings = await prisma.userSettings.findUnique({
            where: { userId: session.user.id }
        });

        if (!userSettings) {
            return NextResponse.json({ error: 'Settings not found. Please configure your AI settings first.' }, { status: 404 });
        }

        const keys = {
            openaiApiKey: userSettings.openaiApiKey,
            geminiApiKey: userSettings.geminiApiKey,
            defaultApiKey: userSettings.apiKey,
            defaultProvider: userSettings.provider
        };

        const data = await processReceipt(imageBase64, model || 'google/gemini-2.0-flash-exp:free', keys);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error scanning receipt:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
            { status: 500 }
        );
    }
}
