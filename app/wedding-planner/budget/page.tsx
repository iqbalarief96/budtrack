'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiChevronLeft, FiEdit2, FiTrash2, FiDollarSign, FiPieChart, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// Demo data
const initialBudgetCategories = [
  {
    id: '1',
    name: 'Venue',
    total: 85000000,
    spent: 45000000,
    items: [
      { id: '101', name: 'Gedung Utama', budgeted: 80000000, actual: 40000000, paid: true },
      { id: '102', name: 'Area Outdoor', budgeted: 5000000, actual: 5000000, paid: false },
    ]
  },
  {
    id: '2',
    name: 'Katering',
    total: 50000000,
    spent: 5000000,
    items: [
      { id: '201', name: 'Menu Utama (250 pax)', budgeted: 40000000, actual: 0, paid: false },
      { id: '202', name: 'Snack & Minuman', budgeted: 10000000, actual: 5000000, paid: true },
    ]
  },
  {
    id: '3',
    name: 'Dekorasi',
    total: 35000000,
    spent: 10000000,
    items: [
      { id: '301', name: 'Dekorasi Pelaminan', budgeted: 25000000, actual: 10000000, paid: true },
      { id: '302', name: 'Bunga & Lighting', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '4',
    name: 'Pakaian',
    total: 30000000,
    spent: 15000000,
    items: [
      { id: '401', name: 'Baju Pengantin', budgeted: 20000000, actual: 15000000, paid: true },
      { id: '402', name: 'Keluarga', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '5',
    name: 'Fotografi & Videografi',
    total: 25000000,
    spent: 0,
    items: [
      { id: '501', name: 'Pre-Wedding', budgeted: 10000000, actual: 0, paid: false },
      { id: '502', name: 'Dokumentasi Acara', budgeted: 15000000, actual: 0, paid: false },
    ]
  },
  {
    id: '6',
    name: 'Entertaiment',
    total: 15000000,
    spent: 0,
    items: [
      { id: '601', name: 'MC', budgeted: 5000000, actual: 0, paid: false },
      { id: '602', name: 'Band/Music', budgeted: 10000000, actual: 0, paid: false },
    ]
  },
  {
    id: '7',
    name: 'Souvenir & Undangan',
    total: 10000000,
    spent: 0,
    items: [
      { id: '701', name: 'Souvenir (250 pcs)', budgeted: 7500000, actual: 0, paid: false },
      { id: '702', name: 'Undangan Digital & Fisik', budgeted: 2500000, actual: 0, paid: false },
    ]
  },
];

// Calculate total budget and spent
const calculateTotals = (categories: any[]) => {
  return categories.reduce(
    (acc, category) => ({
      total: acc.total + category.total,
      spent: acc.spent + category.spent
    }),
    { total: 0, spent: 0 }
  );
};

export default function BudgetPage() {
  const [budgetCategories, setBudgetCategories] = useState<Array<{
    id: string;
    name: string;
    total: number;
    spent: number;
    items: Array<{
      id: string;
      name: string;
      budgeted: number;
      actual: number;
      paid: boolean;
    }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showAddItemForm, setShowAddItemForm] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    budgeted: 0,
    actual: 0,
    paid: false
  });
  
  // New state for payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [defaultWallet, setDefaultWallet] = useState<string | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wedding, setWedding] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Add state for editing items
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  
  // Add state for syncing
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('Fetching categories...');
        
        const response = await fetch('/api/categories');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Categories API response:', data);
        
        if (data && Array.isArray(data)) {
          // Find expense category related to events or personal
          const expenseCategories = data.filter(cat => 
            cat.type === 'EXPENSE' && 
            (cat.name.toLowerCase().includes('event') || 
             cat.name.includes('personal') || 
             cat.name.toLowerCase().includes('entertainment'))
          );
          
          setCategories(data);
          console.log('Possible categories for wedding expense:', expenseCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Get default wallet
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        // Log untuk debug
        console.log('Fetching wallets...');
        
        // Ganti dengan API endpoint yang benar
        const response = await fetch('/api/wallets');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch wallets: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Wallet API response:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Found wallets:', data);
          
          // Format data sesuai kebutuhan
          const formattedWallets = data.map(wallet => ({
            id: wallet.id,
            name: wallet.name,
            balance: wallet.balance || 0,
            isDefault: wallet.isDefault || false
          }));
          
          setWallets(formattedWallets);
          
          // Find default wallet or use the first one
          const defaultWallet = formattedWallets.find(w => w.isDefault === true);
          if (defaultWallet) {
            console.log('Setting default wallet:', defaultWallet.name);
            setDefaultWallet(defaultWallet.id);
            setSelectedWallet(defaultWallet.id);
          } else if (formattedWallets.length > 0) {
            console.log('No default wallet found, using first wallet:', formattedWallets[0].name);
            setDefaultWallet(formattedWallets[0].id);
            setSelectedWallet(formattedWallets[0].id);
          } else {
            console.log('No wallets found');
          }
        } else {
          console.error('No wallets returned from API or invalid format');
          toast.error('Gagal memuat daftar wallet, silakan coba lagi');
        }
      } catch (error) {
        console.error('Error fetching wallets:', error);
        // Show more helpful error message
        if (error instanceof Error) {
          if (error.message.includes('404')) {
            toast.error('API wallet tidak ditemukan. Cek endpoint /api/wallets');
            console.log('API Error: Endpoint /api/wallets tidak ditemukan (404)');
          } else {
            toast.error(`Terjadi kesalahan: ${error.message}`);
          }
        } else {
          toast.error('Terjadi kesalahan saat memuat daftar wallet');
        }
      }
    };
    
    fetchWallets();
  }, []);
  
  // Add this new useEffect to fetch wedding first, then wedding budget data
  useEffect(() => {
    const fetchWeddingData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching wedding data...');
        
        // First fetch the active wedding
        const weddingResponse = await fetch('/api/wedding');
        
        if (!weddingResponse.ok) {
          if (weddingResponse.status === 404) {
            // If no wedding found, might need to create one
            console.log('No active wedding found, you may need to create one first');
            setError('No wedding found. Please create a wedding first.');
          } else {
            throw new Error(`Failed to fetch wedding: ${weddingResponse.status}`);
          }
          setIsLoading(false);
          return; // Exit early if no wedding
        }
        
        const weddingData = await weddingResponse.json();
        console.log('Wedding data:', weddingData);
        
        if (weddingData && weddingData.wedding) {
          setWedding(weddingData.wedding);
          
          // Now fetch the budget categories for this wedding
          console.log('Fetching wedding budget data...');
          const budgetResponse = await fetch('/api/wedding-budget');
          
          if (!budgetResponse.ok) {
            // Handle common errors
            if (budgetResponse.status === 404) {
              console.log('No budget data found for this wedding');
              // This is normal for a new wedding
              toast.success('Creating initial budget data...');
              
              // Try again after a short delay (give server time to create initial data)
              setTimeout(() => {
                fetchWeddingBudget(weddingData.wedding.id);
              }, 2000);
              
            } else {
              throw new Error(`Failed to fetch wedding budget: ${budgetResponse.status}`);
            }
          } else {
            const budgetData = await budgetResponse.json();
            console.log('Wedding budget data:', budgetData);
            
            if (budgetData && budgetData.budgetCategories) {
              // Replace dummy data with real data from API
              setBudgetCategories(budgetData.budgetCategories);
              console.log('Budget data loaded from API successfully');
              
              // Expand the first category by default if we have categories
              if (budgetData.budgetCategories.length > 0) {
                setExpandedCategories([budgetData.budgetCategories[0].id]);
              }
            }
          }
        } else {
          setError('No active wedding found. Please create a wedding first.');
        }
      } catch (error) {
        console.error('Error fetching wedding data:', error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Fallback to initial data in case of error
        setBudgetCategories(initialBudgetCategories);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWeddingData();
  }, []);
  
  // Add a helper function to fetch just the budget data
  const fetchWeddingBudget = async (weddingId: string) => {
    try {
      console.log('Retrying wedding budget fetch for wedding ID:', weddingId);
      const budgetResponse = await fetch('/api/wedding-budget');
      
      if (!budgetResponse.ok) {
        throw new Error(`Failed to fetch budget on retry: ${budgetResponse.status}`);
      }
      
      const budgetData = await budgetResponse.json();
      console.log('Wedding budget data (retry):', budgetData);
      
      if (budgetData && budgetData.budgetCategories) {
        setBudgetCategories(budgetData.budgetCategories);
        
        // Expand the first category
        if (budgetData.budgetCategories.length > 0) {
          setExpandedCategories([budgetData.budgetCategories[0].id]);
        }
        
        toast.success('Budget data loaded successfully!');
      }
    } catch (error) {
      console.error('Error in budget retry:', error);
      toast.error('Failed to load budget data. Please try again later.');
    }
  };
  
  // Calculate budget summary
  const budgetSummary = calculateTotals(budgetCategories);
  const percentageSpent = Math.round((budgetSummary.spent / budgetSummary.total) * 100);
  const remaining = budgetSummary.total - budgetSummary.spent;

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  const handleAddItem = async (categoryId: string) => {
    // Validate form
    if (!newItem.name || newItem.budgeted <= 0) {
      toast.error('Nama item dan anggaran wajib diisi!');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Saving new item to API...');
      
      const response = await fetch('/api/wedding-budget/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          name: newItem.name,
          budgeted: newItem.budgeted,
          actual: newItem.actual || 0,
          paid: newItem.paid || false
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add item: ${response.status}`);
      }
      
      const savedItem = await response.json();
      console.log('Item saved successfully:', savedItem);
      
      // Update the local state with the saved item
      setBudgetCategories(categories => 
        categories.map(category => {
          if (category.id === categoryId) {
            // Add new item to items array
            const newItemsList = [...category.items, savedItem];
            
            // Calculate new total for category
            const newTotal = category.total + newItem.budgeted;
            const newSpent = category.spent + (newItem.actual || 0);
            
            return {
              ...category,
              items: newItemsList,
              total: newTotal,
              spent: newSpent
            };
          }
          return category;
        })
      );
      
      // Reset form
      setNewItem({
        name: '',
        budgeted: 0,
        actual: 0,
        paid: false
      });
      setShowAddItemForm(null);
      
      toast.success('Item berhasil ditambahkan! 🎉');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Gagal menambahkan item: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Function to create transaction
  const createTransaction = async (item: any, categoryName: string, amount: number) => {
    try {
      // Check if wallet is selected
      if (!selectedWallet) {
        console.log('Tidak ada wallet yang dipilih');
        toast.error('Silakan pilih wallet untuk sumber dana');
        return false;
      }
      
      console.log('Using wallet ID:', selectedWallet);
      
      // Get selected wallet name for better logging
      const selectedWalletObj = wallets.find(w => w.id === selectedWallet);
      const walletName = selectedWalletObj?.name || 'Unknown';
      
      // Find appropriate category for wedding expenses
      let categoryId = null;
      
      // Try to find an event, entertainment, or personal expense category
      const weddingCategory = categories.find(cat => 
        cat.type === 'EXPENSE' && 
        (cat.name.toLowerCase().includes('event') || 
         cat.name.toLowerCase().includes('wedding') ||
         cat.name.toLowerCase().includes('entertainment') ||
         cat.name.toLowerCase().includes('personal'))
      );
      
      if (weddingCategory) {
        categoryId = weddingCategory.id;
        console.log(`Found appropriate category: ${weddingCategory.name} (${categoryId})`);
      } else {
        console.log('No appropriate wedding category found, proceeding without categoryId');
      }
      
      // Dari TransactionWithRelations di route.ts, type harusnya 'INCOME' atau 'EXPENSE' (uppercase)
      const transactionData: any = {
        amount: amount,
        description: `[Wedding] ${categoryName} - ${item.name}`,
        walletId: selectedWallet,
        date: paymentDate,
        type: 'EXPENSE', // UPPERCASE sesuai enum di API
        notes: paymentNote || `Pembayaran untuk ${categoryName} - ${item.name}`,
      };
      
      // Hanya tambahkan categoryId jika ditemukan
      if (categoryId) {
        transactionData.categoryId = categoryId;
      }
      
      console.log(`Creating transaction in wallet "${walletName}":`, transactionData);
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transaction error response:', errorText);
        
        // Try to parse error response if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            toast.error(`Gagal mencatat transaksi: ${errorJson.error}`);
          } else {
            toast.error(`Gagal mencatat transaksi: ${response.status} ${response.statusText}`);
          }
        } catch (e) {
          // If not JSON, show raw error
          toast.error(`Gagal mencatat transaksi: ${response.status} ${response.statusText}`);
        }
        
        return false;
      }
      
      const result = await response.json();
      
      if (result.success || result.transaction) {
        toast.success('Transaksi berhasil dicatat!');
        return true;
      } else {
        console.error('Transaction failed with result:', result);
        toast.error(result.error || 'Gagal mencatat transaksi');
        return false;
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Terjadi kesalahan saat mencatat transaksi');
      return false;
    }
  };

  // Enhanced updateItemPayment to call API with correct wedding ID
  const updateItemPayment = async (categoryId: string, itemId: string, amount: number) => {
    try {
      console.log('Updating item payment in API...');
      
      // Get the wedding ID from state
      if (!wedding?.id) {
        throw new Error('Wedding ID not found');
      }
      
      const response = await fetch('/api/wedding-budget/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          categoryId,
          amount,
          weddingId: wedding.id,
          isPaid: false // Let the server determine if it's paid based on amount
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update payment: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Payment updated successfully:', result);
      
      // Update local state with proper typings
      setBudgetCategories(categories => 
        categories.map(category => {
          if (category.id === categoryId) {
            const updatedItems = category.items.map((item: any) => {
              if (item.id === itemId) {
                const newActualAmount = (item.actual || 0) + amount;
                const isPaid = newActualAmount >= item.budgeted;
                
                return {
                  ...item,
                  actual: newActualAmount,
                  paid: isPaid
                };
              }
              return item;
            });
            
            // Calculate new spent amount for the category
            const newSpent = updatedItems.reduce((sum: number, item: any) => sum + (item.actual || 0), 0);
            
            return {
              ...category,
              items: updatedItems,
              spent: newSpent
            };
          }
          return category;
        })
      );
      
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Gagal update pembayaran: ' + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };

  // Add handleDeleteItem function
  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    if (!confirm('Yakin ingin menghapus item ini?')) {
      return;
    }
    
    try {
      console.log('Deleting item from API...');
      
      const response = await fetch(`/api/wedding-budget/items?id=${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Item deleted successfully:', result);
      
      // Update local state to remove the item
      setBudgetCategories(categories => 
        categories.map(category => {
          if (category.id === categoryId) {
            // Find the item to get its budgeted and actual values
            const itemToDelete = category.items.find((item: any) => item.id === itemId);
            
            if (!itemToDelete) return category;
            
            // Remove the item from the array
            const newItems = category.items.filter((item: any) => item.id !== itemId);
            
            // Adjust category totals
            return {
              ...category,
              items: newItems,
              total: category.total - itemToDelete.budgeted,
              spent: category.spent - itemToDelete.actual
            };
          }
          return category;
        })
      );
      
      toast.success('Item berhasil dihapus');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Gagal menghapus item: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Enhanced handlePaymentSubmit to call API
  const handlePaymentSubmit = async () => {
    if (!selectedItem || paymentAmount <= 0) return;
    
    try {
      setIsSubmitting(true);
      
      // First try to update payment status via API
      const success = await updateItemPayment(
        selectedItem.categoryId,
        selectedItem.id,
        paymentAmount
      );
      
      if (success) {
        // Then create transaction record if payment was successful
        const transactionSuccess = await createTransaction(
          selectedItem,
          selectedItem.categoryName,
          paymentAmount
        );
        
        if (transactionSuccess) {
          // Reset form
          setSelectedItem(null);
          setPaymentAmount(0);
          setPaymentDate(new Date().toISOString().split('T')[0]);
          setPaymentNote('');
          setShowPaymentModal(false);
          
          toast.success('Pembayaran berhasil dicatat! 💰');
        }
      }
    } catch (error) {
      console.error('Error in payment submission:', error);
      toast.error('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle edit item form submission
  const handleEditItem = async () => {
    if (!editingItem) return;
    
    try {
      setIsSubmitting(true);
      console.log('Updating item in API...', editingItem);
      
      const response = await fetch(`/api/wedding-budget/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingItem.id,
          name: editingItem.name,
          budgeted: editingItem.budgeted,
          actual: editingItem.actual,
          paid: editingItem.paid
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update item: ${response.status}`);
      }
      
      const updatedItem = await response.json();
      console.log('Item updated successfully:', updatedItem);
      
      // Update local state with edited item
      setBudgetCategories(categories => 
        categories.map(category => {
          if (category.id === editingItem.categoryId) {
            // Calculate differences for updating totals
            const originalItem = category.items.find((item: any) => item.id === editingItem.id);
            if (!originalItem) return category;
            
            const diffBudgeted = editingItem.budgeted - originalItem.budgeted;
            const diffActual = editingItem.actual - originalItem.actual;
            
            // Update the item
            const updatedItems = category.items.map((item: any) => 
              item.id === editingItem.id ? {
                ...item,
                name: editingItem.name,
                budgeted: editingItem.budgeted,
                actual: editingItem.actual,
                paid: editingItem.paid
              } : item
            );
            
            // Update category totals
            return {
              ...category,
              items: updatedItems,
              total: category.total + diffBudgeted,
              spent: category.spent + diffActual
            };
          }
          return category;
        })
      );
      
      // Close edit form
      setIsEditFormOpen(false);
      setEditingItem(null);
      toast.success('Item berhasil diupdate');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Gagal mengupdate item: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi untuk sinkronisasi ulang budget
  const handleSyncBudget = async () => {
    const weddingId = wedding?.id;
    if (!weddingId) {
      toast.error('Wedding tidak ditemukan. Silakan buat wedding terlebih dahulu.');
      return;
    }
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(`/api/wedding-budget/sync?weddingId=${weddingId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal sinkronisasi budget');
      }

      // Refresh data menggunakan fungsi fetchWeddingBudget yang sudah ada
      await fetchWeddingBudget(weddingId);
      toast.success('Budget berhasil disinkronisasi');
    } catch (err) {
      console.error('Error syncing budget:', err);
      setError(err instanceof Error ? err.message : 'Gagal sinkronisasi budget');
      toast.error(err instanceof Error ? err.message : 'Gagal sinkronisasi budget');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/wedding-planner" className="mr-4">
          <FiChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Budget Pernikahan</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading budget data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 rounded-lg text-center">
          <p className="text-lg font-medium mb-2">⚠️ {error}</p>
          <p className="text-sm mb-4">Pastikan Anda sudah membuat wedding terlebih dahulu.</p>
          <Link href="/wedding-planner" className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 inline-block">
            Kembali ke Wedding Planner
          </Link>
        </div>
      ) : (
        <>
          {/* Budget Summary */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Ringkasan Anggaran</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiDollarSign className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="font-medium">Total Anggaran</h3>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(budgetSummary.total)}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiDollarSign className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="font-medium">Tersisa</h3>
                </div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(remaining)}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiPieChart className="w-5 h-5 text-purple-500 mr-2" />
                  <h3 className="font-medium">Terpakai</h3>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(budgetSummary.spent)}</p>
                  <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                    {percentageSpent}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative pt-1">
              <div className="overflow-hidden h-4 mb-1 text-xs flex rounded-full bg-gray-200">
                <div 
                  style={{ width: `${percentageSpent}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500">
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            
            {/* Payment Status Summary */}
            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-3">Status Pembayaran Vendor</h3>
              <div className="space-y-3">
                {budgetCategories.map(category => {
                  // Calculate payment statistics
                  const totalItems = category.items.length;
                  const paidItems = category.items.filter(item => item.paid).length;
                  const paidAmount = category.items.reduce((sum, item) => sum + (item.paid ? item.actual : 0), 0);
                  const paidPercentage = totalItems > 0 ? Math.round((paidItems / totalItems) * 100) : 0;
                  const amountPercentage = category.total > 0 ? Math.round((paidAmount / category.total) * 100) : 0;
                  
                  return (
                    <div key={`payment-${category.id}`} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-500">
                          {paidItems} dari {totalItems} item lunas ({paidPercentage}%)
                        </div>
                      </div>
                      
                      {/* Progress bar for payment status */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div 
                          className={`h-2.5 rounded-full ${
                            amountPercentage < 30 ? 'bg-red-400' : 
                            amountPercentage < 70 ? 'bg-yellow-400' : 
                            'bg-green-400'
                          }`} 
                          style={{ width: `${amountPercentage}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>{formatCurrency(paidAmount)} dibayarkan</span>
                        <span>{formatCurrency(category.total - paidAmount)} belum dibayar</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Budget Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Kategori Anggaran</h2>
            
            {budgetCategories.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Belum ada data budget. Data akan muncul di sini setelah dibuat.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetCategories.map(category => (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div 
                      className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <div className="flex text-sm text-gray-500 mt-1">
                          <span className="mr-3">Budget: {formatCurrency(category.total)}</span>
                          <span>Terpakai: {formatCurrency(category.spent)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${Math.round((category.spent / category.total) * 100) < 50 
                              ? 'bg-green-100 text-green-800' 
                              : Math.round((category.spent / category.total) * 100) < 75
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                            {Math.round((category.spent / category.total) * 100)}%
                          </span>
                        </div>
                        <button className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300">
                          {expandedCategories.includes(category.id) ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Category Items */}
                    {expandedCategories.includes(category.id) && (
                      <div className="p-4 bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Item</th>
                              <th className="px-4 py-2 text-right">Anggaran</th>
                              <th className="px-4 py-2 text-right">Aktual</th>
                              <th className="px-4 py-2 text-center">Status</th>
                              <th className="px-4 py-2 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {category.items.map(item => (
                              <tr key={item.id}>
                                <td className="px-4 py-3">{item.name}</td>
                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.budgeted)}</td>
                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.actual)}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${item.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {item.paid ? 'Lunas' : 'Belum Lunas'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center space-x-2">
                                    {!item.paid && (
                                      <button 
                                        onClick={() => {
                                          setSelectedItem({
                                            ...item, 
                                            categoryId: category.id, 
                                            categoryName: category.name
                                          });
                                          setPaymentAmount(item.budgeted - (item.actual || 0));
                                          setShowPaymentModal(true);
                                        }}
                                        className="p-1 rounded-full text-green-600 hover:bg-green-50"
                                        title="Catat Pembayaran"
                                      >
                                        <FiCreditCard className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                        setEditingItem({
                                          ...item,
                                          categoryId: category.id,
                                          categoryName: category.name
                                        });
                                        setIsEditFormOpen(true);
                                      }}
                                      className="p-1 rounded-full text-blue-600 hover:bg-blue-50"
                                    >
                                      <FiEdit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteItem(category.id, item.id)}
                                      className="p-1 rounded-full text-red-600 hover:bg-red-50"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* Add item button and form */}
                        <div className="mt-4">
                          {showAddItemForm === category.id ? (
                            <div className="bg-gray-50 p-4 rounded-md">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Nama Item</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                    placeholder="e.g., Sewa Tambahan"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Anggaran</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    value={newItem.budgeted === 0 ? '' : newItem.budgeted}
                                    onChange={(e) => setNewItem({...newItem, budgeted: Number(e.target.value)})}
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Aktual (jika ada)</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    value={newItem.actual === 0 ? '' : newItem.actual}
                                    onChange={(e) => setNewItem({...newItem, actual: Number(e.target.value)})}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center mb-4">
                                <input 
                                  type="checkbox" 
                                  id="paidStatus" 
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                  checked={newItem.paid}
                                  onChange={(e) => setNewItem({...newItem, paid: e.target.checked})}
                                />
                                <label htmlFor="paidStatus" className="ml-2 text-sm text-gray-700">Sudah Dibayar</label>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <button 
                                  onClick={() => setShowAddItemForm(null)}
                                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm"
                                  disabled={isSubmitting}
                                >
                                  Batal
                                </button>
                                <button 
                                  onClick={() => handleAddItem(category.id)}
                                  className="px-3 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 text-sm flex items-center"
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Processing...
                                    </>
                                  ) : (
                                    'Simpan'
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setShowAddItemForm(category.id)}
                              className="flex items-center text-blue-600 text-sm hover:text-blue-800"
                            >
                              <FiPlus className="w-4 h-4 mr-1" /> Tambah Item
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Catat Pembayaran</h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Item:</span>
                <span className="font-medium">{selectedItem.categoryName} - {selectedItem.name}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Total Anggaran:</span>
                <span className="font-medium">{formatCurrency(selectedItem.budgeted)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Sudah Dibayar:</span>
                <span className="font-medium">{formatCurrency(selectedItem.actual || 0)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Sisa Tagihan:</span>
                <span className="font-medium">{formatCurrency(selectedItem.budgeted - (selectedItem.actual || 0))}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">Rp</span>
                </div>
                <input 
                  type="number" 
                  value={paymentAmount === 0 ? '' : paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembayaran</label>
              <input 
                type="date" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Dana (Wallet)</label>
              {wallets && wallets.length > 0 ? (
                <select
                  value={selectedWallet || ''}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Pilih wallet</option>
                  {wallets.map(wallet => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} ({formatCurrency(wallet.balance || 0)})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Tidak ada wallet yang tersedia
                  </div>
                  <Link href="/wallets" className="text-sm text-blue-600 hover:text-blue-800">
                    + Tambah wallet baru
                  </Link>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <textarea 
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="DP untuk catering, Pelunasan dekorasi, etc."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShowPaymentModal(false);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={handlePaymentSubmit}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                disabled={paymentAmount <= 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Simpan & Catat Transaksi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Item Modal */}
      {isEditFormOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Edit Item</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item</label>
              <input 
                type="text" 
                value={editingItem.name}
                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anggaran</label>
              <input 
                type="number" 
                value={editingItem.budgeted}
                onChange={(e) => setEditingItem({...editingItem, budgeted: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Aktual</label>
              <input 
                type="number" 
                value={editingItem.actual}
                onChange={(e) => setEditingItem({...editingItem, actual: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingItem.paid ? 'Lunas' : 'Belum Lunas'}
                onChange={(e) => setEditingItem({...editingItem, paid: e.target.value === 'Lunas'})}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lunas">Lunas</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditFormOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                onClick={handleEditItem}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      <Toaster position="bottom-right" />
    </div>
  );
} 