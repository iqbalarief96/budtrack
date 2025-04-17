'use client';

import React, { useState, useEffect } from 'react';
import { FiGift, FiPlus, FiEdit2, FiTrash2, FiDollarSign, FiBox, FiTag, FiUser, FiCalendar, FiTruck, FiInfo, FiX, FiChevronLeft, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DEMO_WEDDING_ID } from '../constants';

// Interface aligned with Prisma Souvenir Schema
interface Souvenir {
  id: string;
  weddingId: string;
  name: string;
  type: string | null;
  quantity: number;
  pricePerUnit: number;
  totalBudget: number;
  vendor: string | null;
  description: string | null;
  imageUrl: string | null;
  status: 'PLANNING' | 'ORDERED' | 'RECEIVED'; // Enum based on schema
  orderDate: Date | null;
  deliveryDate: Date | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to format date
const formatDate = (date: Date | null | string): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return 'Invalid Date'; }
};

// Helper function to format currency
const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

// Helper for Status
const getStatusProps = (status: Souvenir['status']) => {
  switch (status) {
    case 'ORDERED':
      return { label: 'Dipesan', color: 'bg-blue-100 text-blue-800' };
    case 'RECEIVED':
      return { label: 'Diterima', color: 'bg-green-100 text-green-800' };
    case 'PLANNING':
    default:
      return { label: 'Perencanaan', color: 'bg-gray-100 text-gray-800' };
  }
};

// Demo Data
const demoSouvenirs: Souvenir[] = [
  {
    id: 'demo-s1',
    weddingId: DEMO_WEDDING_ID,
    name: 'Gantungan Kunci Kayu (Demo)',
    type: 'Kerajinan Tangan',
    quantity: 200,
    pricePerUnit: 5000,
    totalBudget: 1000000,
    vendor: 'Pengrajin Lokal Jaya',
    description: 'Gantungan kunci custom dengan ukiran inisial nama',
    imageUrl: 'https://via.placeholder.com/150/EBD4A0/808080?text=Souvenir1', // Placeholder
    status: 'ORDERED',
    orderDate: new Date('2024-11-01'),
    deliveryDate: new Date('2024-12-01'),
    notes: 'Pastikan ukiran rapi',
  },
  {
    id: 'demo-s2',
    weddingId: DEMO_WEDDING_ID,
    name: 'Kipas Batik Mini (Demo)',
    type: 'Aksesoris',
    quantity: 200,
    pricePerUnit: 7500,
    totalBudget: 1500000,
    vendor: 'Batik Indah Collection',
    description: 'Kipas lipat dengan motif batik parang',
    imageUrl: 'https://via.placeholder.com/150/A0D8EB/808080?text=Souvenir2', // Placeholder
    status: 'PLANNING',
    orderDate: null,
    deliveryDate: null,
    notes: 'Cari diskon untuk pembelian >150 pcs',
  },
];

// Initial empty state
const emptySouvenir: Omit<Souvenir, 'id' | 'weddingId' | 'createdAt' | 'updatedAt'> = {
  name: '',
  type: null,
  quantity: 0,
  pricePerUnit: 0,
  totalBudget: 0,
  vendor: null,
  description: null,
  imageUrl: null,
  status: 'PLANNING',
  orderDate: null,
  deliveryDate: null,
  notes: null,
};

