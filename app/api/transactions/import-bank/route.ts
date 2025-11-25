import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { parseBankStatement, detectBankFormat, BANK_FORMATS } from '@/lib/bank-statement-parser';

export const dynamic = 'force-dynamic';

// POST /api/transactions/import-bank - Import transactions from bank statement CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const walletId = formData.get('walletId') as string;
    const bankFormatName = formData.get('bankFormat') as string;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 });
    }

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id,
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Read file content
    const csvContent = await file.text();

    // Detect or use specified bank format
    let bankFormat = bankFormatName 
      ? BANK_FORMATS[bankFormatName] 
      : detectBankFormat(csvContent);

    if (!bankFormat) {
      return NextResponse.json(
        { error: 'Could not detect bank format. Please specify manually.' },
        { status: 400 }
      );
    }

    console.log('[IMPORT-BANK] Using bank format:', bankFormat.name);

    // Parse transactions
    const parsedTransactions = parseBankStatement(csvContent, bankFormat);

    console.log('[IMPORT-BANK] Parsed transactions:', parsedTransactions.length);

    if (parsedTransactions.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions found in file' },
        { status: 400 }
      );
    }

    // Get default category for uncategorized transactions
    let defaultCategory = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: 'Uncategorized',
      },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          userId: session.user.id,
          name: 'Uncategorized',
          type: 'EXPENSE',
          icon: '❓',
          color: '#9CA3AF',
        },
      });
    }

    // Check for duplicates if requested
    let duplicateCount = 0;
    let importedCount = 0;
    const errors: string[] = [];

    for (const transaction of parsedTransactions) {
      try {
        // Check for duplicate
        if (skipDuplicates) {
          const existing = await prisma.transaction.findFirst({
            where: {
              userId: session.user.id,
              walletId: wallet.id,
              date: transaction.date,
              amount: transaction.amount,
              type: transaction.type,
            },
          });

          if (existing) {
            duplicateCount++;
            continue;
          }
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            userId: session.user.id,
            walletId: wallet.id,
            categoryId: defaultCategory.id,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
          },
        });

        importedCount++;
      } catch (error) {
        console.error('[IMPORT-BANK] Error importing transaction:', error);
        errors.push(`Failed to import: ${transaction.description}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      duplicates: duplicateCount,
      total: parsedTransactions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} transactions${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`,
    });
  } catch (error) {
    console.error('[IMPORT-BANK] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import bank statement' },
      { status: 500 }
    );
  }
}

// GET /api/transactions/import-bank - Get available bank formats
export async function GET() {
  return NextResponse.json({
    formats: Object.keys(BANK_FORMATS).map(key => ({
      id: key,
      name: BANK_FORMATS[key].name,
    })),
  });
}
