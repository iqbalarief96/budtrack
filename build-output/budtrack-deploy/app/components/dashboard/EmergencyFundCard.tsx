'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useToast } from "@/components/ui/use-toast";

interface EmergencyFundProps {
  walletId?: string;
}

interface EmergencyFundData {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  isActive: boolean;
  totalSavings?: number;
  savingsByType?: Record<string, number>;
}

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
}

export default function EmergencyFundCard({ walletId }: EmergencyFundProps) {
  const [emergencyFund, setEmergencyFund] = useState<EmergencyFundData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for AI recommendation
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isApplyingRecommendation, setIsApplyingRecommendation] = useState(false);

  // Add state to track manual update
  const [isManuallyUpdating, setIsManuallyUpdating] = useState(false);

  // Add a proper Refresh button and handle refreshing properly
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast: uiToast } = useToast();

  const fetchEmergencyFund = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add walletId to URL if provided
      const url = walletId 
        ? `/api/emergency-fund?walletId=${walletId}` 
        : '/api/emergency-fund';
      
      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emergency fund data');
      }
      
      const data = await response.json();
      console.log('Emergency fund data received:', data);
      
      if (data.targetAmount <= 1) {
        console.warn('WARNING: Target amount is still at default value (≤ 1):', data.targetAmount);
      }
      
      setEmergencyFund(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching emergency fund:', error);
      setError('Failed to load emergency fund data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyFund();
  }, [walletId]); // Re-fetch when walletId changes
  
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
          monthlyContribution: emergencyFund?.monthlyContribution || Math.ceil(aiRecommendation.recommendedTarget * 0.1 / 1000) * 1000
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update emergency fund target');
      }
      
      // Refetch emergency fund data to show updated values
      await fetchEmergencyFund();
      
      toast.success('Target dana darurat berhasil diperbarui! 🎯');
      setShowRecommendationDialog(false);
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast.error('Gagal memperbarui target. Silakan coba lagi nanti.');
    } finally {
      setIsApplyingRecommendation(false);
    }
  };
  
  // Update emergency fund
  const updateEmergencyFund = async (updateData: {
    targetAmount?: number;
    monthlyContribution?: number;
  }) => {
    try {
      console.log('Updating emergency fund with data:', updateData);
      
      const response = await fetch('/api/emergency-fund/update-target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update emergency fund');
      }
      
      const result = await response.json();
      console.log('Emergency fund update result:', result);
      
      // Refetch to update UI with new values
      await fetchEmergencyFund();
      
      toast.success('Dana darurat berhasil diupdate! ✨');
      return true;
    } catch (err) {
      console.error('Error updating emergency fund:', err);
      toast.error('Gagal update dana darurat. Coba lagi nanti ya!');
      return false;
    }
  };
  
  // Direct manual update function
  const forceUpdateTarget = async () => {
    try {
      setIsManuallyUpdating(true);
      // Force set a reasonable target
      const target = 5000000; // 5 million
      const monthlyContribution = 500000; // 500k
      
      toast.info(`Memaksa update target ke ${formatCurrency(target)}...`);
      
      console.log(`Attempting to update target to ${target}`);
      const response = await fetch('/api/emergency-fund/update-target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetAmount: target,
          monthlyContribution: monthlyContribution
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Force update result:', result);
      
      if (result.success) {
        toast.success(`Target berhasil diupdate ke ${formatCurrency(target)}! 🚀`);
        
        // Force refresh the component
        setTimeout(() => {
          fetchEmergencyFund();
        }, 1000);
      } else {
        toast.error('Server reported failure, check console');
      }
      
    } catch (error) {
      console.error('Error forcing update:', error);
      toast.error('Gagal update manual. Check console logs.');
    } finally {
      setIsManuallyUpdating(false);
    }
  };
  
  // Fix linter error by conditionally checking if target is too low
  const isTargetTooLow = emergencyFund?.targetAmount !== undefined && emergencyFund.targetAmount <= 1;

  // Add an explicit refresh function
  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      toast.info("Memperbarui data dana darurat...");
      
      // Clear cache by adding timestamp to URL
      const timestamp = new Date().getTime();
      const url = walletId 
        ? `/api/emergency-fund?walletId=${walletId}&t=${timestamp}` 
        : `/api/emergency-fund?t=${timestamp}`;
      
      console.log('Refreshing from URL:', url);
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh emergency fund data');
      }
      
      const data = await response.json();
      console.log('Fresh emergency fund data received:', data);
      
      if (data.targetAmount <= 1) {
        console.warn('WARNING: Target amount is still at default value (≤ 1):', data.targetAmount);
      }
      
      setEmergencyFund(data);
      toast.success("Data berhasil diperbarui! ✨");
    } catch (error) {
      console.error('Error refreshing emergency fund:', error);
      toast.error("Gagal memperbarui data. Coba lagi nanti.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dana Darurat</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dana Darurat</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!emergencyFund || !emergencyFund.isActive || isTargetTooLow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Dana Darurat
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <p className="text-gray-500 mb-2">
            Dana darurat {isTargetTooLow ? 'perlu diatur ulang' : 'belum diatur'}
          </p>
          
          <div className="flex flex-col space-y-2 w-full max-w-xs">
            <Button 
              onClick={async () => {
                try {
                  // First get AI recommendation
                  await generateAIRecommendation();
                  
                  // Then immediately apply it (delayed to wait for recommendation)
                  setTimeout(() => {
                    if (aiRecommendation) {
                      applyRecommendation();
                    }
                  }, 1500);
                  
                } catch (error) {
                  console.error("Error setting up emergency fund:", error);
                  toast.error("Gagal setup dana darurat. Coba lagi nanti ya!");
                }
              }} 
              disabled={isGeneratingRecommendation}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGeneratingRecommendation ? 'Menghitung...' : 'Setup Dana Darurat dengan AI'}</span>
            </Button>
            
            <Button
              onClick={forceUpdateTarget}
              disabled={isManuallyUpdating}
              variant="outline"
              className="flex items-center justify-center space-x-2"
            >
              <span>{isManuallyUpdating ? 'Updating...' : 'Update Target Manual (5jt)'}</span>
            </Button>
            
            {isTargetTooLow && (
              <div className="mt-2 text-xs text-amber-500 text-center">
                Target saat ini: {formatCurrency(emergencyFund.targetAmount)}
                <br/>
                Perlu diupdate ke nilai yang lebih realistis
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Recommendation Dialog */}
        <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rekomendasi Dana Darurat</DialogTitle>
              <DialogDescription>
                Target dana darurat yang direkomendasikan berdasarkan analisis AI
              </DialogDescription>
            </DialogHeader>
            
            {aiRecommendation && (
              <div className="py-4">
                <div className="text-xl font-bold mb-4 text-center">
                  {formatCurrency(aiRecommendation.recommendedTarget)}
                </div>
                
                <p className="text-sm text-gray-700 mb-4">
                  {aiRecommendation.explanation.reasoning}
                </p>
                
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
                disabled={isApplyingRecommendation}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                {isApplyingRecommendation ? 'Menerapkan...' : 'Terapkan Rekomendasi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }
  
  const progressPercentage = Math.min(
    Math.round((emergencyFund.currentAmount / emergencyFund.targetAmount) * 100), 
    100
  );
  
  const remainingAmount = emergencyFund.targetAmount - emergencyFund.currentAmount;
  const monthsToGoal = remainingAmount > 0 && emergencyFund.monthlyContribution > 0
    ? Math.ceil(remainingAmount / emergencyFund.monthlyContribution)
    : 0;
  
  // Check if savings data exists
  const hasSavings = emergencyFund.savingsByType && 
                     Object.keys(emergencyFund.savingsByType).length > 0;
  
  // Extract savings for display
  const savingsData = hasSavings ? Object.entries(emergencyFund.savingsByType!) : [];
  const totalSavings = emergencyFund.totalSavings || 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Dana Darurat
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={refreshData}
              disabled={isRefreshing}
              title="Perbarui data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isRefreshing ? 'animate-spin' : ''}`}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              <span className="sr-only">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20"
              onClick={generateAIRecommendation}
              disabled={isGeneratingRecommendation}
              title="Dapatkan rekomendasi target dana darurat dari AI"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="sr-only">Rekomendasi AI</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Saat Ini</p>
            <p className="text-lg font-medium">
              {formatCurrency(emergencyFund.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Target</p>
            <p className="text-lg font-medium">
              {formatCurrency(emergencyFund.targetAmount)}
            </p>
          </div>
        </div>
        
        {remainingAmount > 0 && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-600">
              {monthsToGoal > 0 
                ? `${monthsToGoal} bulan lagi untuk mencapai target`
                : 'Hampir mencapai target!'}
            </p>
          </div>
        )}
        
        {/* Savings breakdown section */}
        {hasSavings && (
          <div className="pt-4 border-t mt-4">
            <h3 className="font-medium mb-3">Tabungan</h3>
            <div className="space-y-2">
              {savingsData.map(([type, amount]) => {
                // Format the display name - strip "Tabungan " prefix while preserving full type
                // This specifically maintains multi-word types like "Bank Bandung"
                const displayName = type.replace('Tabungan ', '');
                
                console.log(`Display savings type: ${type} → ${displayName}`);
                
                return (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm">{displayName}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
              
              {/* Total savings */}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Tabungan</span>
                  <span className="font-bold">{formatCurrency(totalSavings)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Recommendation Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rekomendasi Dana Darurat</DialogTitle>
            <DialogDescription>
              Target dana darurat yang direkomendasikan berdasarkan analisis AI
            </DialogDescription>
          </DialogHeader>
          
          {aiRecommendation && (
            <div className="py-4">
              <div className="text-xl font-bold mb-4 text-center">
                {formatCurrency(aiRecommendation.recommendedTarget)}
              </div>
              
              <p className="text-sm text-gray-700 mb-4">
                {aiRecommendation.explanation.reasoning}
              </p>
              
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
              disabled={isApplyingRecommendation}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {isApplyingRecommendation ? 'Menerapkan...' : 'Terapkan Rekomendasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 