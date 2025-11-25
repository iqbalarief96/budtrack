'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BankStatementImportProps {
  wallets: any[];
  onImportComplete: () => void;
}

export function BankStatementImport({ wallets, onImportComplete }: BankStatementImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [selectedBank, setSelectedBank] = useState('AUTO');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bankFormats = [
    { id: 'AUTO', name: 'Auto-detect' },
    { id: 'BCA', name: 'BCA' },
    { id: 'MANDIRI', name: 'Mandiri' },
    { id: 'BRI', name: 'BRI' },
    { id: 'BNI', name: 'BNI' },
    { id: 'GENERIC', name: 'Generic CSV' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!selectedWallet) {
      toast.error('Please select a wallet first');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('walletId', selectedWallet);
      formData.append('skipDuplicates', skipDuplicates.toString());
      
      if (selectedBank !== 'AUTO') {
        formData.append('bankFormat', selectedBank);
      }

      const response = await fetch('/api/transactions/import-bank', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import');
      }

      const data = await response.json();
      setResult(data);
      toast.success(data.message);
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import bank statement');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setSelectedWallet('');
    setSelectedBank('AUTO');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import Bank Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Wallet</label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose wallet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bank Format</label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bankFormats.map(format => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-detect will try to identify your bank format automatically
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="skipDuplicates" className="text-sm">
                  Skip duplicate transactions
                </label>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                  Upload your bank statement CSV file
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting || !selectedWallet}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose File
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 mb-1">💡 Tips:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Download CSV from your bank's internet banking</li>
                  <li>• Make sure the file includes date, description, and amount</li>
                  <li>• Transactions will be categorized as "Uncategorized"</li>
                  <li>• You can edit categories after import</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Import Complete!</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-600 font-medium">Imported</p>
                    <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  </div>
                  {result.duplicates > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-yellow-600 font-medium">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-700">{result.duplicates}</p>
                    </div>
                  )}
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-red-900">Some errors occurred:</p>
                  </div>
                  <ul className="text-xs text-red-800 space-y-1">
                    {result.errors.slice(0, 5).map((error: string, i: number) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>• ... and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
