import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/user/risk-profile
export async function POST(request: NextRequest) {
  try {
    // Periksa autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil data dari body
    const data = await request.json();
    const { riskProfile } = data;
    
    // Validasi input
    if (!riskProfile || !['Konservatif', 'Moderat', 'Agresif'].includes(riskProfile)) {
      return NextResponse.json(
        { error: "Invalid risk profile. Must be 'Konservatif', 'Moderat', or 'Agresif'." }, 
        { status: 400 }
      );
    }

    // Update profil risiko pengguna
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { riskProfile },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        riskProfile: true 
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Profil risiko berhasil disimpan", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error saving risk profile:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan profil risiko" }, 
      { status: 500 }
    );
  }
} 