'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiCheck, FiPackage, FiDollarSign, FiUsers } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { DEMO_WEDDING_ID } from '../constants';

// Define SouvenirStatus type for UI
type SouvenirStatus = 'not-started' | 'in-progress' | 'completed';

// API Souvenir data structure (matches Prisma schema)
interface APISouvenir {
  id: string;
  weddingId: string;
  name: string;
  type?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalBudget: number;
  actualCostPerUnit: number;
  totalActualCost: number;
  vendor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status: string; // PLANNING, ORDERED, RECEIVED
  orderDate?: string | null;
  deliveryDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// UI Souvenir data structure (what we use in the UI)
interface UISouvenir {
  id: string;
  name: string;
  description: string;
  quantity: number;
  budgetPerUnit: number;
  actualCostPerUnit: number;
  totalBudget: number;
  totalActualCost: number;
  status: SouvenirStatus;
  vendor: string;
  notes: string;
  targetAudience: 'all' | 'vip' | 'family' | 'regular';
}

// New souvenir form data (without calculated/ID fields)
type NewSouvenirFormData = Omit<UISouvenir, 'id' | 'totalBudget' | 'totalActualCost'>;

export default function SouvenirsPage() {
  const [souvenirs, setSouvenirs] = useState<UISouvenir[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editSouvenirId, setEditSouvenirId] = useState<string | null>(null);
  const [newSouvenir, setNewSouvenir] = useState<NewSouvenirFormData>({
    name: '',
    description: '',
    quantity: 0,
    budgetPerUnit: 0,
    actualCostPerUnit: 0,
    status: 'not-started',
    vendor: '',
    notes: '',
    targetAudience: 'all'
  });
  
  // Contoh weddingId - dalam aplikasi nyata ini akan diambil dari context atau route
  const weddingId = DEMO_WEDDING_ID;
  
  // Helper function to convert API souvenir to UI souvenir
  const mapAPIToUISouvenir = (apiSouvenir: APISouvenir): UISouvenir => {
    return {
      id: apiSouvenir.id,
      name: apiSouvenir.name,
      description: apiSouvenir.description || '',
      quantity: apiSouvenir.quantity,
      budgetPerUnit: apiSouvenir.pricePerUnit,
      actualCostPerUnit: apiSouvenir.actualCostPerUnit,
      totalBudget: apiSouvenir.totalBudget,
      totalActualCost: apiSouvenir.totalActualCost,
      status: mapStatusFromPrisma(apiSouvenir.status),
      vendor: apiSouvenir.vendor || '',
      notes: apiSouvenir.notes || '',
      targetAudience: (apiSouvenir.type as any) || 'all'
    };
  };
  
  // Helper function to convert UI status to API status
  const mapStatusToPrisma = (status: SouvenirStatus): string => {
    switch (status) {
      case 'not-started':
        return 'PLANNING';
      case 'in-progress':
        return 'ORDERED';
      case 'completed':
        return 'RECEIVED';
      default:
        return 'PLANNING';
    }
  };
  
  // Helper function to convert API status to UI status
  const mapStatusFromPrisma = (status: string): SouvenirStatus => {
    switch (status) {
      case 'PLANNING':
        return 'not-started';
      case 'ORDERED':
        return 'in-progress';
      case 'RECEIVED':
        return 'completed';
      default:
        return 'not-started';
    }
  };
  
  // Fungsi untuk fetch data souvenirs dari API
  const fetchSouvenirs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/wedding/${weddingId}/souvenir`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch souvenirs');
      }
      
      const data: APISouvenir[] = await response.json();
      // Map API data to UI format
      const uiSouvenirs = data.map(mapAPIToUISouvenir);
      setSouvenirs(uiSouvenirs);
    } catch (err) {
      console.error('Error fetching souvenirs:', err);
      setError('Gagal mengambil data souvenir');
      setSouvenirs([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Panggil fetchSouvenirs saat komponen di-mount
  useEffect(() => {
    fetchSouvenirs();
  }, [weddingId]);
  
  // Calculate summary stats
  const totalItems = souvenirs.reduce((sum, item) => sum + item.quantity, 0);
  const totalBudget = souvenirs.reduce((sum, item) => sum + item.totalBudget, 0);
  const totalActualCost = souvenirs.reduce((sum, item) => sum + (item.totalActualCost || 0), 0);
  const completedItems = souvenirs
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + item.quantity, 0);
  const completedPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  const handleSaveSouvenir = async () => {
    if (newSouvenir.name && newSouvenir.quantity > 0) {
      try {
        // Calculate totals
        const totalBudget = newSouvenir.budgetPerUnit * newSouvenir.quantity;
        const totalActualCost = newSouvenir.actualCostPerUnit * newSouvenir.quantity;
        
        // Format data sesuai model Prisma Souvenir
        const souvenirPayload = {
          name: newSouvenir.name,
          type: newSouvenir.targetAudience, // Maps to "type" di Prisma
          quantity: newSouvenir.quantity,
          pricePerUnit: newSouvenir.budgetPerUnit,
          totalBudget: totalBudget,
          actualCostPerUnit: newSouvenir.actualCostPerUnit,
          totalActualCost: totalActualCost,
          vendor: newSouvenir.vendor || null,
          description: newSouvenir.description || null,
          status: mapStatusToPrisma(newSouvenir.status), // Convert status format
          notes: newSouvenir.notes || null,
          weddingId: weddingId
        };
        
        console.log("Saving souvenir with data:", souvenirPayload);
        
        if (editSouvenirId) {
          // Update existing souvenir via API
          const response = await fetch(`/api/wedding/${weddingId}/souvenir/${editSouvenirId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(souvenirPayload)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              throw new Error(`Konflik data: ${errorData.details || 'Wedding ID tidak valid atau data duplikat'}`);
            }
            throw new Error(`Failed to update souvenir: ${errorData.details || response.statusText}`);
          }
          
