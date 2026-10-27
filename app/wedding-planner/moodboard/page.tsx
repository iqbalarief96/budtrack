'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiPlus, FiTrash2, FiEdit2, FiX, FiImage, FiSearch, FiFilter, FiExternalLink, FiCheck, FiLink, FiHeart } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useWeddingId } from "../useWeddingId";

// Define mood board item interface
interface Moodboard {
  id: string;
  weddingId: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  category?: string | null;
  isInspiration: boolean;
  isApproved: boolean;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string | null; // Now a comma-separated string
}

// Category options
const categoryOptions = [
  { value: 'decor', label: 'Dekorasi' },
  { value: 'flowers', label: 'Bunga' },
  { value: 'dress', label: 'Gaun Pengantin' },
  { value: 'suit', label: 'Jas Pengantin' },
  { value: 'cake', label: 'Kue Pernikahan' },
  { value: 'colors', label: 'Palette Warna' },
  { value: 'invitation', label: 'Undangan' },
  { value: 'venue', label: 'Venue' },
  { value: 'photoshoot', label: 'Foto Pre-Wedding' },
  { value: 'hairstyle', label: 'Gaya Rambut' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'other', label: 'Lainnya' }
];

// Filter tags shown in UI (dari screenshot)
const filterTags = [
  { id: 'alam', label: 'alam' },
  { id: 'bertingkat', label: 'bertingkat' },
  { id: 'buket', label: 'buket' },
  { id: 'bunga', label: 'bunga' },
  { id: 'cake', label: 'cake' },
  { id: 'dekorasi', label: 'dekorasi' },
  { id: 'dessert', label: 'dessert' },
  { id: 'dusty-rose', label: 'dusty rose' },
  { id: 'elegant', label: 'elegant' },
  { id: 'garden', label: 'garden' },
  { id: 'gold', label: 'gold' },
  { id: 'hijau', label: 'hijau' },
  { id: 'kue', label: 'kue' },
  { id: 'mawar', label: 'mawar' },
  { id: 'minimalis', label: 'minimalis' },
  { id: 'modern', label: 'modern' },
  { id: 'navy', label: 'navy' },
  { id: 'outdoor', label: 'outdoor' },
  { id: 'putih', label: 'putih' },
  { id: 'sage-green', label: 'sage green' },
  { id: 'tema', label: 'tema' },
  { id: 'undangan', label: 'undangan' },
  { id: 'venue', label: 'venue' },
  { id: 'warna', label: 'warna' }
];

// Tag mapping untuk memastikan filter berjalan dengan benar
const tagCategoryMapping: Record<string, string[]> = {
  'dekorasi': ['decor'],
  'bunga': ['flowers'],
  'cake': ['cake'],
  'kue': ['cake'],
  'buket': ['flowers'],
  'elegant': ['decor', 'dress', 'suit', 'venue'],
  'garden': ['venue', 'decor', 'flowers'],
  'outdoor': ['venue', 'photoshoot'],
  'modern': ['decor', 'dress', 'suit', 'invitation'],
  'minimalis': ['decor', 'invitation'],
  'rustic': ['decor', 'venue'],
  'tema': ['colors', 'decor'],
  'warna': ['colors'],
  'undangan': ['invitation'],
  'venue': ['venue'],
  'dusty rose': ['colors'],
  'hijau': ['colors'],
  'sage green': ['colors'],
  'navy': ['colors'],
  'gold': ['colors'],
  'putih': ['colors'],
  'mawar': ['flowers'],
  'alam': ['venue', 'photoshoot', 'decor'],
  'bertingkat': ['cake']
};

