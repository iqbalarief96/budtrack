'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { FiShield, FiPieChart } from 'react-icons/fi';

interface SavingsData {
  totalBalance: number;
  emergencyFund: number;
  totalSavings: number;
  savingsByType: Record<string, number>;
}

export default function EmergencyFundCard() {
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching emergency fund data...');
        const response = await fetch('/api/emergency-fund');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch emergency fund data: ${response.status} ${response.statusText}`);
        }

        const jsonData = await response.json();
        console.log('Received emergency fund data:', jsonData);

        if (!jsonData.totalSavings && jsonData.totalSavings !== 0) {
          console.error('Invalid data received - missing totalSavings:', jsonData);
          throw new Error('Invalid data received from server');
        }

        setData(jsonData);
        setError(null);
      } catch (error) {
        console.error('Error fetching emergency fund data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-red-600">
            Error loading data: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  console.log('Rendering with data:', data);
  const emergencyFundPercentage = (data.emergencyFund / data.totalBalance) * 100;

  return (
    <div className="space-y-6">
      {/* Emergency Fund Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Dana Darurat</h2>
          <div className="text-blue-600">
            <FiShield size={24} />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Total Saldo</span>
              <span>{formatCurrency(data.totalBalance)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${Math.min(emergencyFundPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Dana Darurat</span>
              <span className="font-medium">{formatCurrency(data.emergencyFund)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tabungan</h2>
          <div className="text-green-600">
            <FiPieChart size={24} />
          </div>
        </div>
        
        <div className="space-y-4">
          {Object.keys(data.savingsByType).length > 0 ? (
            <>
              {Object.entries(data.savingsByType).map(([description, amount]) => (
                <div key={description} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="text-gray-700">{description}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}

              <div className="pt-2 flex justify-between items-center">
                <span className="font-semibold">Total Tabungan</span>
                <span className="font-semibold text-green-600">{formatCurrency(data.totalSavings)}</span>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-center py-4">
              Belum ada tabungan
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 