import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// ✅ EXACT SAME mappings as savings-wallet-router.ts for 100% consistency
const SAVINGS_KEYWORD_MAPPINGS = [
    { keywords: ['darurat', 'emergency'], goalTypes: ['EMERGENCY_FUND'] },
    { keywords: ['pendidikan', 'school', 'kuliah', 'education'], goalTypes: ['EDUCATION'] },
    { keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'], goalTypes: ['VACATION'] },
    { keywords: ['pensiun', 'retirement'], goalTypes: ['RETIREMENT'] },
    { keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'], goalTypes: ['HOME_DOWN_PAYMENT', 'PROPERTY'] },
    { keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], goalTypes: ['CAR', 'VEHICLE'] },
    { keywords: ['bank', 'rekening', 'account'], goalTypes: ['OTHER'] },
    { keywords: ['emas', 'gold', 'logam mulia'], goalTypes: ['OTHER'] },
    { keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'], goalTypes: ['OTHER'] },
    { keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond', 'bibit'], goalTypes: ['OTHER'] },
    { keywords: ['deposito', 'deposit', 'term deposit'], goalTypes: ['OTHER'] },
];

export async function POST(
    request: NextRequest,
    { params }: { params: { goalId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const goalId = params.goalId;

        // Get goal
        const goal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: session.user.id,
            },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        if (!goal.category) {
            return NextResponse.json(
                { error: 'Goal must have a category to auto-sync' },
                { status: 400 }
            );
        }

        console.log(`[Auto-Sync] Syncing existing transactions for goal: ${goal.name} (${goal.category})`);

        // 🔥 NEW: Find keywords based on GOAL NAME first (for OTHER type goals like "Bibit")
        const goalNameLower = goal.name.toLowerCase();

        // Try to find mapping that matches goal name
        let mapping = SAVINGS_KEYWORD_MAPPINGS.find(m =>
            m.keywords.some(keyword => goalNameLower.includes(keyword))
        );

        // Fallback: find by goal category
        if (!mapping) {
            mapping = SAVINGS_KEYWORD_MAPPINGS.find(m =>
                m.goalTypes.includes(goal.category!)
            );
        }

        if (!mapping) {
            return NextResponse.json(
                { message: 'No keyword mapping found for this goal' },
                { status: 200 }
            );
        }

        console.log(`[Auto-Sync] Using keywords:`, mapping.keywords);

        // Build OR conditions for matching descriptions (SQLite doesn't support mode)
        const descriptionConditions = mapping.keywords.map(keyword => ({
            description: {
                contains: keyword,
            },
        }));

        // Find matching transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: 'EXPENSE',
                goalId: null, // Not yet linked to any goal
                category: {
                    name: {
                        contains: 'Saving',
                    },
                },
                OR: descriptionConditions,
            },
        });

        console.log(`[Auto-Sync] Found ${transactions.length} matching transactions`);

        let syncedCount = 0;
        let totalAmount = 0;

        for (const tx of transactions) {
            try {
                // Create goal activity
                await prisma.goalActivity.create({
                    data: {
                        goalId: goal.id,
                        userId: session.user.id,
                        amount: tx.amount,
                        date: tx.date,
                        description: tx.description || 'Auto-synced',
                        transactionId: tx.id,
                    },
                });

                // Update transaction
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { goalId: goal.id },
                });

                totalAmount += tx.amount;
                syncedCount++;
            } catch (error) {
                console.error(`[Auto-Sync] Error syncing transaction ${tx.id}:`, error);
            }
        }

        // Update goal current amount
        if (syncedCount > 0) {
            await prisma.goal.update({
                where: { id: goal.id },
                data: {
                    current: {
                        increment: totalAmount,
                    },
                },
            });
        }

        console.log(`[Auto-Sync] Synced ${syncedCount} transactions (${totalAmount}) to goal ${goal.name}`);

        return NextResponse.json({
            success: true,
            syncedCount,
            totalAmount,
            message: `Auto-synced ${syncedCount} existing transaction(s)`,
        });
    } catch (error) {
        console.error('[Auto-Sync] Error:', error);
        return NextResponse.json(
            { error: 'Failed to auto-sync transactions' },
            { status: 500 }
        );
    }
}
