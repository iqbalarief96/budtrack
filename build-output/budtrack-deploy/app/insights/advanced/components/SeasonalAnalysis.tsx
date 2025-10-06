'use client';

import { useState } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatCurrency } from '@/lib/utils';
import { FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
);

interface MonthData {
  name: string;
  amount: number;
}

interface SeasonalAnalysisProps {
  seasonalData: MonthData[];
}

export default function SeasonalAnalysis({ seasonalData }: SeasonalAnalysisProps) {
  // Finding top and bottom spending months
  const sortedMonths = [...seasonalData]
    .filter(month => month.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  
  const topMonths = sortedMonths.slice(0, 3);
  const bottomMonths = [...sortedMonths].reverse().slice(0, 3);
  
  // Check if we have sufficient data
  const hasData = seasonalData.some(month => month.amount > 0);

  // Calculate average monthly spending
  const totalSpending = seasonalData.reduce((sum, month) => sum + month.amount, 0);
  const monthsWithData = seasonalData.filter(month => month.amount > 0).length;
  const averageSpending = monthsWithData > 0 
    ? totalSpending / monthsWithData 
    : 0;
  
  // Data for chart
  const data = {
    labels: seasonalData.map(month => month.name),
    datasets: [
      {
        label: 'Pengeluaran Bulanan',
        data: seasonalData.map(month => month.amount),
        backgroundColor: seasonalData.map(month => {
          // Highlight months with spending above average
          if (month.amount > averageSpending * 1.2) {
            return 'rgba(255, 99, 132, 0.7)';
          } 
          // Highlight months with spending below average
          else if (month.amount > 0 && month.amount < averageSpending * 0.8) {
            return 'rgba(53, 162, 235, 0.7)';
          }
          return 'rgba(75, 192, 192, 0.7)';
        }),
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Analisis Pola Musiman</h2>
        <p className="text-gray-500">
          Visualisasi pengeluaran Anda berdasarkan bulan untuk mengidentifikasi pola musiman
          dan membantu perencanaan keuangan yang lebih baik.
        </p>
      </div>

      {hasData ? (
        <>
          <div className="h-80">
            <Bar options={options} data={data} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-red-50 p-5 rounded-xl border border-red-100">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <FiTrendingUp className="text-red-500" />
                </div>
                <h3 className="font-medium text-red-800">Bulan dengan Pengeluaran Tertinggi</h3>
              </div>
              
              <div className="space-y-4">
                {topMonths.length > 0 ? (
                  topMonths.map((month, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">{month.name}</span>
                      <span className="font-medium text-red-600">{formatCurrency(month.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Belum cukup data untuk analisis</p>
                )}
              </div>
            </div>
            
            <div className="bg-green-50 p-5 rounded-xl border border-green-100">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-full mr-3">
                  <FiTrendingDown className="text-green-500" />
                </div>
                <h3 className="font-medium text-green-800">Bulan dengan Pengeluaran Terendah</h3>
              </div>
              
              <div className="space-y-4">
                {bottomMonths.length > 0 ? (
                  bottomMonths.map((month, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">{month.name}</span>
                      <span className="font-medium text-green-600">{formatCurrency(month.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Belum cukup data untuk analisis</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FiInfo className="text-gray-400 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Data Tidak Cukup</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2">
            Kami membutuhkan lebih banyak data transaksi untuk menganalisis pola musiman.
            Teruslah mencatat transaksi Anda dan periksa kembali di lain waktu.
          </p>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6 flex items-start">
        <FiInfo className="text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Tentang Analisis Musiman</p>
          <p>
            Analisis ini membantu Anda mengidentifikasi bulan-bulan dengan pengeluaran tinggi
            dan rendah sepanjang tahun. Gunakan informasi ini untuk merencanakan anggaran yang
            lebih efektif dan antisipasi pengeluaran musiman.
          </p>
        </div>
      </div>
    </div>
  );
} 