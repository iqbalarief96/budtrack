import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const walletId = formData.get('walletId') as string;
    
    if (!file || !walletId) {
      return new NextResponse("Missing file or walletId", { status: 400 });
    }
    
    const text = await file.text();
    const records = parse(text, { columns: true });
    
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
      records.map(async (record: any) => {
        // Handle different column formats
        const amount = parseFloat(record.amount || "0");
        const description = record.description || "";
        const date = new Date(record.date);
        const type = record.type?.toLowerCase() || "expense";
        
        // Try to match category if provided
        let categoryId = null;
        if (record.category_id) {
          categoryId = categoryMap[record.category_id] || null;
        }
        
        console.log(`Importing: ${description}, ${amount}, ${date}, ${type}, ${categoryId}`);
        
        return await prisma.transaction.create({
          data: {
            amount: amount,
            description: description,
            date: date,
            type: type,
            userId: session.user.id,
            walletId: walletId,
            categoryId: categoryId,
          }
        });
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      count: importedTransactions.length 
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return new NextResponse(`Import failed: ${error.message}`, { status: 500 });
  }
} 