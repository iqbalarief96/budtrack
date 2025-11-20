'use client';

import React, { useState, useRef } from 'react';
import { FiCamera, FiUpload, FiLoader } from 'react-icons/fi';
import { toast } from 'sonner';

interface ScanReceiptButtonProps {
    onScanSuccess: (data: { amount: number; date: string; merchant: string; categoryId: string | null }) => void;
    className?: string;
}

export default function ScanReceiptButton({ onScanSuccess, className = '' }: ScanReceiptButtonProps) {
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log('[ScanReceipt] File selected:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified)
        });

        setIsScanning(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log('[ScanReceipt] Sending request to /api/scan-receipt...');
            const response = await fetch('/api/scan-receipt', {
                method: 'POST',
                body: formData,
            });

            console.log('[ScanReceipt] Response status:', response.status);
            const data = await response.json();
            console.log('[ScanReceipt] Response data:', data);

            if (!response.ok) {
                console.error('[ScanReceipt] Error response:', data);
                throw new Error(data.error || 'Failed to scan receipt');
            }

            toast.success('Struk berhasil dipindai!');
            onScanSuccess({
                amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
                date: data.date,
                merchant: data.merchant,
                categoryId: data.categoryId,
            });
        } catch (error) {
            console.error('[ScanReceipt] Error:', error);
            console.error('[ScanReceipt] Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            toast.error(error instanceof Error ? error.message : 'Gagal memindai struk');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`relative ${className}`}>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
                {isScanning ? (
                    <>
                        <FiLoader className="animate-spin" />
                        <span>Memindai...</span>
                    </>
                ) : (
                    <>
                        <FiCamera />
                        <span>Scan Struk</span>
                    </>
                )}
            </button>
        </div>
    );
}
