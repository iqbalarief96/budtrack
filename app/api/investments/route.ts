import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Valid Investment Types (Use this for validation)
const VALID_INVESTMENT_TYPES = [
  "STOCK",
  "CRYPTO",
  "PRECIOUS_METAL",
  "PROPERTY",
  "OTHER",
];

// GET /api/investments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const investments = await prisma.investment.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(investments)
  } catch (error) {
    console.error('Error fetching investments:', error)
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}

// POST /api/investments
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await request.json()
    const {
      name,
      type,
      tickerSymbol,
      quantity,
      averagePurchasePrice,
      purchaseDate,
      notes,
      walletId,
    } = body
    
    // Validate required fields
    if (!name || !type || quantity == null || averagePurchasePrice == null || !purchaseDate || !walletId) {
      return NextResponse.json({ error: 'Missing required fields (including walletId)' }, { status: 400 })
    }
    
    // Validate investment type
    if (!VALID_INVESTMENT_TYPES.includes(type.toUpperCase())) {
        return NextResponse.json({ error: `Invalid investment type` }, { status: 400 })
    }

    // Validate numeric fields
    const numQuantity = parseFloat(quantity);
    const numAvgPrice = parseFloat(averagePurchasePrice);
    if (isNaN(numQuantity) || isNaN(numAvgPrice) || numQuantity <= 0 || numAvgPrice <= 0) {
        return NextResponse.json({ error: 'Quantity and Price must be positive numbers' }, { status: 400 })
    }
    
    // Validate date
    const dtPurchaseDate = new Date(purchaseDate);
    if (isNaN(dtPurchaseDate.getTime())) {
        return NextResponse.json({ error: 'Invalid purchase date format' }, { status: 400 })
    }
    
    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
        where: { id: walletId, userId: userId }
    });
    if (!wallet) {
        return NextResponse.json({ error: 'Wallet not found or does not belong to user' }, { status: 404 })
    }
    
    // 1. Create the Investment record
    const newInvestment = await prisma.investment.create({
      data: {
        name,
        type: type.toUpperCase(),
        tickerSymbol,
        quantity: numQuantity,
        averagePurchasePrice: numAvgPrice,
        purchaseDate: dtPurchaseDate,
        notes,
        userId: userId,
        walletId: walletId,
      }
    })
    console.log('Investment created:', newInvestment.id);

    // --- Integration: Create Transaction & Update Wallet Balance --- 
    try {
        const investmentCost = numQuantity * numAvgPrice;
        console.log(`Investment cost: ${investmentCost}`);

        // 2. Find the "Savings" category for the user
        // Be specific: search by name AND type if possible, or just name.
        const savingsCategory = await prisma.category.findFirst({
            where: {
                userId: userId,
                // Assuming 'Savings' is the exact name and it's an EXPENSE type category
                name: 'Savings', 
                type: 'EXPENSE' 
            }
        });

        if (!savingsCategory) {
            console.warn(`Savings category not found for user ${userId}. Skipping transaction creation.`);
            // Decide if this should be an error or just a warning. For now, warning.
        } else {
            console.log(`Found Savings category: ${savingsCategory.id}`);

            // 3. Create the corresponding Expense Transaction
            const transactionDescription = `Tabungan ${name}`; // Description based on investment name
            const newTransaction = await prisma.transaction.create({
                data: {
                    amount: investmentCost,
                    type: 'EXPENSE',
                    date: dtPurchaseDate, // Use investment purchase date
                    description: transactionDescription,
                    categoryId: savingsCategory.id,
                    walletId: walletId,
                    userId: userId,
                }
            });
            console.log('Expense transaction created:', newTransaction.id);

            // 4. Update the Wallet Balance (Decrement)
            const updatedWallet = await prisma.wallet.update({
                where: { id: walletId },
                data: {
                    balance: {
                        decrement: investmentCost
                    }
                }
            });
            console.log(`Wallet ${walletId} balance updated. Old: ${wallet.balance}, New: ${updatedWallet.balance}`);
        }
    } catch (integrationError) {
        console.error('Error during transaction/balance integration:', integrationError);
        // Log this error but don't fail the entire investment creation?
        // Or potentially rollback the investment creation if this part fails?
        // For now, we just log it.
    }
    // --- End Integration --- 

    return NextResponse.json(newInvestment, { status: 201 })
    
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 })
  }
} 