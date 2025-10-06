'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Edit, RefreshCw, TrendingUp, TrendingDown, BarChart2, GitBranch, Info } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table"
import { useWallet } from '@/app/providers/WalletProvider'
import { Skeleton } from "@/components/ui/skeleton"
import RiskAssessment from './components/RiskAssessment'
import PortfolioRebalance from './components/PortfolioRebalance'

// Define the Investment type matching the backend
type Investment = {
  id: string
  name: string
  type: string
  tickerSymbol: string | null
  quantity: number
  averagePurchasePrice: number
  purchaseDate: string // ISO string date
  notes: string | null
  createdAt: string
  updatedAt: string
  userId: string
  walletId: string
}

// Valid Investment Types from API
const VALID_INVESTMENT_TYPES = [
  "STOCK",
  "CRYPTO",
  "PRECIOUS_METAL",
  "PROPERTY",
  "OTHER",
];

// Initial state for the form data
const initialFormData = {
  name: '',
  type: '',
  tickerSymbol: '',
  quantity: '',
  averagePurchasePrice: '',
  purchaseDate: '',
  notes: '',
  walletId: ''
};

// Type for market prices state
type MarketPrices = Record<string, number>; // e.g., { 'bitcoin': 65000, 'aapl': 180 }

// Constants
const TROY_OUNCE_TO_GRAM = 31.1034768;

