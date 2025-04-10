import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Valid Investment Types (reuse from main route or define here)
const VALID_INVESTMENT_TYPES = [
  "STOCK",
  "CRYPTO",
  "PRECIOUS_METAL",
  "PROPERTY",
  "OTHER",
];

// PUT /api/investments/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const investmentId = params.id
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!investmentId) {
        return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      type,
      tickerSymbol,
      quantity,
      averagePurchasePrice,
      purchaseDate,
      notes,
      walletId // Make sure walletId is included in the edit form
    } = body

    // *** Basic Validation (similar to POST) ***
    if (!name || !type || quantity == null || averagePurchasePrice == null || !purchaseDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!VALID_INVESTMENT_TYPES.includes(type.toUpperCase())) {
      return NextResponse.json({ error: `Invalid investment type` }, { status: 400 })
    }
    const numQuantity = parseFloat(quantity);
    const numAvgPrice = parseFloat(averagePurchasePrice);
    if (isNaN(numQuantity) || isNaN(numAvgPrice) || numQuantity < 0 || numAvgPrice < 0) {
      return NextResponse.json({ error: 'Quantity and Price must be non-negative numbers' }, { status: 400 })
    }
    const dtPurchaseDate = new Date(purchaseDate);
    if (isNaN(dtPurchaseDate.getTime())) {
      return NextResponse.json({ error: 'Invalid purchase date format' }, { status: 400 })
    }
    // *** End Validation ***

    // Check if the investment exists and belongs to the user
    const existingInvestment = await prisma.investment.findUnique({
      where: { id: investmentId }
    });

    if (!existingInvestment || existingInvestment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Investment not found or unauthorized' }, { status: 404 });
    }

    // Calculate old and new investment costs
    const oldInvestmentCost = existingInvestment.quantity * existingInvestment.averagePurchasePrice;
    const newInvestmentCost = numQuantity * numAvgPrice;
    const costDifference = newInvestmentCost - oldInvestmentCost;
    
    console.log(`Investment update - Old cost: ${oldInvestmentCost}, New cost: ${newInvestmentCost}, Difference: ${costDifference}`);
    
    // Update the investment
    const updatedInvestment = await prisma.investment.update({
      where: { id: investmentId },
      data: {
        name,
        type: type.toUpperCase(),
        tickerSymbol,
        quantity: numQuantity,
        averagePurchasePrice: numAvgPrice,
        purchaseDate: dtPurchaseDate,
        notes,
        // userId is not updated
      }
    });
    
    // --- Integration: Update Related Transaction & Wallet Balance ---
    try {
      // 1. Find the "Savings" category for the user
      const savingsCategory = await prisma.category.findFirst({
        where: {
          userId: session.user.id,
          name: 'Savings', 
          type: 'EXPENSE' 
        }
      });
      
      if (!savingsCategory) {
        console.warn(`Savings category not found for user ${session.user.id}. Skipping transaction update.`);
      } else {
        // 2. Find existing transaction related to this investment
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: session.user.id,
            categoryId: savingsCategory.id,
            description: `Tabungan ${existingInvestment.name}`,
            // We can add more conditions to ensure we get the right transaction
            date: { 
              // Find transactions within a day of the original investment date
              gte: new Date(existingInvestment.purchaseDate.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(existingInvestment.purchaseDate.getTime() + 24 * 60 * 60 * 1000),
            }
          }
        });
        
        if (existingTransaction) {
          console.log(`Found existing transaction: ${existingTransaction.id} for investment ${investmentId}`);
          
          // 3. Update the transaction
          const updatedTransaction = await prisma.transaction.update({
            where: { id: existingTransaction.id },
            data: {
              amount: newInvestmentCost,
              date: dtPurchaseDate,
              description: `Tabungan ${name}`, // Update description in case name changed
            }
          });
          
          console.log(`Transaction updated: ${updatedTransaction.id}`);
          
          // 4. Adjust the wallet balance based on the cost difference
          if (costDifference !== 0) {
            // Get the wallet to update - either from the existing transaction or from the request
            const targetWalletId = walletId || existingTransaction.walletId;
            
            // First get current wallet to log before/after
            const currentWallet = await prisma.wallet.findUnique({
              where: { id: targetWalletId }
            });
            
            if (currentWallet) {
              const operation = costDifference > 0 ? 'decrement' : 'increment';
              const updateAmount = Math.abs(costDifference);
              
              const updatedWallet = await prisma.wallet.update({
                where: { id: targetWalletId },
                data: {
                  balance: {
                    [operation]: updateAmount
                  }
                }
              });
              
              console.log(`Wallet ${targetWalletId} balance updated. Old: ${currentWallet.balance}, New: ${updatedWallet.balance}`);
            } else {
              console.warn(`Wallet ${targetWalletId} not found.`);
            }
          } else {
            console.log('No change in investment cost, wallet balance remains the same.');
          }
        } else {
          console.warn(`No matching transaction found for investment ${investmentId}. Creating a new one.`);
          
          // If no existing transaction found, create a new one
          const newTransaction = await prisma.transaction.create({
            data: {
              amount: newInvestmentCost,
              type: 'EXPENSE',
              date: dtPurchaseDate,
              description: `Tabungan ${name}`,
              categoryId: savingsCategory.id,
              walletId: walletId || existingInvestment.walletId,
              userId: session.user.id,
            }
          });
          
          console.log(`New transaction created: ${newTransaction.id}`);
          
          // Update wallet balance - but only adjust by the DIFFERENCE, not the full amount
          // since the original amount was already accounted for previously
          const targetWalletId = walletId || existingInvestment.walletId;
          const currentWallet = await prisma.wallet.findUnique({
            where: { id: targetWalletId }
          });
          
          if (currentWallet) {
            // Only adjust by the difference, not full amount
            if (costDifference !== 0) {
              const operation = costDifference > 0 ? 'decrement' : 'increment';
              const updateAmount = Math.abs(costDifference);
              
              const updatedWallet = await prisma.wallet.update({
                where: { id: targetWalletId },
                data: {
                  balance: {
                    [operation]: updateAmount
                  }
                }
              });
              
              console.log(`Wallet ${targetWalletId} balance updated. Old: ${currentWallet.balance}, New: ${updatedWallet.balance}`);
            } else {
              console.log('No change in investment cost, wallet balance remains the same.');
            }
          }
        }
      }
    } catch (integrationError) {
      console.error('Error during transaction/wallet update:', integrationError);
      // Log error but don't fail the investment update
    }
    // --- End Integration ---
    
    return NextResponse.json(updatedInvestment)
    
  } catch (error) {
    console.error('Error updating investment:', error)
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 })
  }
}

// Optional: Add DELETE handler here as well later 