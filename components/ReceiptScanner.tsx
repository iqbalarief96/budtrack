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

    // Compress image to fit under maxSize (in bytes)
    const compressImage = async (file: File, maxSize: number = 4 * 1024 * 1024): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onerror = reject;
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onerror = reject;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas not supported'));
                        return;
                    }

                    // Calculate new dimensions (max 2048px on longest side for receipt OCR)
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 2048;

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try different quality levels to get under maxSize
                    let quality = 0.9;
                    let base64 = '';
                    let attempts = 0;
                    const maxAttempts = 5;

                    const tryCompress = () => {
                        try {
                            const dataUrl = canvas.toDataURL('image/jpeg', quality);
                            console.log(`[Compress] Canvas toDataURL success, dataUrl length: ${dataUrl.length}`);

                            // Extract and sanitize base64 string (remove any whitespace/newlines)
                            const parts = dataUrl.split(',');
                            if (parts.length !== 2) {
                                console.error('[Compress] Invalid dataUrl format, parts:', parts.length);
                                reject(new Error('Format data URL tidak valid'));
                                return;
                            }

                            // Aggressive sanitization for iOS compatibility
                            // Remove all whitespace, newlines, and non-base64 characters
                            base64 = parts[1]
                                .replace(/\s+/g, '')  // Remove all whitespace
                                .replace(/\r?\n|\r/g, '')  // Remove newlines
                                .replace(/[^A-Za-z0-9+/=]/g, '')  // Keep only valid base64 chars
                                .trim();

                            console.log(`[Compress] Base64 extracted, length: ${base64.length}, first 50 chars: ${base64.substring(0, 50)}`);
                            console.log(`[Compress] Last 20 chars: ${base64.substring(base64.length - 20)}`);

                            // Basic validation - just check if we have data
                            if (!base64 || base64.length < 100) {
                                console.error('[Compress] Base64 too short or empty');
                                reject(new Error('Data gambar tidak valid'));
                                return;
                            }

                            // iOS-specific validation: ensure proper base64 padding
                            const paddingNeeded = (4 - (base64.length % 4)) % 4;
                            if (paddingNeeded > 0) {
                                console.log(`[Compress] iOS: Adding ${paddingNeeded} padding characters`);
                                base64 += '='.repeat(paddingNeeded);
                            }

                            // Check size (base64 is ~1.37x original size)
                            const estimatedSize = (base64.length * 3) / 4;
                            console.log(`[Compress] Estimated size: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, Quality: ${quality}, Attempt: ${attempts + 1}`);

                            if (estimatedSize <= maxSize || quality <= 0.5 || attempts >= maxAttempts) {
                                console.log(`[Compress] Compression complete! Final size: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, Quality: ${quality}`);
                                resolve(base64);
                            } else {
                                attempts++;
                                quality -= 0.1;
                                tryCompress();
                            }
                        } catch (err) {
                            console.error('[Compress] Error in tryCompress:', err);
                            reject(err);
                        }
                    };

                    try {
                        tryCompress();
                    } catch (err) {
                        console.error('[Compress] Error starting compression:', err);
                        reject(err);
                    }
                };
            };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar');
            return;
        }

        setIsScanning(true);
        try {
            // Compress image first
            toast.info('Memproses gambar...');
            const base64 = await compressImage(file);

            // Final validation before sending
            if (!base64 || base64.length < 100) {
                throw new Error('Gambar terlalu kecil atau tidak valid');
            }

            console.log(`[ReceiptScanner] Sending image: ${(base64.length * 3 / 4 / 1024 / 1024).toFixed(2)}MB, Model: ${selectedModel}`);

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
                console.error('[ReceiptScanner] API error:', error);
                throw new Error(error.error || 'Gagal memproses struk');
            }

            const data = await response.json();
            onScanComplete(data);
            setIsOpen(false);
            toast.success('Struk berhasil diproses!');
        } catch (error) {
            console.error('[ReceiptScanner] Scan error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Gagal memproses struk';
            toast.error(errorMessage);
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

                        <label htmlFor="camera-input" className="cursor-pointer">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-24 flex flex-col gap-2 w-full"
                                disabled={isScanning}
                                onClick={() => document.getElementById('camera-input')?.click()}
                            >
                                {isScanning ? (
                                    <FiLoader className="w-6 h-6 animate-spin" />
                                ) : (
                                    <FiCamera className="w-6 h-6" />
                                )}
                                <span>Ambil Foto</span>
                            </Button>
                        </label>
                    </div>

                    {/* Upload file input */}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    {/* Camera capture input (mobile only) */}
                    <input
                        id="camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
