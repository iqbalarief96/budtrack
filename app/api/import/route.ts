import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    console.log("Import API called");
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    console.log("User authenticated:", session.user.id);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const walletId = formData.get('walletId') as string;
    
    if (!file) {
      console.log("Missing file");
      return new NextResponse("Missing file", { status: 400 });
    }
    
    if (!walletId) {
      console.log("Missing walletId");
      return new NextResponse("Missing walletId", { status: 400 });
    }
    
    console.log("File received:", file.name, "size:", file.size);
    console.log("Wallet ID:", walletId);
    
    try {
      const text = await file.text();
      console.log("File content sample:", text.substring(0, 200));
      
      // Parse CSV with more error handling
      const parseOptions = { 
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      };
      
      const records = parse(text, parseOptions);
      console.log("CSV parsed successfully, records:", records.length);
      console.log("First record sample:", records.length > 0 ? JSON.stringify(records[0]) : "No records");
      
      // Category mapping table
      const categoryMap: Record<string, string> = {
        // Default mappings based on the categories provided
        // User can customize these mappings as needed
        "Makanan": "cm9r9wio20004mvkt6y6jwmwk",
        "Transportasi": "cm9r9wiob0006mvkt2i3bq8vu",
        "Hiburan": "cm9r9wioi0008mvktctazni33",
        "Belanja": "cm9r9wioq000amvkt7rxm67je",
        "Tagihan": "cm9r9wioz000cmvktxscvt9mg",
        "Gaji": "cm9r9wipf000gmvkt2ryz3drz", 
        "Bonus": "cm9r9wipm000imvktkd3ehbo6",
        "Investment": "cm9ry451x0012mvktouachjl4",
        "Savings": "cm9r9xs8w000omvktrd85lt8g",
      };
      
      console.log(`Processing ${records.length} transactions for import`);
      
      const importedTransactions = await Promise.all(
        records.map(async (record: any, index: number) => {
          try {
            // Handle different column formats with more validation
            const amount = parseFloat(record.amount || record.Amount || "0");
            if (isNaN(amount)) {
              console.log(`Warning: Invalid amount format in record ${index}:`, record);
            }
            
            const description = record.description || record.Description || record.desc || record.Desc || "";
            
            let date;
            try {
              const dateValue = record.date || record.Date || record.tanggal || record.Tanggal || new Date().toISOString();
              date = new Date(dateValue);
              if (isNaN(date.getTime())) {
                console.log(`Warning: Invalid date in record ${index}:`, dateValue);
                date = new Date();
              }
            } catch (e) {
              console.log(`Error parsing date in record ${index}:`, e);
              date = new Date();
            }
            
            const type = (record.type || record.Type || "expense").toLowerCase();
            if (type !== "income" && type !== "expense") {
              console.log(`Warning: Invalid transaction type in record ${index}, defaulting to expense:`, type);
            }
            
            // Try to match category if provided
            let categoryId = null;
            if (record.category || record.Category || record.category_id || record.categoryId) {
              const categoryKey = record.category || record.Category || record.category_id || record.categoryId;
              categoryId = categoryMap[categoryKey] || null;
              if (!categoryId) {
                console.log(`Warning: Unknown category in record ${index}:`, categoryKey);
              }
            }
            
            console.log(`Importing record ${index}: ${description}, ${amount}, ${date.toISOString()}, ${type}, ${categoryId}`);
            
            return await prisma.transaction.create({
              data: {
                amount: amount,
                description: description,
                date: date,
                type: type === "income" ? "INCOME" : "EXPENSE",
                userId: session.user.id,
                walletId: walletId,
                categoryId: categoryId,
              }
            });
          } catch (recordError: any) {
            console.error(`Error importing record ${index}:`, recordError);
            return null;
          }
        })
      );
      
      const successfulImports = importedTransactions.filter(t => t !== null);
      console.log(`Successfully imported ${successfulImports.length} of ${records.length} transactions`);
      
      return NextResponse.json({ 
        success: true, 
        count: successfulImports.length 
      });
    } catch (parseError: any) {
      console.error("CSV parsing error:", parseError);
      return new NextResponse(`CSV parsing failed: ${parseError.message}`, { status: 400 });
    }
  } catch (error: any) {
    console.error("Import error:", error);
    return new NextResponse(`Import failed: ${error.message}`, { status: 500 });
  }
} 