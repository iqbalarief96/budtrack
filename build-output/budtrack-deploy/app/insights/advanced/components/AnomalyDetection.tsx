'use client';

import { useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: 'EXPENSE' | 'INCOME';
  category: {
    name: string;
    id: string;
  };
  average: number;
  percentAboveAverage: number;
}

interface AnomalyDetectionProps {
  anomalies: Transaction[];
}

export default function AnomalyDetection({ anomalies }: AnomalyDetectionProps) {
  const [expandedAnomalies, setExpandedAnomalies] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedAnomalies(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full mb-4">
          <FiAlertTriangle className="text-green-500 text-2xl" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Tidak Ada Anomali Terdeteksi</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          Kami tidak menemukan pengeluaran tidak normal dalam transaksi Anda. Ini indikasi positif bahwa pola pengeluaran Anda konsisten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Deteksi Anomali Pengeluaran</h2>
        <p className="text-gray-500">
          Sistem menemukan {anomalies.length} transaksi dengan nilai di atas rata-rata kategori yang sama. 
          Anomali ditentukan saat pengeluaran 50% lebih tinggi dari rata-rata.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start">
        <FiAlertTriangle className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
        <p className="text-sm text-yellow-700">
          Anomali tidak selalu berarti masalah. Pengeluaran besar mungkin direncanakan atau bersifat musiman. Analisis ini membantu Anda mengidentifikasi pola pengeluaran tidak biasa.
        </p>
      </div>

      <div className="space-y-4">
        {anomalies.map(anomaly => (
          <div 
            key={anomaly.id}
            className="border rounded-lg bg-white overflow-hidden shadow-sm"
          >
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleExpand(anomaly.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-red-50 rounded-full">
                  <FiAlertTriangle className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-medium">{anomaly.category.name}</h3>
                  <p className="text-sm text-gray-500">{formatDate(anomaly.date)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="text-right mr-4">
                  <div className="font-bold text-red-600">{formatCurrency(anomaly.amount)}</div>
                  <div className="text-xs text-red-500">
                    +{anomaly.percentAboveAverage.toFixed(0)}% dari rata-rata
                  </div>
                </div>
                {expandedAnomalies.includes(anomaly.id) ? (
                  <FiChevronUp className="text-gray-400" />
                ) : (
                  <FiChevronDown className="text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedAnomalies.includes(anomaly.id) && (
              <div className="px-4 pb-4 pt-0 border-t">
                <div className="p-4 bg-gray-50 rounded-lg mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Nilai Anomali</p>
                      <p className="font-medium">{formatCurrency(anomaly.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rata-rata Kategori</p>
                      <p className="font-medium">{formatCurrency(anomaly.average)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Perbedaan</p>
                      <p className="font-medium text-red-600">
                        +{formatCurrency(anomaly.amount - anomaly.average)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Persentase Perbedaan</p>
                      <p className="font-medium text-red-600">
                        +{anomaly.percentAboveAverage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                    <p className="text-sm">{anomaly.description || "Tidak ada deskripsi"}</p>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>
                      Pengeluaran ini {anomaly.percentAboveAverage.toFixed(0)}% lebih tinggi dari 
                      rata-rata pengeluaran Anda untuk kategori {anomaly.category.name}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 