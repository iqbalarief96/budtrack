'use client';

import React, { useState } from 'react';
import { FiPlus, FiCheck, FiCalendar, FiClock, FiChevronLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';

// Demo data
const initialMilestones = [
  {
    id: '1',
    title: 'Engagement',
    date: '2024-01-15',
    completed: true,
    description: 'Acara lamaran resmi keluarga'
  },
  {
    id: '2',
    title: 'Booking Venue',
    date: '2024-02-10',
    completed: true,
    description: 'Konfirmasi booking venue utama dan pembayaran DP'
  },
  {
    id: '3',
    title: 'Pre-Wedding Photo',
    date: '2024-06-20',
    completed: false,
    description: 'Sesi foto pre-wedding di Labuan Bajo'
  },
  {
    id: '4',
    title: 'Fitting Baju',
    date: '2024-08-15',
    completed: false,
    description: 'Fitting baju pengantin dan keluarga'
  },
  {
    id: '5',
    title: 'Food Tasting',
    date: '2024-09-05',
    completed: false,
    description: 'Test menu katering untuk resepsi'
  },
  {
    id: '6',
    title: 'Wedding Day',
    date: '2024-12-12',
    completed: false,
    description: 'Hari H pernikahan'
  },
];

export default function TimelinePage() {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    date: '',
    description: '',
    completed: false
  });

  const handleAddMilestone = () => {
    if (newMilestone.title && newMilestone.date) {
      setMilestones([
        ...milestones, 
        { 
          ...newMilestone, 
          id: Date.now().toString()
        }
      ]);
      setNewMilestone({
        title: '',
        date: '',
        description: '',
        completed: false
      });
      setShowAddForm(false);
    }
  };

  const toggleMilestoneStatus = (id: string) => {
    setMilestones(milestones.map(milestone => 
      milestone.id === id ? 
        { ...milestone, completed: !milestone.completed } : 
        milestone
    ));
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Sort milestones by date
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Timeline Pernikahan</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Milestone & Jadwal Penting</h2>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center"
          >
            <FiPlus className="mr-1" /> Add Milestone
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                  placeholder="e.g., Pre-Wedding Photo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newMilestone.date}
                  onChange={(e) => setNewMilestone({...newMilestone, date: e.target.value})}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                placeholder="Detail milestone"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button 
                onClick={handleAddMilestone}
                className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {sortedMilestones.map((milestone, index) => (
            <div key={milestone.id} className="relative pl-10 pb-8">
              <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center z-10 
                ${milestone.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {milestone.completed ? (
                  <FiCheck className="w-5 h-5" />
                ) : (
                  <FiCalendar className="w-5 h-5" />
                )}
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{milestone.title}</h3>
                    <p className="text-gray-500 flex items-center mt-1">
                      <FiClock className="w-4 h-4 mr-1" /> 
                      {formatDate(milestone.date)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => toggleMilestoneStatus(milestone.id)}
                      className={`p-2 rounded-full ${milestone.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:opacity-80`}
                      title={milestone.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 rounded-full bg-gray-100 text-red-500 hover:bg-red-100"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {milestone.description && (
                  <p className="text-gray-600 mt-3">{milestone.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 