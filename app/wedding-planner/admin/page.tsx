'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiCheck, FiX, FiFile, FiFileText, FiCalendar, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import { DEMO_WEDDING_ID } from '../constants';
import toast from 'react-hot-toast';

// Type definitions
type DocumentStatus = 'not-started' | 'in-progress' | 'completed';

interface AdminDocument {
  id: string;
  weddingId: string;
  name: string;
  description: string | null;
  deadline: Date | null;
  location: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; // Ensure enum type
  isMandatory: boolean;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to format date
const formatDate = (date: Date | null | string): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    console.error("Error formatting date:", date, e);
    return 'Invalid Date';
  }
};

// Helper function to get status label and color
const getStatusProps = (status: AdminDocument['status']) => {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Selesai', color: 'bg-green-100 text-green-800', icon: <FiCheckCircle className="mr-1 inline"/> };
    case 'IN_PROGRESS':
      return { label: 'Dalam Proses', color: 'bg-yellow-100 text-yellow-800', icon: <FiClock className="mr-1 inline"/> };
    case 'NOT_STARTED':
    default:
      return { label: 'Belum Dimulai', color: 'bg-gray-100 text-gray-800', icon: <FiFileText className="mr-1 inline"/> };
  }
};

// Demo Data (aligned with interface)
const demoDocuments: AdminDocument[] = [
  {
    id: 'demo-1',
    weddingId: DEMO_WEDDING_ID,
    name: 'Form N1 (Surat Keterangan Nikah) (Demo)',
    description: 'Surat keterangan untuk nikah yang dikeluarkan oleh kepala desa/lurah',
    deadline: new Date('2024-10-15'),
    location: 'Kelurahan tempat tinggal',
    status: 'COMPLETED',
    isMandatory: true,
    notes: 'Harus membawa KTP asli dan fotokopi',
    attachmentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-2',
    weddingId: DEMO_WEDDING_ID,
    name: 'Form N3 (Surat Persetujuan Mempelai) (Demo)',
    description: 'Surat persetujuan mempelai',
    deadline: new Date('2024-10-20'),
    location: 'KUA',
    status: 'IN_PROGRESS',
    isMandatory: true,
    notes: 'Ditandatangani oleh kedua mempelai',
    attachmentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
   {
    id: 'demo-3',
    weddingId: DEMO_WEDDING_ID,
    name: 'Fotokopi KTP (Demo)',
    description: 'Fotokopi KTP kedua mempelai',
    deadline: new Date('2024-11-15'),
    location: 'Fotokopi',
    status: 'NOT_STARTED',
    isMandatory: true,
    notes: 'Masing-masing 5 lembar',
    attachmentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Initial empty state for the form (aligned with interface)
const emptyDocument: Omit<AdminDocument, 'id' | 'weddingId' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: null,
  deadline: null,
  location: null,
  status: 'NOT_STARTED',
  isMandatory: false,
  notes: null,
  attachmentUrl: null,
};

export default function AdminPage() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState(emptyDocument);

  const weddingId = DEMO_WEDDING_ID; // Use constant for now

  // Fetch Documents Function
  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wedding/${weddingId}/documents`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error (Fetch Docs):", errorData);
        throw new Error(`Failed to fetch documents (${response.status})`);
      }
      const data = await response.json();
      if (data && Array.isArray(data)) {
        const processedData = data.map(doc => ({
          ...doc,
          deadline: doc.deadline ? new Date(doc.deadline) : null,
          isMandatory: Boolean(doc.isMandatory),
          createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        }));
        setDocuments(processedData);
        console.log(`Documents loaded from API: ${processedData.length}`);
        // Optionally use demo data if API returns empty
        if (processedData.length === 0) {
          console.log("API returned no documents, showing demo data.");
          setDocuments(demoDocuments);
        }
      } else {
        console.log("Invalid data structure from API, using demo data.");
        setDocuments(demoDocuments);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError(`Failed to load documents. ${err instanceof Error ? err.message : 'Unknown error'}. Using demo data.`);
      setDocuments(demoDocuments); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents on initial mount
  useEffect(() => {
    fetchDocuments();
  }, [weddingId]);

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentDocument(prev => {
      if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        return { ...prev, [name]: checked };
      } else if (name === 'deadline') {
        return { ...prev, [name]: value ? new Date(value) : null };
      }
      return { ...prev, [name]: value === '' ? null : value }; // Set to null if empty, otherwise use value
    });
  };

  const resetForm = () => {
    setCurrentDocument(emptyDocument);
    setEditingDocumentId(null);
    setIsFormVisible(false);
    setError(null);
  };

  // --- CRUD Operations ---
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Prepare payload, ensure date is ISO string or null
    const payload = {
      ...currentDocument,
      deadline: currentDocument.deadline instanceof Date ? currentDocument.deadline.toISOString() : null,
    };

    try {
      const url = editingDocumentId
        ? `/api/wedding/${weddingId}/documents/${editingDocumentId}`
        : `/api/wedding/${weddingId}/documents`;
      const method = editingDocumentId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Save Error Response:", errorData);
        throw new Error(`Failed to ${editingDocumentId ? 'update' : 'create'} document (${response.status})`);
      }

      const savedDocument = await response.json();

       // Process saved data before updating state
      const processedSavedDoc = {
        ...savedDocument,
        deadline: savedDocument.deadline ? new Date(savedDocument.deadline) : null,
        isMandatory: Boolean(savedDocument.isMandatory),
        createdAt: savedDocument.createdAt ? new Date(savedDocument.createdAt) : undefined,
        updatedAt: savedDocument.updatedAt ? new Date(savedDocument.updatedAt) : undefined,
      };

      if (editingDocumentId) {
        setDocuments(documents.map(doc => doc.id === editingDocumentId ? processedSavedDoc : doc));
        toast.success('Dokumen berhasil diperbarui!');
      } else {
        setDocuments([...documents, processedSavedDoc]);
        toast.success('Dokumen berhasil ditambahkan!');
      }
      resetForm();
    } catch (err) {
      console.error(`Error saving document:`, err);
      setError(`Gagal menyimpan dokumen. ${err instanceof Error ? err.message : 'Unknown error'}.`);
      toast.error('Gagal menyimpan dokumen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDocument = (docId: string) => {
    const docToEdit = documents.find(doc => doc.id === docId);
    if (docToEdit) {
      setCurrentDocument({
        name: docToEdit.name,
        description: docToEdit.description,
        deadline: docToEdit.deadline,
        location: docToEdit.location,
        status: docToEdit.status,
        isMandatory: docToEdit.isMandatory,
        notes: docToEdit.notes,
        attachmentUrl: docToEdit.attachmentUrl,
      });
      setEditingDocumentId(docId);
      setIsFormVisible(true);
      setError(null);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;

    // Optimistic UI update (optional)
    // const previousDocuments = documents;
    // setDocuments(documents.filter(doc => doc.id !== docId));

    setIsLoading(true); // Use loading state for delete as well
    setError(null);

    try {
      const response = await fetch(`/api/wedding/${weddingId}/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert optimistic update if using
        // setDocuments(previousDocuments);
        const errorData = await response.json().catch(() => ({}));
        console.error("Delete Error:", errorData);
        throw new Error(`Failed to delete document (${response.status})`);
      }

      // Confirm successful deletion by refetching or filtering state
      // If not using optimistic UI, filter state here:
       setDocuments(documents.filter(doc => doc.id !== docId));
      toast.success('Dokumen berhasil dihapus!');

    } catch (err) {
      console.error('Error deleting document:', err);
      setError(`Gagal menghapus dokumen. ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Gagal menghapus dokumen.');
       // Revert optimistic update if using
       // setDocuments(previousDocuments);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculations for Summary ---
  const totalDocuments = documents.length;
  const completedCount = documents.filter(doc => doc.status === 'COMPLETED').length;
  const inProgressCount = documents.filter(doc => doc.status === 'IN_PROGRESS').length;
  const notStartedCount = documents.filter(doc => doc.status === 'NOT_STARTED').length;
  const completionPercentage = totalDocuments > 0 ? Math.round((completedCount / totalDocuments) * 100) : 0;

  // --- Render ---
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Dokumen Administrasi</h1>
      </div>
      
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow flex items-center">
          <FiFileText className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <p className="text-sm text-blue-700">Total Dokumen</p>
            <p className="text-2xl font-bold text-blue-900">{isLoading ? '-' : totalDocuments}</p>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow flex items-center">
           <FiCheckCircle className="w-8 h-8 text-green-500 mr-3" />
           <div>
            <p className="text-sm text-green-700">Selesai</p>
            <p className="text-2xl font-bold text-green-900">{isLoading ? '-' : completedCount}</p>
            {!isLoading && totalDocuments > 0 && <p className="text-xs text-green-600">{completionPercentage}% dari total</p>}
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg shadow flex items-center">
          <FiClock className="w-8 h-8 text-yellow-500 mr-3" />
          <div>
            <p className="text-sm text-yellow-700">Dalam Proses</p>
            <p className="text-2xl font-bold text-yellow-900">{isLoading ? '-' : inProgressCount}</p>
          </div>
        </div>
        
         <div className="bg-gray-50 p-4 rounded-lg shadow flex items-center">
           <FiAlertCircle className="w-8 h-8 text-gray-500 mr-3" />
           <div>
            <p className="text-sm text-gray-700">Belum Dimulai</p>
            <p className="text-2xl font-bold text-gray-900">{isLoading ? '-' : notStartedCount}</p>
          </div>
        </div>
      </div>
      
      {/* Main Table/List Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Daftar Dokumen</h2>
          <button
            onClick={() => {
              resetForm();
              setIsFormVisible(true);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center shadow-sm disabled:opacity-50"
            disabled={isLoading || isSaving}
          >
            <FiPlus className="mr-1" /> Tambah Dokumen
          </button>
        </div>

         {/* Add/Edit Form Modal */}
         {isFormVisible && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
             <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-semibold">{editingDocumentId ? 'Edit Dokumen' : 'Tambah Dokumen Baru'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                   <FiX size={24} />
                 </button>
               </div>
               {/* Form Error Display */}
                {error && !isSaving && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                  </div>
                )}
               <form onSubmit={handleSaveDocument} className="space-y-4">
                 {/* Form Fields Here */}
                 <div>
                   <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Dokumen <span className="text-red-500">*</span></label>
                   <input type="text" id="name" name="name" value={currentDocument.name} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500" />
                 </div>
                 <div>
                   <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi</label>
                   <textarea id="description" name="description" rows={2} value={currentDocument.description ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"></textarea>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lokasi Pengurusan</label>
                      <input type="text" id="location" name="location" value={currentDocument.location ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500" />
                    </div>
                   <div>
                     <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">Tenggat Waktu</label>
                     <input type="date" id="deadline" name="deadline" value={currentDocument.deadline ? currentDocument.deadline.toISOString().split('T')[0] : ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500" />
                   </div>
                 </div>
                  <div>
                   <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                   <select id="status" name="status" value={currentDocument.status} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500">
                     <option value="NOT_STARTED">Belum Dimulai</option>
                     <option value="IN_PROGRESS">Dalam Proses</option>
                     <option value="COMPLETED">Selesai</option>
                   </select>
                 </div>
                  <div>
                   <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan</label>
                   <textarea id="notes" name="notes" rows={2} value={currentDocument.notes ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"></textarea>
                 </div>
                  <div>
                   <label htmlFor="attachmentUrl" className="block text-sm font-medium text-gray-700">URL Lampiran (Opsional)</label>
                   <input type="url" id="attachmentUrl" name="attachmentUrl" value={currentDocument.attachmentUrl ?? ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500" placeholder="https://example.com/dokumen.pdf" />
                 </div>
                 <div className="flex items-center">
                   <input type="checkbox" id="isMandatory" name="isMandatory" checked={currentDocument.isMandatory} onChange={handleInputChange} className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                   <label htmlFor="isMandatory" className="ml-2 block text-sm text-gray-900">Dokumen Wajib</label>
                 </div>
                 {/* Form Actions */}
                 <div className="flex justify-end pt-4">
                   <button type="button" onClick={resetForm} className="mr-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                     Batal
                   </button>
                   <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center">
                     {isSaving ? (
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     ) : (editingDocumentId ? <FiCheck className="mr-1"/> : <FiPlus className="mr-1"/>)}
                     {isSaving ? 'Menyimpan...' : (editingDocumentId ? 'Update Dokumen' : 'Simpan Dokumen')}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-10 text-gray-500">
            <p>Memuat dokumen...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-center" role="alert">
             <strong className="font-bold">Oops! Terjadi Kesalahan</strong>
             <span className="block sm:inline"> {error}</span>
             <button onClick={fetchDocuments} className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
               Coba Lagi
             </button>
          </div>
        )}

        {/* Document List Table */}
        {!isLoading && documents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dokumen</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenggat</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => {
                  const statusProps = getStatusProps(doc.status);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.name} {doc.isMandatory && <span className="ml-1 text-xs text-red-500 font-normal">(Wajib)</span>}</div>
                        <div className="text-xs text-gray-500">{doc.description || '-'}</div>
                        {doc.notes && <div className="text-xs text-gray-500 mt-1 italic">Catatan: {doc.notes}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.location || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.deadline)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusProps.color}`}>
                          {statusProps.icon} {statusProps.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleEditDocument(doc.id)} className="text-indigo-600 hover:text-indigo-900" title="Edit Dokumen">
                          <FiEdit2 className="w-4 h-4 inline"/>
                        </button>
                        <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-900" title="Hapus Dokumen">
                          <FiTrash2 className="w-4 h-4 inline"/>
                        </button>
                         {/* Optional: Button to change status quickly */} 
                         {/* <button onClick={() => handleChangeStatus(doc.id, getNextStatus(doc.status))} className="text-gray-500 hover:text-gray-700" title="Ubah Status">...</button> */} 
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* No Documents Message */} 
        {!isLoading && documents.length === 0 && !error && (
          <div className="text-center py-10 text-gray-500">
            <p>Belum ada dokumen administrasi yang ditambahkan.</p>
          </div>
        )}
      </div>
    </div>
  );
} 