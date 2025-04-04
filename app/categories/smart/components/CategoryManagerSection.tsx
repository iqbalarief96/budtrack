'use client';

import React, { useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiScissors } from 'react-icons/fi';

type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
};

type CategoryManagerSectionProps = {
  categories: Category[];
  onRefresh: () => void;
};

export default function CategoryManagerSection({ categories, onRefresh }: CategoryManagerSectionProps) {
  const [mergeState, setMergeState] = useState<{
    sourceCategoryId: string;
    targetCategoryId: string;
    isProcessing: boolean;
    success: boolean | null;
    error: string;
    debugInfo: string;
  }>({
    sourceCategoryId: '',
    targetCategoryId: '',
    isProcessing: false,
    success: null,
    error: '',
    debugInfo: '',
  });

  const [splitState, setSplitState] = useState<{
    categoryId: string;
    newCategoryName: string;
    splitPattern: string;
    isProcessing: boolean;
    success: boolean | null;
    error: string;
  }>({
    categoryId: '',
    newCategoryName: '',
    splitPattern: '',
    isProcessing: false,
    success: null,
    error: '',
  });

  // Filter categories by type
  const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');
  const incomeCategories = categories.filter(cat => cat.type === 'INCOME');

  const handleMergeCategories = async () => {
    // Validation
    if (!mergeState.sourceCategoryId || !mergeState.targetCategoryId) {
      setMergeState({
        ...mergeState,
        error: 'Please select both source and target categories',
        debugInfo: '',
      });
      return;
    }

    if (mergeState.sourceCategoryId === mergeState.targetCategoryId) {
      setMergeState({
        ...mergeState,
        error: 'Source and target categories cannot be the same',
        debugInfo: '',
      });
      return;
    }

    const sourceCategory = categories.find(c => c.id === mergeState.sourceCategoryId);
    const targetCategory = categories.find(c => c.id === mergeState.targetCategoryId);

    if (!sourceCategory || !targetCategory) {
      setMergeState({
        ...mergeState,
        error: 'One or both selected categories could not be found',
        debugInfo: '',
      });
      return;
    }

    if (sourceCategory.type !== targetCategory.type) {
      setMergeState({
        ...mergeState,
        error: 'You can only merge categories of the same type (Income or Expense)',
        debugInfo: '',
      });
      return;
    }
    
    // Start processing
    setMergeState({
      ...mergeState,
      isProcessing: true,
      error: '',
      success: null,
      debugInfo: '',
    });

    try {
      console.log('Sending merge request:', {
        sourceCategoryId: mergeState.sourceCategoryId, 
        targetCategoryId: mergeState.targetCategoryId
      });
      
      // Call the actual API to merge categories
      const response = await fetch('/api/categories/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCategoryId: mergeState.sourceCategoryId,
          targetCategoryId: mergeState.targetCategoryId,
        }),
      });

      const data = await response.json();
      console.log('Merge response:', data);

      if (!response.ok) {
        const debugInfo = `Status: ${response.status}, Source ID: ${mergeState.sourceCategoryId}, Target ID: ${mergeState.targetCategoryId}`;
        throw new Error(data.error || 'Failed to merge categories' + '. ' + debugInfo);
      }
      
      // Success handling
      setMergeState({
        ...mergeState,
        isProcessing: false,
        success: true,
        debugInfo: '',
      });
      
      // Reset after showing success message
      setTimeout(() => {
        setMergeState({
          sourceCategoryId: '',
          targetCategoryId: '',
          isProcessing: false,
          success: null,
          error: '',
          debugInfo: '',
        });
        onRefresh(); // Refresh data
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to merge categories. Please try again.';
      console.error('Merge error:', error);
      
      setMergeState({
        ...mergeState,
        isProcessing: false,
        success: false,
        error: errorMessage,
        debugInfo: 'Please check the console for more details.',
      });
    }
  };

  const handleSplitCategory = async () => {
    // Validation
    if (!splitState.categoryId) {
      setSplitState({
        ...splitState,
        error: 'Please select a category to split',
      });
      return;
    }

    if (!splitState.newCategoryName) {
      setSplitState({
        ...splitState,
        error: 'Please enter a name for the new category',
      });
      return;
    }

    if (!splitState.splitPattern) {
      setSplitState({
        ...splitState,
        error: 'Please enter a pattern to identify transactions for the new category',
      });
      return;
    }

    // Start processing
    setSplitState({
      ...splitState,
      isProcessing: true,
      error: '',
      success: null,
    });

    try {
      // Call the actual API to split category
      const response = await fetch('/api/categories/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: splitState.categoryId,
          newCategoryName: splitState.newCategoryName,
          splitPattern: splitState.splitPattern,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to split category');
      }
      
      // Success handling
      setSplitState({
        ...splitState,
        isProcessing: false,
        success: true,
      });
      
      // Reset after showing success message
      setTimeout(() => {
        setSplitState({
          categoryId: '',
          newCategoryName: '',
          splitPattern: '',
          isProcessing: false,
          success: null,
          error: '',
        });
        onRefresh(); // Refresh data
      }, 2000);
    } catch (error) {
      setSplitState({
        ...splitState,
        isProcessing: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to split category. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Merge Categories Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Merge Categories</h2>
        <p className="text-gray-600 mb-6">
          Combine two categories into one. All transactions from the source category will be moved to the target category.
          The source category will be deleted after the merge.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Selection Interface */}
          <div className="space-y-4 border-r pr-6">
            <div>
              <label htmlFor="sourceCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Source Category (will be deleted)
              </label>
              <select
                id="sourceCategory"
                value={mergeState.sourceCategoryId}
                onChange={(e) => setMergeState({ ...mergeState, sourceCategoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                disabled={mergeState.isProcessing}
              >
                <option value="">Select a category</option>
                <optgroup label="Expense Categories">
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Income Categories">
                  {incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            <div className="flex justify-center py-2">
              <FiArrowRight className="text-blue-500 text-xl" />
            </div>
            
            <div>
              <label htmlFor="targetCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Target Category (will remain)
              </label>
              <select
                id="targetCategory"
                value={mergeState.targetCategoryId}
                onChange={(e) => setMergeState({ ...mergeState, targetCategoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                disabled={mergeState.isProcessing}
              >
                <option value="">Select a category</option>
                <optgroup label="Expense Categories">
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Income Categories">
                  {incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleMergeCategories}
                disabled={mergeState.isProcessing || !mergeState.sourceCategoryId || !mergeState.targetCategoryId}
                className={`w-full py-2 px-4 rounded-md ${
                  mergeState.isProcessing || !mergeState.sourceCategoryId || !mergeState.targetCategoryId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {mergeState.isProcessing ? (
                  <span className="flex justify-center items-center">
                    <FiRefreshCw className="animate-spin mr-2" /> 
                    Processing...
                  </span>
                ) : 'Merge Categories'}
              </button>
            </div>
            
            {mergeState.error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                <div>{mergeState.error}</div>
                {mergeState.debugInfo && (
                  <div className="mt-2 text-xs text-gray-600">{mergeState.debugInfo}</div>
                )}
              </div>
            )}
            
            {mergeState.success === true && (
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
                <FiCheckCircle className="mr-2" /> 
                Categories successfully merged!
              </div>
            )}
          </div>
          
          {/* Info Panel */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">What happens when you merge?</h3>
              <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                <li>All transactions from the source category will be moved to the target category</li>
                <li>The source category will be permanently deleted</li>
                <li>Budget allocations for the source category will be moved to the target category</li>
                <li>Any rules using the source category will be updated to use the target category</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Warning</h3>
              <p className="text-sm text-yellow-700">
                This action cannot be undone. Make sure you've selected the correct categories before merging.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Split Category Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Split Category</h2>
        <p className="text-gray-600 mb-6">
          Split transactions from one category into a new category based on a pattern in the transaction description.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Split Form */}
          <div className="space-y-4 border-r pr-6">
            <div>
              <label htmlFor="categoryToSplit" className="block text-sm font-medium text-gray-700 mb-1">
                Category to Split
              </label>
              <select
                id="categoryToSplit"
                value={splitState.categoryId}
                onChange={(e) => setSplitState({ ...splitState, categoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                disabled={splitState.isProcessing}
              >
                <option value="">Select a category</option>
                <optgroup label="Expense Categories">
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Income Categories">
                  {incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            <div>
              <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                New Category Name
              </label>
              <input
                type="text"
                id="newCategoryName"
                value={splitState.newCategoryName}
                onChange={(e) => setSplitState({ ...splitState, newCategoryName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Business Travel"
                disabled={splitState.isProcessing}
              />
            </div>
            
            <div>
              <label htmlFor="splitPattern" className="block text-sm font-medium text-gray-700 mb-1">
                Split Pattern (match in transaction description)
              </label>
              <input
                type="text"
                id="splitPattern"
                value={splitState.splitPattern}
                onChange={(e) => setSplitState({ ...splitState, splitPattern: e.target.value })}
                className="w-full px-3 py-2 border rounded-md font-mono"
                placeholder="e.g., business, work, client"
                disabled={splitState.isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple words with commas. Any transaction containing these words will be moved.
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleSplitCategory}
                disabled={splitState.isProcessing || !splitState.categoryId || !splitState.newCategoryName || !splitState.splitPattern}
                className={`w-full py-2 px-4 rounded-md ${
                  splitState.isProcessing || !splitState.categoryId || !splitState.newCategoryName || !splitState.splitPattern
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {splitState.isProcessing ? (
                  <span className="flex justify-center items-center">
                    <FiRefreshCw className="animate-spin mr-2" /> 
                    Processing...
                  </span>
                ) : (
                  <span className="flex justify-center items-center">
                    <FiScissors className="mr-2" />
                    Split Category
                  </span>
                )}
              </button>
            </div>
            
            {splitState.error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {splitState.error}
              </div>
            )}
            
            {splitState.success === true && (
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
                <FiCheckCircle className="mr-2" /> 
                Category successfully split!
              </div>
            )}
          </div>
          
          {/* Info Panel */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">What happens when you split?</h3>
              <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                <li>A new category is created with the specified name</li>
                <li>Transactions matching the pattern are moved to the new category</li>
                <li>The original category remains with its remaining transactions</li>
                <li>Any budget for the original category is not automatically adjusted</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Example</h3>
              <p className="text-sm text-purple-700 mb-2">
                If you have a "Food" category but want to separate "Groceries" from "Restaurants":
              </p>
              <ul className="text-sm text-purple-700 list-disc list-inside">
                <li>Select "Food" as the category to split</li>
                <li>Create a new category named "Restaurants"</li>
                <li>Use patterns like "restaurant, cafe, dining, lunch" to identify restaurant transactions</li>
                <li>After splitting, restaurant-related transactions will be in the new category</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 