export default function SouvenirPage() {
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingSouvenirId, setEditingSouvenirId] = useState<string | null>(null);
  const [currentSouvenir, setCurrentSouvenir] = useState(emptySouvenir);

  const weddingId = DEMO_WEDDING_ID;

  // Fetch Souvenirs Function
  const fetchSouvenirs = async () => {
    setIsLoading(true);
    setError(null);
    // Clear existing non-demo data before fetching
    setSouvenirs([]); 
    try {
      const response = await fetch(`/api/wedding/${weddingId}/souvenir`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch souvenirs (${response.status}) - ${errorData.details || 'Unknown API error'}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data)) {
        const processedData = data.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
          totalBudget: Number(item.totalBudget),
          orderDate: item.orderDate ? new Date(item.orderDate) : null,
          deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }));
        console.log(`Fetched ${processedData.length} souvenirs from API.`);
        setSouvenirs(processedData); // Directly set the fetched data
         // Demo data logic moved to error block
      } else {
         // If data is not an array, treat as error or empty state
         console.warn("Invalid data format from API, expected an array.");
         setSouvenirs([]); // Set to empty array
      }
    } catch (err) {
      console.error("Error fetching souvenirs:", err);
      setError(`Failed to load souvenirs. ${err instanceof Error ? err.message : 'Unknown error'}. Showing demo data as fallback.`);
      // Show demo data ONLY on error
      setSouvenirs(demoSouvenirs.map(s => ({...s, orderDate: s.orderDate ? new Date(s.orderDate) : null, deliveryDate: s.deliveryDate ? new Date(s.deliveryDate): null })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSouvenirs();
  }, [weddingId]);

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentSouvenir(prev => {
      if (type === 'number') {
        // Handle potential empty string for number inputs
        const numValue = value === '' ? null : Number(value);
         // Auto-calculate total budget if quantity or price changes
         let newTotalBudget = prev.totalBudget;
         if (name === 'quantity' && numValue !== null && prev.pricePerUnit !== null) {
            newTotalBudget = numValue * prev.pricePerUnit;
         } else if (name === 'pricePerUnit' && numValue !== null && prev.quantity !== null) {
            newTotalBudget = prev.quantity * numValue;
         }
        return { ...prev, [name]: numValue, totalBudget: newTotalBudget };
      } else if (name === 'orderDate' || name === 'deliveryDate') {
        return { ...prev, [name]: value ? new Date(value) : null };
      }
      return { ...prev, [name]: value === '' ? null : value };
    });
  };

  const resetForm = () => {
    setCurrentSouvenir(emptySouvenir);
    setEditingSouvenirId(null);
    setIsFormVisible(false);
    setError(null);
  };

  // --- CRUD Operations ---
  const handleSaveSouvenir = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!currentSouvenir.name) {
        setError('Nama souvenir wajib diisi.');
        setIsSaving(false);
        return;
    }

    // Prepare payload - Ensure weddingId is included when creating
    const payload = {
      ...currentSouvenir,
      weddingId: weddingId, // Explicitly add weddingId here
      orderDate: currentSouvenir.orderDate instanceof Date ? currentSouvenir.orderDate.toISOString() : null,
      deliveryDate: currentSouvenir.deliveryDate instanceof Date ? currentSouvenir.deliveryDate.toISOString() : null,
      // Ensure numbers are sent correctly
      quantity: Number(currentSouvenir.quantity) || 0,
      pricePerUnit: Number(currentSouvenir.pricePerUnit) || 0,
      totalBudget: Number(currentSouvenir.totalBudget) || 0,
    };

    // Remove id from payload if it's a new item (shouldn't be sent)
    if (!editingSouvenirId) {
      delete (payload as any).id; // Prisma might complain if id is present on create
    }

    try {
      const url = editingSouvenirId
        ? `/api/wedding/${weddingId}/souvenir/${editingSouvenirId}`
        : `/api/wedding/${weddingId}/souvenir`;
      const method = editingSouvenirId ? 'PUT' : 'POST';

      console.log(`Saving souvenir (${method}) to ${url} with payload:`, JSON.stringify(payload)); // Debug log

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error("API Error Data:", errorData); // Log error details
        throw new Error(`Failed to ${editingSouvenirId ? 'update' : 'create'} souvenir (${response.status}) - ${errorData.details || errorData.message || 'Unknown error'}`);
      }

      const savedSouvenir = await response.json();

      // Process saved data
      const processedSavedItem = {
        ...savedSouvenir,
        quantity: Number(savedSouvenir.quantity),
        pricePerUnit: Number(savedSouvenir.pricePerUnit),
        totalBudget: Number(savedSouvenir.totalBudget),
        orderDate: savedSouvenir.orderDate ? new Date(savedSouvenir.orderDate) : null,
        deliveryDate: savedSouvenir.deliveryDate ? new Date(savedSouvenir.deliveryDate) : null,
        createdAt: savedSouvenir.createdAt ? new Date(savedSouvenir.createdAt) : undefined,
        updatedAt: savedSouvenir.updatedAt ? new Date(savedSouvenir.updatedAt) : undefined,
      };

      if (editingSouvenirId) {
        setSouvenirs(souvenirs.map(s => s.id === editingSouvenirId ? processedSavedItem : s));
        toast.success('Souvenir berhasil diperbarui!');
      } else {
        setSouvenirs([...souvenirs, processedSavedItem]);
        toast.success('Souvenir berhasil ditambahkan!');
      }
      resetForm();
    } catch (err) {
      console.error(`Error saving souvenir:`, err);
      setError(`Gagal menyimpan souvenir. ${err instanceof Error ? err.message : 'Unknown error'}.`);
      toast.error('Gagal menyimpan souvenir.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSouvenir = (souvenirId: string) => {
    const itemToEdit = souvenirs.find(s => s.id === souvenirId);
    if (itemToEdit) {
      setCurrentSouvenir({
        name: itemToEdit.name,
        type: itemToEdit.type,
        quantity: itemToEdit.quantity,
        pricePerUnit: itemToEdit.pricePerUnit,
        totalBudget: itemToEdit.totalBudget,
        vendor: itemToEdit.vendor,
        description: itemToEdit.description,
        imageUrl: itemToEdit.imageUrl,
        status: itemToEdit.status,
        orderDate: itemToEdit.orderDate,
        deliveryDate: itemToEdit.deliveryDate,
        notes: itemToEdit.notes,
      });
      setEditingSouvenirId(souvenirId);
      setIsFormVisible(true);
      setError(null);
    }
  };

  const handleDeleteSouvenir = async (souvenirId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus souvenir ini?')) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wedding/${weddingId}/souvenir/${souvenirId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete souvenir (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      setSouvenirs(souvenirs.filter(s => s.id !== souvenirId));
      toast.success('Souvenir berhasil dihapus!');
    } catch (err) {
      console.error('Error deleting souvenir:', err);
      setError(`Gagal menghapus souvenir. ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Gagal menghapus souvenir.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculations for Summary (Optional) ---
  const totalSouvenirBudget = souvenirs.reduce((sum, s) => sum + s.totalBudget, 0);
  const totalQuantity = souvenirs.reduce((sum, s) => sum + s.quantity, 0);

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4 text-gray-600 hover:text-gray-800">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Souvenir</h1>
      </div>

       {/* Optional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-pink-50 p-4 rounded-lg shadow flex items-center">
          <FiGift className="w-8 h-8 text-pink-500 mr-3" />
          <div>
            <p className="text-sm text-pink-700">Total Jenis Souvenir</p>
            <p className="text-2xl font-bold text-pink-900">{isLoading ? '-' : souvenirs.length}</p>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow flex items-center">
          <FiBox className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <p className="text-sm text-blue-700">Total Kuantitas</p>
            <p className="text-2xl font-bold text-blue-900">{isLoading ? '-' : totalQuantity.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow flex items-center">
          <FiDollarSign className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <p className="text-sm text-green-700">Total Anggaran Souvenir</p>
            <p className="text-2xl font-bold text-green-900">{isLoading ? '-' : formatCurrency(totalSouvenirBudget)}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */} 
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Daftar Souvenir</h2>
          <button
            onClick={() => {
              resetForm();
              setIsFormVisible(true);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center shadow-sm disabled:opacity-50"
             disabled={isLoading || isSaving}
          >
            <FiPlus className="mr-1" /> Tambah Souvenir
          </button>
        </div>

         {/* Add/Edit Form Modal */} 
         {isFormVisible && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
             <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-semibold">{editingSouvenirId ? 'Edit Souvenir' : 'Tambah Souvenir Baru'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><FiX size={24} /></button>
               </div>
               {/* Form Error Display */}
                {error && !isSaving && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                  </div>
                )}
               <form onSubmit={handleSaveSouvenir} className="space-y-4">
                  {/* Form Fields */} 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                     <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Souvenir <span className="text-red-500">*</span></label>
                     <input type="text" id="name" name="name" value={currentSouvenir.name} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                    <div>
                     <label htmlFor="type" className="block text-sm font-medium text-gray-700">Jenis/Tipe</label>
                     <input type="text" id="type" name="type" value={currentSouvenir.type ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                    <div>
                     <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Jumlah</label>
                     <input type="number" id="quantity" name="quantity" value={currentSouvenir.quantity} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                   <div>
                     <label htmlFor="pricePerUnit" className="block text-sm font-medium text-gray-700">Harga Satuan (Rp)</label>
                     <input type="number" id="pricePerUnit" name="pricePerUnit" value={currentSouvenir.pricePerUnit} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                   <div>
                     <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700">Total Anggaran (Rp)</label>
                     <input type="number" id="totalBudget" name="totalBudget" value={currentSouvenir.totalBudget} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50" readOnly />
                     <p className="text-xs text-gray-500 mt-1">Otomatis dihitung dari Jumlah x Harga Satuan</p>
                   </div>
                   <div>
                     <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Vendor</label>
                     <input type="text" id="vendor" name="vendor" value={currentSouvenir.vendor ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                   <div>
                     <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                     <select id="status" name="status" value={currentSouvenir.status} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                       <option value="PLANNING">Perencanaan</option>
                       <option value="ORDERED">Dipesan</option>
                       <option value="RECEIVED">Diterima</option>
                     </select>
                   </div>
                    <div>
                     <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700">Tanggal Pesan</label>
                     <input type="date" id="orderDate" name="orderDate" value={currentSouvenir.orderDate ? currentSouvenir.orderDate.toISOString().split('T')[0] : ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                    <div>
                     <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">Tanggal Diterima</label>
                     <input type="date" id="deliveryDate" name="deliveryDate" value={currentSouvenir.deliveryDate ? currentSouvenir.deliveryDate.toISOString().split('T')[0] : ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                   </div>
                   <div className="md:col-span-2">
                     <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL Gambar</label>
                     <input type="url" id="imageUrl" name="imageUrl" value={currentSouvenir.imageUrl ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="https://..." />
                   </div>
                   <div className="md:col-span-2">
                     <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi</label>
                     <textarea id="description" name="description" rows={2} value={currentSouvenir.description ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                   </div>
                   <div className="md:col-span-2">
                     <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan</label>
                     <textarea id="notes" name="notes" rows={2} value={currentSouvenir.notes ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                   </div>
                 </div>
                 {/* Form Actions */}
                 <div className="flex justify-end pt-4">
                   <button type="button" onClick={resetForm} className="mr-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Batal</button>
                   <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center">
                     {isSaving ? <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (editingSouvenirId ? <FiCheck/> : <FiPlus/>)}
                     {isSaving ? 'Menyimpan...' : (editingSouvenirId ? 'Update Souvenir' : 'Simpan Souvenir')}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}

         {/* Loading State */}
         {isLoading && (
           <div className="text-center py-10 text-gray-500">Memuat data souvenir...</div>
         )}

         {/* Error State */}
         {error && !isLoading && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
             <strong className="font-bold">Oops!</strong>
             <span className="block sm:inline"> {error}</span>
             <button onClick={fetchSouvenirs} className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Coba Lagi</button>
          </div>
         )}

         {/* Souvenir List/Grid */}
         {!isLoading && souvenirs.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {souvenirs.map(souvenir => {
               const statusProps = getStatusProps(souvenir.status);
               return (
                 <div key={souvenir.id} className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                   <div>
                     {/* Image */}
                      <div className="w-full h-32 bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                       <img 
                         src={souvenir.imageUrl || 'https://via.placeholder.com/150/E0E0E0/808080?text=Souvenir'}
                         alt={souvenir.name}
                         className="max-h-full max-w-full object-contain rounded-md"
                         onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150/E0E0E0/808080?text=Image+Error'; }} 
                       />
                     </div>
                      {/* Details */}
                     <div className="flex justify-between items-start mb-1">
                       <h3 className="font-semibold text-gray-800">{souvenir.name}</h3>
                       <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusProps.color}`}>{statusProps.label}</span>
                     </div>
                      {souvenir.type && <p className="text-sm text-gray-500 mb-2"><FiTag className="inline mr-1"/> {souvenir.type}</p>}
                      {souvenir.description && <p className="text-xs text-gray-600 mb-2">{souvenir.description}</p>}
                     <div className="text-xs text-gray-600 space-y-1 mb-3">
                        <p><FiBox className="inline mr-1"/> Jumlah: {souvenir.quantity.toLocaleString('id-ID')}</p>
                        <p><FiDollarSign className="inline mr-1"/> Harga/pcs: {formatCurrency(souvenir.pricePerUnit)}</p>
                        <p><FiDollarSign className="inline mr-1"/> Anggaran Total: {formatCurrency(souvenir.totalBudget)}</p>
                        {souvenir.vendor && <p><FiUser className="inline mr-1"/> Vendor: {souvenir.vendor}</p>}
                        {souvenir.orderDate && <p><FiCalendar className="inline mr-1"/> Dipesan: {formatDate(souvenir.orderDate)}</p>}
                        {souvenir.deliveryDate && <p><FiTruck className="inline mr-1"/> Diterima: {formatDate(souvenir.deliveryDate)}</p>}
                     </div>
                      {souvenir.notes && <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded border border-dashed">Catatan: {souvenir.notes}</p>}
                   </div>
                    {/* Actions */}
                   <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                     <button onClick={() => handleEditSouvenir(souvenir.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" title="Edit Souvenir">
                       <FiEdit2 size={16}/>
                     </button>
                     <button onClick={() => handleDeleteSouvenir(souvenir.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Hapus Souvenir">
                       <FiTrash2 size={16}/>
                     </button>
                   </div>
                 </div>
               );
             })}
           </div>
         )}

         {/* No Souvenirs Message */} 
         {!isLoading && souvenirs.length === 0 && !error && (
           <div className="text-center py-10 text-gray-500">
             Belum ada souvenir yang ditambahkan.
           </div>
         )}
      </div>
    </div>
  );
} 