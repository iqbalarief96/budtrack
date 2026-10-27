'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiCheck, FiX, FiShoppingBag } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useWeddingId } from '../useWeddingId';

// Define GiftStatus type
type GiftStatus = 'not-started' | 'pending' | 'completed';

// Interface for gift items
interface Gift {
  id: string;
  weddingId: string;
  name: string;
  quantity: number;
  estimatedCost: number;
  actualCost: number;
  status: GiftStatus;
  responsible: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Demo data for fallback
const demoGifts: Gift[] = [
  {
    id: '1',
    weddingId: '',
    name: 'Cincin Pernikahan',
    quantity: 2,
    estimatedCost: 15000000,
    actualCost: 12500000,
    status: 'completed',
    responsible: 'Pengantin Pria',
    notes: 'Emas putih dengan berlian'
  },
  {
    id: '2',
    weddingId: '',
    name: 'Seperangkat Alat Sholat',
    quantity: 1,
    estimatedCost: 1000000,
    actualCost: 1250000,
    status: 'completed',
    responsible: 'Keluarga Pria',
    notes: 'Warna pastel'
  },
  {
    id: '3',
    weddingId: '',
    name: 'Perhiasan Set',
    quantity: 1,
    estimatedCost: 8000000,
    actualCost: 0,
    status: 'pending',
    responsible: 'Keluarga Pria',
    notes: 'Kalung, gelang, dan anting'
  }
];

export default function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editGiftId, setEditGiftId] = useState<string | null>(null);
  const [newGift, setNewGift] = useState<Omit<Gift, 'id' | 'weddingId' | 'createdAt' | 'updatedAt'>>({
    name: '',
    quantity: 1,
    estimatedCost: 0,
    actualCost: 0,
    status: 'not-started',
    responsible: null,
    notes: null
  });
  
  const { weddingId, loading: weddingLoading, hasWedding } = useWeddingId();
  
  // Fetch gifts data from API
  useEffect(() => {
    if (!weddingId) return;
    const fetchGifts = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/wedding/${weddingId}/gifts`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch gifts (${response.status}) - ${errorData.details || 'Unknown API error'}`);
        }
        
        const data = await response.json();
        if (data && Array.isArray(data)) {
          console.log(`Fetched ${data.length} gifts from API.`);
          setGifts(data);
          
          // If no data is returned, use demo data
          if (data.length === 0) {
            console.log("No gifts found in database, using demo data");
            setGifts(demoGifts);
          }
        } else {
          // If response is not an array, fallback to demo data
          console.log("Invalid API response format, using demo data");
          setGifts(demoGifts);
        }
      } catch (error) {
        console.error('Error fetching gifts:', error);
        toast.error('Gagal memuat data seserahan');
        // Fallback to demo data
        setGifts(demoGifts);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGifts();
  }, [weddingId]);
  
  // Calculate summary stats
  const totalItems = gifts.reduce((sum, gift) => sum + gift.quantity, 0);
  const completedItems = gifts.filter(gift => gift.status === 'completed').reduce((sum, gift) => sum + gift.quantity, 0);
  const totalEstimatedCost = gifts.reduce((sum, gift) => sum + gift.estimatedCost, 0);
  const totalActualCost = gifts.reduce((sum, gift) => sum + (gift.actualCost || 0), 0);
  
  const handleSaveGift = async () => {
    if (!weddingId) {
      toast.error('Wedding belum tersedia.');
      return;
    }
    if (newGift.name) {
      try {
        setIsLoading(true);
        
        const endpoint = editGiftId 
          ? `/api/wedding/${weddingId}/gifts/${editGiftId}`
          : `/api/wedding/${weddingId}/gifts`;
        
        const method = editGiftId ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newGift, weddingId })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to ${editGiftId ? 'update' : 'create'} gift (${response.status}) - ${errorData.details || 'Unknown error'}`);
        }
        
        const savedGift = await response.json();
        
        if (editGiftId) {
          // Update existing gift in state
          setGifts(prevGifts => 
            prevGifts.map(gift => 
              gift.id === editGiftId ? savedGift : gift
            )
          );
          toast.success('Seserahan berhasil diperbarui!');
        } else {
          // Add new gift to state
          setGifts(prev => [savedGift, ...prev]);
          toast.success('Seserahan berhasil ditambahkan!');
        }
        
        // Reset form
        setNewGift({
          name: '',
          quantity: 1,
          estimatedCost: 0,
          actualCost: 0,
          status: 'not-started',
          responsible: null,
          notes: null
        });
        setEditGiftId(null);
        setShowAddForm(false);
      } catch (error) {
        console.error('Error saving gift:', error);
        toast.error('Gagal menyimpan data seserahan');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Nama seserahan wajib diisi');
    }
  };
  
  const handleEditGift = (id: string) => {
    const giftToEdit = gifts.find(gift => gift.id === id);
    if (giftToEdit) {
      setNewGift({
        name: giftToEdit.name,
        quantity: giftToEdit.quantity,
        estimatedCost: giftToEdit.estimatedCost,
        actualCost: giftToEdit.actualCost,
        status: giftToEdit.status,
        responsible: giftToEdit.responsible,
        notes: giftToEdit.notes
      });
      setEditGiftId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteGift = async (id: string) => {
    if (!weddingId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus seserahan ini?')) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/wedding/${weddingId}/gifts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete gift (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      
      setGifts(gifts.filter(gift => gift.id !== id));
      toast.success('Seserahan berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting gift:', error);
      toast.error('Gagal menghapus seserahan');
    } finally {
      setIsLoading(false);
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
  
  const getStatusBadgeClass = (status: GiftStatus) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: GiftStatus) => {
    switch (status) {
      case 'not-started':
        return 'Belum Dimulai';
      case 'pending':
        return 'Dalam Proses';
      case 'completed':
        return 'Selesai';
      default:
        return status;
    }
  };
  
  if (hasWedding === false) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p className="mb-4">Belum ada wedding planning.</p>
          <Link href="/wedding-planner" className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">
            Buat wedding planning dulu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Daftar Seserahan</h1>
      </div>
      
      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Ringkasan Seserahan</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiShoppingBag className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Total Item</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiCheck className="w-5 h-5 text-green-500 mr-2" />
              <h3 className="font-medium">Selesai</h3>
            </div>
            <p className="text-2xl font-bold text-green-700">{completedItems}</p>
            <p className="text-xs text-gray-500">{Math.round((completedItems / totalItems) * 100)}% dari total</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiShoppingBag className="w-5 h-5 text-purple-500 mr-2" />
              <h3 className="font-medium">Estimasi Biaya</h3>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalEstimatedCost)}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FiShoppingBag className="w-5 h-5 text-orange-500 mr-2" />
              <h3 className="font-medium">Biaya Aktual</h3>
            </div>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalActualCost)}</p>
            <p className="text-xs text-gray-500">
              {totalEstimatedCost > 0 
                ? `${Math.round((totalActualCost / totalEstimatedCost) * 100)}% dari estimasi` 
                : '0% dari estimasi'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Gifts List Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Daftar Barang Seserahan</h2>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Tambah Barang
          </button>
        </div>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="font-medium mb-4">{editGiftId ? 'Edit Barang Seserahan' : 'Tambah Barang Seserahan'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang*</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGift.name}
                  onChange={(e) => setNewGift({...newGift, name: e.target.value})}
                  placeholder="e.g., Cincin Pernikahan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGift.quantity}
                  onChange={(e) => setNewGift({...newGift, quantity: Number(e.target.value)})}
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perkiraan Biaya (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGift.estimatedCost === 0 ? '' : newGift.estimatedCost}
                  onChange={(e) => setNewGift({...newGift, estimatedCost: Number(e.target.value)})}
                  placeholder="e.g., 1000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Aktual (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGift.actualCost === 0 ? '' : newGift.actualCost}
                  onChange={(e) => setNewGift({...newGift, actualCost: Number(e.target.value)})}
                  placeholder="e.g., 1200000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={newGift.status}
                  onChange={(e) => setNewGift({...newGift, status: e.target.value as GiftStatus})}
                >
                  <option value="not-started">Belum Dimulai</option>
                  <option value="pending">Dalam Proses</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penanggung Jawab</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGift.responsible || ''}
                  onChange={(e) => setNewGift({...newGift, responsible: e.target.value || null})}
                  placeholder="e.g., Keluarga Pria"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGift.notes || ''}
                onChange={(e) => setNewGift({...newGift, notes: e.target.value || null})}
                rows={2}
                placeholder="Detail atau spesifikasi barang..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditGiftId(null);
                  setNewGift({
                    name: '',
                    quantity: 1,
                    estimatedCost: 0,
                    actualCost: 0,
                    status: 'not-started',
                    responsible: null,
                    notes: null
                  });
                }}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveGift}
                className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
              >
                {editGiftId ? 'Update Barang' : 'Simpan Barang'}
              </button>
            </div>
          </div>
        )}
        
        {/* Gifts List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barang
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biaya
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gifts.map((gift) => (
                <tr key={gift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">{gift.name}</div>
                      <div className="text-sm text-gray-500">Penanggung jawab: {gift.responsible || 'Tidak diketahui'}</div>
                      {gift.notes && <div className="text-xs text-gray-500 mt-1">{gift.notes}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {gift.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(gift.actualCost || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Estimasi: {formatCurrency(gift.estimatedCost)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(gift.status)}`}>
                      {getStatusLabel(gift.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => handleEditGift(gift.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteGift(gift.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {gifts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Belum ada barang seserahan. Tambahkan item pertama untuk memulai daftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 