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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || (editVendorId ? 'Failed to update vendor' : 'Failed to add vendor'));
      }
      
      if (editVendorId) {
        setVendors(prevVendors => 
          prevVendors.map(vendor => 
            vendor.id === editVendorId ? data : vendor
          )
        );
        setEditVendorId(null);
      } else {
        setVendors(prevVendors => [...prevVendors, data]);
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
      setNewVendor({
        weddingId: vendorToEdit.weddingId,
        name: vendorToEdit.name,
        category: vendorToEdit.category,
        description: vendorToEdit.description || '',
        contactPerson: vendorToEdit.contactPerson || '',
        phone: vendorToEdit.phone || '',
        email: vendorToEdit.email || '',
        website: vendorToEdit.website || '',
        address: vendorToEdit.address || '',
        priceRange: vendorToEdit.priceRange || '',
        status: vendorToEdit.status,
        rating: vendorToEdit.rating || 0,
        imageUrl: vendorToEdit.imageUrl || '',
        instagramHandle: vendorToEdit.instagramHandle || '',
        notes: vendorToEdit.notes || '',
        features: vendorToEdit.features || ''
      });
      setEditVendorId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/wedding/${DEMO_WEDDING_ID}/vendors/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete vendor');
      }
      
      setVendors(prevVendors => prevVendors.filter(vendor => vendor.id !== id));
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get category label
  const getCategoryLabel = (category: string): string => {
    const found = categoryOptions.find(opt => opt.value === category);
    return found ? found.label : category;
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'negotiating':
        return 'bg-purple-100 text-purple-800';
      case 'booked':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'Dikonfirmasi';
      case 'pending':
        return 'Menunggu';
      case 'rejected':
        return 'Ditolak';
      case 'contacted':
        return 'Dihubungi';
      case 'negotiating':
        return 'Negosiasi';
      case 'booked':
        return 'Sudah Booking';
      default:
        return status;
    }
  };
  
  // Render 5-star rating
  const renderRating = (rating: number) => {
    rating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FiStar key={i} className="text-yellow-500 fill-current" />);
      } else if (i - 0.5 === rating) {
        stars.push(<FiStar key={i} className="text-yellow-500 fill-current" style={{ clipPath: 'inset(0 50% 0 0)' }} />);
      } else {
        stars.push(<FiStar key={i} className="text-gray-300" />);
      }
    }
    
    return <div className="flex">{stars}</div>;
  };
  
  // Filter vendors based on category and search term
  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory;
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.description && vendor.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'rating') {
      setNewVendor({
        ...newVendor,
        [name]: parseFloat(value)
      });
    } else {
      setNewVendor({
        ...newVendor,
        [name]: value
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4 text-gray-600 hover:text-gray-800">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Vendor</h1>
      </div>
      
      {/* Filters and Add button */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Daftar Vendor</h2>
            <p className="text-sm text-gray-500">Kelola vendor untuk pernikahan Anda</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Search Input */}
            <div className="w-full md:w-auto mb-2 md:mb-0">
              <input
                type="text"
                placeholder="Cari vendor..."
                className="px-3 py-2 border border-gray-300 rounded-md w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* Add Button */}
            <button
              onClick={() => {
                setNewVendor(emptyVendor);
                setEditVendorId(null);
                setShowAddForm(true);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
            >
              <FiPlus className="mr-1" /> Tambah Vendor
            </button>
          </div>
        </div>
        
        {/* Vendor List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Memuat data vendor...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Belum ada vendor yang ditambahkan.</p>
            <button
              onClick={() => {
                setNewVendor(emptyVendor);
                setEditVendorId(null);
                setShowAddForm(true);
              }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              <FiPlus className="inline mr-1" /> Tambah Vendor Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Vendor Image */}
                <div className="relative h-40 bg-gray-200">
                  {vendor.imageUrl ? (
                    <img
                      src={vendor.imageUrl}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20fill%3D%22%23CCCCCC%22%20width%3D%22200%22%20height%3D%22200%22%2F%3E%3Ctext%20fill%3D%22%23808080%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20dy%3D%220.3em%22%20text-anchor%3D%22middle%22%20x%3D%22100%22%20y%3D%22100%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <FiImage className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.status)}`}>
                    {getStatusLabel(vendor.status)}
                  </span>
                </div>
                
                {/* Vendor Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{vendor.name}</h3>
                      <p className="text-sm text-blue-600">{getCategoryLabel(vendor.category)}</p>
                    </div>
                    <div className="flex space-x-1">
                      {renderRating(vendor.rating || 0)}
                    </div>
                  </div>
                  
                  {vendor.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{vendor.description}</p>
                  )}
                  
                  <div className="mt-3 space-y-1 text-sm">
                    {vendor.contactPerson && (
                      <p className="text-gray-600 flex items-center">
                        <FiUsers className="mr-2 w-4 h-4" />
                        {vendor.contactPerson}
                      </p>
                    )}
                    {vendor.phone && (
                      <p className="text-gray-600 flex items-center">
                        <FiPhone className="mr-2 w-4 h-4" />
                        {vendor.phone}
                      </p>
                    )}
                    {vendor.priceRange && (
                      <p className="text-gray-600 flex items-center">
                        <FiDollarSign className="mr-2 w-4 h-4" />
                        {vendor.priceRange}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditVendor(vendor.id)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editVendorId ? 'Edit Vendor' : 'Tambah Vendor Baru'}</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveVendor} className="space-y-4">
              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Vendor <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newVendor.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori <span className="text-red-500">*</span></label>
                  <select
                    id="category"
                    name="category"
                    value={newVendor.category}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="" disabled>Pilih kategori</option>
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Description */}
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={newVendor.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  ></textarea>
                </div>
                
                {/* Contact Person */}
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    value={newVendor.contactPerson}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telepon</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={newVendor.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newVendor.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Website */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={newVendor.website}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Alamat</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={newVendor.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Price Range */}
                <div>
                  <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700">Range Harga</label>
                  <input
                    type="text"
                    id="priceRange"
                    name="priceRange"
                    value={newVendor.priceRange}
                    onChange={handleInputChange}
                    placeholder="10jt-15jt"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={newVendor.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="pending">Menunggu</option>
                    <option value="contacted">Dihubungi</option>
                    <option value="negotiating">Negosiasi</option>
                    <option value="confirmed">Dikonfirmasi</option>
                    <option value="booked">Sudah Booking</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
                
                {/* Rating */}
                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700">Rating (0-5)</label>
                  <input
                    type="number"
                    id="rating"
                    name="rating"
                    min="0"
                    max="5"
                    step="0.5"
                    value={newVendor.rating}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Image URL */}
                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL Gambar</label>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    value={newVendor.imageUrl}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Instagram Handle */}
                <div>
                  <label htmlFor="instagramHandle" className="block text-sm font-medium text-gray-700">Instagram</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      id="instagramHandle"
                      name="instagramHandle"
                      value={newVendor.instagramHandle?.replace('@', '')}
                      onChange={(e) => {
                        const value = e.target.value.startsWith('@') ? e.target.value : e.target.value;
                        setNewVendor({ ...newVendor, instagramHandle: value });
                      }}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Features */}
                <div className="md:col-span-2">
                  <label htmlFor="features" className="block text-sm font-medium text-gray-700">Fitur (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    id="features"
                    name="features"
                    value={newVendor.features}
                    onChange={handleInputChange}
                    placeholder="Contoh: Foto prewedding, Video cinematic, Album cetak"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                </div>
                
                {/* Notes */}
                <div className="md:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={newVendor.notes}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  ></textarea>
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="mr-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {editVendorId ? 'Update Vendor' : 'Simpan Vendor'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 