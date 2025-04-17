'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiPlus, FiTrash2, FiEdit2, FiPhone, FiMail, FiMapPin, FiX, FiImage, FiDollarSign, FiCalendar, FiCheck, FiUsers } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DEMO_WEDDING_ID } from "../constants";

// Align interface with Prisma Schema
interface Venue {
  id: string;
  weddingId: string;
  name: string;
  address: string;
  // description?: string; // Removed as it's not in the latest Prisma schema
  capacity: number | null;
  priceRange: string | null; // Changed from pricePerDay
  features: string | null; // Stored as comma-separated string in DB
  imageUrl: string | null;
  isBooked: boolean; // Changed from bookingStatus and status
  bookingDate: Date | null;
  depositAmount: number | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  createdAt?: Date; // Optional, added based on schema
  updatedAt?: Date; // Optional, added based on schema
}

// Venue features list (can still be used for selection)
const venueFeaturesList = [
  'Indoor', 'Outdoor', 'Parkir Luas', 'AC', 'Ruang Ganti', 'Katering',
  'Dekorasi', 'Lighting', 'Sound System', 'Taman', 'Gazebo', 'Kolam Renang',
  'Penginapan', 'Valet', 'Free WiFi', 'Generator', 'Bridal Suite'
];

// Helper to parse features string to array
const parseFeatures = (featuresString: string | null): string[] => {
  if (!featuresString) return [];
  return featuresString.split(',').map(f => f.trim()).filter(f => f !== '');
};

// Helper to format features array to string
const formatFeatures = (featuresArray: string[] | null): string => {
  if (!featuresArray) return '';
  return featuresArray.join(',');
};