export default function MoodboardPage() {
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const { weddingId, loading: weddingLoading, hasWedding } = useWeddingId();
  
  const [newItem, setNewItem] = useState<Partial<Moodboard>>({
    title: '',
    description: '',
    imageUrl: '',
    category: 'decor',
    isInspiration: true,
    isApproved: false,
    source: '',
    tags: ''
  });
  
  // Get category label for display
  const getCategoryLabel = (category: string | null | undefined): string => {
    if (!category) return 'Lainnya';
    const found = categoryOptions.find(opt => opt.value === category);
    return found ? found.label : category;
  };
  
  // Fetch moodboards from API
  useEffect(() => {
    if (!weddingId) return;
    const fetchMoodboards = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from API instead of using mock data
        const response = await fetch(`/api/wedding/${weddingId}/moodboard`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch moodboards (${response.status}) - ${errorData.details || 'Unknown API error'}`);
        }
        
        const data = await response.json();
        if (data && Array.isArray(data)) {
          console.log(`Fetched ${data.length} moodboards from API.`);
          // Tidak perlu lagi menambahkan tags kosong karena sudah ada di database
          setMoodboards(data);
        } else {
          // Jika API mengembalikan format data yang tidak valid
          console.error("Invalid data format from API");
          setMoodboards([]);
          toast.error('Format data dari server tidak valid');
        }
      } catch (error) {
        console.error('Error fetching moodboards:', error);
        toast.error('Gagal memuat data moodboard');
        setMoodboards([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMoodboards();
  }, [weddingId]);
  
  const handleSaveItem = async () => {
    if (!weddingId) {
      toast.error('Wedding belum tersedia.');
      return;
    }
    if (newItem.title && newItem.imageUrl) {
      try {
        setIsLoading(true);
        
        const endpoint = editItemId 
          ? `/api/wedding/${weddingId}/moodboard/${editItemId}`
          : `/api/wedding/${weddingId}/moodboard`;
        
        const method = editItemId ? 'PUT' : 'POST';
        
        // Tidak perlu lagi menghapus tags, karena sudah disupport database
        const response = await fetch(endpoint, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newItem, weddingId })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to ${editItemId ? 'update' : 'create'} moodboard (${response.status}) - ${errorData.details || 'Unknown error'}`);
        }
        
        const savedItem = await response.json();
        
        if (editItemId) {
          setMoodboards(prevItems => 
            prevItems.map(item => 
              item.id === editItemId ? savedItem : item
            )
          );
          
          toast.success('Item berhasil diperbarui!');
        } else {
          setMoodboards(prev => [savedItem, ...prev]);
          toast.success('Item berhasil ditambahkan!');
        }
        
        // Reset form
        setNewItem({
          title: '',
          description: '',
          imageUrl: '',
          category: 'decor',
          isInspiration: true,
          isApproved: false,
          source: '',
          tags: ''
        });
        setEditItemId(null);
        setShowAddForm(false);
      } catch (error) {
        console.error('Error saving moodboard item:', error);
        toast.error('Gagal menyimpan item');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Judul dan URL gambar wajib diisi');
    }
  };
  
  const handleEditItem = (id: string) => {
    const itemToEdit = moodboards.find(item => item.id === id);
    if (itemToEdit) {
      setNewItem({
        title: itemToEdit.title,
        description: itemToEdit.description || '',
        imageUrl: itemToEdit.imageUrl,
        category: itemToEdit.category || 'decor',
        isInspiration: itemToEdit.isInspiration,
        isApproved: itemToEdit.isApproved,
        source: itemToEdit.source || '',
        tags: itemToEdit.tags || '' // Use empty string as fallback
      });
      setEditItemId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteItem = async (id: string) => {
    if (!weddingId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/wedding/${weddingId}/moodboard/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete moodboard (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      
      setMoodboards(moodboards.filter(item => item.id !== id));
      toast.success('Item berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting moodboard item:', error);
      toast.error('Gagal menghapus item');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApproveToggle = async (id: string) => {
    if (!weddingId) return;
    try {
      setIsLoading(true);
      
      const itemToUpdate = moodboards.find(item => item.id === id);
      if (!itemToUpdate) throw new Error('Item tidak ditemukan');
      
      const response = await fetch(`/api/wedding/${weddingId}/moodboard/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemToUpdate,
          isApproved: !itemToUpdate.isApproved
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update moodboard (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      
      const updatedItem = await response.json();
      
      setMoodboards(moodboards.map(item => 
        item.id === id ? updatedItem : item
      ));
      toast.success('Status item berhasil diubah!');
    } catch (error) {
      console.error('Error updating moodboard status:', error);
      toast.error('Gagal mengubah status item');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter items based on category, search term, and tag
  const filteredItems = moodboards.filter(item => {
    // Convert tags string to array for filtering
    const itemTags = item.tags ? item.tags.split(',') : [];
    
    // Filter by dropdown category
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    // Filter by search text
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by tag - enhanced matching with category mapping
    let matchesTag = !activeTag;
    
    if (activeTag) {
      // Check title and description
      if (item.title && item.title.toLowerCase().includes(activeTag.toLowerCase())) {
        matchesTag = true;
      } else if (item.description && item.description.toLowerCase().includes(activeTag.toLowerCase())) {
        matchesTag = true;
      } else if (item.category && getCategoryLabel(item.category).toLowerCase().includes(activeTag.toLowerCase())) {
        matchesTag = true;
      } else if (itemTags.some((tag: string) => tag.toLowerCase().includes(activeTag.toLowerCase()))) {
        // Check if tag matches any of the item's tags
        matchesTag = true;
      } else {
        // Check category mapping
        const relatedCategories = tagCategoryMapping[activeTag.toLowerCase()] || [];
        if (item.category && relatedCategories.includes(item.category)) {
          matchesTag = true;
        }
      }
    }
    
    return matchesCategory && matchesSearch && matchesTag;
  });
  
  // Log untuk debug
  useEffect(() => {
    if (activeTag) {
      console.log(`Filtering by tag: ${activeTag}, found ${filteredItems.length} results`);
      console.log(`Related categories for tag: ${tagCategoryMapping[activeTag.toLowerCase()] || 'none'}`);
    }
  }, [activeTag, filteredItems.length]);
  
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
        <h1 className="text-2xl font-bold">Mood Board</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium">Inspirasi & Tema</h2>
            <p className="text-sm text-gray-500">Kumpulkan inspirasi untuk tema pernikahan Anda</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Tambah Inspirasi
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari inspirasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-md"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <FiSearch className="w-5 h-5" />
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
        
        {/* Filter Tags */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Filter berdasarkan tema:</p>
          <div className="flex flex-wrap gap-2">
            {filterTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTag === tag.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Filter Status & Reset Button */}
        {(activeTag || selectedCategory !== 'all' || searchTerm) && (
          <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredItems.length}</span> hasil ditemukan
              {activeTag && <span className="ml-1">dengan tag <span className="font-medium text-pink-600">{activeTag}</span></span>}
              {selectedCategory !== 'all' && <span className="ml-1">dalam kategori <span className="font-medium text-pink-600">{getCategoryLabel(selectedCategory)}</span></span>}
              {searchTerm && <span className="ml-1">untuk pencarian <span className="font-medium text-pink-600">"{searchTerm}"</span></span>}
            </div>
            <button 
              onClick={() => {
                setActiveTag(null);
                setSelectedCategory('all');
                setSearchTerm('');
              }}
              className="text-sm text-pink-600 hover:text-pink-800 flex items-center"
            >
              <FiX className="w-4 h-4 mr-1" /> Reset Filter
            </button>
          </div>
        )}
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{editItemId ? 'Edit Inspirasi' : 'Tambah Inspirasi'}</h3>
              <button onClick={() => {
                setShowAddForm(false);
                setEditItemId(null);
                setNewItem({
                  title: '',
                  description: '',
                  imageUrl: '',
                  category: 'decor',
                  isInspiration: true,
                  isApproved: false,
                  source: '',
                  tags: ''
                });
              }} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul*</label>
                <input 
                  type="text" 
                  value={newItem.title || ''}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Dekorasi Rustic"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  value={newItem.category || 'decor'}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea 
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Deskripsi singkat tentang inspirasi ini..."
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar*</label>
                <input 
                  type="text" 
                  value={newItem.imageUrl || ''}
                  onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., https://example.com/image.jpg"
                />
                {newItem.imageUrl && (
                  <div className="mt-2 w-full max-h-48 overflow-hidden rounded-md">
                    <img 
                      src={newItem.imageUrl} 
                      alt="Preview" 
                      className="w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://via.placeholder.com/400x300?text=Image+Preview+Error';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Sumber / URL</label>
                <input 
                  type="text" 
                  value={newItem.source || ''}
                  onChange={(e) => setNewItem({...newItem, source: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., https://pinterest.com/pin/123456789"
                />
              </div>
              
              {/* Tags Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newItem.tags && newItem.tags.length > 0 ? (
                    newItem.tags.split(',').filter(tag => tag.trim() !== '').map((tag, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-pink-100 text-pink-800 rounded-md text-sm flex items-center"
                      >
                        {tag}
                        <button 
                          type="button"
                          onClick={() => {
                            const newTagsArray = (newItem.tags || '').split(',').filter((_, i) => i !== index);
                            setNewItem({...newItem, tags: newTagsArray.join(',')});
                          }}
                          className="ml-1 text-pink-500 hover:text-pink-700"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Belum ada tag. Pilih di bawah atau ketik tag baru.</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="newTag"
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    placeholder="Tambah tag baru..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        const newTag = e.currentTarget.value.trim();
                        const currentTags = newItem.tags || '';
                        if (!currentTags.split(',').some(t => t.trim() === newTag)) {
                          const separator = currentTags && currentTags.trim() !== '' ? ',' : '';
                          setNewItem({
                            ...newItem, 
                            tags: currentTags + separator + newTag
                          });
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newTag') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        const newTag = input.value.trim();
                        const currentTags = newItem.tags || '';
                        if (!currentTags.split(',').some(t => t.trim() === newTag)) {
                          const separator = currentTags && currentTags.trim() !== '' ? ',' : '';
                          setNewItem({
                            ...newItem, 
                            tags: currentTags + separator + newTag
                          });
                        }
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
                  >
                    Tambah
                  </button>
                </div>
                
                {/* Quick tag selection */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {filterTags.slice(0, 10).map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const newTag = tag.label;
                        const currentTags = newItem.tags || '';
                        if (!currentTags.split(',').some(t => t.trim() === newTag)) {
                          const separator = currentTags && currentTags.trim() !== '' ? ',' : '';
                          setNewItem({
                            ...newItem,
                            tags: currentTags + separator + newTag
                          });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="isInspiration" 
                  checked={newItem.isInspiration !== undefined ? newItem.isInspiration : true}
                  onChange={(e) => setNewItem({...newItem, isInspiration: e.target.checked})}
                  className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="isInspiration" className="ml-2 text-sm text-gray-700">
                  Hanya inspirasi (bukan final)
                </label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="isApproved" 
                  checked={newItem.isApproved || false}
                  onChange={(e) => setNewItem({...newItem, isApproved: e.target.checked})}
                  className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="isApproved" className="ml-2 text-sm text-gray-700">
                  Sudah disetujui pasangan
                </label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSaveItem}
                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
                disabled={!newItem.title || !newItem.imageUrl}
              >
                {editItemId ? 'Update Inspirasi' : 'Simpan Inspirasi'}
              </button>
            </div>
          </div>
        )}
        
        {/* Moodboard Grid */}
        {isLoading || weddingLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Memuat moodboard...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <span className={`px-2 py-1 text-xs rounded-md bg-pink-100 text-pink-800`}>
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                  {!item.isInspiration && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-1 text-xs rounded-md bg-purple-100 text-purple-800">
                        Final
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{item.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-md ${item.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.isApproved ? 'Disetujui' : 'Belum Disetujui'}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  )}
                  
                  {item.source && (
                    <div className="mb-3">
                      <a 
                        href={item.source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:underline"
                      >
                        <FiExternalLink className="mr-1 h-3 w-3" /> Lihat Sumber
                      </a>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleApproveToggle(item.id)}
                        className={`p-1.5 rounded-md text-xs ${
                          item.isApproved 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {item.isApproved ? 'Disetujui ✓' : 'Setujui'}
                      </button>
                    </div>
                    
                    <div className="space-x-1">
                      <button 
                        onClick={() => handleEditItem(item.id)}
                        className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {moodboards.length === 0 
              ? 'Belum ada inspirasi tersimpan. Klik "Tambah Inspirasi" untuk menambahkan.'
              : 'Tidak ada inspirasi yang cocok dengan filter atau pencarian yang dipilih.'
            }
          </div>
        )}
      </div>
    </div>
  );
} 