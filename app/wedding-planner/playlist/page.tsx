'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiPlus, FiTrash2, FiEdit2, FiX, FiMusic, FiYoutube, FiSearch, FiFilter, FiPlay, FiLink } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useWeddingId } from "../useWeddingId";

// Define song segment type
type SongSegment = 'prelude' | 'processional' | 'ceremony' | 'recessional' | 'cocktail' | 'dinner' | 'first-dance' | 'father-daughter' | 'mother-son' | 'cake-cutting' | 'bouquet-toss' | 'general-dancing' | 'last-dance';

// Define song interface
interface Playlist {
  id: string;
  weddingId: string;
  title: string;
  artist: string;
  category?: string | null;
  url?: string | null;
  notes?: string | null;
  order?: number | null;
  duration?: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Segment options
const segmentOptions = [
  { value: 'prelude', label: 'Prelude (Sebelum Acara)' },
  { value: 'processional', label: 'Prosesi Masuk' },
  { value: 'ceremony', label: 'Upacara/Akad' },
  { value: 'recessional', label: 'Prosesi Keluar' },
  { value: 'cocktail', label: 'Mingle Time' },
  { value: 'dinner', label: 'Makan Malam' },
  { value: 'first-dance', label: 'First Dance' },
  { value: 'father-daughter', label: 'Ayah-Pengantin Wanita' },
  { value: 'mother-son', label: 'Ibu-Pengantin Pria' },
  { value: 'cake-cutting', label: 'Potong Kue' },
  { value: 'bouquet-toss', label: 'Lempar Buket' },
  { value: 'general-dancing', label: 'Dansa Umum' },
  { value: 'last-dance', label: 'Lagu Penutup' }
];

export default function PlaylistPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editSongId, setEditSongId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { weddingId, loading: weddingLoading, hasWedding } = useWeddingId();
  
  const [newSong, setNewSong] = useState<Partial<Playlist>>({
    title: '',
    artist: '',
    category: 'general-dancing',
    url: '',
    notes: '',
    duration: '',
    order: 0,
    isApproved: false
  });
  
