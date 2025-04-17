'use client';

import React, { useState } from 'react';
import { DashboardWidget } from './WidgetTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

interface AddWidgetFormProps {
  availableWidgets: DashboardWidget[];
  existingWidgets: DashboardWidget[];
  onAddWidget: (widget: DashboardWidget) => void;
}

export default function AddWidgetForm({
  availableWidgets,
  existingWidgets,
  onAddWidget
}: AddWidgetFormProps) {
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  
  // Group widgets by type to prevent duplicates
  const existingWidgetTypes = new Set(existingWidgets.map(w => w.type));
  
  // Filter available widgets to only show those that aren't already added
  // For widgets that can have multiple instances, we don't filter them
  const filteredWidgets = availableWidgets.filter(widget => {
    const isMultiInstance = ['budget-overview', 'transaction-list'].includes(widget.type);
    return isMultiInstance || !existingWidgetTypes.has(widget.type);
  });
  
  const handleAddWidget = () => {
    if (!selectedWidgetType) return;
    
    const widgetTemplate = availableWidgets.find(w => w.type === selectedWidgetType);
    if (!widgetTemplate) return;
    
    const newWidget: DashboardWidget = {
      ...widgetTemplate,
      id: `${widgetTemplate.type}-${Date.now()}`,
      title: customTitle || widgetTemplate.title,
      position: existingWidgets.length,
    };
    
    onAddWidget(newWidget);
    setSelectedWidgetType(null);
    setCustomTitle('');
  };
  
  if (filteredWidgets.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Semua widget sudah ditambahkan ke dashboard.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Pilih Widget</h3>
        <RadioGroup 
          value={selectedWidgetType || ''} 
          onValueChange={setSelectedWidgetType}
          className="grid grid-cols-1 gap-2"
        >
          {filteredWidgets.map((widget) => (
            <div
              key={widget.type}
              className={`border rounded-md p-3 flex items-center space-x-3 cursor-pointer ${
                selectedWidgetType === widget.type 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedWidgetType(widget.type)}
            >
              <RadioGroupItem value={widget.type} id={widget.type} className="sr-only" />
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                selectedWidgetType === widget.type 
                  ? 'bg-primary text-white' 
                  : 'border border-gray-300'
              }`}>
                {selectedWidgetType === widget.type && <Check className="h-3 w-3" />}
              </div>
              <Label htmlFor={widget.type} className="flex-1 cursor-pointer">
                <div className="font-medium">{widget.title}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {getWidgetDescription(widget.type)}
                </div>
              </Label>
              <div className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                {widget.size}
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {selectedWidgetType && (
        <div>
          <h3 className="text-sm font-medium mb-2">Judul Widget (Opsional)</h3>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={availableWidgets.find(w => w.type === selectedWidgetType)?.title}
            className="mb-4"
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button 
          onClick={handleAddWidget}
          disabled={!selectedWidgetType}
        >
          Tambah Widget
        </Button>
      </div>
    </div>
  );
}

// Helper function to get description for widgets
function getWidgetDescription(type: string): string {
  switch (type) {
    case 'balance':
      return 'Menampilkan total saldo dari semua wallet';
    case 'income':
      return 'Menampilkan total pemasukan bulan ini';
    case 'expense':
      return 'Menampilkan total pengeluaran bulan ini';
    case 'expense-chart':
      return 'Visualisasi distribusi pengeluaran berdasarkan kategori';
    case 'income-expense-chart':
      return 'Grafik perbandingan pemasukan dan pengeluaran';
    case 'transaction-list':
      return 'Daftar transaksi terbaru';
    case 'emergency-fund':
      return 'Status dan progres dana darurat';
    case 'budget-overview':
      return 'Ringkasan status semua budget';
    case 'financial-tips':
      return 'Tips pengelolaan keuangan';
    case 'savings-goals':
      return 'Daftar dan progres target tabungan';
    case 'investment-performance':
      return 'Grafik performa investasi';
    default:
      return 'Widget tambahan untuk dashboard';
  }
} 