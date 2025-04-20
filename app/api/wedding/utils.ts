import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback prisma jika ada masalah
const prismaFallback = new PrismaClient();

/**
 * Function untuk update expectedGuests di model Wedding berdasarkan jumlah tamu
 * 
 * @param weddingId ID dari wedding yang akan diupdate
 */
export async function updateWeddingGuestCount(weddingId: string) {
  try {
    const prismaClient = prisma || prismaFallback;
    
    // Ambil semua guests wedding
    const guests = await prismaClient.weddingGuest.findMany({
      where: { weddingId }
    });
    
    // Hitung total
    const totalGuests = guests.length;
    const confirmedGuests = guests.filter(guest => guest.confirmed).length;
    const totalSeats = guests.reduce((acc, guest) => acc + (guest.seats || 1), 0);
    
    // Update wedding record dengan jumlah tamu
    await prismaClient.wedding.update({
      where: { id: weddingId },
      data: { 
        expectedGuests: totalGuests
      }
    });
    
    console.log(`Wedding ${weddingId} guest count updated: total=${totalGuests}, confirmed=${confirmedGuests}, seats=${totalSeats}`);
    
    return { totalGuests, confirmedGuests, totalSeats };
  } catch (error) {
    console.error(`Error updating wedding guest count for wedding ${weddingId}:`, error);
    throw error;
  }
} 