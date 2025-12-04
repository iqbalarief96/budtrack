'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, Wallet, CreditCard } from 'lucide-react';
import type { CategoryBreakdown } from '@/app/types/net-worth';

/**
 * NetWorthBreakdown Component
 * Displays pie charts for assets and liabilities breakdown
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

interface NetWorthBreakdownProps {
  assetBreakdown: CategoryBreakdown[];
  liabilityBreakdown: CategoryBreakdown[];
  isLoading?: boolean;
  className?: string;
}

// Colors for pie chart segments
const ASSET_COLORS = [
  '#22c55e', // green-500
  '#16a34a', // green-600
  '#15803d', // green-700
  '#166534', // green-800
  '#14532d', // green-900
];

const LIABILITY_COLORS = [
  '#ef4444', // red-500
  '#dc2626', // red-600
  '#b91c1c', // red-700
  '#991b1b', // red-800
  '#7f1d1d', // red-900
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{data.category}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(data.amount)} ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export const NetWorthBreakdown: React.FC<NetWorthBreakdownProps> = ({
  assetBreakdown,
  liabilityBreakdown,
  isLoading = false,
  className,
}) => {
  const [expandedAssetCategory, setExpandedAssetCategory] = useState<string | null>(null);
  const [expandedLiabilityCategory, setExpandedLiabilityCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPieChart = (data: CategoryBreakdown[], colors: string[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Tidak ada data
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="amount"
            nameKey="category"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderCategoryList = (
    data: CategoryBreakdown[], 
    expandedCategory: string | null,
    setExpandedCategory: (cat: string | null) => void,
    colorClass: string
  ) => {
    if (!data || data.length === 0) {
      return <div className="text-sm text-muted-foreground">Tidak ada data</div>;
    }

    return (
      <div className="space-y-2">
        {data.map((category) => (
          <div key={category.category} className="border rounded-lg">
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.category ? null : category.category
              )}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{category.category}</span>
                <span className="text-sm text-muted-foreground">
                  ({category.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${colorClass}`}>
                  {formatCurrency(category.amount)}
                </span>
                {category.items.length > 0 && (
                  expandedCategory === category.category 
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>
            
            {expandedCategory === category.category && category.items.length > 0 && (
              <div className="border-t bg-gray-50 p-3 space-y-2">
                {category.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Breakdown Aset & Liabilitas</CardTitle>
        <CardDescription>Distribusi kekayaan dan kewajiban Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Aset
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Liabilitas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="space-y-4">
            {renderPieChart(assetBreakdown, ASSET_COLORS)}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Detail per Kategori</h4>
              {renderCategoryList(
                assetBreakdown, 
                expandedAssetCategory, 
                setExpandedAssetCategory,
                'text-green-600'
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="liabilities" className="space-y-4">
            {renderPieChart(liabilityBreakdown, LIABILITY_COLORS)}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Detail per Kategori</h4>
              {renderCategoryList(
                liabilityBreakdown, 
                expandedLiabilityCategory, 
                setExpandedLiabilityCategory,
                'text-red-600'
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NetWorthBreakdown;
