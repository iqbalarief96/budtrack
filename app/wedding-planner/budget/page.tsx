'use client';

import React, { useState } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiDollarSign, FiPieChart } from 'react-icons/fi';
import Link from 'next/link';

// Demo data
const initialBudgetCategories = [
  {
    id: '1',
    name: 'Venue',
    total: 85000000,
    spent: 45000000,
    items: [
      { id: '101', name: 'Gedung Utama', budgeted: 80000000, actual: 40000000, paid: true },
      { id: '102', name: 'Area Outdoor', budgeted: 5000000, actual: 5000000, paid: false },
    ]
  },
  {
    id: '2',
    name: 'Katering',
    total: 50000000,
    spent: 5000000,
    items: [
      { id: '201', name: 'Menu Utama (250 pax)', budgeted: 40000000, actual: 0, paid: false },
      { id: '202', name: 'Snack & Minuman', budgeted: 10000000, actual: 5000000, paid: true },
    ]
  },
  {
    id: '3',
    name: 'Dekorasi',
    total: 35000000,
    spent: 10000000,
    items: [
      { id: '301', name: 'Dekorasi Pelaminan', budgeted: 25000000, actual: 10000000, paid: true },
      { id: '302', name: 'Bunga & Lighting', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '4',
    name: 'Pakaian',
    total: 30000000,
    spent: 15000000,
    items: [
      { id: '401', name: 'Baju Pengantin', budgeted: 20000000, actual: 15000000, paid: true },
      { id: '402', name: 'Keluarga', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '5',
    name: 'Fotografi & Videografi',
    total: 25000000,
    spent: 0,
    items: [
      { id: '501', name: 'Pre-Wedding', budgeted: 10000000, actual: 0, paid: false },
      { id: '502', name: 'Dokumentasi Acara', budgeted: 15000000, actual: 0, paid: false },
    ]
  },
  {
    id: '6',
    name: 'Entertaiment',
    total: 15000000,
    spent: 0,
    items: [
      { id: '601', name: 'MC', budgeted: 5000000, actual: 0, paid: false },
      { id: '602', name: 'Band/Music', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '7',
    name: 'Souvenir & Undangan',
    total: 10000000,
    spent: 0,
    items: [
      { id: '701', name: 'Souvenir (250 pcs)', budgeted: 7500000, actual: 0, paid: false },
      { id: '702', name: 'Undangan Digital & Fisik', budgeted: 2500000, actual: 0, paid: false },
    ]
  },
];

// Calculate total budget and spent
const calculateTotals = (categories: any[]) => {
  return categories.reduce(
    (acc, category) => ({
      total: acc.total + category.total,
      spent: acc.spent + category.spent
    }),
    { total: 0, spent: 0 }
  );
};

export default function BudgetPage() {
  const [budgetCategories, setBudgetCategories] = useState(initialBudgetCategories);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showAddItemForm, setShowAddItemForm] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    budgeted: 0,
    actual: 0,
    paid: false
  });
  
  // Calculate budget summary
  const budgetSummary = calculateTotals(budgetCategories);
  const percentageSpent = Math.round((budgetSummary.spent / budgetSummary.total) * 100);
  const remaining = budgetSummary.total - budgetSummary.spent;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddItem = (categoryId: string) => {
    if (newItem.name && newItem.budgeted > 0) {
      setBudgetCategories(categories => 
        categories.map(category => {
          if (category.id === categoryId) {
            const newItemWithId = {
              ...newItem,
              id: Date.now().toString(),
            };
            
            // Update category total
            const updatedCategory = {
              ...category,
              total: category.total + newItem.budgeted,
              spent: category.spent + (newItem.actual || 0),
              items: [...category.items, newItemWithId]
            };
            
            return updatedCategory;
          }
          return category;
        })
      );
      
      // Reset form
      setNewItem({
        name: '',
        budgeted: 0,
        actual: 0,
        paid: false
      });
      setShowAddItemForm(null);
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Budget Pernikahan</h1>
      </div>

      {/* Budget Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Ringkasan Anggaran</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiDollarSign className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Total Anggaran</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(budgetSummary.total)}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiDollarSign className="w-5 h-5 text-green-500 mr-2" />
              <h3 className="font-medium">Tersisa</h3>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(remaining)}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiPieChart className="w-5 h-5 text-purple-500 mr-2" />
              <h3 className="font-medium">Terpakai</h3>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(budgetSummary.spent)}</p>
              <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                {percentageSpent}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative pt-1">
          <div className="overflow-hidden h-4 mb-1 text-xs flex rounded-full bg-gray-200">
            <div 
              style={{ width: `${percentageSpent}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500">
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Kategori Anggaran</h2>
        
        <div className="space-y-4">
          {budgetCategories.map(category => (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <div>
                  <h3 className="font-medium">{category.name}</h3>
                  <div className="flex text-sm text-gray-500 mt-1">
                    <span className="mr-3">Budget: {formatCurrency(category.total)}</span>
                    <span>Terpakai: {formatCurrency(category.spent)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${Math.round((category.spent / category.total) * 100) < 50 
                        ? 'bg-green-100 text-green-800' 
                        : Math.round((category.spent / category.total) * 100) < 75
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                      {Math.round((category.spent / category.total) * 100)}%
                    </span>
                  </div>
                  <button className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300">
                    {expandedCategories.includes(category.id) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Category Items */}
              {expandedCategories.includes(category.id) && (
                <div className="p-4 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-right">Anggaran</th>
                        <th className="px-4 py-2 text-right">Aktual</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {category.items.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">{item.name}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.budgeted)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.actual)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${item.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {item.paid ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center space-x-2">
                              <button className="p-1 rounded-full text-blue-600 hover:bg-blue-50">
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button className="p-1 rounded-full text-red-600 hover:bg-red-50">
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Add item button */}
                  <div className="mt-4">
                    {showAddItemForm === category.id ? (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Item</label>
                            <input 
                              type="text" 
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={newItem.name}
                              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                              placeholder="e.g., Sewa Tambahan"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Anggaran</label>
                            <input 
                              type="number" 
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={newItem.budgeted === 0 ? '' : newItem.budgeted}
                              onChange={(e) => setNewItem({...newItem, budgeted: Number(e.target.value)})}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Aktual (jika ada)</label>
                            <input 
                              type="number" 
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={newItem.actual === 0 ? '' : newItem.actual}
                              onChange={(e) => setNewItem({...newItem, actual: Number(e.target.value)})}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex items-center mb-4">
                          <input 
                            type="checkbox" 
                            id="paidStatus" 
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            checked={newItem.paid}
                            onChange={(e) => setNewItem({...newItem, paid: e.target.checked})}
                          />
                          <label htmlFor="paidStatus" className="ml-2 text-sm text-gray-700">Sudah Dibayar</label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => setShowAddItemForm(null)}
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm"
                          >
                            Batal
                          </button>
                          <button 
                            onClick={() => handleAddItem(category.id)}
                            className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 text-sm"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowAddItemForm(category.id)}
                        className="flex items-center text-blue-600 text-sm hover:text-blue-800"
                      >
                        <FiPlus className="w-4 h-4 mr-1" /> Tambah Item
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 