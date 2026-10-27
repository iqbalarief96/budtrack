'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiUsers, 
  FiCalendar, 
  FiDollarSign, 
  FiMapPin, 
  FiMusic, 
  FiImage, 
  FiGift, 
  FiPackage, 
  FiEdit, 
  FiFileText, 
  FiClock,
  FiUserPlus,
  FiRefreshCw
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import {
  Calendar,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Define Wedding interface
interface Wedding {
  id: string;
  title: string;
  date: string;
  location: string;
  budget: number;
  spentBudget: number;
  expectedGuests: number;
  confirmedGuests?: number;
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function WeddingPlanner() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [weddingInfo, setWeddingInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    venue: '',
    budget: 'Rp 0',
    spent: 'Rp 0',
    guests: '0',
  });
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingGuests, setIsSyncingGuests] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchWeddingData();
  }, []);

  const fetchWeddingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wedding');
      const data = await response.json();
      
      // Updated to handle both response formats
      if (data.wedding) {
        // New API format: single wedding object
        setWedding(data.wedding);
        // Update wedding info state with data from API
        setWeddingInfo({
          date: new Date(data.wedding.date).toISOString().split('T')[0],
          venue: data.wedding.location || '',
          budget: `Rp ${data.wedding.budget.toLocaleString('id-ID')}`,
          spent: data.wedding.spentBudget ? `Rp ${data.wedding.spentBudget.toLocaleString('id-ID')}` : 'Rp 0',
          guests: data.wedding.expectedGuests.toString(),
        });
      } else if (data.weddings && data.weddings.length > 0) {
        // Old API format: array of weddings
        setWedding(data.weddings[0]);
        // Update wedding info state with data from API
        const weddingData = data.weddings[0];
        setWeddingInfo({
          date: new Date(weddingData.date).toISOString().split('T')[0],
          venue: weddingData.location || '',
          budget: `Rp ${weddingData.budget.toLocaleString('id-ID')}`,
          spent: weddingData.spentBudget ? `Rp ${weddingData.spentBudget.toLocaleString('id-ID')}` : 'Rp 0',
          guests: weddingData.expectedGuests.toString(),
        });
      } else {
        setWedding(null);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch wedding data:', err);
      setError('Failed to load wedding data. Please try again later.');
      setWedding(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWeddingInfo({
      ...weddingInfo,
      [name]: value,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract numeric values from formatted strings
    const budgetValue = parseInt(weddingInfo.budget.replace(/\D/g, ''));
    const spentValue = parseInt(weddingInfo.spent.replace(/\D/g, ''));
    const guestsValue = parseInt(weddingInfo.guests);
    
    if (wedding) {
      // Update existing wedding
      fetch(`/api/wedding/${wedding.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: weddingInfo.date,
          budget: budgetValue,
          expectedGuests: guestsValue,
          location: weddingInfo.venue,
          spentBudget: spentValue,
          // We'll leave confirmedGuests unchanged for now
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.wedding) {
          setWedding(data.wedding);
        }
      })
      .catch(error => {
        console.error('Error updating wedding:', error);
      });
    } else {
      // Create new wedding
      fetch(`/api/wedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Wedding',
          date: weddingInfo.date,
          location: weddingInfo.venue,
          budget: budgetValue,
          expectedGuests: guestsValue,
          status: 'PLANNING',
          spentBudget: spentValue,
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.wedding) {
          setWedding(data.wedding);
        }
      })
      .catch(error => {
        console.error('Error creating wedding:', error);
      });
    }
    
    setShowEditModal(false);
  };

  const createWedding = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/wedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'My Wedding',
          date: weddingInfo.date,
          location: weddingInfo.venue,
          budget: parseInt(weddingInfo.budget.replace(/\D/g, '')),
          expectedGuests: parseInt(weddingInfo.guests),
          status: 'PLANNING',
          spentBudget: parseInt(weddingInfo.spent.replace(/\D/g, '')),
          notes: '',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create wedding');
      
      fetchWeddingData(); // Refresh data after creation
    } catch (err) {
      console.error('Error creating wedding:', err);
      setError('Failed to create wedding. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWedding();
  };

  // Add new function to sync budget
  const handleSyncBudget = async () => {
    if (!wedding) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/wedding-budget/sync?weddingId=${wedding.id}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal sinkronisasi budget');
      }

      // Refresh wedding data to show updated values
      await fetchWeddingData();
      toast.success('Budget berhasil disinkronisasi');
    } catch (err) {
      console.error('Error syncing budget:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal sinkronisasi budget');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add new function to sync guests
  const handleSyncGuests = async () => {
    if (!wedding) return;
    
    setIsSyncingGuests(true);
    try {
      const response = await fetch(`/api/wedding/${wedding.id}/sync-guests`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal sinkronisasi tamu');
      }

      // Refresh wedding data to show updated values
      await fetchWeddingData();
      toast.success('Jumlah tamu berhasil disinkronisasi');
    } catch (err) {
      console.error('Error syncing guests:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal sinkronisasi tamu');
    } finally {
      setIsSyncingGuests(false);
    }
  };

  // Show loading state
  // Rendered in both the empty state and the main view (it used to exist only in
  // the main view, so "Buat Wedding Planning" on the empty state did nothing).
  const editModal = showEditModal && (

        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Edit Wedding Info</h3>
            
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Wedding Date</label>
                <input
                  type="date"
                  name="date"
                  value={weddingInfo.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  name="venue"
                  value={weddingInfo.venue}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Budget</label>
                <input
                  type="text"
                  name="budget"
                  value={weddingInfo.budget}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Spent</label>
                <input
                  type="text"
                  name="spent"
                  value={weddingInfo.spent}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Guests</label>
                <input
                  type="text"
                  name="guests"
                  value={weddingInfo.guests}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Wedding Planner</h1>
        <div className="bg-white p-8 rounded-xl shadow-md">
          <p className="text-gray-500">Loading wedding information...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no wedding is found
  if (!wedding) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Wedding Planner</h1>
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h2 className="text-xl font-medium mb-3">No Wedding Planning Found</h2>
          <p className="text-gray-500 mb-4">Kamu belum punya wedding planning. Yuk mulai buat wedding planning kamu!</p>
          <button 
            onClick={() => setShowEditModal(true)}
            className="px-6 py-3 bg-pink-500 text-white rounded-lg flex items-center gap-2 hover:bg-pink-600 transition mx-auto"
          >
            <FiEdit /> Buat Wedding Planning
          </button>
        </div>
        {editModal}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Wedding Planner</h1>
      
      {/* Wedding Info Card */}
      <div className="bg-white p-8 rounded-xl shadow-md mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Wedding Information</h2>
          <div className="flex gap-2">
            <button 
              onClick={handleSyncGuests}
              disabled={isSyncingGuests}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-600 transition disabled:opacity-50"
            >
              <FiRefreshCw className={isSyncingGuests ? "animate-spin" : ""} /> 
              {isSyncingGuests ? 'Syncing...' : 'Sync Guests'}
            </button>
            <button 
              onClick={handleSyncBudget}
              disabled={isSyncing}
              className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 transition disabled:opacity-50"
            >
              <FiRefreshCw className={isSyncing ? "animate-spin" : ""} /> 
              {isSyncing ? 'Syncing...' : 'Sync Budget'}
            </button>
            <button 
              onClick={() => setShowEditModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition"
            >
              <FiEdit /> Edit Wedding Info
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <FiCalendar className="text-blue-500" />
              </div>
              <span className="text-gray-500">Date</span>
            </div>
            <p className="text-lg font-medium">{weddingInfo.date}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-full">
                <FiMapPin className="text-purple-500" />
              </div>
              <span className="text-gray-500">Venue</span>
            </div>
            <p className="text-lg font-medium">{weddingInfo.venue}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <FiDollarSign className="text-green-500" />
              </div>
              <span className="text-gray-500">Budget</span>
            </div>
            <p className="text-lg font-medium">{weddingInfo.budget}</p>
            <p className="text-sm text-gray-500">Spent: {weddingInfo.spent}</p>
            
            {/* Progress Bar */}
            <div className="mt-2">
              {(() => {
                const budgetNum = parseInt(weddingInfo.budget.replace(/\D/g, ''));
                const spentNum = parseInt(weddingInfo.spent.replace(/\D/g, ''));
                const percentage = budgetNum > 0 ? Math.min(Math.round((spentNum / budgetNum) * 100), 100) : 0;
                
                return (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                      <div 
                        className={`h-2.5 rounded-full ${
                          percentage < 50 ? 'bg-green-500' : 
                          percentage < 75 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{percentage}% used</span>
                      <span className="text-gray-500">{100-percentage}% remaining</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-orange-100 p-2 rounded-full">
                <FiUsers className="text-orange-500" />
              </div>
              <span className="text-gray-500">Guests</span>
            </div>
            <p className="text-lg font-medium">{weddingInfo.guests} invited</p>
            <p className="text-sm text-gray-500">Confirmed: {wedding.confirmedGuests}</p>
          </div>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Budget Feature */}
        <Link href="/wedding-planner/budget" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <FiDollarSign className="text-green-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Anggaran Pernikahan</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Kelola anggaran dan pembayaran vendor</p>
          </div>
        </Link>

        {/* Venue Feature */}
        <Link href="/wedding-planner/venue" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FiMapPin className="text-blue-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Venue</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Manage your wedding venue details</p>
          </div>
        </Link>

        {/* Vendors Feature */}
        <Link href="/wedding-planner/vendors" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <FiUsers className="text-purple-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Vendors</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Manage catering, photography, etc.</p>
          </div>
        </Link>

        {/* Guests Feature - NEW */}
        <Link href="/wedding-planner/guests" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <FiUserPlus className="text-indigo-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Guests</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Manage wedding guest list and RSVPs</p>
          </div>
        </Link>

        {/* Administration Feature */}
        <Link href="/wedding-planner/admin" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
              <FiFileText className="text-yellow-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Administration</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Manage important documents</p>
          </div>
        </Link>

        {/* Rundown Feature */}
        <Link href="/wedding-planner/rundown" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <FiClock className="text-green-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Event Rundown</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Plan your wedding day timeline</p>
          </div>
        </Link>

        {/* Playlist Feature */}
        <Link href="/wedding-planner/playlist" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <FiMusic className="text-red-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Playlist</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Create your wedding soundtrack</p>
          </div>
        </Link>

        {/* Moodboard Feature */}
        <Link href="/wedding-planner/moodboard" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
              <FiImage className="text-pink-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Mood Board</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Gather inspiration and themes</p>
          </div>
        </Link>

        {/* Gifts Feature */}
        <Link href="/wedding-planner/gifts" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FiGift className="text-blue-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Gifts</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Track gifts and 'seserahan'</p>
          </div>
        </Link>

        {/* Souvenirs Feature */}
        <Link href="/wedding-planner/souvenirs" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <FiPackage className="text-green-500 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center">Souvenirs</h3>
            <p className="text-sm text-gray-500 text-center mt-2">Manage wedding souvenirs</p>
          </div>
        </Link>
      </div>
      
      {editModal}
      
      {/* Toast provider for notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
} 