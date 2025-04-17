'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiSearch, FiFilter, FiDownload, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import Link from 'next/link';

// Demo data for guests
const initialGuests = [
  {
    id: '1',
    name: 'Budi Santoso',
    relationship: 'Keluarga Pria',
    contactNumber: '081234567890',
    email: 'budi@example.com',
    address: 'Jl. Mawar No. 10, Jakarta',
    confirmed: true,
    attended: false,
    group: 'Keluarga',
    seats: 2,
    dietaryRestrictions: 'Vegetarian',
    notes: 'Datang bersama istri'
  },
  {
    id: '2',
    name: 'Siti Rahayu',
    relationship: 'Keluarga Wanita',
    contactNumber: '081298765432',
    email: 'siti@example.com',
    address: 'Jl. Melati No. 15, Bandung',
    confirmed: true,
    attended: false,
    group: 'Keluarga',
    seats: 4,
    dietaryRestrictions: '',
    notes: 'Datang bersama anak-anak'
  },
  {
    id: '3',
    name: 'Ahmad Fauzi',
    relationship: 'Teman Pria',
    contactNumber: '085712345678',
    email: 'ahmad@example.com',
    address: 'Jl. Anggrek No. 5, Jakarta',
    confirmed: false,
    attended: false,
    group: 'Teman',
    seats: 2,
    dietaryRestrictions: '',
    notes: ''
  },
  {
    id: '4',
    name: 'Maya Wijaya',
    relationship: 'Teman Wanita',
    contactNumber: '087887654321',
    email: 'maya@example.com',
    address: 'Jl. Dahlia No. 8, Surabaya',
    confirmed: true,
    attended: false,
    group: 'Teman',
    seats: 1,
    dietaryRestrictions: 'Non-seafood',
    notes: ''
  },
  {
    id: '5',
    name: 'Hadi Nugroho',
    relationship: 'Rekan Kerja Pria',
    contactNumber: '081356789012',
    email: 'hadi@example.com',
    address: 'Jl. Kamboja No. 12, Jakarta',
    confirmed: false,
    attended: false,
    group: 'Rekan Kerja',
    seats: 2,
    dietaryRestrictions: '',
    notes: 'Konfirmasi H-7'
  },
  {
    id: '6',
    name: 'Dina Fitriani',
    relationship: 'Rekan Kerja Wanita',
    contactNumber: '089876543210',
    email: 'dina@example.com',
    address: 'Jl. Cempaka No. 20, Depok',
    confirmed: true,
    attended: false,
    group: 'Rekan Kerja',
    seats: 1,
    dietaryRestrictions: '',
    notes: ''
  }
];

export default function GuestsPage() {
  const [guests, setGuests] = useState(initialGuests);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editGuest, setEditGuest] = useState<null | any>(null);
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

  // Filter guests based on search term, status, and group
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.contactNumber.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'confirmed' && guest.confirmed) ||
                          (filterStatus === 'unconfirmed' && !guest.confirmed);
    
    const matchesGroup = filterGroup === 'all' || guest.group === filterGroup;
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  // Get unique groups for filter dropdown
  const uniqueGroups = Array.from(new Set(guests.map(guest => guest.group)));

  // Calculate summary stats
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(guest => guest.confirmed).length;
  const totalSeats = guests.reduce((acc, guest) => acc + guest.seats, 0);
  const confirmedSeats = guests.filter(guest => guest.confirmed).reduce((acc, guest) => acc + guest.seats, 0);

  const handleAddGuest = () => {
    if (newGuest.name && newGuest.contactNumber) {
      if (editGuest) {
        // Update existing guest
        setGuests(guests.map(guest => 
          guest.id === editGuest.id ? {...newGuest, id: guest.id} : guest
        ));
        setEditGuest(null);
      } else {
        // Add new guest
        setGuests([
          ...guests, 
          { 
            ...newGuest, 
            id: Date.now().toString()
          }
        ]);
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
    }
  };

  const handleEditGuest = (guest: any) => {
    setEditGuest(guest);
    setNewGuest({...guest});
    setShowAddForm(true);
  };

  const handleDeleteGuest = (id: string) => {
    setGuests(guests.filter(guest => guest.id !== id));
  };

  const toggleGuestStatus = (id: string, field: 'confirmed' | 'attended') => {
    setGuests(guests.map(guest => 
      guest.id === id ? {...guest, [field]: !guest[field]} : guest
    ));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Daftar Tamu</h1>
      </div>

      {/* Guest Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Ringkasan Tamu</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Tamu</h3>
            <p className="text-2xl font-bold text-blue-700">{totalGuests}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Konfirmasi Hadir</h3>
            <p className="text-2xl font-bold text-green-700">{confirmedGuests}</p>
            <p className="text-xs text-gray-500">{Math.round((confirmedGuests / totalGuests) * 100)}% dari total</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Kursi</h3>
            <p className="text-2xl font-bold text-purple-700">{totalSeats}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Kursi Terkonfirmasi</h3>
            <p className="text-2xl font-bold text-orange-700">{confirmedSeats}</p>
            <p className="text-xs text-gray-500">{Math.round((confirmedSeats / totalSeats) * 100)}% dari total</p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
          <div className="flex items-center w-full md:w-auto">
            <div className="relative mr-2 flex-grow md:flex-grow-0 md:w-64">
              <input
                type="text"
                placeholder="Cari nama atau kontak..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
            
            <div className="flex space-x-2">
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="confirmed">Terkonfirmasi</option>
                <option value="unconfirmed">Belum Konfirmasi</option>
              </select>
              
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                <option value="all">Semua Grup</option>
                {uniqueGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex space-x-2 w-full md:w-auto">
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center"
            >
              <FiPlus className="mr-1" /> Tambah Tamu
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center">
              <FiDownload className="mr-1" /> Export
            </button>
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
                  value={newGuest.relationship}
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
                  value={newGuest.group}
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
                  value={newGuest.contactNumber}
                  onChange={(e) => setNewGuest({...newGuest, contactNumber: e.target.value})}
                  placeholder="e.g., 081234567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGuest.email}
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
                value={newGuest.address}
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
                  value={newGuest.dietaryRestrictions}
                  onChange={(e) => setNewGuest({...newGuest, dietaryRestrictions: e.target.value})}
                  placeholder="e.g., Vegetarian, Non-seafood"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newGuest.notes}
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
      </div>
    </div>
  );
} 