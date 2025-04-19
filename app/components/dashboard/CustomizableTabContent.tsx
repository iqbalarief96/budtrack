'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget, DashboardView, DEFAULT_DASHBOARD_VIEW } from './WidgetTypes';
import DashboardWidgetContainer from './DashboardWidgetContainer';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddWidgetForm from './AddWidgetForm';
import { v4 as uuidv4 } from 'uuid';

interface CustomizableTabContentProps {
  isEditMode: boolean;
  onSaveChanges: (widgets: DashboardWidget[]) => void;
  onCancelEdit: () => void;
  selectedWalletId?: string;
  initialWidgets?: DashboardWidget[];
}

export default function CustomizableTabContent({ 
  isEditMode, 
  onSaveChanges,
  onCancelEdit,
  selectedWalletId,
  initialWidgets = []
}: CustomizableTabContentProps) {
  // Default widgets for the dashboard if none provided
  const defaultWidgets: DashboardWidget[] = [
    { id: 'summary-stats-widget', type: 'summary-stats', size: 'full', title: 'Ringkasan Keuangan', position: 0 },
    { id: 'quick-actions-widget', type: 'quick-actions', size: 'large', title: 'Aksi Cepat', position: 1 },
    { id: 'expense-chart-widget', type: 'expense-chart', size: 'medium', title: 'Distribusi Pengeluaran', position: 2 },
    { id: 'income-expense-chart-widget', type: 'income-expense-chart', size: 'medium', title: 'Tren Keuangan', position: 3 },
    { id: 'transaction-list-widget', type: 'transaction-list', size: 'large', title: 'Transaksi Terbaru', position: 4 },
    { id: 'emergency-fund-widget', type: 'emergency-fund', size: 'small', title: 'Dana Darurat', position: 5 },
  ];

  console.log("CustomizableTabContent rendering with initialWidgets:", initialWidgets);

  // Use initialWidgets from props (loaded from localStorage) or fallback to defaultWidgets
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const hasInitialWidgets = initialWidgets && initialWidgets.length > 0;
    console.log("Initializing widgets state:", hasInitialWidgets ? 'Using initialWidgets' : 'Using defaultWidgets');
    return hasInitialWidgets ? initialWidgets : defaultWidgets;
  });
  
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update widgets if initialWidgets changes, but only if they exist
  useEffect(() => {
    if (initialWidgets && initialWidgets.length > 0) {
      console.log("useEffect: Updating widgets from initialWidgets:", initialWidgets);
      setWidgets(initialWidgets);
    }
  }, [initialWidgets]);

  // Available widgets that can be added to the dashboard
  const availableWidgets: DashboardWidget[] = [
    { id: 'balance-widget', type: 'balance', size: 'small', title: 'Total Saldo', position: 0 },
    { id: 'income-widget', type: 'income', size: 'small', title: 'Pemasukan', position: 1 },
    { id: 'expense-widget', type: 'expense', size: 'small', title: 'Pengeluaran', position: 2 },
    { id: 'expense-chart-widget', type: 'expense-chart', size: 'medium', title: 'Distribusi Pengeluaran', position: 3 },
    { id: 'income-expense-chart-widget', type: 'income-expense-chart', size: 'medium', title: 'Tren Keuangan', position: 4 },
    { id: 'transaction-list-widget', type: 'transaction-list', size: 'medium', title: 'Transaksi Terbaru', position: 5 },
    { id: 'emergency-fund-widget', type: 'emergency-fund', size: 'medium', title: 'Dana Darurat', position: 6 },
    { id: 'budget-overview-widget', type: 'budget-overview', size: 'large', title: 'Ringkasan Budget', position: 7 },
    { id: 'top-spending-widget', type: 'top-spending', size: 'medium', title: 'Top Spending', position: 8 },
    { id: 'financial-tips-widget', type: 'financial-tips', size: 'small', title: 'Tips Keuangan', position: 9 },
    { id: 'savings-goals-widget', type: 'savings-goals', size: 'medium', title: 'Target Tabungan', position: 10 },
    { id: 'investment-performance-widget', type: 'investment-performance', size: 'medium', title: 'Performa Investasi', position: 11 },
    { id: 'summary-stats-widget', type: 'summary-stats', size: 'full', title: 'Ringkasan Keuangan', position: 12 },
    { id: 'quick-actions-widget', type: 'quick-actions', size: 'large', title: 'Aksi Cepat', position: 13 },
  ];

  // Add a new widget
  const handleAddWidget = (widget: DashboardWidget) => {
    const newWidget = {
      ...widget,
      id: `${widget.type}-${uuidv4()}`,
      position: widgets.length,
    };
    
    setWidgets(prevWidgets => [...prevWidgets, newWidget]);
    setHasChanges(true);
    setIsAddingWidget(false);
  };

  // Remove a widget
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(prevWidgets => {
      const updatedWidgets = prevWidgets.filter(w => w.id !== widgetId);
      // Update position numbers
      const reindexedWidgets = updatedWidgets.map((item, index) => ({
        ...item,
        position: index,
      }));
      
      setHasChanges(true);
      return reindexedWidgets;
    });
  };

  // Handle widget repositioning and other changes from DashboardWidgetContainer
  const handleSaveWidgets = (updatedView: DashboardView) => {
    console.log("handleSaveWidgets called with:", updatedView.widgets);
    setWidgets(updatedView.widgets);
    setHasChanges(true);
  };

  // Save changes back to parent component
  const handleSave = () => {
    console.log('Saving widgets in CustomizableTabContent:', widgets);
    setHasChanges(false);
    onSaveChanges(widgets);
  };

  return (
    <div className="space-y-4">
      {isEditMode && (
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            onClick={() => setIsAddingWidget(true)}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Widget
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancelEdit}
            >
              Batal
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Simpan
            </Button>
          </div>
        </div>
      )}
      
      <DashboardWidgetContainer
        currentView={{
          id: 'tab-ringkasan',
          name: 'Ringkasan',
          isDefault: true,
          timeframe: 'monthly',
          widgets: widgets,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        onSave={handleSaveWidgets}
        availableWidgets={availableWidgets}
        isEditMode={isEditMode}
        selectedWalletId={selectedWalletId}
      />
      
      <Dialog open={isAddingWidget} onOpenChange={setIsAddingWidget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Widget</DialogTitle>
          </DialogHeader>
          <AddWidgetForm 
            availableWidgets={availableWidgets} 
            onAddWidget={handleAddWidget} 
            existingWidgets={widgets}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 