          toast.success('Souvenir berhasil diupdate!');
        } else {
          // Add new souvenir via API
          const response = await fetch(`/api/wedding/${weddingId}/souvenir`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(souvenirPayload)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              throw new Error(`Konflik data: ${errorData.details || 'Wedding ID tidak valid atau data duplikat'}`);
            }
            throw new Error(`Failed to create souvenir: ${errorData.details || response.statusText}`);
          }
          
          toast.success('Souvenir baru berhasil disimpan!');
        }
        
        // Refresh souvenirs list
        fetchSouvenirs();
        
        // Reset form
        setNewSouvenir({
          name: '',
          description: '',
          quantity: 0,
          budgetPerUnit: 0,
          actualCostPerUnit: 0,
          status: 'not-started',
          vendor: '',
          notes: '',
          targetAudience: 'all'
        });
        setEditSouvenirId(null);
        setShowAddForm(false);
      } catch (err) {
        console.error('Error saving souvenir:', err);
        toast.error('Gagal menyimpan souvenir: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } else {
      toast.error('Nama dan jumlah souvenir wajib diisi');
    }
  };
  
  const handleEditSouvenir = (id: string) => {
    const souvenirToEdit = souvenirs.find(souvenir => souvenir.id === id);
    if (souvenirToEdit) {
      setNewSouvenir({
        name: souvenirToEdit.name,
        description: souvenirToEdit.description,
        quantity: souvenirToEdit.quantity,
        budgetPerUnit: souvenirToEdit.budgetPerUnit,
        actualCostPerUnit: souvenirToEdit.actualCostPerUnit,
        status: souvenirToEdit.status,
        vendor: souvenirToEdit.vendor,
        notes: souvenirToEdit.notes,
        targetAudience: souvenirToEdit.targetAudience
      });
      
      setEditSouvenirId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteSouvenir = async (id: string) => {
    try {
      const response = await fetch(`/api/wedding/${weddingId}/souvenir/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete souvenir');
      }
      
      toast.success('Souvenir berhasil dihapus!');
      
      // Refresh list setelah delete
      fetchSouvenirs();
    } catch (err) {
      console.error('Error deleting souvenir:', err);
      toast.error('Gagal menghapus souvenir');
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
  
  const getStatusBadgeClass = (status: SouvenirStatus) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: SouvenirStatus) => {
    switch (status) {
      case 'not-started':
        return 'Belum Dimulai';
      case 'in-progress':
        return 'Dalam Proses';
      case 'completed':
        return 'Selesai';
      default:
        return status;
    }
  };
  
  const getAudienceBadgeClass = (audience: string) => {
    switch (audience) {
      case 'vip':
        return 'bg-purple-100 text-purple-800';
      case 'family':
        return 'bg-blue-100 text-blue-800';
      case 'regular':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'vip':
        return 'VIP';
      case 'family':
        return 'Keluarga';
      case 'regular':
        return 'Reguler';
      default:
        return 'Semua Tamu';
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Souvenir Pernikahan</h1>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
          {error}
          <button 
            onClick={fetchSouvenirs} 
            className="ml-2 underline"
          >
            Coba lagi
          </button>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6 text-center py-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 mb-4 rounded-full bg-indigo-200"></div>
            <div className="h-4 w-36 bg-indigo-100 rounded"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Ringkasan Souvenir</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiPackage className="w-5 h-5 text-indigo-500 mr-2" />
                  <h3 className="font-medium">Total Item</h3>
                </div>
                <p className="text-2xl font-bold text-indigo-700">{totalItems}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiCheck className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="font-medium">Item Selesai</h3>
                </div>
                <p className="text-2xl font-bold text-green-700">{completedItems}</p>
                <p className="text-xs text-gray-500">{completedPercentage}% dari total</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiDollarSign className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="font-medium">Total Budget</h3>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalBudget)}</p>
              </div>
              
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiDollarSign className="w-5 h-5 text-pink-500 mr-2" />
                  <h3 className="font-medium">Total Biaya</h3>
                </div>
                <p className="text-2xl font-bold text-pink-700">{formatCurrency(totalActualCost)}</p>
                <p className="text-xs text-gray-500">
                  {totalBudget > 0 
                    ? totalActualCost > totalBudget
                      ? `${Math.round((totalActualCost / totalBudget) * 100)}% dari budget (Over)`
                      : `${Math.round((totalActualCost / totalBudget) * 100)}% dari budget`
                    : '-'}
                </p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-5 relative pt-1">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {completedPercentage}% Souvenir Siap
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-blue-100">
                <div 
                  style={{ width: `${completedPercentage}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500">
                </div>
              </div>
            </div>
          </div>
          
          {/* Souvenirs List Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Daftar Souvenir</h2>
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 flex items-center"
              >
                <FiPlus className="mr-1" /> Tambah Souvenir
              </button>
            </div>
            
            {/* Add/Edit Form */}
            {showAddForm && (
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <h3 className="font-medium mb-4">{editSouvenirId ? 'Edit Souvenir' : 'Tambah Souvenir'}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Souvenir*</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newSouvenir.name}
                      onChange={(e) => setNewSouvenir({...newSouvenir, name: e.target.value})}
                      placeholder="e.g., Gelas Tumbler Custom"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah*</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newSouvenir.quantity === 0 ? '' : newSouvenir.quantity}
                      onChange={(e) => setNewSouvenir({...newSouvenir, quantity: Number(e.target.value)})}
                      placeholder="e.g., 200"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget per Unit (Rp)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newSouvenir.budgetPerUnit === 0 ? '' : newSouvenir.budgetPerUnit}
                      onChange={(e) => setNewSouvenir({...newSouvenir, budgetPerUnit: Number(e.target.value)})}
                      placeholder="e.g., 50000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Aktual per Unit (Rp)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newSouvenir.actualCostPerUnit === 0 ? '' : newSouvenir.actualCostPerUnit}
                      onChange={(e) => setNewSouvenir({...newSouvenir, actualCostPerUnit: Number(e.target.value)})}
                      placeholder="e.g., 52000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                      value={newSouvenir.status}
                      onChange={(e) => setNewSouvenir({...newSouvenir, status: e.target.value as SouvenirStatus})}
                    >
                      <option value="not-started">Belum Dimulai</option>
                      <option value="in-progress">Dalam Proses</option>
                      <option value="completed">Selesai</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Penerima</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                      value={newSouvenir.targetAudience}
                      onChange={(e) => setNewSouvenir({...newSouvenir, targetAudience: e.target.value as any})}
                    >
                      <option value="all">Semua Tamu</option>
                      <option value="vip">VIP</option>
                      <option value="family">Keluarga</option>
                      <option value="regular">Reguler</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor/Supplier</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newSouvenir.vendor}
                      onChange={(e) => setNewSouvenir({...newSouvenir, vendor: e.target.value})}
                      placeholder="e.g., Gifts & More"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={newSouvenir.description}
                    onChange={(e) => setNewSouvenir({...newSouvenir, description: e.target.value})}
                    rows={2}
                    placeholder="Detail tentang souvenir..."
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={newSouvenir.notes}
                    onChange={(e) => setNewSouvenir({...newSouvenir, notes: e.target.value})}
                    rows={2}
                    placeholder="Catatan tambahan..."
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditSouvenirId(null);
                      setNewSouvenir({
                        name: '',
                        description: '',
                        quantity: 0,
                        budgetPerUnit: 0,
                        actualCostPerUnit: 0,
                        status: 'not-started',
                        vendor: '',
                        notes: '',
                        targetAudience: 'all'
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSaveSouvenir}
                    className="px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                  >
                    {editSouvenirId ? 'Update Souvenir' : 'Simpan Souvenir'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Souvenirs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {souvenirs.map((souvenir) => (
                <div key={souvenir.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-lg">{souvenir.name}</h3>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getAudienceBadgeClass(souvenir.targetAudience)}`}>
                            {getAudienceLabel(souvenir.targetAudience)}
                          </span>
                        </div>
                        {souvenir.vendor && <p className="text-sm text-gray-500">Vendor: {souvenir.vendor}</p>}
                      </div>
                      
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(souvenir.status)}`}>
                        {getStatusLabel(souvenir.status)}
                      </span>
                    </div>
                    
                    {souvenir.description && (
                      <p className="mt-2 text-sm text-gray-600">{souvenir.description}</p>
                    )}
                    
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Jumlah</p>
                        <p className="text-sm font-medium">{souvenir.quantity.toLocaleString()} pcs</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Harga per Unit</p>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">
                            {souvenir.actualCostPerUnit > 0 ? formatCurrency(souvenir.actualCostPerUnit) : '-'}
                          </p>
                          {souvenir.actualCostPerUnit > 0 && souvenir.budgetPerUnit > 0 && (
                            <p className="text-xs text-gray-500">
                              Budget: {formatCurrency(souvenir.budgetPerUnit)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Total Budget</p>
                        <p className="text-sm font-medium">{formatCurrency(souvenir.totalBudget)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Total Biaya Aktual</p>
                        <p className="text-sm font-medium">
                          {souvenir.totalActualCost > 0 ? formatCurrency(souvenir.totalActualCost) : '-'}
                        </p>
                      </div>
                    </div>
                    
                    {souvenir.notes && (
                      <p className="mt-2 text-xs italic text-gray-500">Catatan: {souvenir.notes}</p>
                    )}
                    
                    <div className="mt-4 flex justify-end space-x-2">
                      <button 
                        onClick={() => handleEditSouvenir(souvenir.id)}
                        className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="Edit"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSouvenir(souvenir.id)}
                        className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        title="Hapus"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {souvenirs.length === 0 && (
                <div className="md:col-span-2 text-center py-8 text-gray-500">
                  Belum ada souvenir. Tambahkan item pertama untuk memulai daftar.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 