const InvestmentsPage = () => {
  const { wallets, selectedWallet } = useWallet()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  // State for market data
  const [marketPrices, setMarketPrices] = useState<MarketPrices>({});
  const [usdToIdrRate, setUsdToIdrRate] = useState<number | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("assets");
  
  // State for detail view modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    name: string,
    tickerSymbol: string,
    type: string,
    originalInvestments: Investment[]
  } | null>(null);
  
  // State for sorting and pagination
  const [sortColumn, setSortColumn] = useState<string>("purchaseDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; // Number of items to show per page

  // Function to fetch investments
  const fetchInvestments = async () => {
    setIsLoading(true)
    setError(null)
    setMarketPrices({});
    setUsdToIdrRate(null); // Clear old rate
    try {
      const response = await fetch('/api/investments')
      if (!response.ok) {
        throw new Error('Gagal mengambil data investasi')
      }
      const data: Investment[] = await response.json()
      setInvestments(data)
      if (data.length > 0) {
        fetchMarketData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to fetch market data (including exchange rate)
  const fetchMarketData = async (investmentsToFetch: Investment[]) => {
      const symbols = investmentsToFetch
          .map(inv => inv.tickerSymbol?.trim())
          .filter((s): s is string => !!s && s.length > 0);
      const uniqueSymbols = [...new Set(symbols)];
      if (uniqueSymbols.length === 0) return;
      
      console.log("Fetching market data for symbols:", uniqueSymbols);
      setIsMarketLoading(true);
      setMarketError(null);
      setUsdToIdrRate(null); // Clear rate before fetching
      try {
          const response = await fetch(`/api/market-data?symbols=${uniqueSymbols.join(',')}`);
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Gagal mengambil data pasar');
          }
          // Expect { prices: MarketPrices, usdToIdrRate: number | null }
          const data = await response.json(); 
          console.log("Received market data:", data);

          const prices = data.prices || {};
          const rate = data.usdToIdrRate;

          // Store prices with lowercase keys
          const lowercasePrices: MarketPrices = {};
          for (const key in prices) {
              lowercasePrices[key.toLowerCase()] = prices[key];
          }
          setMarketPrices(lowercasePrices);
          setUsdToIdrRate(rate); // Store the exchange rate

          if (rate == null) {
              setMarketError("Kurs USD/IDR tidak dapat diambil.");
          }

      } catch (err: any) {
          setMarketError(err.message || 'Terjadi kesalahan saat mengambil data pasar');
          console.error(err);
      } finally {
          setIsMarketLoading(false);
      }
  }

  useEffect(() => {
    fetchInvestments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Fetch investments on initial load

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: 'type' | 'walletId', value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (investmentToEdit: Investment | null = null) => {
    setEditingInvestment(investmentToEdit);
    setSaveError(null);
    if (investmentToEdit) {
      setFormData({
        name: investmentToEdit.name,
        type: investmentToEdit.type,
        tickerSymbol: investmentToEdit.tickerSymbol || '',
        quantity: String(investmentToEdit.quantity),
        averagePurchasePrice: String(investmentToEdit.averagePurchasePrice),
        purchaseDate: investmentToEdit.purchaseDate.split('T')[0],
        notes: investmentToEdit.notes || '',
        walletId: investmentToEdit.walletId
      });
    } else {
      setFormData({
        ...initialFormData,
        walletId: selectedWallet?.id || ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingInvestment(null);
  };

  // Function to refresh all data after an important change
  const refreshAllData = async () => {
    // Refresh investments data
    await fetchInvestments();
    
    // Force reload to get updated wallet balances and transaction data
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    if (!formData.name || !formData.type || !formData.quantity || !formData.averagePurchasePrice || !formData.purchaseDate || !formData.walletId) {
      setSaveError('Mohon isi semua field yang wajib diisi (termasuk Dompet).');
      setIsSaving(false);
      return;
    }

    const url = editingInvestment ? `/api/investments/${editingInvestment.id}` : '/api/investments';
    const method = editingInvestment ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity) || 0,
          averagePurchasePrice: parseFloat(formData.averagePurchasePrice) || 0,
          purchaseDate: new Date(formData.purchaseDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Gagal ${editingInvestment ? 'memperbarui' : 'menyimpan'} investasi`);
      }

      handleCloseModal();
      
      // Use the new refresh function to reload all data
      await refreshAllData();

    } catch (err: any) {
      setSaveError(err.message || 'Terjadi kesalahan saat menyimpan.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined, currency = 'IDR') => {
    if (amount == null) return '-';
    // Always show 2 decimal places for USD for better clarity with cents
    const minDigits = currency === 'USD' ? 2 : 0;
    const maxDigits = currency === 'USD' ? 2 : 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  }

  const getWalletName = (walletId: string) => {
    return wallets.find(w => w.id === walletId)?.name || 'N/A';
  }

  // Inside InvestmentsPage component, add this function above the return statement
  // to group investments by ticker symbol
  const groupInvestmentsBySymbol = (investments: Investment[]) => {
    const grouped: Record<string, {
      name: string,
      type: string,
      tickerSymbol: string,
      totalQuantity: number,
      totalCost: number,
      avgPurchasePrice: number,
      walletId: string,
      earliestDate: string,
      originalInvestments: Investment[]
    }> = {};

    investments.forEach(inv => {
      const key = inv.tickerSymbol?.toLowerCase() || 'unknown';
      
      if (!grouped[key]) {
        grouped[key] = {
          name: inv.name,
          type: inv.type,
          tickerSymbol: inv.tickerSymbol || '',
          totalQuantity: 0,
          totalCost: 0,
          avgPurchasePrice: 0,
          walletId: inv.walletId,
          earliestDate: inv.purchaseDate,
          originalInvestments: []
        };
      }
      
      // Add this investment to the group
      grouped[key].totalQuantity += inv.quantity;
      grouped[key].totalCost += inv.quantity * inv.averagePurchasePrice;
      
      // Track earliest purchase date
      if (new Date(inv.purchaseDate) < new Date(grouped[key].earliestDate)) {
        grouped[key].earliestDate = inv.purchaseDate;
      }
      
      // Keep reference to original investment for detailed view or editing
      grouped[key].originalInvestments.push(inv);
    });
    
    // Calculate average purchase price for each group
    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      group.avgPurchasePrice = group.totalQuantity > 0 
        ? group.totalCost / group.totalQuantity 
        : 0;
    });
    
    return Object.values(grouped);
  };

  // Handle showing detail modal
  const showDetailModal = (group: any) => {
    setSelectedGroup(group);
    setDetailModalOpen(true);
    // Reset to first page and default sort when opening modal
    setCurrentPage(1);
    setSortColumn("purchaseDate");
    setSortDirection("desc");
  };

  // Handle sort changes
  const handleSort = (column: string) => {
    // If clicking the same column, toggle direction
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If new column, set it and default to descending
      setSortColumn(column);
      setSortDirection("desc");
    }
    // Reset to first page on sort change
    setCurrentPage(1);
  };

  // Function to sort and paginate data
  const getProcessedInvestments = () => {
    if (!selectedGroup) return [];

    // Create a copy for sorting
    let sorted = [...selectedGroup.originalInvestments];

    // Sort based on selected column and direction
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle different columns
      switch (sortColumn) {
        case "purchaseDate":
          aValue = new Date(a.purchaseDate).getTime();
          bValue = new Date(b.purchaseDate).getTime();
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case "price":
          aValue = a.averagePurchasePrice;
          bValue = b.averagePurchasePrice;
          break;
        case "total":
          aValue = a.quantity * a.averagePurchasePrice;
          bValue = b.quantity * b.averagePurchasePrice;
          break;
        default:
          aValue = a[sortColumn as keyof Investment];
          bValue = b[sortColumn as keyof Investment];
      }

      // Handle the sorting direction
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const getTotalPages = () => {
    if (!selectedGroup) return 1;
    return Math.ceil(selectedGroup.originalInvestments.length / itemsPerPage);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Investasi Saya</CardTitle>
          <div className="flex items-center gap-2">
            {/* Refresh Market Data Button */} 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchMarketData(investments)} 
              disabled={isMarketLoading || investments.length === 0}
            >
              <RefreshCw className={`h-4 w-4 ${isMarketLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => handleOpenModal(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Investasi
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent mb-4 pb-0 h-auto">
              <TabsTrigger
                value="assets"
                className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                id="assets-tab"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Aset Investasi
              </TabsTrigger>
              <TabsTrigger
                value="risk-assessment"
                className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                id="risk-assessment-tab"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Profil Risiko
              </TabsTrigger>
              <TabsTrigger
                value="rebalance"
                className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
                id="rebalance-tab"
              >
                <GitBranch className="h-4 w-4 mr-2" />
                Rebalancing Portfolio
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assets" className="mt-0">
              {isLoading && <p>Memuat data investasi...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {marketError && <p className="text-orange-500 text-sm mt-2">Peringatan Data Pasar: {marketError}</p>}
              {isMarketLoading && usdToIdrRate == null && <p className="text-blue-500 text-sm mt-2">Mengambil kurs USD/IDR...</p>}
              
              {!isLoading && !error && (
                <div className="mt-4">
                  {investments.length === 0 ? (
                    <p className="text-center text-gray-500">Anda belum menambahkan data investasi.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupInvestmentsBySymbol(investments).map((group) => {
                        // --- Calculations for Market Data ---
                        const symbolKey = group.tickerSymbol.toLowerCase();
                        const isGold = symbolKey === 'xau'; // Check if it's gold

                        // Prices from API (USD/unit for stocks/crypto, USD/oz for XAU)
                        const currentPriceRawUSD = symbolKey ? marketPrices[symbolKey] : null;
                        
                        // Adjust price and calculate value based on type
                        let currentPricePerUnitUSD: number | null = null;
                        let currentValueUSD: number | null = null;
                        let displayUnit = 'Unit'; // Default display unit

                        if (isGold && currentPriceRawUSD != null) {
                            currentPricePerUnitUSD = currentPriceRawUSD / TROY_OUNCE_TO_GRAM; // Convert USD/oz to USD/gram
                            currentValueUSD = group.totalQuantity * currentPricePerUnitUSD; // Value = grams * USD/gram
                            displayUnit = 'Gram';
                        } else if (!isGold && currentPriceRawUSD != null) {
                            currentPricePerUnitUSD = currentPriceRawUSD; // Stock/Crypto price is already per unit
                            currentValueUSD = group.totalQuantity * currentPricePerUnitUSD;
                        }

                        const totalCostIDR = group.totalQuantity * group.avgPurchasePrice; // This should be total cost in IDR
                        
                        // Calculate IDR values using the rate
                        const currentPricePerUnitIDR = usdToIdrRate && currentPricePerUnitUSD != null ? currentPricePerUnitUSD * usdToIdrRate : null;
                        const currentValueIDR = usdToIdrRate && currentValueUSD != null ? currentValueUSD * usdToIdrRate : null;
                        
                        // Calculate Profit/Loss (using consistent currency, e.g., IDR)
                        const profitLossIDR = currentValueIDR != null ? currentValueIDR - totalCostIDR : null;
                        const profitLossPercent = profitLossIDR != null && totalCostIDR !== 0 ? (profitLossIDR / totalCostIDR) * 100 : null;
                        // -------------------------------------

                        return (
                          <Card key={group.tickerSymbol} className="overflow-hidden flex flex-col">
                            <CardHeader className="bg-muted/50 p-4">
                              <CardTitle className="text-lg flex items-center justify-between">
                                <span>{group.name}</span>
                                <span className="text-xs font-normal px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  {group.type}
                                </span>
                              </CardTitle>
                              {group.tickerSymbol && <p className="text-sm text-muted-foreground">{group.tickerSymbol}</p>}
                              {group.originalInvestments.length > 1 && 
                                <div className="text-xs text-primary-500 font-medium mt-1">
                                  {group.originalInvestments.length} investasi tergabung
                                </div>
                              }
                            </CardHeader>
                            <CardContent className="p-4 text-sm space-y-2 flex-grow">
                              <p><strong>Dompet:</strong> {getWalletName(group.walletId)}</p>
                              <p><strong>Jumlah:</strong> {group.totalQuantity} {isGold ? 'gram' : 'unit'}</p>
                              <p><strong>Harga Beli Rata-rata:</strong> {formatCurrency(group.avgPurchasePrice, 'IDR')}{isGold ? '/gram' : '/unit'}</p>
                              <p><strong>Total Modal:</strong> {formatCurrency(totalCostIDR, 'IDR')}</p>
                              <p><strong>Tgl Beli:</strong> {formatDate(group.earliestDate)}</p>
                              {/* Notes aren't shown in grouped view */}
                              
                              {/* --- Market Data Display (USD & IDR) --- */} 
                              <div className="border-t pt-3 mt-3 space-y-1">
                                {/* Harga/Unit */} 
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-muted-foreground">Harga/{displayUnit}:</span>
                                  {isMarketLoading ? (
                                    <Skeleton className="h-5 w-28" />
                                  ) : (
                                    <div className="text-right">
                                       <span className={`block font-semibold ${currentPricePerUnitUSD == null && 'text-muted-foreground'}`}>{formatCurrency(currentPricePerUnitUSD, 'USD')}</span>
                                       <span className={`block text-xs ${currentPricePerUnitIDR == null && 'text-muted-foreground'}`}>{formatCurrency(currentPricePerUnitIDR, 'IDR')}</span>
                                    </div>
                                  )}
                                </div>
                                {/* Nilai Kini */} 
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-muted-foreground">Nilai Kini:</span>
                                  {isMarketLoading ? (
                                    <Skeleton className="h-5 w-32" />
                                  ) : (
                                    <div className="text-right">
                                       <span className={`block font-semibold ${currentValueUSD == null && 'text-muted-foreground'}`}>{formatCurrency(currentValueUSD, 'USD')}</span>
                                       <span className={`block text-xs ${currentValueIDR == null && 'text-muted-foreground'}`}>{formatCurrency(currentValueIDR, 'IDR')}</span>
                                    </div>
                                  )}
                                </div>
                                {/* Profit/Loss */} 
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-muted-foreground">Profit/Loss:</span>
                                  {isMarketLoading ? (
                                    <Skeleton className="h-5 w-36" />
                                  ) : (
                                    <div className={`text-right font-semibold ${profitLossIDR == null ? 'text-muted-foreground' : profitLossIDR > 0 ? 'text-green-600' : profitLossIDR < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                        <span className="flex items-center justify-end">
                                           {profitLossIDR == null ? null : (profitLossIDR > 0 ? <TrendingUp size={14} className="mr-1"/> : profitLossIDR < 0 ? <TrendingDown size={14} className="mr-1"/> : null)}
                                           {formatCurrency(profitLossIDR, 'IDR')}
                                       </span>
                                      {profitLossPercent != null && <span className="block text-xs">{`${profitLossPercent.toFixed(1)}%`}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* -------------------------------- */} 
                            </CardContent>
                            <CardFooter className="border-t p-3 flex justify-end">
                              {group.originalInvestments.length === 1 ? (
                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(group.originalInvestments[0])}>
                                  <Edit className="h-4 w-4 mr-1"/> Edit
                                </Button>
                              ) : (
                                <div className="flex gap-2 items-center justify-end w-full">
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={() => showDetailModal(group)}
                                  >
                                    <Info className="h-4 w-4 mr-1"/> Detail ({group.originalInvestments.length})
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleOpenModal(group.originalInvestments[0])}>
                                    <Edit className="h-4 w-4 mr-1"/> Edit Terbaru
                                  </Button>
                                </div>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="risk-assessment" className="mt-0">
              <RiskAssessment />
            </TabsContent>
            
            <TabsContent value="rebalance" className="mt-0">
              <PortfolioRebalance />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => { if(isSaving) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>{editingInvestment ? 'Edit Investasi' : 'Tambah Investasi Baru'}</DialogTitle>
            <DialogDescription>
              {editingInvestment ? 'Perbarui detail investasi Anda.' : 'Masukkan detail investasi Anda di bawah ini.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nama*</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Jenis*</Label>
                <Select name="type" onValueChange={(v) => handleSelectChange('type', v)} value={formData.type} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Jenis Investasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_INVESTMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="walletId" className="text-right">Dompet*</Label>
                <Select name="walletId" onValueChange={(v) => handleSelectChange('walletId', v)} value={formData.walletId} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.length > 0 ? (
                      wallets.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>{wallet.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>Tidak ada dompet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tickerSymbol" className="text-right">Simbol/ID*</Label>
                <Input id="tickerSymbol" name="tickerSymbol" value={formData.tickerSymbol} onChange={handleInputChange} className="col-span-3" placeholder="cth: XAU, bitcoin, AAPL" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Jumlah*</Label>
                <Input id="quantity" name="quantity" type="number" step="any" value={formData.quantity} onChange={handleInputChange} className="col-span-3" required min="0" placeholder={formData.tickerSymbol?.toLowerCase() === 'xau' ? 'gram' : 'unit/lembar'} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="averagePurchasePrice" className="text-right">Harga Beli*</Label>
                <Input id="averagePurchasePrice" name="averagePurchasePrice" type="number" step="any" value={formData.averagePurchasePrice} onChange={handleInputChange} className="col-span-3" placeholder={formData.tickerSymbol?.toLowerCase() === 'xau' ? 'Harga IDR/gram' : 'Harga IDR/unit'} required min="0" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseDate" className="text-right">Tgl Beli*</Label>
                <Input id="purchaseDate" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Catatan</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className="col-span-3" placeholder="Catatan tambahan (opsional)" />
              </div>
            </div>
            {saveError && <p className="text-red-500 text-sm mb-4">Error: {saveError}</p>}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSaving}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : (editingInvestment ? 'Simpan Perubahan' : 'Simpan Investasi')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail View Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail Investasi: {selectedGroup?.name} ({selectedGroup?.tickerSymbol})
            </DialogTitle>
            <DialogDescription>
              Menampilkan {selectedGroup?.originalInvestments.length} transaksi investasi.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <Table>
              <TableCaption>
                {selectedGroup?.originalInvestments.length 
                  ? `Menampilkan ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, selectedGroup.originalInvestments.length)} dari ${selectedGroup.originalInvestments.length} investasi`
                  : 'Tidak ada investasi'
                }
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort("purchaseDate")}
                  >
                    Tanggal Beli {sortColumn === "purchaseDate" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort("quantity")}
                  >
                    Jumlah {sortColumn === "quantity" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort("price")}
                  >
                    Harga {sortColumn === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort("total")}
                  >
                    Total {sortColumn === "total" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Dompet</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getProcessedInvestments().map((inv, idx) => {
                  const isGold = inv.tickerSymbol?.toLowerCase() === 'xau';
                  const totalCost = inv.quantity * inv.averagePurchasePrice;
                  const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{actualIdx}</TableCell>
                      <TableCell>{formatDate(inv.purchaseDate)}</TableCell>
                      <TableCell>
                        {inv.quantity} {isGold ? 'gram' : 'unit'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(inv.averagePurchasePrice, 'IDR')}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(totalCost, 'IDR')}
                      </TableCell>
                      <TableCell>{getWalletName(inv.walletId)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          setDetailModalOpen(false);
                          handleOpenModal(inv);
                        }}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
            {getTotalPages() > 1 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <select 
                  value={currentPage} 
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="h-8 w-16 rounded border border-input px-2"
                >
                  {Array.from({ length: getTotalPages() }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="text-sm">dari {getTotalPages()}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(p + 1, getTotalPages()))}
                  disabled={currentPage === getTotalPages()}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InvestmentsPage 