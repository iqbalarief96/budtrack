'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiClock, FiMapPin, FiUsers, FiChevronLeft, FiX, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DEMO_WEDDING_ID } from '../constants';

// Interface aligned with Prisma Rundown Schema
interface RundownItem {
  id: string;
  weddingId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string | null;
  location: string | null;
  responsible: string | null;
  category: string | null; // e.g., PERSIAPAN, UPACARA, RESEPSI, LAINNYA
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper to format time (HH:MM) - ENSURE HH:mm format for input[type=time]
const formatTime = (date: Date | null | string): string => {
  if (!date) return ''; // Return empty string for time input compatibility
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        return ''; // Return empty if date is invalid
    }
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`; // Force HH:mm format
  } catch {
    return ''; // Return empty on error
  }
};

// Helper to format full date (e.g., Jumat, 20 Desember 2024)
const formatFullDate = (date: Date | null | string): string => {
  if (!date) return 'Tanggal tidak valid';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Invalid Date';
  }
};

// Helper function to group rundown items by date
const groupRundownByDate = (items: RundownItem[]) => {
  return items.reduce((acc, item) => {
    const dateKey = item.startTime.toISOString().split('T')[0]; // Group by YYYY-MM-DD
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    // Sort items within the same day by startTime
    acc[dateKey].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return acc;
  }, {} as Record<string, RundownItem[]>);
};

// Initial empty state for the form
const emptyRundownItem: Omit<RundownItem, 'id' | 'weddingId' | 'createdAt' | 'updatedAt'> = {
  title: '',
  startTime: new Date(), // Default to now, will be changed by user
  endTime: new Date(),   // Default to now, will be changed by user
  description: null,
  location: null,
  responsible: null,
  category: null,
  notes: null,
};


export default function RundownPage() {
  const [rundownItems, setRundownItems] = useState<RundownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState(emptyRundownItem);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]); // State for the date part of the form

  const weddingId = DEMO_WEDDING_ID;

  // Fetch Rundown Items Function
  const fetchRundownItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wedding/${weddingId}/rundown`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch rundown items (${response.status}) - ${errorData.details || 'Unknown API error'}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data)) {
        const processedData = data.map(item => ({
          ...item,
          startTime: new Date(item.startTime), // Ensure Date objects
          endTime: new Date(item.endTime),
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }));
        setRundownItems(processedData);
        console.log(`Rundown items loaded from API: ${processedData.length}`);
      } else {
        // Jika API mengembalikan format data yang tidak valid
        console.error("Invalid data format from API");
        setRundownItems([]);
        setError('Format data dari server tidak valid');
      }
    } catch (err) {
      console.error("Error fetching rundown items:", err);
      setError(`Gagal memuat rundown. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRundownItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRundownItems();
  }, [weddingId]);

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  // Handle date/time changes specifically
   const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target; // value is HH:MM from input
    const timePart = value;
    // Use the existing date part from the state (or today if not set)
    // Ensure we are indexing with keys valid for the state type
    const baseDateKey = name as keyof Pick<RundownItem, 'startTime' | 'endTime'>;
    const baseDateValue = currentItem[baseDateKey];
    const baseDate = baseDateValue instanceof Date ? new Date(baseDateValue) : new Date(); // Default to now if invalid
    const datePart = baseDate.toISOString().split('T')[0]; // Get YYYY-MM-DD from existing date

    if (timePart) {
        const [hours, minutes] = timePart.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
            // Construct new date string with correct date and new time
            const newDateTimeString = `${datePart}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
             try {
                const newDate = new Date(newDateTimeString);
                 if (!isNaN(newDate.getTime())) {
                     setCurrentItem(prev => ({ ...prev, [name]: newDate }));
                 } else {
                      console.warn("Failed to create valid date from string:", newDateTimeString);
                      // Keep previous valid state if new one is invalid
                      setCurrentItem(prev => ({ ...prev, [name]: prev[baseDateKey] })); 
                 }
             } catch (err) {
                  console.error("Error parsing date time string:", err);
                  setCurrentItem(prev => ({ ...prev, [name]: prev[baseDateKey] }));
             }
        } else {
             console.warn("Invalid time input format:", timePart);
             // Keep previous valid state on format error
             setCurrentItem(prev => ({ ...prev, [name]: prev[baseDateKey] }));
        }
    } else {
         // Handle empty time input - Keep previous valid state
         setCurrentItem(prev => ({ ...prev, [name]: prev[baseDateKey] }));
    }
  };

   // Handle change for the date picker associated with the form
  const handleFormDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value; // YYYY-MM-DD
    setFormDate(newDateStr);

    // Update both startTime and endTime dates when the form date changes, preserving the time part
    const updateDateTime = (currentDateTime: Date): Date => { // Type MUST be Date now based on state
        // Preserve existing time
        const hours = currentDateTime.getHours().toString().padStart(2, '0');
        const minutes = currentDateTime.getMinutes().toString().padStart(2, '0');
        const newDateTimeString = `${newDateStr}T${hours}:${minutes}:00`;
         try {
             const newDate = new Date(newDateTimeString);
             // Fallback to original date if parsing fails
             return isNaN(newDate.getTime()) ? currentDateTime : newDate;
         } catch { 
             return currentDateTime; // Return original on error
         }
    };

    setCurrentItem(prev => ({
        ...prev,
        // Cast to Date as the state type requires it, updateDateTime now guarantees a Date
        startTime: updateDateTime(prev.startTime as Date),
        endTime: updateDateTime(prev.endTime as Date),
    }));
  };

  const resetForm = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentItem(emptyRundownItem);
    setEditingItemId(null);
    setIsFormVisible(false);
    setError(null);
    setFormDate(todayStr); // Reset form date to today
  };

  // --- CRUD Operations ---
  const handleSaveRundownItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Basic validation
    if (!currentItem.title || !currentItem.startTime || !currentItem.endTime) {
      setError('Judul, Waktu Mulai, dan Waktu Selesai wajib diisi.');
      setIsSaving(false);
      return;
    }
    if (currentItem.startTime >= currentItem.endTime) {
        setError('Waktu Selesai harus setelah Waktu Mulai.');
        setIsSaving(false);
        return;
    }

    const payload = {
      ...currentItem,
      startTime: currentItem.startTime.toISOString(), // Send as ISO string
      endTime: currentItem.endTime.toISOString(),
    };

    try {
      const url = editingItemId
        ? `/api/wedding/${weddingId}/rundown/${editingItemId}`
        : `/api/wedding/${weddingId}/rundown`;
      const method = editingItemId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to ${editingItemId ? 'update' : 'create'} item (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }

      const savedItem = await response.json();

      // Process saved data before updating state
       const processedSavedItem = {
        ...savedItem,
        startTime: new Date(savedItem.startTime),
        endTime: new Date(savedItem.endTime),
        createdAt: savedItem.createdAt ? new Date(savedItem.createdAt) : undefined,
        updatedAt: savedItem.updatedAt ? new Date(savedItem.updatedAt) : undefined,
      };


      if (editingItemId) {
        setRundownItems(rundownItems.map(item => item.id === editingItemId ? processedSavedItem : item));
        toast.success('Item rundown berhasil diperbarui!');
      } else {
        setRundownItems([...rundownItems, processedSavedItem]);
        toast.success('Item rundown berhasil ditambahkan!');
      }
      resetForm();
    } catch (err) {
      console.error(`Error saving item:`, err);
      setError(`Gagal menyimpan item. ${err instanceof Error ? err.message : 'Unknown error'}.`);
      toast.error('Gagal menyimpan item rundown.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItem = (itemId: string) => {
    const itemToEdit = rundownItems.find(item => item.id === itemId);
    if (itemToEdit) {
      const itemDateStr = itemToEdit.startTime.toISOString().split('T')[0];
      setCurrentItem({
        title: itemToEdit.title,
        startTime: itemToEdit.startTime,
        endTime: itemToEdit.endTime,
        description: itemToEdit.description,
        location: itemToEdit.location,
        responsible: itemToEdit.responsible,
        category: itemToEdit.category,
        notes: itemToEdit.notes,
      });
      setFormDate(itemDateStr); // Set form date to the item's date
      setEditingItemId(itemId);
      setIsFormVisible(true);
      setError(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item rundown ini?')) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wedding/${weddingId}/rundown/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete item (${response.status}) - ${errorData.details || 'Unknown error'}`);
      }
      setRundownItems(rundownItems.filter(item => item.id !== itemId));
      toast.success('Item rundown berhasil dihapus!');
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(`Gagal menghapus item. ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Gagal menghapus item rundown.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Grouping and Sorting for Display ---
  const groupedRundown = groupRundownByDate(rundownItems);
  const sortedDates = Object.keys(groupedRundown).sort();

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
         <Link href="/wedding-planner" className="mr-4 text-gray-600 hover:text-gray-800">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Rundown Acara</h1>
      </div>

      {/* Add/Edit Form Modal */} 
      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{editingItemId ? 'Edit Item Rundown' : 'Tambah Item Rundown'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><FiX size={24} /></button>
            </div>
            {/* Form Error Display */}
            {error && !isSaving && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}
            <form onSubmit={handleSaveRundownItem} className="space-y-4">
               {/* Date Selector for the Form */}
               <div>
                 <label htmlFor="formDate" className="block text-sm font-medium text-gray-700">Tanggal Acara</label>
                 <input
                   type="date"
                   id="formDate"
                   name="formDate"
                   value={formDate}
                   onChange={handleFormDateChange}
                   required
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                 />
               </div>
               {/* Title */}
               <div>
                 <label htmlFor="title" className="block text-sm font-medium text-gray-700">Judul Acara <span className="text-red-500">*</span></label>
                 <input type="text" id="title" name="title" value={currentItem.title} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
               </div>
               {/* Time Inputs */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Waktu Mulai <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formatTime(currentItem.startTime)}
                      onChange={handleDateTimeChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                     />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">Waktu Selesai <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formatTime(currentItem.endTime)}
                      onChange={handleDateTimeChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                  </div>
               </div>
                {/* Optional Fields */}
               <div>
                 <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi</label>
                 <textarea id="description" name="description" rows={2} value={currentItem.description ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lokasi</label>
                   <input type="text" id="location" name="location" value={currentItem.location ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                 </div>
                 <div>
                   <label htmlFor="responsible" className="block text-sm font-medium text-gray-700">Penanggung Jawab</label>
                   <input type="text" id="responsible" name="responsible" value={currentItem.responsible ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                 </div>
               </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
                  <select id="category" name="category" value={currentItem.category ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500">
                    <option value="">-- Pilih Kategori --</option>
                    <option value="PERSIAPAN">Persiapan</option>
                    <option value="UPACARA">Upacara</option>
                    <option value="RESEPSI">Resepsi</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
               </div>
               <div>
                 <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan</label>
                 <textarea id="notes" name="notes" rows={2} value={currentItem.notes ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
               </div>
               {/* Form Actions */}
               <div className="flex justify-end pt-4">
                 <button type="button" onClick={resetForm} className="mr-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Batal</button>
                 <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center">
                   {isSaving ? <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (editingItemId ? <FiCheck/> : <FiPlus/>)}
                   {isSaving ? 'Menyimpan...' : (editingItemId ? 'Update Item' : 'Simpan Item')}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-10 text-gray-500">Memuat rundown...</div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
          <strong className="font-bold">Oops!</strong>
          <span className="block sm:inline"> {error}</span>
          <button onClick={fetchRundownItems} className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">Coba Lagi</button>
        </div>
      )}

       {/* Button to Add New Item - Placed outside the loop */}
       <div className="text-right mb-4">
            <button
                onClick={() => {
                    resetForm(); // Ensure form starts empty with today's date
                    setIsFormVisible(true);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center shadow-sm disabled:opacity-50 ml-auto"
                disabled={isLoading || isSaving}
                title="Tambah Item Rundown Baru"
            >
                <FiPlus className="mr-1" /> Tambah Item
            </button>
        </div>

      {/* Rundown List - Grouped by Date */} 
      {!isLoading && sortedDates.length > 0 && (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date} className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <h2 className="text-lg font-semibold flex items-center">
                    <FiCalendar className="mr-2 text-red-500" /> {formatFullDate(date)}
                  </h2>
                  {/* Optional: Button to add item specifically to this date */} 
                   <button
                     onClick={() => {
                        resetForm();
                        setFormDate(date); // Pre-fill date for this day
                        // Also update the initial times based on this date
                        setCurrentItem(prev => ({
                           ...prev,
                           startTime: new Date(`${date}T09:00:00`), // Default start time for new item
                           endTime: new Date(`${date}T10:00:00`)   // Default end time
                        }));
                        setIsFormVisible(true);
                      }}
                      className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 flex items-center"
                      title={`Tambah item untuk ${formatFullDate(date)}`}
                   >
                      <FiPlus size={14} className="mr-1"/> Tambah Acara
                   </button>
              </div>
              <div className="space-y-4">
                {groupedRundown[date].map((item, index) => (
                  <div key={item.id} className="flex items-start space-x-4 relative pl-6">
                     {/* Timeline Line */}
                     <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-200"></div>
                     {/* Timeline Dot */}
                     <div className="absolute left-[-5px] top-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                    {/* Time */}
                    <div className="text-right w-16 flex-shrink-0">
                      <p className="text-sm font-medium text-gray-700">{formatTime(item.startTime)}</p>
                      <p className="text-xs text-gray-500">s/d {formatTime(item.endTime)}</p>
                    </div>
                    {/* Details */}
                    <div className="flex-grow pb-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                           <h3 className="font-semibold text-gray-800">{item.title}</h3>
                           {item.category && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full mr-1">{item.category}</span>}
                           {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                           <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              {item.location && <span className="flex items-center"><FiMapPin className="mr-1"/> {item.location}</span>}
                              {item.responsible && <span className="flex items-center"><FiUsers className="mr-1"/> {item.responsible}</span>}
                           </div>
                            {item.notes && <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 p-1 rounded border border-dashed">Catatan: {item.notes}</p>}
                        </div>
                        {/* Actions */}
                        <div className="flex space-x-1 flex-shrink-0 ml-2">
                          <button onClick={() => handleEditItem(item.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" title="Edit Item">
                             <FiEdit2 size={16}/>
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Hapus Item">
                             <FiTrash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

       {/* No Rundown Items Message */}
      {!isLoading && sortedDates.length === 0 && !error && (
        <div className="text-center py-10 text-gray-500">
          Belum ada item rundown yang ditambahkan.
        </div>
      )}
    </div>
  );
} 