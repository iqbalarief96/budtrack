import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Definisikan alokasi target berdasarkan profil risiko
const TARGET_ALLOCATIONS = {
  Konservatif: {
    STOCK: 0.25, // 25%
    CRYPTO: 0.05, // 5%
    PRECIOUS_METAL: 0.10, // 10%
    PROPERTY: 0.20, // 20%
    OTHER: 0.05, // 5%
    CASH: 0.35, // 35%
  },
  Moderat: {
    STOCK: 0.40, // 40%
    CRYPTO: 0.10, // 10%
    PRECIOUS_METAL: 0.10, // 10%
    PROPERTY: 0.20, // 20%
    OTHER: 0.05, // 5%
    CASH: 0.15, // 15%
  },
  Agresif: {
    STOCK: 0.60, // 60%
    CRYPTO: 0.20, // 20%
    PRECIOUS_METAL: 0.05, // 5%
    PROPERTY: 0.10, // 10%
    OTHER: 0.05, // 5%
    CASH: 0.00, // 0%
  }
};

// GET /api/investments/rebalance
export async function GET(request: NextRequest) {
  try {
    // Periksa autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ambil profil risiko pengguna
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, riskProfile: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.riskProfile || !['Konservatif', 'Moderat', 'Agresif'].includes(user.riskProfile)) {
      return NextResponse.json({
        error: "Risk profile not set. Please complete the risk assessment first.",
        needsAssessment: true
      }, { status: 400 });
    }

    // Ambil investasi pengguna
    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        tickerSymbol: true,
        quantity: true,
        averagePurchasePrice: true,
        walletId: true
      }
    });

    // Ambil wallet pengguna untuk mengetahui kas
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, balance: true }
    });

    // Hitung total nilai investasi dan kas
    const totalInvestmentValue = investments.reduce(
      (sum, inv) => sum + (inv.quantity * inv.averagePurchasePrice),
      0
    );
    
    const totalCashValue = wallets.reduce(
      (sum, wallet) => sum + wallet.balance,
      0
    );

    const totalPortfolioValue = totalInvestmentValue + totalCashValue;

    if (totalPortfolioValue <= 0) {
      return NextResponse.json({
        error: "No investments or cash found in your portfolio.",
        totalPortfolioValue: 0
      }, { status: 400 });
    }

    // Hitung alokasi saat ini berdasarkan tipe investasi
    const currentAllocation: Record<string, { amount: number, percentage: number }> = {};
    
    // Inisialisasi semua tipe investasi dengan 0
    const allTypes = ['STOCK', 'CRYPTO', 'PRECIOUS_METAL', 'PROPERTY', 'OTHER', 'CASH'];
    allTypes.forEach(type => {
      currentAllocation[type] = { amount: 0, percentage: 0 };
    });

    // Hitung total untuk setiap tipe investasi
    investments.forEach(inv => {
      const value = inv.quantity * inv.averagePurchasePrice;
      if (currentAllocation[inv.type]) {
        currentAllocation[inv.type].amount += value;
      } else {
        currentAllocation['OTHER'].amount += value;
      }
    });

    // Tambahkan kas
    currentAllocation['CASH'].amount = totalCashValue;

    // Hitung persentase untuk setiap tipe
    Object.keys(currentAllocation).forEach(type => {
      currentAllocation[type].percentage = totalPortfolioValue > 0
        ? currentAllocation[type].amount / totalPortfolioValue
        : 0;
    });

    // Ambil target alokasi berdasarkan profil risiko
    const targetAllocation = TARGET_ALLOCATIONS[user.riskProfile as keyof typeof TARGET_ALLOCATIONS];

    // Hitung rekomendasi rebalancing
    const rebalancingRecommendations: {
      type: string;
      currentAmount: number;
      currentPercentage: number;
      targetPercentage: number;
      targetAmount: number;
      difference: number;
      action: string;
    }[] = [];

    Object.keys(targetAllocation).forEach(type => {
      const current = currentAllocation[type];
      const targetPercent = targetAllocation[type as keyof typeof targetAllocation];
      const targetAmount = totalPortfolioValue * targetPercent;
      const difference = targetAmount - current.amount;
      
      let action = "MAINTAIN";
      if (difference > 0) {
        action = "BUY";
      } else if (difference < 0) {
        action = "SELL";
      }

      rebalancingRecommendations.push({
        type,
        currentAmount: current.amount,
        currentPercentage: current.percentage,
        targetPercentage: targetPercent,
        targetAmount,
        difference,
        action
      });
    });

    return NextResponse.json({
      success: true,
      riskProfile: user.riskProfile,
      totalPortfolioValue,
      totalInvestmentValue,
      totalCashValue,
      currentAllocation,
      targetAllocation,
      rebalancingRecommendations,
    });
  } catch (error) {
    console.error("Error generating rebalancing recommendations:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat rekomendasi rebalancing" },
      { status: 500 }
    );
  }
} 