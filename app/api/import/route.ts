import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parse } from 'csv-parse/sync';
import prisma from '@/lib/prisma';
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log('Import API called');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const walletId = formData.get('walletId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    
    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 });
    }
    
    // Check if the wallet belongs to the user
    const wallet = await prisma.wallet.findUnique({
      where: {
        id: walletId,
        userId,
      },
    });
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }
    
    const csvContent = await file.text();
    console.log('Raw CSV content:', csvContent);
    
    if (!csvContent.trim()) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }
    
    // Parse CSV with headers matching the export format
    const records = parse(csvContent, {
      columns: false, // We'll handle the columns manually since there are no headers
      skip_empty_lines: true,
      trim: true
    });
    
    console.log('Parsed records:', JSON.stringify(records, null, 2));
    
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 });
    }
    
    // Process each record
    const created = [];
    const errors = [];

    // Mapping dari old category ID ke nama kategori
    const oldCategoryIdMapping: Record<string, string> = {
      // Shopping related
      "1f01ec36-8575-48fe-af94-a974e7e3f800": "Belanja", // Shopping
      "862c5203-c992-445a-ac7a-a611f18acd3a": "Belanja", // Shopping
      "04eedec2-574d-4f73-9d44-d7bdd188568e": "Shopee",  // Shopee
      "4832c182-2cb1-43a3-93e5-67b01c406460": "Belanja", // Tokopedia
      "29492758-4d8a-4a66-a09f-a3617eb8d11e": "Belanja", // Lazada
      
      // Food related
      "76ff2941-ab71-431b-8984-c3bf045c183e": "Makanan", // Food
      "89cf41c1-b100-452f-a187-2bd79d3953c0": "Makanan", // Food
      "2386315f-53dc-48de-af0d-e5a1781c70f3": "Makanan", // Food
      "a04b57f3-31e3-43b8-aae8-e44a72871643": "Makanan", // Food
      "a1a540a0-cee4-471d-b922-56d6b47b53c9": "Makanan", // Food
      "f30d6716-90f1-4633-accc-071ed4c98c60": "Makanan", // Food
      
      // Transportation
      "0f61579b-429c-439f-af7d-d36a34162217": "Transportasi", // Transportation
      "183bec28-9f97-4949-be2f-60ac53f8bb3a": "Transportasi", // Transportation
      
      // Entertainment
      "1d49aef8-06fe-49a1-b5ca-4bd7f2bcb13f": "Hiburan", // Entertainment
      
      // Dating
      "2b342c5e-8d04-4057-922d-a9394a41ade8": "Dating", // Dating
      
      // Utilities
      "75f8ed61-ad01-470d-8b2c-67d27ce0975a": "Kuota", // Kuota
      "b960b2f9-0aef-4a6f-bc13-798ff93bb408": "Kebutuhan", // Kebutuhan Rumah
      
      // Investment/Savings
      "284c6de3-9e21-46c3-bce7-1fc8b725ee26": "Investment", // Investment
      "ce5515db-1688-40b0-818a-1072d79cfb5a": "Savings", // Savings
      "de5d8b07-bb99-4756-92c6-e07c2db995da": "Savings", // Savings
      
      // Income related
      "4e04ae0b-c712-49fb-828f-9f1798944ad2": "Pendapatan Lain", // Income
      "a4566463-1c32-4b15-bfcf-4c06cf99e3b9": "Pendapatan Lain", // Income
      "9cc53b4a-74ad-46f1-b462-22e20b94d1b1": "Gaji", // Salary
      "80dd03bb-cc82-4084-b99d-753566bbf1f6": "Bonus", // Bonus

      // Housing
      "f5264634-1df8-41e2-bc5c-9788bb4dddd2": "Kebutuhan", // Housing
      
      // Others
      "12e3a6d5-a3a7-45e8-8418-aa219a190f76": "Others", // Others
      "87fcbd5b-edb6-4952-921a-69d9411b9aa4": "Belanja", // Tarik Tunai
      "8acaaeec-3b1a-4b71-a6a1-aab5a02c4471": "Kebutuhan", // Health
      "2da1a568-6c5c-46e1-aa25-acf2847a1977": "Hiburan", // Sports
      "b67587a7-47df-479d-ab56-324749c7d1ac": "Belanja", // Gopay
    };

    // Mapping deskripsi ke kategori yang umum jika tidak ada category ID
    const descriptionMapping: Record<string, string> = {
      // Food related
      "Makan": "Makanan",
      "Makan Ramen": "Makanan",
      "Makan Crisbar": "Makanan", 
      "Makan Iga": "Makanan", 
      "Makan Sky Pasta": "Makanan", 
      "Makan keluarga": "Makanan",
      "Makan Gacoan": "Makanan",
      "Ramen Ichiyo": "Makanan",
      "Bebek Mas Wanto": "Makanan",

      "Transport": "Transportasi",
      
      // Entertainment
      "Popcorn": "Hiburan", 
      "Nonton": "Hiburan", 
      "AYCE": "Hiburan",
      
      // Shopping related
      "Beli Sendal": "Belanja",
      "Beli Tumbler": "Belanja",
      "Beli Celana": "Belanja",
      "Belanja Superindo": "Belanja",
      "Belanja Borma": "Belanja",
      
      // Shopee related  
      "Shopee": "Shopee",
      "Akun di Shopee": "Shopee",
      
      // WiFi related
      "Wifi Rumah": "Listrik & WiFi",
      "WiFi Rumah": "Listrik & WiFi",
      
      // Bills
      "CC": "Tagihan",
      "Subscribe web": "Tagihan",
      
      // Income
      "Gaji": "Gaji",
      "THR": "Bonus",
      
      // Savings
      "Tabungan": "Savings",
      "Tabungan Emas": "Savings",
      "Tabungan BTC": "Savings",
      "Tabungan Bank Bandung": "Savings",
      "Emergency Funds": "Savings",
      "ngendap di mandiri": "Savings",
      
      // Investment
      "Dari Bibit": "Investment",
      "Dari Rekening": "Investment",
      "Jual Bibit": "Investment"
    };

    // Default category names for different types
    const defaultCategoryNames = {
      EXPENSE: "Others", 
      INCOME: "Pendapatan Lain"     
    };

    for (const record of records) {
      try {
        // Log the record format before processing
        console.log('Processing record:', JSON.stringify(record, null, 2));
        const trimmedRecord = record.map((value) => (typeof value === 'string' ? value.trim() : value));

        // Skip header rows if present
        if (
          trimmedRecord.length >= 2 &&
          trimmedRecord[0]?.toLowerCase?.() === 'date' &&
          trimmedRecord[1]?.toLowerCase?.() === 'type'
        ) {
          console.log('Skipping header row');
          continue;
        }

        let rawAmount: string | undefined;
        let transactionTypeRaw: string | undefined;
        let description: string | undefined;
        let dateStr: string | undefined;
        let categoryNameFromRecord: string | undefined;
        let oldCategoryId: string | undefined;

        if (trimmedRecord.length === 6) {
          // New export format: Date,Type,Amount,Description,Category,Wallet
          const [dateValue, typeValue, amountValue, descriptionValue, categoryValue, walletValue] = trimmedRecord;

          dateStr = dateValue;
          transactionTypeRaw = typeValue;
          rawAmount = amountValue;
          description = descriptionValue;
          categoryNameFromRecord = categoryValue;

          console.log('Detected new export format:', {
            dateStr,
            transactionTypeRaw,
            rawAmount,
            description,
            categoryNameFromRecord,
            walletValue,
          });
        } else {
          // Legacy format: user_id,wallet_id,category_id,amount,type,description,date
          const [oldUserId, oldWalletId, legacyCategoryId, amountValue, typeValue, descriptionValue, legacyDate] =
            trimmedRecord;

          rawAmount = amountValue;
          transactionTypeRaw = typeValue;
          description = descriptionValue;
          dateStr = legacyDate;
          oldCategoryId = legacyCategoryId;

          console.log('Extracted legacy data:', {
            oldUserId,
            oldWalletId,
            oldCategoryId,
            rawAmount,
            transactionTypeRaw,
            description,
            dateStr,
          });
        }

        if (!rawAmount) {
          throw new Error('Amount is required');
        }

        // Clean and parse amount - handle both .00 and , formats
        const cleanAmount = rawAmount.replace(/[^\d.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.');
        const amount = parseFloat(cleanAmount);
        
        if (isNaN(amount)) {
          console.error('Amount parsing failed:', {
            original: rawAmount,
            cleaned: cleanAmount,
            parsed: amount
          });
          throw new Error('Invalid amount');
        }
        
        // Parse date - handle multiple formats
        if (!dateStr) {
          throw new Error('Date is required');
        }

        let date;
        try {
          // Try parsing as ISO date first
          date = new Date(dateStr);
          console.log('Date parsing - ISO attempt:', {
            dateStr,
            parsedDate: date,
            isValid: !isNaN(date.getTime())
          });
          
          if (isNaN(date.getTime())) {
            // If ISO fails, try DD/MM/YYYY format
            const [day, month, year] = dateStr.split('/');
            date = new Date(`${year}-${month}-${day}`);
            console.log('Date parsing - DD/MM/YYYY attempt:', {
              dateStr,
              day, month, year,
              parsedDate: date,
              isValid: !isNaN(date.getTime())
            });
          }
        } catch (e) {
          console.error('Date parsing failed:', dateStr, e);
          throw new Error('Invalid date format');
        }

        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }

        // Get transaction type
        if (!transactionTypeRaw) {
          throw new Error('Transaction type is required');
        }
        const transactionType = transactionTypeRaw.toUpperCase() as 'INCOME' | 'EXPENSE';
        
        // Try to find a category match
        // 1. First try using the original category ID mapping
        // 2. If not found, try mapping based on description
        // 3. If all fails, use default category for the transaction type
        let categoryName = categoryNameFromRecord || (oldCategoryId ? oldCategoryIdMapping[oldCategoryId] : undefined);
        
        if (!categoryName) {
          categoryName = descriptionMapping[description];
        }
        
        if (!categoryName) {
          categoryName = defaultCategoryNames[transactionType];
        }
        
        console.log(`Looking for category with name: "${categoryName}" (from old category ID: "${oldCategoryId}" or description: "${description}")`);
        
        // Try to find existing category by name for this user
        let category = await prisma.category.findFirst({
          where: {
            name: categoryName,
            userId: session.user.id
          }
        });
        
        if (!category) {
          console.log(`Category "${categoryName}" not found, creating new category`);
          // Create new category
          const categoryType = transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE';
          
          category = await prisma.category.create({
            data: {
              name: categoryName,
              type: categoryType,
              userId: session.user.id,
            },
          });
          
          console.log(`Created new category with ID: ${category.id}`);
        } else {
          console.log(`Found existing category "${categoryName}" with ID: ${category.id}`);
        }
        
        console.log('Creating transaction with data:', {
          amount,
          description,
          date: date.toISOString(),
          type: transactionType,
          userId: session.user.id,
          walletId: wallet.id,
          categoryId: category.id
        });
        
        const transaction = await prisma.transaction.create({
          data: {
            amount,
            description: description || '',
            date,
            type: transactionType,
            user: {
              connect: {
                id: session.user.id,
              },
            },
            wallet: {
              connect: {
                id: wallet.id,
              },
            },
            category: {
              connect: {
                id: category.id,
              },
            },
          },
        });
        
        console.log(`Transaction created with ID: ${transaction.id}`);
        created.push(transaction);
      } catch (error: any) {
        console.error('Error importing record:', error);
        errors.push({
          record,
          error: error.message,
        });
      }
    }
    
    const message =
      errors.length > 0
        ? `Import selesai: ${created.length} baris berhasil, ${errors.length} baris gagal.`
        : 'Import selesai.';

    return NextResponse.json({
      success: true,
      message,
      count: created.length,
      created: created.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
