import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback prisma jika ada masalah
const prismaFallback = new PrismaClient();

/**
 * Function untuk update total budget dan spent di Wedding berdasarkan kalkulasi dari semua kategori
 * 
 * @param weddingId ID dari wedding yang akan diupdate
 */
export async function updateWeddingBudgetTotals(weddingId: string) {
  try {
    const prismaClient = prisma || prismaFallback;
    
    // Ambil semua kategori budget wedding
    const categories = await prismaClient.weddingBudgetCategory.findMany({
      where: { weddingId }
    });
    
    // Hitung total
    const totalBudget = categories.reduce((sum, cat) => sum + cat.total, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    
    // Update wedding record
    await prismaClient.wedding.update({
      where: { id: weddingId },
      data: { 
        budget: totalBudget, 
        spentBudget: totalSpent 
      }
    });
    
    console.log(`Wedding ${weddingId} budget updated: total=${totalBudget}, spent=${totalSpent}`);
    
    return { totalBudget, totalSpent };
  } catch (error) {
    console.error(`Error updating wedding budget totals for wedding ${weddingId}:`, error);
    throw error;
  }
} 