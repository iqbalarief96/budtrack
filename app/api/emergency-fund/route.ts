import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const walletId = url.searchParams.get('walletId');
    
    console.log('[DEBUG] Emergency fund API GET called with walletId:', walletId);
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[DEBUG] User found with emergency fund:', user.emergencyFund);
    
    // Get all emergency fund data
    let currentAmount = 0;
    let targetAmount = user.emergencyFund?.targetAmount ?? 0;
    
    // Make sure targetAmount is never set to 1 (the default/placeholder value)
    if (targetAmount <= 1 && user.emergencyFund) {
      console.log('[DEBUG] Target amount was <= 1, setting to 5,000,000');
      
      // Update it to a reasonable default
      await prisma.emergencyFund.update({
        where: { id: user.emergencyFund.id },
        data: { targetAmount: 5000000 }
      });
      
      // Use the updated value
      targetAmount = 5000000;
    }
    
    // If walletId is specified, filter the emergency fund amount by wallet
    if (walletId) {
      try {
        const wallet = await prisma.wallet.findUnique({
          where: { 
            id: walletId,
            userId: user.id
          }
        });
        
        if (wallet) {
          // We're assuming the wallet balance represents the emergency fund
          currentAmount = wallet.balance;
        }
      } catch (walletError) {
        console.error('Error fetching wallet:', walletError);
        // Continue with default values instead of failing
      }
    } else if (user.emergencyFund) {
      // Use the emergency fund data if available
      currentAmount = user.emergencyFund.currentAmount;
    }
    
    // Fetch savings transactions using simpler, more reliable logic
    let savingsByType: Record<string, number> = {};
    let totalSavings = 0;
    
    try {
      // First simple attempt - get all transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          ...(walletId ? { walletId } : {})
        },
        include: {
          category: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      console.log(`Found ${transactions.length} total transactions`);
      
      // Debug output sample transactions
      if (transactions.length > 0) {
        console.log('Sample transactions:', transactions.slice(0, 3).map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          category: tx.category ? {
            id: tx.category.id,
            name: tx.category.name,
            type: tx.category.type
          } : null
        })));
      }
      
      // Filter savings transactions in JavaScript for more reliability
      const savingsTransactions = transactions.filter(tx => {
        // Check if description contains "tabungan" case insensitive
        const hasTabunganInDesc = tx.description && 
          tx.description.toLowerCase().includes('tabungan');
          
        // Check if category is of type SAVINGS
        const hasSavingsCategory = tx.category && 
          tx.category.type && 
          tx.category.type.toUpperCase() === 'SAVINGS';
          
        return hasTabunganInDesc || hasSavingsCategory;
      });
      
      console.log(`Filtered to ${savingsTransactions.length} savings transactions`);
      
      // Debug output sample savings transactions
      if (savingsTransactions.length > 0) {
        console.log('Sample savings transactions:', savingsTransactions.slice(0, 3).map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          category: tx.category ? {
            id: tx.category.id,
            name: tx.category.name,
            type: tx.category.type
          } : null
        })));
      }
      
      // Helper function to process description and identify savings type
      function identifySavingsType(description: string) {
        if (!description) return 'Tabungan Lainnya';
        
        const desc = description.toLowerCase();
        let savingsType = 'Tabungan Lainnya';
        
        console.log(`Processing description: "${desc}"`);
        
        // Special case for Bank Bandung
        if (desc.includes('bank bandung')) {
          console.log('MATCH: Found "Bank Bandung"');
          return 'Tabungan Bank Bandung';
        }
        
        // Try to extract full name after "Tabungan "
        const fullMatchRegex = /tabungan\s+(.*?)(\s*$|\/)/i;
        const fullMatch = desc.match(fullMatchRegex);
        
        if (fullMatch && fullMatch[1]) {
          const extractedType = fullMatch[1].trim();
          console.log(`MATCH: Extracted "${extractedType}" from "${desc}"`);
          
          // For multi-word types, capitalize each word
          if (extractedType.includes(' ')) {
            savingsType = 'Tabungan ' + extractedType.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } else {
            // For single word, just capitalize first letter
            savingsType = 'Tabungan ' + extractedType.charAt(0).toUpperCase() + extractedType.slice(1);
          }
          
          console.log(`Final savings type: "${savingsType}"`);
          return savingsType;
        }
        
        // Keyword matching if regex extraction didn't work
        if (desc.includes('pendidikan')) {
          return 'Tabungan Pendidikan';
        } else if (desc.includes('liburan') || desc.includes('traveling') || desc.includes('travel')) {
          return 'Tabungan Liburan';
        } else if (desc.includes('darurat') || desc.includes('emergency')) {
          return 'Tabungan Darurat';
        } else if (desc.includes('pensiun') || desc.includes('retirement')) {
          return 'Tabungan Pensiun';
        } else if (desc.includes('rumah') || desc.includes('properti')) {
          return 'Tabungan Properti';
        } else if (desc.includes('mobil') || desc.includes('motor') || desc.includes('kendaraan')) {
          return 'Tabungan Kendaraan';
        } else if (desc.includes('bank')) {
          return 'Tabungan Bank';
        } else if (desc.includes('emas')) {
          return 'Tabungan Emas';
        } else if (desc.includes('btc') || desc.includes('bitcoin')) {
          return 'Tabungan Btc';
        }
        
        // Default fallback
        return 'Tabungan Lainnya';
      }
      
      // Process savings transactions
      for (const tx of savingsTransactions) {
        // Use the helper function to identify savings type
        const savingsType = identifySavingsType(tx.description || '');
        console.log(`Transaction "${tx.description}" categorized as "${savingsType}"`);
        
        // Add to the appropriate savings type
        if (!savingsByType[savingsType]) {
          savingsByType[savingsType] = 0;
        }
        
        savingsByType[savingsType] += tx.amount;
        totalSavings += tx.amount;
      }
      
      console.log('Final savings categories:', Object.keys(savingsByType));
      console.log('Final savings data:', savingsByType);
      console.log('Successfully processed savings data');
      
    } catch (txError) {
      console.error('Error processing transactions, using fallback:', txError);
      
      // Fallback to empty data if error occurs - don't break the API
      savingsByType = {};
      totalSavings = 0;
    }
    
    // If no savings were found or error occurred, provide empty object
    if (Object.keys(savingsByType).length === 0) {
      console.log('No savings found, using empty object');
    }
    
    // If no emergency fund exists, return default values
    if (!user.emergencyFund) {
      return NextResponse.json({
        targetAmount: 5000000, // Never use 0 or 1 as the default
        currentAmount: currentAmount,
        monthlyContribution: 500000, // Reasonable default
        isActive: false,
        totalSavings: totalSavings,
        savingsByType: savingsByType
      }, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      });
    }
    
    // Return emergency fund data
    return NextResponse.json({
      targetAmount: targetAmount,
      currentAmount: currentAmount,
      monthlyContribution: user.emergencyFund.monthlyContribution,
      isActive: user.emergencyFund.isActive,
      totalSavings: totalSavings,
      savingsByType: savingsByType
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error fetching emergency fund data:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request data
    const data = await request.json();
    const { walletId } = data;
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get all emergency fund data
    let currentAmount = 0;
    
    // If walletId is specified, filter the emergency fund amount by wallet
    if (walletId) {
      try {
        const wallet = await prisma.wallet.findUnique({
      where: {
            id: walletId,
            userId: user.id
          }
        });
        
        if (wallet) {
          // We're assuming the wallet balance represents the emergency fund
          currentAmount = wallet.balance;
        }
      } catch (walletError) {
        console.error('Error fetching wallet:', walletError);
        // Continue with default values instead of failing
      }
    } else if (user.emergencyFund) {
      // Use the emergency fund data if available
      currentAmount = user.emergencyFund.currentAmount;
    }
    
    // Fetch savings transactions using simpler, more reliable logic
    let savingsByType: Record<string, number> = {};
    let totalSavings = 0;
    
    try {
      // First simple attempt - get all transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          ...(walletId ? { walletId } : {})
        },
        include: {
          category: true
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      // Filter savings transactions in JavaScript for more reliability
      const savingsTransactions = transactions.filter(tx => {
        // Check if description contains "tabungan" case insensitive
        const hasTabunganInDesc = tx.description && 
          tx.description.toLowerCase().includes('tabungan');
          
        // Check if category is of type SAVINGS
        const hasSavingsCategory = tx.category && 
          tx.category.type && 
          tx.category.type.toUpperCase() === 'SAVINGS';
          
        return hasTabunganInDesc || hasSavingsCategory;
      });
      
      // Debug output sample savings transactions
      if (savingsTransactions.length > 0) {
        console.log('Sample savings transactions:', savingsTransactions.slice(0, 3).map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          category: tx.category ? {
            id: tx.category.id,
            name: tx.category.name,
            type: tx.category.type
          } : null
        })));
      }

      // Helper function to process description and identify savings type
      function identifySavingsType(description: string) {
        if (!description) return 'Tabungan Lainnya';
        
        const desc = description.toLowerCase();
        let savingsType = 'Tabungan Lainnya';
        
        // Special case for Bank Bandung
        if (desc.includes('bank bandung')) {
          return 'Tabungan Bank Bandung';
        }
        
        // Try to extract full name after "Tabungan "
        const fullMatchRegex = /tabungan\s+(.*?)(\s*$|\/)/i;
        const fullMatch = desc.match(fullMatchRegex);
        
        if (fullMatch && fullMatch[1]) {
          const extractedType = fullMatch[1].trim();
          
          // For multi-word types, capitalize each word
          if (extractedType.includes(' ')) {
            savingsType = 'Tabungan ' + extractedType.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } else {
            // For single word, just capitalize first letter
            savingsType = 'Tabungan ' + extractedType.charAt(0).toUpperCase() + extractedType.slice(1);
          }
          
          return savingsType;
        }
        
        // Keyword matching if regex extraction didn't work
        if (desc.includes('pendidikan')) {
          return 'Tabungan Pendidikan';
        } else if (desc.includes('liburan') || desc.includes('traveling') || desc.includes('travel')) {
          return 'Tabungan Liburan';
        } else if (desc.includes('darurat') || desc.includes('emergency')) {
          return 'Tabungan Darurat';
        } else if (desc.includes('pensiun') || desc.includes('retirement')) {
          return 'Tabungan Pensiun';
        } else if (desc.includes('rumah') || desc.includes('properti')) {
          return 'Tabungan Properti';
        } else if (desc.includes('mobil') || desc.includes('motor') || desc.includes('kendaraan')) {
          return 'Tabungan Kendaraan';
        } else if (desc.includes('bank')) {
          return 'Tabungan Bank';
        } else if (desc.includes('emas')) {
          return 'Tabungan Emas';
        } else if (desc.includes('btc') || desc.includes('bitcoin')) {
          return 'Tabungan Btc';
        }
        
        // Default fallback
        return 'Tabungan Lainnya';
      }
      
      // Process savings transactions
      for (const tx of savingsTransactions) {
        // Use the helper function to identify savings type
        const savingsType = identifySavingsType(tx.description || '');
        
        // Add to the appropriate savings type
        if (!savingsByType[savingsType]) {
          savingsByType[savingsType] = 0;
        }
        
        savingsByType[savingsType] += tx.amount;
        totalSavings += tx.amount;
      }
      
    } catch (txError) {
      console.error('Error processing transactions, using fallback:', txError);
      
      // Fallback to empty data if error occurs - don't break the API
      savingsByType = {};
      totalSavings = 0;
    }
    
    // If no emergency fund exists, return default values
    if (!user.emergencyFund) {
      return NextResponse.json({
        targetAmount: 0,
        currentAmount: currentAmount,
        monthlyContribution: 0,
        isActive: false,
        totalSavings: totalSavings,
        savingsByType: savingsByType
      });
    }
    
    // Return emergency fund data
    return NextResponse.json({
      targetAmount: user.emergencyFund.targetAmount,
      currentAmount: currentAmount,
      monthlyContribution: user.emergencyFund.monthlyContribution,
      isActive: user.emergencyFund.isActive,
      totalSavings: totalSavings,
      savingsByType: savingsByType
    });
  } catch (error) {
    console.error('Error processing emergency fund data:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[DEBUG] PUT request to emergency-fund received');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('[DEBUG] PUT unauthorized - no session/email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request data and log it
    const data = await request.json();
    console.log('[DEBUG] PUT request body:', data);
    const { targetAmount, monthlyContribution } = data;
    
    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true
      }
    });
    
    if (!user) {
      console.log('[DEBUG] PUT user not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[DEBUG] Found user:', user.id, 'Has emergency fund:', !!user.emergencyFund);
    
    let emergencyFund;
    
    // Create or update emergency fund
    if (user.emergencyFund) {
      // Update existing emergency fund
      const updateData: any = {};
      
      if (targetAmount !== undefined) {
        updateData.targetAmount = targetAmount;
        console.log('[DEBUG] Will update targetAmount to:', targetAmount);
      }
      
      if (monthlyContribution !== undefined) {
        updateData.monthlyContribution = monthlyContribution;
        console.log('[DEBUG] Will update monthlyContribution to:', monthlyContribution);
      }
      
      emergencyFund = await prisma.emergencyFund.update({
        where: { id: user.emergencyFund.id },
        data: updateData
      });
      
      console.log(`[DEBUG] Updated emergency fund for user ${user.id}`, emergencyFund);
    } else {
      // Create new emergency fund
      emergencyFund = await prisma.emergencyFund.create({
        data: {
          userId: user.id,
          targetAmount: targetAmount || 0,
          currentAmount: 0, // Start with 0
          monthlyContribution: monthlyContribution || 0,
          isActive: true
        }
      });
      
      console.log(`[DEBUG] Created emergency fund for user ${user.id}`, emergencyFund);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      emergencyFund
    });
    
  } catch (error) {
    console.error('[DEBUG] Error in PUT route:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 