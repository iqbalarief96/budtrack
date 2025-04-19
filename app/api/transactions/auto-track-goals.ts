import prisma from '@/lib/prisma';

/**
 * Fungsi untuk auto track transaksi ke goal yang sesuai dengan kategori
 */
export async function autoTrackTransactionToGoals(
  transactionId: string,
  categoryId: string | null,
  userId: string,
  amount: number,
  type: string,
  description: string | null,
  date: Date
) {
  // Skip jika tidak ada kategori
  if (!categoryId) return;
  
  try {
    // Ambil data kategori
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) return;
    
    // Cari goals yang melacak kategori ini dengan cara yang lebih aman
    // Menggunakan raw query karena model mungkin belum ter-generate dengan baik
    const results = await prisma.$queryRaw`
      SELECT g.id as goalId, g.name, g.current, g.target, g.status, g.type as goalType
      FROM "Goal" g
      JOIN "GoalCategory" gc ON g.id = gc."goalId"
      WHERE gc."categoryId" = ${categoryId}
        AND g."userId" = ${userId}
        AND g.status = 'ONGOING'
    `;
    
    const goalCategories = Array.isArray(results) ? results : [];
    if (goalCategories.length === 0) {
      return; // Tidak ada goal yang melacak kategori ini
    }
    
    console.log('Found goals tracking category:', goalCategories);
    
    // Untuk setiap goal yang terkait, buat activity
    for (const goal of goalCategories) {
      try {
        const goalId = goal.goalId;
        const goalType = goal.goalType || 'SAVINGS'; // Default ke SAVINGS jika tidak ada type
        
        console.log('Processing goal:', { goalId, name: goal.name, type: goalType });
        
        // Tentukan jumlah yang ditambahkan ke goal
        let activityAmount = 0;
        
        // Logika baru: Tergantung tipe goal
        // 1. Goal SAVINGS (menabung): 
        //    - INCOME menambah (positif)
        //    - EXPENSE mengurangi (negatif)
        // 2. Goal SPENDING_LIMIT (limit pengeluaran):
        //    - EXPENSE menambah progress (positif) karena mendekati limit
        //    - INCOME tidak berpengaruh (0)
        
        if (goalType === 'SPENDING_LIMIT' || goalType === 'DEBT_REPAYMENT') {
          // Untuk tipe spending limit atau pelunasan hutang
          if (type === 'EXPENSE') {
            activityAmount = amount; // Expense menambah progress
          } else {
            activityAmount = 0; // Income tidak berpengaruh
          }
        } else {
          // Untuk tipe savings atau investasi (default)
          if (type === 'INCOME') {
            activityAmount = amount; // Income menambah tabungan
          } else {
            // Khusus kategori SAVINGS, expense tetap menambah
            if (category.type === 'SAVINGS') {
              activityAmount = amount;
            } else {
              activityAmount = -amount; // Expense lain mengurangi
            }
          }
        }
        
        console.log('Calculated activity amount:', { 
          transactionType: type, 
          categoryType: category.type, 
          goalType, 
          amount, 
          activityAmount 
        });
        
        // Create goal activity
        await prisma.goalActivity.create({
          data: {
            goalId,
            amount: activityAmount,
            description: `Auto-tracked transaction: ${description || type}`,
            date,
            transactionId: transactionId,
            userId
          }
        });
        
        // Update goal progress - compute the new value to avoid race conditions
        const newProgress = parseFloat(goal.current) + activityAmount;
        const newStatus = newProgress >= parseFloat(goal.target) ? 'COMPLETED' : 'ONGOING';
        
        await prisma.goal.update({
          where: { id: goalId },
          data: {
            current: newProgress,
            status: newStatus
          }
        });
        
        // Update transaction to link it with goal
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { 
            goalId 
          }
        });
        
        console.log(`Transaksi #${transactionId} berhasil di-track ke goal #${goalId}`);
      } catch (innerError) {
        console.error(`Error processing goal ${goal.goalId}:`, innerError);
        // Continue to next goal instead of failing entire process
      }
    }
  } catch (error) {
    console.error('Error auto-tracking transaction to goals:', error);
    // Jangan throw error di sini supaya proses transaksi tetap berjalan
  }
} 