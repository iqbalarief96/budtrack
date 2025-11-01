'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { BiWallet } from 'react-icons/bi';
import { BsShieldLockFill } from 'react-icons/bs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Define the props including walletId
interface EmergencyFundCardProps {
  className?: string;
  walletId?: string;
}

// Define the emergency fund data structure
interface EmergencyFundData {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  isActive: boolean;
  totalSavings?: number;
  savingsByType?: Record<string, number>;
}

// Interface for AI recommendations
interface AIRecommendation {
  recommendedTarget: number;
  explanation: {
    averageMonthlyExpense: number;
    multiplier: number;
    reasoning: string;
    details: string[];
  };
  currentTarget: number;
  hasExistingFund: boolean;
  toastMessage?: string;
}

// Helper function to convert markdown to React-compatible markdown
const fixMarkdown = (text: string) => {
  // Replace ** with <strong> and * with <em> for more reliable rendering
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
};

export const EmergencyFundCard: React.FC<EmergencyFundCardProps> = ({ className, walletId }) => {
  const [data, setData] = useState<EmergencyFundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Add dialog state for editing target amount
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newTargetAmount, setNewTargetAmount] = useState<string>('');
  const [newMonthlyContribution, setNewMonthlyContribution] = useState<string>('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  
  // Add state for AI recommendation
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isApplyingRecommendation, setIsApplyingRecommendation] = useState(false);

  // Function to fetch or refresh data
  const fetchData = async (skipLoading = false) => {
    if (!skipLoading) setLoading(true);
    setError(null);

    try {
      // Build API URL with walletId and cache-busting
      const timestamp = new Date().getTime();
      let url = `/api/emergency-fund?t=${timestamp}`;
      if (walletId) {
        url += `&walletId=${encodeURIComponent(walletId)}`;
        console.log('[DEBUG] EmergencyFundCard: Fetching with walletId:', walletId, 'encoded:', encodeURIComponent(walletId));
        
        // Force cache invalidation with a unique timestamp
        url += `&_t=${Date.now()}`;
      } else {
        console.log('[DEBUG] EmergencyFundCard: Fetching without walletId');
      }
      
      console.log('Fetching emergency fund data from:', url);
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Emergency fund API response:', result);
      
      // Ensure target is never less than default
      if (result.targetAmount <= 1) {
        console.warn('Default target value detected, applying fix');
        
        // Try to fix this via API
        try {
          const fixResponse = await fetch('/api/emergency-fund/force-update');
          if (fixResponse.ok) {
            toast.success('Dana darurat telah diatur ulang!');
            // Re-fetch data after fix
            setTimeout(() => fetchData(true), 1000);
          }
        } catch (fixError) {
          console.error('Failed to fix target:', fixError);
          // Make sure we reset the refreshing state on error
          setIsRefreshing(false);
        }
      }
      
      // Debug the current amount
      console.log('[DEBUG] Setting data with currentAmount:', result.currentAmount);
      
      setData(result);
      // Always ensure we reset the refreshing state
      setIsRefreshing(false);
      
      if (isRefreshing) {
        toast.success('Data berhasil diperbarui!');
      }
    } catch (err) {
      console.error('Failed to fetch emergency fund data:', err);
      setError('Failed to load emergency fund data');
      // Always ensure we reset the refreshing state
      setIsRefreshing(false);
      
      if (isRefreshing) {
        toast.error('Gagal memperbarui data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [walletId]); // Re-fetch when walletId changes

  // Handle refresh button click
  const handleRefresh = () => {
    // Prevent multiple clicks
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    // Set a safety timeout to reset the spinner after 10 seconds
    // in case the fetch never completes
    const safetyTimeout = setTimeout(() => {
      if (isRefreshing) {
        console.warn('Safety timeout triggered to reset refresh state');
        setIsRefreshing(false);
        toast.error('Timeout terjadi saat memperbarui data');
      }
    }, 10000);
    
    fetchData(true).finally(() => {
      clearTimeout(safetyTimeout);
    });
  };
  
  // Function to generate AI recommendation
  const generateAIRecommendation = async () => {
    try {
      setIsGeneratingRecommendation(true);
      
      const response = await fetch('/api/emergency-fund/generate-ai-target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate recommendation');
      }
      
      const data = await response.json();
      console.log('AI recommendation received:', data);
      
      setAiRecommendation(data);
      setShowRecommendationDialog(true);
      
      // Show success toast
      if (data.toastMessage) {
        toast.success(data.toastMessage);
      } else {
        toast.success(`Rekomendasi dana darurat: ${formatCurrency(data.recommendedTarget)} 🔥`);
      }
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      toast.error('Gagal menghasilkan rekomendasi. Silakan coba lagi nanti.');
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };
  
  // Function to apply recommendation
  const applyRecommendation = async () => {
    if (!aiRecommendation) return;
    
    try {
      setIsApplyingRecommendation(true);
      
      // Use update-target endpoint to directly apply the recommendation
      const response = await fetch('/api/emergency-fund/update-target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetAmount: aiRecommendation.recommendedTarget,
          monthlyContribution: data?.monthlyContribution || Math.ceil(aiRecommendation.recommendedTarget * 0.1 / 1000) * 1000
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update emergency fund target');
      }
      
      // Refetch emergency fund data to show updated values
      await fetchData(true);
      
      toast.success('Target dana darurat berhasil diperbarui! 🎯');
      setShowRecommendationDialog(false);
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast.error('Gagal memperbarui target. Silakan coba lagi nanti.');
    } finally {
      setIsApplyingRecommendation(false);
    }
  };
  
  // Open the target dialog and prefill with current values
  const openTargetDialog = () => {
    if (data) {
      setNewTargetAmount(data.targetAmount.toString());
      setNewMonthlyContribution(data.monthlyContribution.toString());
      setShowTargetDialog(true);
    }
  };
  
  // Function to update emergency fund target
  const updateTarget = async () => {
    try {
      setIsUpdatingTarget(true);
      
      const targetAmount = parseFloat(newTargetAmount);
      const monthlyContribution = parseFloat(newMonthlyContribution || '0');
      
      if (isNaN(targetAmount) || targetAmount <= 0) {
        toast.error('Target harus berupa angka positif');
        return;
      }
      
      // Call the API to update target
      const response = await fetch('/api/emergency-fund/update-target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetAmount,
          monthlyContribution,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update target');
      }
      
      toast.success('Target dana darurat berhasil diperbarui!');
      setShowTargetDialog(false);
      
      // Re-fetch data to show new target
      fetchData(true);
    } catch (error) {
      console.error('Error updating target:', error);
      toast.error('Gagal memperbarui target dana darurat');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  // Debug logs
  useEffect(() => {
    if (data) {
      console.log('Emergency fund data in component:', data);
      console.log('Has savingsByType:', !!data.savingsByType);
      if (data.savingsByType) {
        console.log('Savings entries:', Object.entries(data.savingsByType));
        console.log('Savings entries length:', Object.entries(data.savingsByType).length);
      }
    }
  }, [data]);

  // Calculate with safe values
  const currentAmount = data?.currentAmount || 0;
  const targetAmount = data?.targetAmount || 5000000; // Use 5M as fallback
  const totalSavings = data?.totalSavings || 0;
  
  // Calculate emergency fund percentage safely
  const emergencyFundPercentage = Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Dana Darurat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Debugging empty savingsByType
  const hasSavings = data?.savingsByType && Object.keys(data.savingsByType).length > 0;
  console.log('Has savings to display:', hasSavings);
  
  // Check if target amount is too low (default value)
  const isTargetTooLow = data && data.targetAmount <= 1;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <BsShieldLockFill className="mr-2" /> Dana Darurat
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 rounded-full"
              title="Refresh data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isRefreshing ? 'animate-spin' : ''}`}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={generateAIRecommendation}
              disabled={isGeneratingRecommendation}
              className="h-8 w-8 p-0 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20"
              title="Dapatkan rekomendasi target dana darurat dari AI"
            >
              <Sparkles size={16} className="text-indigo-600" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Dana darurat yang telah terkumpul
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="text-2xl font-bold">{formatCurrency(currentAmount)}</div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center">
              dari target {formatCurrency(targetAmount)}
            </div>
            <Progress 
              value={emergencyFundPercentage} 
              className={`h-2 mt-2 ${emergencyFundPercentage >= 100 ? "bg-green-500" : ""}`}
            />
            <div className="flex justify-between text-xs mt-1">
              <span>{isNaN(emergencyFundPercentage) ? "0" : emergencyFundPercentage.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Tabungan</h4>
            {hasSavings ? (
              <div className="space-y-2">
                {Object.entries(data!.savingsByType!).map(([type, amount]) => {
                  // Get the display name, but keep the full word after "Tabungan "
                  // This preserves multi-word names like "Bank Bandung"
                  let displayType = type.replace('Tabungan ', '');
                  
                  console.log(`Rendering savings type: ${type} -> ${displayType}`);
                  
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <div className="text-sm">{displayType}</div>
                      <div className="font-medium">{formatCurrency(amount)}</div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Total Tabungan</div>
                    <div className="font-bold">{formatCurrency(totalSavings)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Belum ada tabungan</div>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* AI Recommendation Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rekomendasi Dana Darurat</DialogTitle>
            <DialogDescription>
              Target dana darurat yang direkomendasikan berdasarkan analisis pengeluaran
            </DialogDescription>
          </DialogHeader>
          
          {aiRecommendation && (
            <div className="py-4">
              <div className="text-xl font-bold mb-4 text-center">
                {formatCurrency(aiRecommendation.recommendedTarget)}
              </div>
              
              <div className="text-sm text-gray-700 mb-4 prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]} 
                  components={{
                    // Override default components to ensure proper rendering
                    strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                    em: ({node, ...props}) => <span className="italic" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2" {...props} />
                  }}
                >
                  {aiRecommendation.explanation.reasoning ? fixMarkdown(aiRecommendation.explanation.reasoning) : ''}
                </ReactMarkdown>
              </div>
              
              <div className="text-sm bg-gray-100 p-3 rounded-md space-y-1">
                {aiRecommendation.explanation.details.map((detail, index) => (
                  <p key={index}>{detail}</p>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowRecommendationDialog(false)}
            >
              Tutup
            </Button>
            <Button 
              onClick={applyRecommendation} 
              disabled={isApplyingRecommendation || !aiRecommendation}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {isApplyingRecommendation ? 'Menerapkan...' : 'Terapkan Rekomendasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Target Amount Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Target Dana Darurat</DialogTitle>
            <DialogDescription>
              Sesuaikan target dana darurat dan kontribusi bulanan anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Dana Darurat</Label>
              <Input
                id="targetAmount"
                type="number"
                min="1"
                value={newTargetAmount}
                onChange={(e) => setNewTargetAmount(e.target.value)}
                placeholder="Contoh: 20000000"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Disarankan: 3-6x pengeluaran bulanan (Rp 15-30jt)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Kontribusi Bulanan</Label>
              <Input
                id="monthlyContribution"
                type="number"
                min="0"
                value={newMonthlyContribution}
                onChange={(e) => setNewMonthlyContribution(e.target.value)}
                placeholder="Contoh: 500000"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Berapa banyak yang ingin anda sisihkan tiap bulan
              </p>
            </div>
            
            {parseFloat(newTargetAmount) > 0 && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Target Baru: <span className="font-medium">{formatCurrency(parseFloat(newTargetAmount))}</span>
                </p>
                {currentAmount > 0 && parseFloat(newTargetAmount) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Progress: <span className="font-medium">
                      {Math.min(100, Math.round((currentAmount / parseFloat(newTargetAmount)) * 100))}%
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowTargetDialog(false)}
            >
              Batal
            </Button>
            <Button 
              onClick={updateTarget} 
              disabled={isUpdatingTarget || !newTargetAmount || parseFloat(newTargetAmount) <= 0}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUpdatingTarget ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}; 