const demoVenues: Venue[] = [
  {
    id: '1',
    weddingId: DEMO_WEDDING_ID,
    name: 'Gedung Serbaguna Senayan (Demo)',
    address: 'Jl. Senayan No. 1, Jakarta Selatan',
    capacity: 1000,
    priceRange: '20000000-30000000', // Updated field
    features: 'AC,Parkir Luas,Ruang Rias,Sound System', // Stored as string
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1374&q=80',
    isBooked: false, // Updated field
    bookingDate: null,
    depositAmount: null,
    contactPerson: 'Pak Budi',
    phone: '081234567890',
    email: 'budi@senayan.com',
    website: 'www.senayanvenue.com',
    notes: 'Tersedia catering in-house (Demo Data)',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

// Align initial empty state with Prisma Schema
const emptyVenue: Omit<Venue, 'id' | 'createdAt' | 'updatedAt'> = {
  weddingId: DEMO_WEDDING_ID,
  name: '',
  address: '',
  capacity: null,
  priceRange: null,
  features: null,
  imageUrl: null,
  isBooked: false,
  bookingDate: null,
  depositAmount: null,
  contactPerson: null,
  phone: null,
  email: null,
  website: null,
  notes: null,
};


export default function VenuePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Renamed for clarity
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'booked' | 'available'>('all'); // Filter state

  // Demo wedding ID for testing (replace with actual logic if needed)
  const weddingId = DEMO_WEDDING_ID;

  // State for the add/edit form, aligned with the interface
  const [currentVenue, setCurrentVenue] = useState<Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>>(emptyVenue);

  // Function to fetch venues
  const fetchVenues = async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/wedding/${weddingId}/venues`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        console.error("API Error Response:", errorData);
        throw new Error(`Failed to fetch venues (${response.status})`);
      }
      const data = await response.json();
      if (data && Array.isArray(data)) {
         // Process data: ensure dates are Date objects, capacity is number
         const processedData = data.map(venue => ({
          ...venue,
          features: venue.features || null, // Keep as string or null initially
          capacity: venue.capacity !== null ? Number(venue.capacity) : null,
          priceRange: venue.priceRange || null,
          depositAmount: venue.depositAmount !== null ? Number(venue.depositAmount) : null,
          isBooked: Boolean(venue.isBooked),
          bookingDate: venue.bookingDate ? new Date(venue.bookingDate) : null,
          createdAt: venue.createdAt ? new Date(venue.createdAt) : undefined,
          updatedAt: venue.updatedAt ? new Date(venue.updatedAt) : undefined,
        }));
        setVenues(processedData);
        console.log(`Venues loaded from API: ${processedData.length}`);
        if (processedData.length === 0) {
          console.log("API returned empty array, showing demo data as fallback.");
          setVenues(demoVenues); // Use demo if API returns empty
        }
      } else {
        console.log("Invalid data structure from API, using demo data.");
        setVenues(demoVenues); // Fallback to demo data
      }
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError(`Failed to load venues. ${err instanceof Error ? err.message : 'Unknown error'}. Using demo data.`);
      setVenues(demoVenues); // Use demo data as fallback on error
    } finally {
      setIsLoading(false);
    }
  };

  // Call fetchVenues on initial mount
  useEffect(() => {
    fetchVenues();
  }, [weddingId]); // Re-fetch if weddingId changes

  // Reset form function
  const resetForm = () => {
    setCurrentVenue(emptyVenue);
    setEditingVenueId(null);
    setIsAddFormVisible(false);
    setError(null); // Clear errors on form reset/close
  };

  // --- Start of Form Handlers ---

  // Handle simple input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setCurrentVenue(prev => {
       if (type === 'checkbox') {
         // Handle checkbox (isBooked)
         const { checked } = e.target as HTMLInputElement;
         return { ...prev, [name]: checked };
       } else if (name === 'capacity' || name === 'depositAmount') {
         // Handle numeric fields
         return { ...prev, [name]: value === '' ? null : Number(value) };
       } else if (name === 'bookingDate') {
         // Handle date field
         return { ...prev, [name]: value ? new Date(value) : null };
       }
      return { ...prev, [name]: value };
    });
  };

  // Handle feature toggling using checkboxes based on venueFeaturesList
   const handleFeatureChange = (feature: string) => {
    const currentFeaturesArray = parseFeatures(currentVenue.features);
    let updatedFeaturesArray;
    if (currentFeaturesArray.includes(feature)) {
      updatedFeaturesArray = currentFeaturesArray.filter(f => f !== feature);
    } else {
      updatedFeaturesArray = [...currentFeaturesArray, feature];
    }
    setCurrentVenue(prev => ({ ...prev, features: formatFeatures(updatedFeaturesArray) }));
  };

  // --- End of Form Handlers ---


  // Save venue function (POST/PUT)
  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const venuePayload = {
      ...currentVenue,
      // Ensure features is a string for the API
      features: typeof currentVenue.features === 'string' ? currentVenue.features : formatFeatures(parseFeatures(currentVenue.features)),
       // Make sure numeric fields are numbers or null
      capacity: currentVenue.capacity !== null ? Number(currentVenue.capacity) : null,
      depositAmount: currentVenue.depositAmount !== null ? Number(currentVenue.depositAmount) : null,
      // Ensure date is ISO string or null
      bookingDate: currentVenue.bookingDate instanceof Date ? currentVenue.bookingDate.toISOString() : null,
    };

    // Remove id if it's a new venue (empty string id from initial state)
    if (!editingVenueId) {
      // delete venuePayload.id; // Prisma handles ID generation
    }


    try {
      const url = editingVenueId
        ? `/api/wedding/${weddingId}/venues/${editingVenueId}`
        : `/api/wedding/${weddingId}/venues`;
      const method = editingVenueId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venuePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Save Error Response:", errorData);
        throw new Error(`Failed to ${editingVenueId ? 'update' : 'create'} venue (${response.status})`);
      }

      const savedVenue = await response.json();

       // Process saved data (like API fetch) before updating state
       const processedSavedVenue = {
         ...savedVenue,
         features: savedVenue.features || null,
         capacity: savedVenue.capacity !== null ? Number(savedVenue.capacity) : null,
         priceRange: savedVenue.priceRange || null,
         depositAmount: savedVenue.depositAmount !== null ? Number(savedVenue.depositAmount) : null,
         isBooked: Boolean(savedVenue.isBooked),
         bookingDate: savedVenue.bookingDate ? new Date(savedVenue.bookingDate) : null,
         createdAt: savedVenue.createdAt ? new Date(savedVenue.createdAt) : undefined,
         updatedAt: savedVenue.updatedAt ? new Date(savedVenue.updatedAt) : undefined,
       };


      if (editingVenueId) {
        // Update existing venue in the list
        setVenues(venues.map(v => v.id === editingVenueId ? processedSavedVenue : v));
        toast.success("Venue berhasil diperbarui!");
      } else {
        // Add new venue to the list
        setVenues([...venues, processedSavedVenue]);
        toast.success("Venue berhasil ditambahkan!");
      }

      resetForm(); // Close form and reset state

    } catch (err) {
      console.error(`Error ${editingVenueId ? 'updating' : 'creating'} venue:`, err);
      setError(`Gagal menyimpan venue. ${err instanceof Error ? err.message : 'Unknown error'}.`);
      // Keep form open with data if save fails
    } finally {
      setIsSaving(false);
    }
  };


  // Edit venue: Populate form with existing data
  const handleEditVenue = (venueId: string) => {
    const venueToEdit = venues.find((v) => v.id === venueId);
    if (venueToEdit) {
      // Make sure to pass the correct structure to the form state
       setCurrentVenue({
        weddingId: venueToEdit.weddingId,
        name: venueToEdit.name || '',
        address: venueToEdit.address || '',
        capacity: venueToEdit.capacity,
        priceRange: venueToEdit.priceRange,
        features: venueToEdit.features, // Keep as string/null for form state
        imageUrl: venueToEdit.imageUrl,
        isBooked: venueToEdit.isBooked,
        bookingDate: venueToEdit.bookingDate,
        depositAmount: venueToEdit.depositAmount,
        contactPerson: venueToEdit.contactPerson,
        phone: venueToEdit.phone,
        email: venueToEdit.email,
        website: venueToEdit.website,
        notes: venueToEdit.notes,
      });
      setEditingVenueId(venueId);
      setIsAddFormVisible(true);
      setError(null); // Clear error when opening edit form
    }
  };

  // Delete venue function
  const handleDeleteVenue = async (id: string) => {
     if (!confirm("Apakah Anda yakin ingin menghapus venue ini? Data tidak dapat dikembalikan.")) {
      return;
    }
    setIsLoading(true); // Indicate loading state during delete
    setError(null);

    try {
      const response = await fetch(`/api/wedding/${weddingId}/venues/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         console.error("Delete Error Response:", errorData);
        throw new Error(`Failed to delete venue (${response.status})`);
      }

      // Update venues state by filtering out the deleted venue
      setVenues(venues.filter(venue => venue.id !== id));
      toast.success("Venue berhasil dihapus!");
    } catch (err) {
      console.error("Error deleting venue:", err);
      setError(`Gagal menghapus venue. ${err instanceof Error ? err.message : 'Unknown error'}.`);
      toast.error("Gagal menghapus venue."); // More user-friendly toast
    } finally {
       setIsLoading(false);
    }
  };


  // --- Filtering Logic ---
  const filteredVenues = venues.filter(venue => {
    if (selectedStatusFilter === 'all') return true;
    if (selectedStatusFilter === 'booked') return venue.isBooked;
    if (selectedStatusFilter === 'available') return !venue.isBooked;
    return true; // Should not happen, but default to all
  });

  // --- UI Helper Functions ---
  const getStatusColor = (isBooked: boolean) => {
    return isBooked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (isBooked: boolean) => {
    return isBooked ? 'Sudah Booking' : 'Tersedia';
  };

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4 text-gray-600 hover:text-gray-800">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Venue</h1>
      </div>

      {/* Summary/Stats Cards (Optional - can be added later) */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"> ... </div> */}

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Toolbar: Add Button & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
             <h2 className="text-lg font-semibold text-gray-700">Daftar Venue</h2>
             <p className="text-sm text-gray-500">Kelola semua pilihan venue pernikahan Anda.</p>
          </div>
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
             <button
               onClick={() => setSelectedStatusFilter('all')}
               className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                 selectedStatusFilter === 'all'
                   ? 'bg-gray-800 text-white shadow-sm'
                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
               }`}
             >
               Semua ({venues.length})
             </button>
             <button
               onClick={() => setSelectedStatusFilter('booked')}
               className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                 selectedStatusFilter === 'booked'
                   ? 'bg-green-600 text-white shadow-sm'
                   : 'bg-green-100 text-green-800 hover:bg-green-200'
               }`}
             >
               Booked ({venues.filter(v => v.isBooked).length})
             </button>
              <button
               onClick={() => setSelectedStatusFilter('available')}
               className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                 selectedStatusFilter === 'available'
                   ? 'bg-yellow-500 text-white shadow-sm'
                   : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
               }`}
             >
               Tersedia ({venues.filter(v => !v.isBooked).length})
             </button>
          </div>
           <button
             onClick={() => {
                resetForm(); // Ensure form is empty when adding new
                setIsAddFormVisible(true);
             }}
             className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center transition-colors shadow-sm disabled:opacity-50"
             disabled={isSaving || isLoading} // Disable while saving/loading
           >
             <FiPlus className="mr-1" /> Tambah Venue
           </button>
        </div>


        {/* Add/Edit Form Modal (Simplified - Render conditionally) */}
        {isAddFormVisible && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
             <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-semibold">{editingVenueId ? 'Edit Venue' : 'Tambah Venue Baru'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                   <FiX size={24} />
                 </button>
               </div>
                {/* Display form error */}
                {error && !isSaving && ( // Show form-specific error only when not saving
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                  </div>
                )}
               <form onSubmit={handleSaveVenue} className="space-y-4">
                 {/* Form Fields */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Name */}
                   <div>
                     <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Venue <span className="text-red-500">*</span></label>
                     <input type="text" id="name" name="name" value={currentVenue.name} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Address */}
                   <div>
                     <label htmlFor="address" className="block text-sm font-medium text-gray-700">Alamat</label>
                     <input type="text" id="address" name="address" value={currentVenue.address ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Capacity */}
                   <div>
                     <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">Kapasitas (orang)</label>
                     <input type="number" id="capacity" name="capacity" value={currentVenue.capacity ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                    {/* Price Range */}
                   <div>
                     <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700">Range Harga (contoh: 10jt-15jt)</label>
                     <input type="text" id="priceRange" name="priceRange" value={currentVenue.priceRange ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Image URL */}
                   <div>
                     <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL Gambar</label>
                     <input type="url" id="imageUrl" name="imageUrl" value={currentVenue.imageUrl ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Contact Person */}
                   <div>
                     <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">Contact Person</label>
                     <input type="text" id="contactPerson" name="contactPerson" value={currentVenue.contactPerson ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Phone */}
                   <div>
                     <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telepon</label>
                     <input type="tel" id="phone" name="phone" value={currentVenue.phone ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Email */}
                   <div>
                     <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                     <input type="email" id="email" name="email" value={currentVenue.email ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Website */}
                   <div>
                     <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                     <input type="url" id="website" name="website" value={currentVenue.website ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                    {/* Deposit Amount */}
                   <div>
                     <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">Jumlah Deposit (Rp)</label>
                     <input type="number" id="depositAmount" name="depositAmount" value={currentVenue.depositAmount ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
                   </div>
                   {/* Booking Date */}
                   <div>
                     <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-700">Tanggal Booking</label>
                     <input
                      type="date"
                      id="bookingDate"
                      name="bookingDate"
                      value={currentVenue.bookingDate instanceof Date ? currentVenue.bookingDate.toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                     />
                   </div>
                   {/* Is Booked Checkbox */}
                   <div className="flex items-center mt-4 col-span-1 md:col-span-2">
                     <input
                       type="checkbox"
                       id="isBooked"
                       name="isBooked"
                       checked={currentVenue.isBooked}
                       onChange={handleInputChange}
                       className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                     />
                     <label htmlFor="isBooked" className="ml-2 block text-sm text-gray-900">
                       Tandai sebagai Sudah Dibooking
                     </label>
                   </div>
                 </div>

                {/* Features Checkboxes */}
                <div className="col-span-1 md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-2">Fitur Venue</label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                     {venueFeaturesList.map(feature => (
                       <div key={feature} className="flex items-center">
                         <input
                           type="checkbox"
                           id={`feature-${feature}`}
                           name={`feature-${feature}`}
                           checked={parseFeatures(currentVenue.features).includes(feature)}
                           onChange={() => handleFeatureChange(feature)}
                           className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                         />
                         <label htmlFor={`feature-${feature}`} className="ml-2 block text-sm text-gray-700">
                           {feature}
                         </label>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Notes */}
                 <div className="col-span-1 md:col-span-2">
                   <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan Tambahan</label>
                   <textarea id="notes" name="notes" rows={3} value={currentVenue.notes ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"></textarea>
                 </div>

                 {/* Form Actions */}
                 <div className="flex justify-end pt-4">
                   <button type="button" onClick={resetForm} className="mr-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                     Batal
                   </button>
                   <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center">
                      {isSaving ? (
                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                      ) : (editingVenueId ? <FiCheck className="mr-1"/> : <FiPlus className="mr-1"/>) }
                     {isSaving ? 'Menyimpan...' : (editingVenueId ? 'Update Venue' : 'Simpan Venue')}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}

        {/* Loading State */}
        {isLoading && !isAddFormVisible && ( // Don't show list loading when form is open
          <div className="flex justify-center items-center py-12">
             <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className="ml-2 text-gray-600">Memuat data venue...</span>
          </div>
        )}

         {/* Display List Error */}
         {error && !isLoading && !isAddFormVisible && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
             <strong className="font-bold">Oops!</strong>
             <span className="block sm:inline"> {error}</span>
             <button onClick={() => fetchVenues()} className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
               Coba Lagi
             </button>
          </div>
        )}

        {/* Venue List */}
        {!isLoading && venues.length > 0 && (
          <div className="space-y-4">
            {filteredVenues.map((venue) => {
              const venueFeaturesArray = parseFeatures(venue.features); // Parse for display
              return (
                <div key={venue.id} className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow duration-200">
                  {/* Image */}
                  <div className="flex-shrink-0 w-full md:w-48 h-32 md:h-auto">
                    <img
                      src={venue.imageUrl || 'https://via.placeholder.com/150/CCCCCC/808080?text=No+Image'} // Placeholder image
                      alt={venue.name}
                      className="w-full h-full object-cover rounded-md"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150/CCCCCC/808080?text=No+Image'; }} // Fallback on image error
                    />
                  </div>
                  {/* Details */}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-semibold text-gray-800">{venue.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(venue.isBooked)}`}>
                        {getStatusLabel(venue.isBooked)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 flex items-center"><FiMapPin className="mr-1 inline-block w-4 h-4" /> {venue.address || 'Alamat tidak tersedia'}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                      <p><FiUsers className="mr-1 inline-block w-4 h-4" /> Kapasitas: {venue.capacity ? `${venue.capacity} orang` : '-'}</p>
                      <p><FiDollarSign className="mr-1 inline-block w-4 h-4" /> Harga: {venue.priceRange || '-'}</p>
                      <p><FiPhone className="mr-1 inline-block w-4 h-4" /> Kontak: {venue.contactPerson || '-'} ({venue.phone || '-'})</p>
                      <p><FiMail className="mr-1 inline-block w-4 h-4" /> Email: {venue.email || '-'}</p>
                      {venue.bookingDate && venue.isBooked && (
                         <p><FiCalendar className="mr-1 inline-block w-4 h-4" /> Booked: {new Date(venue.bookingDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      )}
                       {venue.depositAmount && venue.isBooked && (
                         <p><FiDollarSign className="mr-1 inline-block w-4 h-4" /> DP: Rp {venue.depositAmount.toLocaleString('id-ID')}</p>
                      )}
                    </div>
                    {/* Features */}
                     {venueFeaturesArray.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Fitur:</h4>
                        <div className="flex flex-wrap gap-1">
                          {venueFeaturesArray.map((feature: string) => (
                            <span key={feature} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                     )}
                     {/* Notes */}
                      {venue.notes && (
                         <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded border border-dashed border-gray-200">
                           <strong>Catatan:</strong> {venue.notes}
                         </p>
                      )}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col md:flex-row md:items-start gap-2 flex-shrink-0 pt-2 md:pt-0">
                     <button
                       onClick={() => handleEditVenue(venue.id)}
                       className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors flex items-center justify-center text-sm w-full md:w-auto"
                       title="Edit Venue"
                     >
                       <FiEdit2 className="w-4 h-4 mr-1" /> Edit
                     </button>
                     <button
                       onClick={() => handleDeleteVenue(venue.id)}
                       className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center text-sm w-full md:w-auto"
                       title="Hapus Venue"
                       disabled={isLoading} // Disable delete while loading
                     >
                       <FiTrash2 className="w-4 h-4 mr-1" /> Hapus
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Venues Message */}
        {!isLoading && venues.length === 0 && !isAddFormVisible && (
          <div className="text-center py-12 text-gray-500">
            <p>Belum ada data venue.</p>
            <button
              onClick={() => {
                 resetForm();
                 setIsAddFormVisible(true);
               }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <FiPlus className="inline-block mr-1 mb-0.5" /> Tambah Venue Pertama
            </button>
          </div>
        )}
      </div> {/* End Main Content Area */}
    </div>
  );
} 