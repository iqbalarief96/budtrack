'use client';

import React, { useState, useRef } from 'react';
import { FiCamera, FiUpload, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ReceiptScannerProps {
    onScanComplete: (data: any) => void;
}

const MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o (Best Quality - butuh OpenAI key)', provider: 'openai' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Butuh OpenAI API key + saldo)', provider: 'openai' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Gratis, bisa rate-limited)', provider: 'openrouter' },
    { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (Butuh Gemini API key)', provider: 'google' },
];

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id); // Default to GPT-4o
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            toast.error('Ukuran file terlalu besar (maks 4MB)');
            return;
        }

        setIsScanning(true);
        try {
            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result?.toString().split(',')[1];

                const response = await fetch('/api/scan-receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: base64,
                        model: selectedModel
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Gagal memproses struk');
                }

                const data = await response.json();
                onScanComplete(data);
                setIsOpen(false);
                toast.success('Struk berhasil diproses!');
            };
        } catch (error) {
            console.error('Scan error:', error);
            toast.error(error instanceof Error ? error.message : 'Gagal memproses struk');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FiCamera className="w-4 h-4" />
                    Scan Struk
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Struk Belanja</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Pilih Model AI</label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MODELS.map(model => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Pastikan API Key untuk model yang dipilih sudah diatur di Pengaturan.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <FiLoader className="w-6 h-6 animate-spin" />
                            ) : (
                                <FiUpload className="w-6 h-6" />
                            )}
                            <span>Upload Foto</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2"
                            onClick={() => {
                                // Camera handling would go here, for now just trigger upload
                                fileInputRef.current?.click();
                            }}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <FiLoader className="w-6 h-6 animate-spin" />
                            ) : (
                                <FiCamera className="w-6 h-6" />
                            )}
                            <span>Ambil Foto</span>
                        </Button>
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
