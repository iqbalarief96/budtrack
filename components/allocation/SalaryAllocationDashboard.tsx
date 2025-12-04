'use client';

import { useState } from 'react';
import AllocationForm from './AllocationForm';
import AllocationPreview from './AllocationPreview';
import SavedConfigsList from './SavedConfigsList';
import type { AllocationResult, SalaryAllocationConfig, AllocationTemplateType } from '@/app/types/allocation';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Wallet {
  id: string;
  name: string;
}

interface Props {
  initialConfigs: any[];
  categories: Category[];
  wallets: Wallet[];
}

export default function SalaryAllocationDashboard({ initialConfigs, categories, wallets }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [unallocatedPercentage, setUnallocatedPercentage] = useState(0);
  const [currentIncome, setCurrentIncome] = useState(0);
  const [currentTemplateType, setCurrentTemplateType] = useState<AllocationTemplateType>('50-30-20');
  const [loadedConfig, setLoadedConfig] = useState<any>(null);

  const handleCalculate = (
    calculatedResults: AllocationResult[],
    total: number,
    unallocated: number,
    income: number,
    templateType: AllocationTemplateType
  ) => {
    setResults(calculatedResults);
    setTotalAllocated(total);
    setUnallocatedPercentage(unallocated);
    setCurrentIncome(income);
    setCurrentTemplateType(templateType);
  };

  const handleConfigSaved = (newConfig: SalaryAllocationConfig) => {
    setConfigs([newConfig, ...configs.filter(c => c.id !== newConfig.id)]);
  };

  const handleConfigDeleted = (configId: string) => {
    setConfigs(configs.filter(c => c.id !== configId));
  };

  const handleConfigLoad = async (config: any) => {
    // Calculate allocation from loaded config
    try {
      const response = await fetch('/api/salary-allocation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: config.monthlyIncome,
          templateType: config.templateType,
          customItems: config.items.map((item: any) => ({
            categoryName: item.categoryName,
            categoryType: item.categoryType,
            percentage: item.percentage,
            icon: item.icon,
            color: item.color,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setTotalAllocated(data.totalAllocated);
        setUnallocatedPercentage(data.unallocatedPercentage);
        setCurrentIncome(config.monthlyIncome);
        setCurrentTemplateType(config.templateType);
        setLoadedConfig(config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Form */}
      <div className="lg:col-span-1">
        <AllocationForm
          onCalculate={handleCalculate}
          onConfigSaved={handleConfigSaved}
          categories={categories}
          wallets={wallets}
          loadedConfig={loadedConfig}
        />
      </div>

      {/* Middle Column - Preview */}
      <div className="lg:col-span-1">
        <AllocationPreview
          results={results}
          totalAllocated={totalAllocated}
          unallocatedPercentage={unallocatedPercentage}
          monthlyIncome={currentIncome}
        />
      </div>

      {/* Right Column - Saved Configs */}
      <div className="lg:col-span-1">
        <SavedConfigsList
          configs={configs}
          onLoad={handleConfigLoad}
          onDelete={handleConfigDeleted}
          categories={categories}
          wallets={wallets}
        />
      </div>
    </div>
  );
}
