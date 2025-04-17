'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiPlus, FiTrash2, FiEdit2, FiPhone, FiMail, FiLink, FiX, FiImage, FiDollarSign, FiStar, FiInfo, FiUsers } from 'react-icons/fi';
import Link from 'next/link';
import { DEMO_WEDDING_ID } from '../constants';

// Define vendor category type
type VendorCategory = 'venue' | 'catering' | 'photography' | 'videography' | 'decor' | 'makeup' | 'attire' | 'music' | 'cake' | 'invitation' | 'transportation' | 'lighting' | 'florist' | 'other';

// Define vendor interface
interface Vendor {
  id: string;
  weddingId: string;
  name: string;
  category: string;
  description?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  priceRange?: string;
  status: string;
  rating?: number;
  imageUrl?: string;
  instagramHandle?: string;
  notes?: string;
  features?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Demo data
const demoVendors: Vendor[] = [
  {
    id: '1',
    weddingId: DEMO_WEDDING_ID,
    name: 'Budi Photography',
    category: 'photography',
    description: 'Professional wedding photographer with 10 years experience',
    contactPerson: 'Budi Santoso',
    phone: '081234567890',
    email: 'budi@photo.com',
    website: 'www.budiphoto.com',
    address: 'Jakarta Selatan',
    priceRange: '10000000-20000000',
    status: 'pending',
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1554941829-202a0b2403b8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    instagramHandle: '@budiphoto',
    notes: 'Specialized in candid photography',
    features: 'Pre-wedding,Wedding Day,Same Day Edit'
  }
];

// Initial empty vendor state
const emptyVendor: Omit<Vendor, 'id'> = {
  weddingId: DEMO_WEDDING_ID,
  name: '',
  category: '',
  description: '',
  contactPerson: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  priceRange: '',
  status: 'pending',
  rating: 0,
  imageUrl: '',
  instagramHandle: '',
  notes: '',
  features: ''
};

// Category options
const categoryOptions = [
  { value: 'venue', label: 'Venue/Gedung' },
  { value: 'catering', label: 'Katering' },
  { value: 'photography', label: 'Fotografi' },
  { value: 'videography', label: 'Videografi' },
  { value: 'decor', label: 'Dekorasi' },
  { value: 'makeup', label: 'Make Up Artist' },
  { value: 'attire', label: 'Busana Pengantin' },
  { value: 'music', label: 'Musik/Hiburan' },
  { value: 'cake', label: 'Kue Pernikahan' },
  { value: 'invitation', label: 'Undangan' },
  { value: 'transportation', label: 'Transportasi' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'florist', label: 'Bunga' },
  { value: 'other', label: 'Lainnya' }
];

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newVendor, setNewVendor] = useState<Omit<Vendor, 'id'>>({
    weddingId: DEMO_WEDDING_ID,
    name: '',
    category: '',
    description: '',
    contactPerson: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    priceRange: '',
    status: 'pending',
    rating: 0,
    imageUrl: '',
    instagramHandle: '',
    notes: '',
    features: ''
  });

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/wedding/${DEMO_WEDDING_ID}/vendors`);
        if (!response.ok) {
          throw new Error('Failed to fetch vendors');
        }
        const data = await response.json();
        setVendors(data.length > 0 ? data : demoVendors);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError('Failed to load vendors. Using demo data instead.');
        setVendors(demoVendors);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);
  
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const vendorData = {
        ...newVendor,
        weddingId: DEMO_WEDDING_ID,
        rating: newVendor.rating || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const url = editVendorId 
        ? `/api/wedding/${DEMO_WEDDING_ID}/vendors/${editVendorId}`
        : `/api/wedding/${DEMO_WEDDING_ID}/vendors`;
      
      const response = await fetch(url, {
        method: editVendorId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      });

      if (!response.ok) {
        throw new Error(editVendorId ? 'Failed to update vendor' : 'Failed to add vendor');
      }

      const savedVendor = await response.json();
      
      if (editVendorId) {
        setVendors(prevVendors => 
          prevVendors.map(vendor => 
            vendor.id === editVendorId ? savedVendor : vendor
          )
        );
        setEditVendorId(null);
      } else {
        setVendors(prevVendors => [...prevVendors, savedVendor]);
      }
      
      // Reset form
      setNewVendor(emptyVendor);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error saving vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditVendor = (id: string) => {
    const vendorToEdit = vendors.find(vendor => vendor.id === id);
    if (vendorToEdit) {
      const { id, ...rest } = vendorToEdit;
      setNewVendor(rest);
      setEditVendorId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Yakin mau hapus vendor ini?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/wedding/${DEMO_WEDDING_ID}/vendors/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete vendor');
      }

      setVendors(vendors.filter(vendor => vendor.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter by category and search term
  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
  
  const getCategoryLabel = (category: string): string => {
    const found = categoryOptions.find(opt => opt.value === category);
    return found ? found.label : category;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'meeting-scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'Sudah Dihubungi';
      case 'meeting-scheduled':
        return 'Meeting Terjadwal';
      case 'booked':
        return 'Sudah Booking';
      case 'rejected':
        return 'Ditolak';
      case 'completed':
        return 'Selesai';
      default:
        return status;
    }
  };
  
  // Function to render star rating
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FiStar key={i} className="fill-current text-yellow-500 h-4 w-4" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FiStar key={i} className="fill-current text-yellow-500 h-4 w-4 opacity-50" />);
      } else {
        stars.push(<FiStar key={i} className="text-gray-300 h-4 w-4" />);
      }
    }
    
    return (
      <div className="flex">
        {stars}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Vendor</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium">Daftar Vendor</h2>
            <p className="text-sm text-gray-500">Kelola vendor untuk pernikahan Anda</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Tambah Vendor
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-md"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="all">Semua Kategori</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{editVendorId ? 'Edit Vendor' : 'Tambah Vendor'}</h3>
              <button onClick={() => {
                setShowAddForm(false);
                setEditVendorId(null);
                setNewVendor(emptyVendor);
              }} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Vendor*</label>
                <input 
                  type="text" 
                  value={newVendor.name || ''}
                  onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Elegant Moments Photography"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori*</label>
                <select 
                  value={newVendor.category}
                  onChange={(e) => setNewVendor({...newVendor, category: e.target.value as VendorCategory})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={newVendor.status}
                  onChange={(e) => setNewVendor({...newVendor, status: e.target.value as any})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="contacted">Sudah Dihubungi</option>
                  <option value="meeting-scheduled">Meeting Terjadwal</option>
                  <option value="booked">Sudah Booking</option>
                  <option value="rejected">Ditolak</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea 
                  value={newVendor.description || ''}
                  onChange={(e) => setNewVendor({...newVendor, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Deskripsi singkat tentang vendor..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kontak</label>
                <input 
                  type="text" 
                  value={newVendor.contactPerson || ''}
                  onChange={(e) => setNewVendor({...newVendor, contactPerson: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Riana Putri"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input 
                  type="text" 
                  value={newVendor.phone || ''}
                  onChange={(e) => setNewVendor({...newVendor, phone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 08123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={newVendor.email || ''}
                  onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., vendor@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input 
                  type="text" 
                  value={newVendor.website || ''}
                  onChange={(e) => setNewVendor({...newVendor, website: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., https://example.com"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <input 
                  type="text" 
                  value={newVendor.address || ''}
                  onChange={(e) => setNewVendor({...newVendor, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Jl. Kemang Raya No. 15, Jakarta Selatan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rentang Harga</label>
                <input 
                  type="text" 
                  value={newVendor.priceRange || ''}
                  onChange={(e) => setNewVendor({...newVendor, priceRange: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Rp 10.000.000 - Rp 15.000.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input 
                  type="text" 
                  value={newVendor.instagramHandle || ''}
                  onChange={(e) => setNewVendor({...newVendor, instagramHandle: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., @vendorname"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
                <input 
                  type="text" 
                  value={newVendor.imageUrl || ''}
                  onChange={(e) => setNewVendor({...newVendor, imageUrl: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                <input 
                  type="number" 
                  value={newVendor.rating}
                  min="1"
                  max="5"
                  step="0.1"
                  onChange={(e) => setNewVendor({...newVendor, rating: parseFloat(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 4.5"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea 
                  value={newVendor.notes || ''}
                  onChange={(e) => setNewVendor({...newVendor, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Catatan tambahan tentang vendor ini..."
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSaveVendor}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                disabled={!newVendor.name || !newVendor.category}
              >
                {editVendorId ? 'Update Vendor' : 'Simpan Vendor'}
              </button>
            </div>
          </div>
        )}
        
        {/* Vendors Grid */}
        {filteredVendors.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{vendor.name}</h3>
                      <span className="inline-block px-2 py-1 text-xs rounded-md bg-indigo-100 text-indigo-800 mb-1">
                        {getCategoryLabel(vendor.category)}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-md ${getStatusColor(vendor.status)}`}>
                      {getStatusLabel(vendor.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="md:col-span-2">
                      {vendor.imageUrl && (
                        <div className="h-40 overflow-hidden rounded-md mb-3">
                          <img 
                            src={vendor.imageUrl} 
                            alt={vendor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-2 md:col-span-2">
                      <p className="text-sm text-gray-600">{vendor.description}</p>
                    </div>
                    
                    {vendor.rating !== undefined && (
                      <div className="flex items-center">
                        <FiStar className="text-yellow-500 mr-1" />
                        <span className="text-sm">{vendor.rating.toFixed(1)}</span>
                      </div>
                    )}
                    
                    {vendor.priceRange && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Harga:</p>
                        <div className="flex items-center">
                          <FiDollarSign className="text-green-500 mr-1 h-4 w-4" />
                          <p className="text-sm">{vendor.priceRange}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {vendor.contactPerson && (
                        <div className="flex items-center">
                          <FiUsers className="text-indigo-500 mr-2 h-4 w-4" />
                          <span className="text-sm">{vendor.contactPerson}</span>
                        </div>
                      )}
                      
                      {vendor.phone && (
                        <div className="flex items-center">
                          <FiPhone className="text-blue-500 mr-2 h-4 w-4" />
                          <a href={`tel:${vendor.phone}`} className="text-sm text-blue-600 hover:underline">
                            {vendor.phone}
                          </a>
                        </div>
                      )}
                      
                      {vendor.email && (
                        <div className="flex items-center">
                          <FiMail className="text-red-500 mr-2 h-4 w-4" />
                          <a href={`mailto:${vendor.email}`} className="text-sm text-blue-600 hover:underline">
                            {vendor.email}
                          </a>
                        </div>
                      )}
                      
                      {vendor.website && (
                        <div className="flex items-center">
                          <FiLink className="text-purple-500 mr-2 h-4 w-4" />
                          <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            Website
                          </a>
                        </div>
                      )}
                      
                      {vendor.instagramHandle && (
                        <div className="flex items-center">
                          <svg className="h-4 w-4 mr-2 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                          <a href={`https://instagram.com/${vendor.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            {vendor.instagramHandle}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {vendor.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                      <p className="text-xs italic text-gray-700">{vendor.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <button 
                      onClick={() => handleEditVendor(vendor.id)}
                      className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                      title="Edit"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                      title="Hapus"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {vendors.length === 0 
              ? `Belum ada vendor tersimpan. Klik "Tambah Vendor" untuk menambahkan.`
              : `Tidak ada vendor yang cocok dengan filter atau pencarian yang dipilih.`
            }
          </div>
        )}
      </div>
    </div>
  );
} 