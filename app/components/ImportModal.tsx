"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Wallet {
  id: string;
  name: string;
}

interface ImportModalProps {
  wallets: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export default function ImportModal({ wallets, isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedWallet) {
      toast({
        title: "Error",
        description: "Pilih file dan wallet dulu dong",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("walletId", selectedWallet);
    
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success!",
          description: data.message ?? `${data.count ?? 0} transaksi berhasil diimport`,
        });
        // Reset form after successful import
        setFile(null);
        setSelectedWallet("");
        
        // Close the modal
        onClose();
        
        // Notify parent component that import is complete
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(data.message || "Import gagal");
      }
    } catch (error) {
      toast({
        title: "Import gagal",
        description: error instanceof Error ? error.message : "Coba cek format CSV-nya",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Transaksi</DialogTitle>
          <DialogDescription>Upload CSV dari aplikasi lain</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleImport} className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <label className="text-sm font-medium">Pilih Wallet</label>
            <select 
              value={selectedWallet} 
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Pilih Wallet</option>
              {wallets.map(wallet => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid w-full items-center gap-1.5">
            <label className="text-sm font-medium">Upload CSV</label>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="flex w-full"
              required
            />
            <p className="text-xs text-muted-foreground">
              Format: CSV dengan header (Date,Type,Amount,Description,Category,Wallet) atau format lama
            </p>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Importing..." : "Import Transaksi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
