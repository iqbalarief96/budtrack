'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiSearch, FiFilter, FiDownload, FiEdit2, FiTrash2, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [wedding, setWedding] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editGuest, setEditGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newGuest, setNewGuest] = useState({
    name: '',
    relationship: 'Keluarga Pria',
    contactNumber: '',
    email: '',
    address: '',
    confirmed: false,
    attended: false,
    group: 'Keluarga',
    seats: 1,
    dietaryRestrictions: '',
    notes: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // First, fetch the wedding data to get the wedding ID
  useEffect(() => {
    const fetchWeddingData = async () => {
      try {
        const response = await fetch('/api/wedding');
        if (!response.ok) {
          throw new Error('Failed to fetch wedding data');
        }
        
        const data = await response.json();
        if (data.wedding) {
          setWedding(data.wedding);
          fetchGuestData(data.wedding.id);
        } else {
          setError('No wedding data found');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching wedding:', err);
        setError('Failed to load wedding data');
        setLoading(false);
      }
    };
    
    fetchWeddingData();
  }, []);

  // Fetch guest data using the wedding ID
  const fetchGuestData = async (weddingId) => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching guests for wedding ID:', weddingId);
      
      const response = await fetch(`/api/wedding/${weddingId}/guests`);
      const responseData = await response.json();
      
      console.log('API response:', responseData);
      
      if (!response.ok && !responseData.guests) {
        throw new Error(responseData.error || 'Failed to fetch guests data');
      }
      
      if (responseData.guests) {
        setGuests(responseData.guests);
        console.log('Loaded', responseData.guests.length, 'guests');
      } else {
        // If no guests property but we have a 200 response, set empty array
        setGuests([]);
        console.log('No guests found or empty array returned');
        if (responseData.error) {
          setError(responseData.error);
        }
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
      setError('Failed to load guests data. ' + (err instanceof Error ? err.message : String(err)));
      setGuests([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter guests based on search term, status, and group
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (guest.email && guest.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (guest.contactNumber && guest.contactNumber.includes(searchTerm));
    
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'confirmed' && guest.confirmed) ||
                          (filterStatus === 'unconfirmed' && !guest.confirmed);
    
    const matchesGroup = filterGroup === 'all' || guest.group === filterGroup;
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Get unique groups for filter dropdown
  const uniqueGroups = Array.from(new Set(guests.map(guest => guest.group).filter(Boolean)));

  // Calculate summary stats
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(guest => guest.confirmed).length;
  const totalSeats = guests.reduce((acc, guest) => acc + guest.seats, 0);
  const confirmedSeats = guests.filter(guest => guest.confirmed).reduce((acc, guest) => acc + guest.seats, 0);

  const handleAddGuest = async () => {
    if (!wedding) {
      setError('No wedding found');
      return;
    }
    
    if (newGuest.name && newGuest.contactNumber) {
      try {
        if (editGuest) {
          // Update existing guest
          const response = await fetch(`/api/wedding/${wedding.id}/guests`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: editGuest.id,
              ...newGuest
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update guest');
          }
          
          // Refresh guest data
          fetchGuestData(wedding.id);
          setEditGuest(null);
        } else {
          // Add new guest
          const response = await fetch(`/api/wedding/${wedding.id}/guests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newGuest),
          });
          
          if (!response.ok) {
            throw new Error('Failed to add guest');
          }
          
          // Refresh guest data
          fetchGuestData(wedding.id);
        }
        
        // Reset form
        setNewGuest({
          name: '',
          relationship: 'Keluarga Pria',
          contactNumber: '',
          email: '',
          address: '',
          confirmed: false,
          attended: false,
          group: 'Keluarga',
          seats: 1,
          dietaryRestrictions: '',
          notes: ''
        });
        setShowAddForm(false);
      } catch (err) {
        console.error('Error saving guest:', err);
        setError('Failed to save guest');
      }
    }
  };

  const handleEditGuest = (guest) => {
    setEditGuest(guest);
    setNewGuest({...guest});
    setShowAddForm(true);
  };

  const handleDeleteGuest = async (id) => {
    if (!wedding) {
      setError('No wedding found');
      return;
    }
    
    try {
      const response = await fetch(`/api/wedding/${wedding.id}/guests?guestId=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete guest');
      }
      
      // Refresh guest data
      fetchGuestData(wedding.id);
    } catch (err) {
      console.error('Error deleting guest:', err);
      setError('Failed to delete guest');
    }
  };

  const toggleGuestStatus = async (id, field) => {
    if (!wedding) {
      setError('No wedding found');
      return;
    }
    
    // Find the guest to get current data
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    
    try {
      // Toggle the status and update
      const updatedGuest = { 
        ...guest, 
        [field]: !guest[field] 
      };
      
      const response = await fetch(`/api/wedding/${wedding.id}/guests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGuest),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update guest ${field}`);
      }
      
      // Refresh guest data
      fetchGuestData(wedding.id);
    } catch (err) {
      console.error('Error updating guest:', err);
      setError('Failed to update guest status');
    }
  };

  // Add function to sync guests
  const handleSyncGuests = async () => {
    if (!wedding) {
      setError('No wedding found');
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/wedding/${wedding.id}/sync-guests`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal sinkronisasi tamu');
      }

      // Refresh wedding data
      toast.success('Jumlah tamu berhasil disinkronisasi');
    } catch (err) {
      console.error('Error syncing guests:', err);
      setError(err instanceof Error ? err.message : 'Gagal sinkronisasi tamu');
      toast.error(err instanceof Error ? err.message : 'Gagal sinkronisasi tamu');
    } finally {
      setIsSyncing(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Link href="/wedding-planner" className="mr-4">
            <FiChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Daftar Tamu</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Loading wedding guests...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Link href="/wedding-planner" className="mr-4">
            <FiChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Daftar Tamu</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-500 text-center py-8">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4 text-gray-600 hover:text-gray-800">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Daftar Tamu</h1>
      </div>
      
      {/* Guest Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Kelola Tamu Undangan</h2>
            <p className="text-sm text-gray-500">Total: {totalGuests} tamu, {confirmedGuests} konfirmasi hadir</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleSyncGuests}
              disabled={isSyncing}
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 flex items-center"
            >
              <FiRefreshCw className={`mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Guests"}
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
            >
              <FiPlus className="mr-2" /> Tambah Tamu
            </button>
          </div>
        </div>
        
        {/* Guest Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Tamu</h3>
            <p className="text-2xl font-bold text-blue-700">{totalGuests}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Konfirmasi Hadir</h3>
            <p className="text-2xl font-bold text-green-700">{confirmedGuests}</p>
            <p className="text-xs text-gray-500">{totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0}% dari total</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Kursi</h3>
            <p className="text-2xl font-bold text-purple-700">{totalSeats}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Kursi Terkonfirmasi</h3>
            <p className="text-2xl font-bold text-orange-700">{confirmedSeats}</p>
            <p className="text-xs text-gray-500">{totalSeats > 0 ? Math.round((confirmedSeats / totalSeats) * 100) : 0}% dari total</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
          <div className="flex items-center w-full md:w-auto">
            <div className="relative flex-grow mr-2">
              <input
                type="text"
                placeholder="Cari tamu..."
                className="w-full p-2 pl-8 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FiSearch className="absolute left-2 top-3 text-gray-400" />
            </div>
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Status</option>
              <option value="confirmed">Hadir</option>
              <option value="unconfirmed">Belum Konfirmasi</option>
            </select>
            <select
              className="p-2 border border-gray-300 rounded-md ml-2"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
            >
              <option value="all">Semua Grup</option>
              {uniqueGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-2 w-full md:w-auto">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center">
              <FiDownload className="mr-1" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Guest Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-medium mb-4">{editGuest ? 'Edit Tamu' : 'Tambah Tamu Baru'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap*</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.name}
                onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                placeholder="e.g., Budi Santoso"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hubungan</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                value={newGuest.relationship || ''}
                onChange={(e) => setNewGuest({...newGuest, relationship: e.target.value})}
              >
                <option value="Keluarga Pria">Keluarga Pria</option>
                <option value="Keluarga Wanita">Keluarga Wanita</option>
                <option value="Teman Pria">Teman Pria</option>
                <option value="Teman Wanita">Teman Wanita</option>
                <option value="Rekan Kerja Pria">Rekan Kerja Pria</option>
                <option value="Rekan Kerja Wanita">Rekan Kerja Wanita</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grup</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                value={newGuest.group || ''}
                onChange={(e) => setNewGuest({...newGuest, group: e.target.value})}
              >
                <option value="Keluarga">Keluarga</option>
                <option value="Teman">Teman</option>
                <option value="Rekan Kerja">Rekan Kerja</option>
                <option value="VIP">VIP</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon*</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.contactNumber || ''}
                onChange={(e) => setNewGuest({...newGuest, contactNumber: e.target.value})}
                placeholder="e.g., 081234567890"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.email || ''}
                onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                placeholder="e.g., email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Kursi</label>
              <input 
                type="number" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.seats}
                onChange={(e) => setNewGuest({...newGuest, seats: Number(e.target.value)})}
                min="1"
                max="10"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={newGuest.address || ''}
              onChange={(e) => setNewGuest({...newGuest, address: e.target.value})}
              placeholder="e.g., Jl. Mawar No. 10, Jakarta"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Diet</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.dietaryRestrictions || ''}
                onChange={(e) => setNewGuest({...newGuest, dietaryRestrictions: e.target.value})}
                placeholder="e.g., Vegetarian, Non-seafood"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newGuest.notes || ''}
                onChange={(e) => setNewGuest({...newGuest, notes: e.target.value})}
                placeholder="Catatan lainnya..."
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="confirmedStatus" 
                className="h-4 w-4 text-pink-600 rounded border-gray-300"
                checked={newGuest.confirmed}
                onChange={(e) => setNewGuest({...newGuest, confirmed: e.target.checked})}
              />
              <label htmlFor="confirmedStatus" className="ml-2 text-sm text-gray-700">Sudah Konfirmasi Kehadiran</label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="attendedStatus" 
                className="h-4 w-4 text-pink-600 rounded border-gray-300"
                checked={newGuest.attended}
                onChange={(e) => setNewGuest({...newGuest, attended: e.target.checked})}
              />
              <label htmlFor="attendedStatus" className="ml-2 text-sm text-gray-700">Hadir di Acara</label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => {
                setShowAddForm(false);
                setEditGuest(null);
              }}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Batal
            </button>
            <button 
              onClick={handleAddGuest}
              className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
            >
              {editGuest ? 'Update' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
      
      {/* Guest List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontak
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grup
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kursi
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
            {filteredGuests.map((guest) => (
              <tr key={guest.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                      <div className="text-sm text-gray-500">{guest.relationship}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{guest.contactNumber}</div>
                  <div className="text-sm text-gray-500">{guest.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {guest.group}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  {guest.seats}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col space-y-1 items-center">
                    <button 
                      onClick={() => toggleGuestStatus(guest.id, 'confirmed')}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        guest.confirmed 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      {guest.confirmed ? (
                        <><FiCheck className="mr-1" /> Konfirmasi</>
                      ) : (
                        <><FiX className="mr-1" /> Belum Konfirmasi</>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => toggleGuestStatus(guest.id, 'attended')}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        guest.attended 
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {guest.attended ? (
                        <><FiCheck className="mr-1" /> Hadir</>
                      ) : (
                        <><FiX className="mr-1" /> Belum Hadir</>
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => handleEditGuest(guest)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {filteredGuests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Tidak ada tamu yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
} 