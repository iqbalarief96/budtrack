"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Wallet {
  id: string;
  name: string;
}

interface ImportTransactionsProps {
  wallets: Wallet[];
}

export default function ImportTransactions({ wallets }: ImportTransactionsProps) {
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
          description: `${data.count} transaksi berhasil diimport`,
        });
        // Reset form after successful import
        setFile(null);
        setSelectedWallet("");
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
    <Card>
      <CardHeader>
        <CardTitle>Import Transaksi</CardTitle>
        <CardDescription>Upload CSV dari aplikasi lain</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport}>
          <div className="space-y-4">
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
              <p className="text-sm text-muted-foreground">Format: CSV dengan header (ID, user_id, wallet_id, category_id, amount, type, description, date)</p>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Importing..." : "Import Transaksi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 