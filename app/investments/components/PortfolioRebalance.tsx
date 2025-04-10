'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from "lucide-react"
import Link from 'next/link'

type RebalancingRecommendation = {
  type: string;
  currentAmount: number;
  currentPercentage: number;
  targetPercentage: number;
  targetAmount: number;
  difference: number;
  action: string;
};

type PortfolioAllocation = Record<string, { amount: number; percentage: number }>;

const typeTranslations: Record<string, string> = {
  STOCK: 'Saham',
  CRYPTO: 'Kripto',
  PRECIOUS_METAL: 'Logam Mulia',
  PROPERTY: 'Properti',
  OTHER: 'Lainnya',
  CASH: 'Kas/Uang Tunai'
};

const typeColors: Record<string, string> = {
  STOCK: 'bg-blue-500',
  CRYPTO: 'bg-violet-500',
  PRECIOUS_METAL: 'bg-yellow-500',
  PROPERTY: 'bg-green-500',
  OTHER: 'bg-gray-500',
  CASH: 'bg-cyan-500'
};

const PortfolioRebalance = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAssessment, setNeedsAssessment] = useState(false);

  const [riskProfile, setRiskProfile] = useState<string | null>(null);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(0);
  const [totalInvestmentValue, setTotalInvestmentValue] = useState<number>(0);
  const [totalCashValue, setTotalCashValue] = useState<number>(0);
  const [currentAllocation, setCurrentAllocation] = useState<PortfolioAllocation>({});
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<RebalancingRecommendation[]>([]);

  useEffect(() => {
    fetchRebalancingRecommendations();
  }, []);

  const fetchRebalancingRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/investments/rebalance');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.needsAssessment) {
          setNeedsAssessment(true);
          setError(errorData.error || 'Anda perlu melengkapi penilaian profil risiko terlebih dahulu.');
        } else {
          throw new Error(errorData.error || 'Gagal mengambil rekomendasi rebalancing');
        }
        
        return;
      }
      
      const data = await response.json();
      
      setRiskProfile(data.riskProfile);
      setTotalPortfolioValue(data.totalPortfolioValue);
      setTotalInvestmentValue(data.totalInvestmentValue);
      setTotalCashValue(data.totalCashValue);
      setCurrentAllocation(data.currentAllocation);
      setTargetAllocation(data.targetAllocation);
      setRecommendations(data.rebalancingRecommendations);
      
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengambil data rebalancing');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(percentage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat rekomendasi rebalancing...</p>
        </div>
      </div>
    );
  }

  if (needsAssessment) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-orange-500" />
        <h3 className="text-xl font-semibold mb-2">Profil Risiko Belum Tersedia</h3>
        <p className="text-muted-foreground mb-6">
          Anda harus melengkapi penilaian profil risiko terlebih dahulu untuk mendapatkan rekomendasi rebalancing.
        </p>
        <Button onClick={() => document.getElementById('risk-assessment-tab')?.click()}>
          Lakukan Penilaian Risiko Sekarang
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
        <h3 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={fetchRebalancingRecommendations}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Rekomendasi ini didasarkan pada profil risiko <strong>{riskProfile}</strong> Anda dan alokasi portofolio saat ini.
      </p>
      
      {/* Ringkasan Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Portfolio</h3>
            <p className="text-2xl font-semibold">{formatCurrency(totalPortfolioValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Investasi</h3>
            <p className="text-2xl font-semibold">{formatCurrency(totalInvestmentValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Kas</h3>
            <p className="text-2xl font-semibold">{formatCurrency(totalCashValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alokasi vs Target */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Alokasi Portfolio vs. Target</h3>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.type} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${typeColors[rec.type]}`}></div>
                  <span>{typeTranslations[rec.type] || rec.type}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {formatPercentage(rec.currentPercentage)} <ArrowRight size={12} className="inline" /> {formatPercentage(rec.targetPercentage)}
                  </span>
                  <div className="w-16 text-right">
                    {rec.action === 'BUY' && <TrendingUp size={18} className="inline text-green-600" />}
                    {rec.action === 'SELL' && <TrendingDown size={18} className="inline text-red-600" />}
                    {rec.action === 'MAINTAIN' && <Minus size={18} className="inline text-gray-600" />}
                  </div>
                </div>
              </div>
              
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full ${typeColors[rec.type]}`} 
                  style={{ width: `${rec.currentPercentage * 100}%` }}
                ></div>
                <div 
                  className="absolute top-0 h-full border-r-2 border-black" 
                  style={{ left: `${rec.targetPercentage * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabel Rekomendasi Detail */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Rekomendasi Rebalancing</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left">Jenis Aset</th>
                <th className="py-2 px-4 text-right">Alokasi Saat Ini</th>
                <th className="py-2 px-4 text-right">Target Alokasi</th>
                <th className="py-2 px-4 text-right">Perbedaan</th>
                <th className="py-2 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <tr key={rec.type} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${typeColors[rec.type]}`}></div>
                      <span>{typeTranslations[rec.type] || rec.type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div>{formatCurrency(rec.currentAmount)}</div>
                    <div className="text-xs text-muted-foreground">{formatPercentage(rec.currentPercentage)}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div>{formatCurrency(rec.targetAmount)}</div>
                    <div className="text-xs text-muted-foreground">{formatPercentage(rec.targetPercentage)}</div>
                  </td>
                  <td className={`py-3 px-4 text-right ${rec.difference > 0 ? 'text-green-600' : rec.difference < 0 ? 'text-red-600' : ''}`}>
                    {rec.difference > 0 && '+'}
                    {formatCurrency(rec.difference)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${rec.action === 'BUY' ? 'bg-green-100 text-green-800' : 
                        rec.action === 'SELL' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {rec.action === 'BUY' ? 'BELI' : rec.action === 'SELL' ? 'JUAL' : 'PERTAHANKAN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-blue-50/50 text-sm">
          <h4 className="font-semibold mb-2">Catatan Rebalancing:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Rekomendasi ini hanya sebagai panduan dan bukan nasihat keuangan profesional.</li>
            <li>Pertimbangkan biaya transaksi dan pajak sebelum melakukan rebalancing.</li>
            <li>Rebalancing sebaiknya dilakukan setiap 6-12 bulan atau ketika alokasi menyimpang signifikan dari target.</li>
            <li>Rebalancing dapat dilakukan secara bertahap dengan cara memasukkan dana baru ke aset yang kurang.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PortfolioRebalance; 