  // Fetch playlists from API
  useEffect(() => {
    if (!weddingId) return;
    const fetchPlaylists = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from API instead of using mock data
        const response = await fetch(`/api/wedding/${weddingId}/playlist`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch playlists (${response.status}) - ${errorData.details || 'Unknown API error'}`);
        }
        
        const data = await response.json();
        if (data && Array.isArray(data)) {
          console.log(`Fetched ${data.length} songs from API.`);
          setPlaylists(data);
        } else {
          // Jika API mengembalikan format data yang tidak valid
          console.error("Invalid data format from API");
          setPlaylists([]);
          toast.error('Format data dari server tidak valid');
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
        toast.error('Gagal memuat daftar lagu');
        setPlaylists([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlaylists();
  }, [weddingId]);
  
  const handleSaveSong = async () => {
    if (!weddingId) {
      toast.error('Wedding belum tersedia.');
      return;
    }
    if (newSong.title && newSong.artist) {
      try {
        setIsLoading(true);
        
        const endpoint = editSongId 
          ? `/api/wedding/${weddingId}/playlist/${editSongId}`
          : `/api/wedding/${weddingId}/playlist`;
        
        const method = editSongId ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSong, weddingId })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to ${editSongId ? 'update' : 'create'} playlist (${response.status}) - ${errorData.details || 'Unknown error'}`);
        }
        
        const savedSong = await response.json();
        
        if (editSongId) {
          setPlaylists(prevPlaylists => 
            prevPlaylists.map(song => 
              song.id === editSongId ? savedSong : song
            )
          );
          
          toast.success('Lagu berhasil diperbarui!');
        } else {
          setPlaylists(prev => [savedSong, ...prev]);
          toast.success('Lagu berhasil ditambahkan!');
        }
        
        // Reset form
        setNewSong({
          title: '',
          artist: '',
          category: 'general-dancing',
          url: '',
          notes: '',
          duration: '',
          order: 0,
          isApproved: false
        });
        setEditSongId(null);
        setShowAddForm(false);
      } catch (error) {
        console.error('Error saving song:', error);
        toast.error('Gagal menyimpan lagu');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Judul dan artis lagu wajib diisi');
    }
  };
  
  const handleEditSong = (id: string) => {
    const songToEdit = playlists.find(song => song.id === id);
    if (songToEdit) {
      setNewSong({
        title: songToEdit.title,
        artist: songToEdit.artist,
        category: songToEdit.category || 'general-dancing',
        url: songToEdit.url || '',
        notes: songToEdit.notes || '',
        duration: songToEdit.duration || '',
        order: songToEdit.order || 0,
        isApproved: songToEdit.isApproved
      });
      setEditSongId(id);
      setShowAddForm(true);
    }
  };
  
  const handleDeleteSong = async (id: string) => {
    if (!weddingId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus lagu ini?')) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/wedding/${weddingId}/playlist/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete playlist (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      
      setPlaylists(playlists.filter(song => song.id !== id));
      toast.success('Lagu berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting playlist item:', error);
      toast.error('Gagal menghapus lagu');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApproveToggle = async (id: string) => {
    if (!weddingId) return;
    try {
      setIsLoading(true);
      
      const songToUpdate = playlists.find(song => song.id === id);
      if (!songToUpdate) throw new Error('Lagu tidak ditemukan');
      
      const response = await fetch(`/api/wedding/${weddingId}/playlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...songToUpdate,
          isApproved: !songToUpdate.isApproved
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update playlist (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      
      const updatedSong = await response.json();
      
      setPlaylists(playlists.map(song => 
        song.id === id ? updatedSong : song
      ));
      toast.success('Status lagu berhasil diubah!');
    } catch (error) {
      console.error('Error updating playlist status:', error);
      toast.error('Gagal mengubah status lagu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter songs based on category and search term
  const filteredSongs = playlists.filter(song => {
    const matchesCategory = selectedCategory === 'all' || song.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
  
  // Get category label for display
  const getCategoryLabel = (category: string | null | undefined): string => {
    if (!category) return 'Umum';
    const found = segmentOptions.find(opt => opt.value === category);
    return found ? found.label : category;
  };
  
  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Format YouTube thumbnail URL
  const getYouTubeThumbnail = (url: string | null | undefined): string => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
  };
  
  if (hasWedding === false) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p className="mb-4">Belum ada wedding planning.</p>
          <Link href="/wedding-planner" className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
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
        <h1 className="text-2xl font-bold">Playlist Pernikahan</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium">Daftar Lagu</h2>
            <p className="text-sm text-gray-500">Kelola playlist musik untuk acara pernikahan Anda</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Tambah Lagu
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari lagu atau artis..."
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
              <option value="all">Semua Segmen</option>
              {segmentOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{editSongId ? 'Edit Lagu' : 'Tambah Lagu'}</h3>
              <button onClick={() => {
                setShowAddForm(false);
                setEditSongId(null);
                setNewSong({
                  title: '',
                  artist: '',
                  category: 'general-dancing',
                  url: '',
                  notes: '',
                  duration: '',
                  order: 0,
                  isApproved: false
                });
              }} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Lagu*</label>
                <input 
                  type="text" 
                  value={newSong.title || ''}
                  onChange={(e) => setNewSong({...newSong, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Can't Help Falling in Love"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Artis/Penyanyi*</label>
                <input 
                  type="text" 
                  value={newSong.artist || ''}
                  onChange={(e) => setNewSong({...newSong, artist: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Elvis Presley"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmen Acara</label>
                <select 
                  value={newSong.category || 'general-dancing'}
                  onChange={(e) => setNewSong({...newSong, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {segmentOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durasi</label>
                <input 
                  type="text" 
                  value={newSong.duration || ''}
                  onChange={(e) => setNewSong({...newSong, duration: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 3:45"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL YouTube</label>
                <input 
                  type="text" 
                  value={newSong.url || ''}
                  onChange={(e) => setNewSong({...newSong, url: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., https://www.youtube.com/watch?v=vGJTaP6anOU"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea 
                  value={newSong.notes || ''}
                  onChange={(e) => setNewSong({...newSong, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={2}
                  placeholder="Catatan tambahan tentang lagu ini..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                <input 
                  type="number" 
                  value={newSong.order || 0}
                  onChange={(e) => setNewSong({...newSong, order: parseInt(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 1"
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="isApproved" 
                  checked={newSong.isApproved}
                  onChange={(e) => setNewSong({...newSong, isApproved: e.target.checked})}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isApproved" className="ml-2 text-sm text-gray-700">
                  Sudah disetujui pasangan
                </label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSaveSong}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                disabled={!newSong.title || !newSong.artist}
              >
                {editSongId ? 'Update Lagu' : 'Simpan Lagu'}
              </button>
            </div>
          </div>
        )}
        
        {/* Song List */}
        {isLoading || weddingLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Memuat daftar lagu...</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map(song => (
              <div key={song.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {song.url && getYouTubeId(song.url) && (
                  <div className="relative">
                    <img 
                      src={getYouTubeThumbnail(song.url)} 
                      alt={song.title}
                      className="w-full h-40 object-cover"
                    />
                    <a 
                      href={song.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="bg-black bg-opacity-50 p-4 rounded-full">
                        <FiPlay className="text-white w-6 h-6" />
                      </div>
                    </a>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{song.title}</h3>
                      <p className="text-sm text-gray-600">{song.artist}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-md ${song.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {song.isApproved ? 'Disetujui' : 'Belum Disetujui'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Segmen:</p>
                      <p>{getCategoryLabel(song.category)}</p>
                    </div>
                    
                    {song.duration && (
                      <div>
                        <p className="text-xs text-gray-500">Durasi:</p>
                        <p>{song.duration}</p>
                      </div>
                    )}
                  </div>
                  
                  {song.notes && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">Catatan:</p>
                      <p className="text-sm">{song.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleApproveToggle(song.id)}
                        className={`p-1.5 rounded-md text-xs ${
                          song.isApproved 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {song.isApproved ? 'Disetujui ✓' : 'Setujui'}
                      </button>
                      
                      {song.url && (
                        <a 
                          href={song.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-xs inline-flex items-center"
                        >
                          <FiYoutube className="mr-1" /> Play
                        </a>
                      )}
                    </div>
                    
                    <div className="space-x-1">
                      <button 
                        onClick={() => handleEditSong(song.id)}
                        className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSong(song.id)}
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
            {playlists.length === 0 
              ? 'Belum ada lagu tersimpan. Klik "Tambah Lagu" untuk menambahkan.'
              : 'Tidak ada lagu yang cocok dengan filter atau pencarian yang dipilih.'
            }
          </div>
        )}
      </div>
    </div>
  );
} 