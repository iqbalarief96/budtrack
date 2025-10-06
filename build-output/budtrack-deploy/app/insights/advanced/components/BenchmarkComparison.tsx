'use client';

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
import { FiUsers, FiInfo, FiCheck, FiAlertTriangle } from 'react-icons/fi';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
);

interface CategoryComparison {
  name: string;
  userAmount: number;
  platformAmount: number;
}

interface BenchmarkProps {
  benchmarkData: {
    userAverage: number;
    platformAverage: number;
    categories: CategoryComparison[];
  };
}

export default function BenchmarkComparison({ benchmarkData }: BenchmarkProps) {
  const { userAverage, platformAverage, categories } = benchmarkData;
  
  // Calculate comparison percentages
  const userVsPlatformPercentage = platformAverage > 0 
    ? ((userAverage / platformAverage) * 100) - 100 
    : 0;
  
  const isLowerThanAverage = userVsPlatformPercentage < 0;
  
  // Sort categories by biggest difference
  const sortedCategories = [...categories]
    .sort((a, b) => {
      const diffA = Math.abs(a.userAmount - a.platformAmount);
      const diffB = Math.abs(b.userAmount - b.platformAmount);
      return diffB - diffA;
    })
    .slice(0, 5); // Top 5 categories with biggest difference
  
  // Data for chart
  const chartData = {
    labels: sortedCategories.map(cat => cat.name),
    datasets: [
      {
        label: 'Pengeluaran Anda',
        data: sortedCategories.map(cat => cat.userAmount),
        backgroundColor: 'rgba(53, 162, 235, 0.6)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
      {
        label: 'Rata-rata Pengguna',
        data: sortedCategories.map(cat => cat.platformAmount),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgb(255, 99, 132)',
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
        <h2 className="text-xl font-bold mb-2">Perbandingan dengan Pengguna Lain</h2>
        <p className="text-gray-500">
          Bandingkan pola pengeluaran Anda dengan rata-rata pengguna lain pada platform ini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className={`p-6 rounded-xl border ${
          isLowerThanAverage ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'
        }`}>
          <div className="flex items-center mb-4">
            <div className={`p-2 rounded-full mr-3 ${
              isLowerThanAverage ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {isLowerThanAverage ? (
                <FiCheck className="text-green-500" />
              ) : (
                <FiAlertTriangle className="text-yellow-500" />
              )}
            </div>
            <h3 className={`font-medium ${
              isLowerThanAverage ? 'text-green-800' : 'text-yellow-800'
            }`}>
              Rata-Rata Pengeluaran Bulanan
            </h3>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Anda</p>
              <p className="text-xl font-bold">{formatCurrency(userAverage)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rata-rata Pengguna</p>
              <p className="text-xl font-bold">{formatCurrency(platformAverage)}</p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className={`text-sm ${
              isLowerThanAverage ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {isLowerThanAverage 
                ? `Anda membelanjakan ${Math.abs(userVsPlatformPercentage).toFixed(1)}% lebih sedikit dari rata-rata`
                : `Anda membelanjakan ${userVsPlatformPercentage.toFixed(1)}% lebih banyak dari rata-rata`
              }
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-full mr-3">
              <FiUsers className="text-blue-500" />
            </div>
            <h3 className="font-medium text-blue-800">
              Wawasan Perbandingan
            </h3>
          </div>
          
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              {isLowerThanAverage 
                ? "Selamat! Pola pengeluaran Anda cenderung lebih hemat dibandingkan rata-rata pengguna lain."
                : "Pengeluaran Anda lebih tinggi dibandingkan rata-rata pengguna lain."
              }
            </p>
            <p>
              Pola ini berlanjut di {categories.filter(c => c.userAmount < c.platformAmount).length} dari {categories.length} kategori.
            </p>
            <p>
              Kategori dengan perbedaan terbesar: {sortedCategories[0]?.name || "Tidak Ada Data"}
            </p>
          </div>
        </div>
      </div>

      <div className="h-96 mt-6">
        <h3 className="text-lg font-medium mb-4">Perbandingan per Kategori</h3>
        <Bar options={options} data={chartData} />
      </div>
      
      {/* Small divider instead of large spacer */}
      <div className="border-t border-gray-200 mt-8"></div>
      
      <div className="mt-6 space-y-4 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium">Rincian Kategori</h3>
        <div className="bg-white rounded-lg border p-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left pb-3">Kategori</th>
                <th className="text-right pb-3">Pengeluaran Anda</th>
                <th className="text-right pb-3">Rata-rata Pengguna</th>
                <th className="text-right pb-3">Perbedaan</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((category, index) => {
                const diff = category.userAmount - category.platformAmount;
                const diffPercentage = category.platformAmount > 0 
                  ? (diff / category.platformAmount) * 100 
                  : 0;
                
                return (
                  <tr key={index} className="border-t">
                    <td className="py-3">{category.name}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(category.userAmount)}</td>
                    <td className="text-right py-3">{formatCurrency(category.platformAmount)}</td>
                    <td className={`text-right py-3 font-medium ${diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diff < 0 ? '-' : '+'}{formatCurrency(Math.abs(diff))}
                      <span className="block text-xs">
                        ({diffPercentage.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg border mt-6 flex items-start">
        <FiInfo className="text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm text-gray-700">
          <p>
            <span className="font-medium">Catatan:</span> Perbandingan ini hanya untuk referensi.
            Pola pengeluaran setiap orang berbeda berdasarkan kebutuhan, lokasi, dan gaya hidup.
            Fokus pada tujuan keuangan pribadi Anda, bukan sekadar membandingkan dengan orang lain.
          </p>
        </div>
      </div>
    </div>
  );
} 