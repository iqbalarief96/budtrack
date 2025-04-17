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
  FiClock
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import {
  Calendar,
} from 'lucide-react';

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
    date: '2024-12-12',
    venue: 'Grand Ballroom Hotel Magnolia',
    budget: 'Rp 250.000.000',
    spent: 'Rp 75.000.000',
    guests: '250',
  });
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchWeddingData();
  }, []);

  const fetchWeddingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wedding');
      const data = await response.json();
      
      if (data.weddings && data.weddings.length > 0) {
        setWedding(data.weddings[0]);
        // Update wedding info state with data from API
        if (data.weddings[0]) {
          const weddingData = data.weddings[0];
          setWeddingInfo({
            date: new Date(weddingData.date).toISOString().split('T')[0],
            venue: weddingData.location || 'Grand Ballroom Hotel Magnolia',
            budget: `Rp ${weddingData.budget.toLocaleString('id-ID')}`,
            spent: weddingData.spentBudget ? `Rp ${weddingData.spentBudget.toLocaleString('id-ID')}` : 'Rp 0',
            guests: weddingData.expectedGuests.toString(),
          });
        }
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

  // Show loading state
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
          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition"
          >
            <FiEdit /> Edit Wedding Info
          </button>
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
      
      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Venue Card */}
        <Link href="/wedding-planner/venue" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <FiMapPin className="text-blue-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Venue</h3>
          <p className="text-gray-500 text-sm">Manage your wedding venue details</p>
        </Link>
        
        {/* Vendor Card */}
        <Link href="/wedding-planner/vendor" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-purple-100 p-4 rounded-full mb-4">
            <FiUsers className="text-purple-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Vendors</h3>
          <p className="text-gray-500 text-sm">Manage catering, photography, etc.</p>
        </Link>
        
        {/* Documents Card */}
        <Link href="/wedding-planner/admin" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-yellow-100 p-4 rounded-full mb-4">
            <FiFileText className="text-yellow-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Administration</h3>
          <p className="text-gray-500 text-sm">Manage important documents</p>
        </Link>
        
        {/* Event Rundown Card */}
        <Link href="/wedding-planner/rundown" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <FiClock className="text-green-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Event Rundown</h3>
          <p className="text-gray-500 text-sm">Plan your wedding day timeline</p>
        </Link>
        
        {/* Playlist Card */}
        <Link href="/wedding-planner/playlist" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <FiMusic className="text-red-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Playlist</h3>
          <p className="text-gray-500 text-sm">Create your wedding soundtrack</p>
        </Link>
        
        {/* Mood Board Card */}
        <Link href="/wedding-planner/moodboard" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-pink-100 p-4 rounded-full mb-4">
            <FiImage className="text-pink-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Mood Board</h3>
          <p className="text-gray-500 text-sm">Gather inspiration and themes</p>
        </Link>
        
        {/* Gifts Card */}
        <Link href="/wedding-planner/gifts" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <FiGift className="text-indigo-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Gifts</h3>
          <p className="text-gray-500 text-sm">Track gifts and 'seserahan'</p>
        </Link>
        
        {/* Souvenirs Card */}
        <Link href="/wedding-planner/souvenirs" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
          <div className="bg-teal-100 p-4 rounded-full mb-4">
            <FiPackage className="text-teal-500 text-xl" />
          </div>
          <h3 className="font-medium text-lg mb-2">Souvenirs</h3>
          <p className="text-gray-500 text-sm">Manage wedding souvenirs</p>
        </Link>
      </div>
      
      {/* Edit Wedding Info Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
      )}
    </div>
  );
} 