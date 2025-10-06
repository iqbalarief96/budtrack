'use client';

import React, { useState } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import Link from 'next/link';

// Demo data
const initialSavings = [
  {
    id: '1',
    name: 'Dana Utama',
    target: 150000000,
    current: 65000000,
    deadline: '2024-10-15',
    source: 'Tabungan Bersama',
    description: 'Tabungan utama untuk biaya pernikahan dari kedua mempelai'
  },
  {
    id: '2',
    name: 'Dana Honeymoon',
    target: 35000000,
    current: 15000000,
    deadline: '2024-11-30',
    source: 'Tabungan Pribadi',
    description: 'Dana untuk liburan bulan madu ke Bali'
  },
  {
    id: '3',
    name: 'Dana Darurat',
    target: 25000000,
    current: 10000000,
    deadline: '2024-11-01',
    source: 'Investasi',
    description: 'Dana cadangan untuk kebutuhan mendadak'
  }
];

export default function SavingsPage() {
  const [savingsGoals, setSavingsGoals] = useState(initialSavings);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editSavingId, setEditSavingId] = useState<string | null>(null);
  const [newSaving, setNewSaving] = useState({
    name: '',
    target: 0,
    current: 0,
    deadline: '',
    source: '',
    description: ''
  });
  
  // Calculate total stats
  const totalTarget = savingsGoals.reduce((sum, item) => sum + item.target, 0);
  const totalCurrent = savingsGoals.reduce((sum, item) => sum + item.current, 0);
  const totalPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const remaining = totalTarget - totalCurrent;
  
  const handleSaveGoal = () => {
    if (newSaving.name && newSaving.target > 0) {
      if (editSavingId) {
        // Update existing saving
        setSavingsGoals(prevSavings => 
          prevSavings.map(saving => 
            saving.id === editSavingId ? {...newSaving, id: saving.id} : saving
          )
        );
        setEditSavingId(null);
      } else {
        // Add new saving
        setSavingsGoals([
          ...savingsGoals,
          {
            ...newSaving,
            id: Date.now().toString()
          }
        ]);
      }
      
      // Reset form
      setNewSaving({
        name: '',
        target: 0,
        current: 0,
        deadline: '',
        source: '',
        description: ''
      });
      setShowAddForm(false);
    }
  };
  
  const handleEditSaving = (id: string) => {
    const savingToEdit = savingsGoals.find(saving => saving.id === id);
    if (savingToEdit) {
      setNewSaving({...savingToEdit});
      setEditSavingId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteSaving = (id: string) => {
    setSavingsGoals(savingsGoals.filter(saving => saving.id !== id));
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };
  
  const calculateTimeLeft = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr);
    const today = new Date();
    const timeLeft = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    
    return daysLeft > 0 ? `${daysLeft} hari lagi` : 'Tenggat terlewat';
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Target Tabungan</h1>
      </div>
      
      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Ringkasan Tabungan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiDollarSign className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Target Total</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalTarget)}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiDollarSign className="w-5 h-5 text-green-500 mr-2" />
              <h3 className="font-medium">Terkumpul</h3>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCurrent)}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiTrendingUp className="w-5 h-5 text-purple-500 mr-2" />
              <h3 className="font-medium">Sisa Target</h3>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(remaining)}</p>
              <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                {totalPercentage}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative pt-1">
          <div className="overflow-hidden h-4 mb-1 text-xs flex rounded-full bg-gray-200">
            <div 
              style={{ width: `${totalPercentage}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500">
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      
      {/* Savings Goals Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Target Tabungan</h2>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Tambah Target
          </button>
        </div>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="font-medium mb-4">{editSavingId ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Target</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newSaving.name}
                  onChange={(e) => setNewSaving({...newSaving, name: e.target.value})}
                  placeholder="e.g., Dana Utama"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Dana</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newSaving.source}
                  onChange={(e) => setNewSaving({...newSaving, source: e.target.value})}
                  placeholder="e.g., Tabungan Bersama"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newSaving.target === 0 ? '' : newSaving.target}
                  onChange={(e) => setNewSaving({...newSaving, target: Number(e.target.value)})}
                  placeholder="e.g., 50000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terkumpul (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newSaving.current === 0 ? '' : newSaving.current}
                  onChange={(e) => setNewSaving({...newSaving, current: Number(e.target.value)})}
                  placeholder="e.g., 10000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenggat Waktu</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newSaving.deadline}
                  onChange={(e) => setNewSaving({...newSaving, deadline: e.target.value})}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newSaving.description}
                onChange={(e) => setNewSaving({...newSaving, description: e.target.value})}
                rows={2}
                placeholder="Deskripsi target tabungan..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditSavingId(null);
                  setNewSaving({
                    name: '',
                    target: 0,
                    current: 0,
                    deadline: '',
                    source: '',
                    description: ''
                  });
                }}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveGoal}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editSavingId ? 'Update Target' : 'Simpan Target'}
              </button>
            </div>
          </div>
        )}
        
        {/* Goals List */}
        <div className="space-y-4">
          {savingsGoals.map(saving => {
            const percentage = Math.round((saving.current / saving.target) * 100);
            
            return (
              <div key={saving.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{saving.name}</h3>
                      <p className="text-gray-500 text-sm">{saving.source}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditSaving(saving.id)}
                        className="p-1 rounded-full bg-gray-100 text-blue-600 hover:bg-blue-50"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSaving(saving.id)}
                        className="p-1 rounded-full bg-gray-100 text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Target</p>
                      <p className="font-semibold">{formatCurrency(saving.target)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Terkumpul</p>
                      <p className="font-semibold">{formatCurrency(saving.current)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tenggat</p>
                      <p className="font-semibold">{formatDate(saving.deadline)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sisa Waktu</p>
                      <p className="font-semibold">{calculateTimeLeft(saving.deadline)}</p>
                    </div>
                  </div>
                  
                  {saving.description && (
                    <p className="mt-3 text-sm text-gray-600">{saving.description}</p>
                  )}
                  
                  {/* Progress bar */}
                  <div className="mt-4 relative pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs font-medium inline-block text-blue-600">
                          {percentage}% Terkumpul
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium inline-block text-blue-600">
                          {formatCurrency(saving.target - saving.current)} lagi
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-blue-100">
                      <div 
                        style={{ width: `${percentage}%` }} 
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          percentage < 40 ? 'bg-red-500' : percentage < 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {savingsGoals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Belum ada target tabungan. Tambahkan target baru untuk mulai menabung.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 