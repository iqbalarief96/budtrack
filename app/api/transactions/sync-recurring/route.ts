import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Define proper interface for RecurringTransaction with all properties
interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  frequency: string;
  startDate: Date;
  nextPaymentDate: Date;
  description: string | null;
  isActive: boolean;
  type: string; // Now explicitly defined in the interface
  createdAt: Date;
  updatedAt: Date;
  walletId: string;
  userId: string;
}

// POST /api/transactions/sync-recurring
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { walletId } = await request.json()
    
    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 })
    }
    
    // Verifikasi wallet milik user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        user: {
          email: session.user.email
        }
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    // Ambil semua recurring transactions yang aktif untuk wallet ini
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        walletId: walletId,
        isActive: true
      }
    }) as RecurringTransaction[] // Cast untuk memastikan TypeScript mengenali properti type
    
    // Menentukan tanggal awal dan akhir untuk menambahkan transaksi
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11 (Jan-Dec)
    
    // Tanggal awal: 1 Januari tahun ini
    const startDate = new Date(currentYear, 0, 1); 
    
    // Tanggal akhir: Akhir bulan ini
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    console.log(`Memeriksa transaksi berulang dari ${startDate.toISOString()} hingga ${endDate.toISOString()}`);
    
    // Tracking untuk hasil sinkronisasi
    let syncResult = {
      success: 0,
      skipped: 0
    }
    
    // Loop untuk setiap bulan dari Januari hingga bulan saat ini
    for (let month = 0; month <= currentMonth; month++) {
      const startMonthDate = new Date(currentYear, month, 1);
      const endMonthDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);
      
      console.log(`Memeriksa bulan ${month + 1} dari ${startMonthDate.toISOString()} hingga ${endMonthDate.toISOString()}`);
      
      // Loop semua recurring transactions
      for (const recurring of recurringTransactions) {
        // Periksa apakah transaksi sudah ada di database untuk bulan ini
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            walletId: walletId,
            description: recurring.name,
            date: {
              gte: startMonthDate,
              lte: endMonthDate
            }
          }
        });
        
        // Jika belum ada, buat transaksi baru dengan tanggal di bulan saat ini
        if (!existingTransaction) {
          // Tentukan jenis transaksi (income atau expense)
          const transactionType = recurring.type || 'expense';
          
          // Konversi tipe ke format yang benar untuk model Transaction (kapital)
          const formattedType = transactionType.toUpperCase() as 'INCOME' | 'EXPENSE';
          
          // Validasi category jika ada
          let categoryId = null;
          if (recurring.category) {
            // Category bisa berupa ID atau nama
            // Coba cari langsung dengan ID dulu
            let category = await prisma.category.findFirst({
              where: {
                id: recurring.category,
                userId: recurring.userId
              }
            });

            // Jika tidak ditemukan dengan ID, mungkin itu nama kategori
            if (!category) {
              category = await prisma.category.findFirst({
                where: {
                  name: recurring.category,
                  userId: recurring.userId
                }
              });
            }
            
            if (category) {
              categoryId = category.id;
              console.log(`Kategori '${category.name}' ditemukan dengan id: ${categoryId}`);
            } else {
              console.log(`Kategori '${recurring.category}' tidak ditemukan`);
            }
          }
          
          // Tentukan tanggal transaksi
          // Gunakan tanggal 15 bulan ini sebagai default
          const transactionDate = new Date(currentYear, month, 15); 
          
          console.log(`Membuat transaksi bertipe '${formattedType}' untuk ${recurring.name} dengan tanggal ${transactionDate.toISOString()}`);
          console.log(`Amount: ${recurring.amount}`);
          
          // Buat transaksi baru
          await prisma.transaction.create({
            data: {
              amount: recurring.amount,
              description: recurring.name,
              date: transactionDate,
              type: formattedType, // Gunakan tipe yang sudah diformat
              categoryId: categoryId, // Gunakan categoryId yang sudah divalidasi
              walletId: walletId,
              userId: recurring.userId
            }
          });
          
          // Update saldo wallet
          let newBalance = wallet.balance;
          
          if (formattedType === 'INCOME') {
            newBalance = wallet.balance + recurring.amount;
            console.log(`Income: Adding ${recurring.amount} to wallet balance. New balance: ${newBalance}`);
          } else {
            newBalance = wallet.balance - recurring.amount;
            console.log(`Expense: Subtracting ${recurring.amount} from wallet balance. New balance: ${newBalance}`);
          }
          
          await prisma.wallet.update({
            where: { id: walletId },
            data: { balance: newBalance }
          });
          
          syncResult.success++;
        } else {
          // Transaksi sudah ada, lewati
          console.log(`Transaksi untuk ${recurring.name} sudah ada di bulan ${month+1}, dilewati`);
          syncResult.skipped++;
        }
      }
    }
    
    return NextResponse.json(syncResult);
  } catch (error) {
    console.error('Error synchronizing recurring transactions:', error);
    return NextResponse.json({ error: 'Failed to synchronize recurring transactions' }, { status: 500 });
  }
} 