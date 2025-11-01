'use client';

import React, { useState, useEffect } from 'react';
import { FiPlusCircle, FiTag, FiTrash, FiEdit, FiArrowDown, FiArrowUp, FiRefreshCw, FiLayers, FiFilter, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';
import { useWallet } from '@/app/providers/WalletProvider';
import AutoCategorizeSection from './components/AutoCategorizeSection';
import CustomRulesSection from './components/CustomRulesSection';
import CategoryManagerSection from './components/CategoryManagerSection';
import SubCategoriesSection from './components/SubCategoriesSection';

type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  parentId?: string | null;
  keywords?: string[];
};

type Rule = {
  id: string;
  name: string;
  pattern: string;
  categoryId: string;
  isRegex: boolean;
  isActive: boolean;
};

const SmartCategoriesPage = () => {
  const { selectedWallet } = useWallet();
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fetch categories and rules
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Fetch categories
      const catResponse = await fetch('/api/categories');
      if (!catResponse.ok) throw new Error('Failed to fetch categories');
      const categoriesData = await catResponse.json();
      
      // Fetch rules - we'll create this API later
      const rulesResponse = await fetch('/api/category-rules');
      let rulesData: Rule[] = [];
      
      if (rulesResponse.ok) {
        rulesData = await rulesResponse.json();
      } else {
        // If API doesn't exist yet, use mock data
        rulesData = [
          {
            id: 'mock1',
            name: 'Makanan Rule',
            pattern: 'makanan|makan|restoran|warung|cafe',
            categoryId: categoriesData.find((c: Category) => c.name === 'Food')?.id || '',
            isRegex: true,
            isActive: true
          },
          {
            id: 'mock2',
            name: 'Transport Rule',
            pattern: 'gojek|grab|uber|bensin|parkir',
            categoryId: categoriesData.find((c: Category) => c.name === 'Transport')?.id || '',
            isRegex: true,
            isActive: true
          }
        ];
      }
      
      setCategories(categoriesData);
      setRules(rulesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Smart Categorization</h1>
        <div className="flex space-x-2">
          <Link 
            href="/categories"
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <FiTag />
            <span>Manage Basic Categories</span>
          </Link>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            onClick={fetchData}
          >
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Tab Selector */}
      <div className="flex border-b overflow-x-auto">
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'auto' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('auto')}
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            <FiRefreshCw />
            <span>Auto-Categorize</span>
          </div>
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'rules' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('rules')}
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            <FiFilter />
            <span>Custom Rules</span>
          </div>
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'manage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('manage')}
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            <FiEdit />
            <span>Merge & Split</span>
          </div>
        </button>
        <button 
          className={`px-4 py-2 font-medium ${activeTab === 'sub' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('sub')}
        >
          <div className="flex items-center gap-1 whitespace-nowrap">
            <FiLayers />
            <span>Sub-Categories</span>
          </div>
        </button>
      </div>
      
      {/* Main Content */}
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="py-4">
          {activeTab === 'auto' && (
            <AutoCategorizeSection 
              walletId={selectedWallet?.id}
              walletName={selectedWallet?.name}
            />
          )}
          
          {activeTab === 'rules' && (
            <CustomRulesSection 
              rules={rules}
              categories={categories}
              onRulesChange={setRules}
              onRefresh={fetchData}
            />
          )}
          
          {activeTab === 'manage' && (
            <CategoryManagerSection 
              categories={categories}
              onRefresh={fetchData}
            />
          )}
          
          {activeTab === 'sub' && (
            <SubCategoriesSection 
              categories={categories}
              onRefresh={fetchData}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCategoriesPage; 
