'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { ReceiptData } from '@/lib/receipt-scanner';

interface ReceiptConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: any[]) => void;
    data: ReceiptData | null;
    wallets: any[]; // Pass available wallets for selection
}

export function ReceiptConfirmationModal({ isOpen, onClose, onSave, data, wallets }: ReceiptConfirmationModalProps) {
    const [items, setItems] = useState<any[]>([]);
    const [header, setHeader] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [defaultWalletId, setDefaultWalletId] = useState<string>('');

    useEffect(() => {
        if (data) {
            setHeader(data.header);
            setItems(data.items_as_transactions.map((item, index) => ({ ...item, id: index })));
            // Select all items by default
            setSelectedItems(new Set(data.items_as_transactions.map((_, index) => index)));
        }
        if (wallets.length > 0) {
            setDefaultWalletId(wallets[0].id);
        }
    }, [data, wallets]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleHeaderChange = (field: string, value: any) => {
        setHeader({ ...header, [field]: value });
    };

    const toggleItemSelection = (index: number) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedItems(newSelected);
    };

    const handleSave = () => {
        const transactionsToSave = items
            .filter((_, index) => selectedItems.has(index))
            .map(item => ({
                amount: item.jumlah,
                description: item.deskripsi,
                date: header.transaction_date, // Use header date for all items
                type: 'EXPENSE', // Receipts are usually expenses
                walletId: defaultWalletId, // Use selected default wallet
                // You might need to map category names to IDs here or handle it on the backend
                categoryName: item.kategori
            }));

        onSave(transactionsToSave);
        onClose();
    };

    if (!data || !header) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Konfirmasi Data Struk</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <Label>Nama Toko</Label>
                            <Input
                                value={header.store_name}
                                onChange={(e) => handleHeaderChange('store_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Tanggal</Label>
                            <Input
                                type="date"
                                value={header.transaction_date}
                                onChange={(e) => handleHeaderChange('transaction_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Total Struk</Label>
                            <div className="text-lg font-bold text-blue-600">
                                {formatCurrency(header.total_amount)}
                            </div>
                        </div>
                        <div>
                            <Label>Dompet Pembayaran</Label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={defaultWalletId}
                                onChange={(e) => setDefaultWalletId(e.target.value)}
                            >
                                {wallets.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Item Belanja</h3>
                            <span className="text-sm text-gray-500">{selectedItems.size} item dipilih</span>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                <Checkbox
                                    checked={selectedItems.has(index)}
                                    onCheckedChange={() => toggleItemSelection(index)}
                                    className="mt-2"
                                />
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <Input
                                            value={item.deskripsi}
                                            onChange={(e) => handleItemChange(index, 'deskripsi', e.target.value)}
                                            className="mb-1 font-medium"
                                            placeholder="Nama Item"
                                        />
                                        <Input
                                            value={item.kategori}
                                            onChange={(e) => handleItemChange(index, 'kategori', e.target.value)}
                                            className="text-xs text-gray-500 h-7"
                                            placeholder="Kategori"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            value={item.jumlah}
                                            onChange={(e) => handleItemChange(index, 'jumlah', parseFloat(e.target.value))}
                                            className="text-right"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSave}>Simpan {selectedItems.size} Transaksi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
