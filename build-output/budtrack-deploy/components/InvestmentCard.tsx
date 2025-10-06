'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';

// Definir el tipo Investment
type Investment = {
  id: string;
  name: string;
  type: string;
  tickerSymbol: string | null;
  quantity: number;
  averagePurchasePrice: number;
  purchaseDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  walletId: string;
};

// Mapeo de tipos de inversión en inglés a indonesio
const investmentTypeMap: Record<string, string> = {
  'STOCK': 'Saham',
  'CRYPTO': 'Kripto',
  'PRECIOUS_METAL': 'Logam Mulia',
  'PROPERTY': 'Properti',
  'OTHER': 'Lainnya',
};

// Konstanta konversi troy ounce ke gram
const TROY_OUNCE_TO_GRAM = 31.1034768;

interface InvestmentCardProps {
  investment: Investment;
  marketData?: Record<string, any>;
  usdToIdr?: number;
  onInvestmentUpdated?: () => void;
}

const InvestmentCard = ({ investment, marketData = {}, usdToIdr = 15500, onInvestmentUpdated }: InvestmentCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Función para formatear moneda
  const formatCurrency = (amount: number | null | undefined, currency = 'IDR') => {
    if (amount == null) return '-';
    const minDigits = currency === 'USD' ? 2 : 0;
    const maxDigits = currency === 'USD' ? 2 : 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Obtener el nombre traducido del tipo de inversión
  const getInvestmentType = (type: string) => {
    return investmentTypeMap[type] || type;
  };

  // Cek apakah investasi adalah emas
  const isGold = investment.tickerSymbol?.toLowerCase() === 'xau';

  // Calcular valor actual basado en datos de mercado
  const calculateCurrentValue = () => {
    if (!investment.tickerSymbol) return investment.quantity * investment.averagePurchasePrice;
    
    const symbol = investment.tickerSymbol.toLowerCase();
    const marketPrice = marketData && marketData[symbol] ? marketData[symbol] : null;
    
    if (!marketPrice) return investment.quantity * investment.averagePurchasePrice;
    
    // Jika emas, konversi harga dari USD/oz ke USD/gram
    if (isGold) {
      // Harga emas per gram dalam USD
      const goldPricePerGramUSD = marketPrice / TROY_OUNCE_TO_GRAM;
      // Nilai dalam USD
      const valueInUSD = investment.quantity * goldPricePerGramUSD;
      // Nilai dalam IDR
      return valueInUSD * usdToIdr;
    } else {
      // Investasi lain (crypto, saham, dll)
      return investment.quantity * marketPrice * usdToIdr;
    }
  };

  // Calcular ganancia/pérdida
  const calculateProfitLoss = () => {
    const currentValue = calculateCurrentValue();
    const purchaseValue = investment.quantity * investment.averagePurchasePrice;
    return currentValue - purchaseValue;
  };

  // Calcular porcentaje de cambio
  const calculateChangePercentage = () => {
    const profitLoss = calculateProfitLoss();
    const purchaseValue = investment.quantity * investment.averagePurchasePrice;
    
    if (purchaseValue === 0) return 0;
    
    return (profitLoss / purchaseValue) * 100;
  };

  // Manejar eliminación de inversión
  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/investments/${investment.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar inversión');
      }
      
      toast({
        title: 'Inversión eliminada',
        description: 'La inversión ha sido eliminada exitosamente',
      });
      
      setIsDeleteDialogOpen(false);
      
      // Callback para actualizar la lista de inversiones
      if (onInvestmentUpdated) {
        onInvestmentUpdated();
      }
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al eliminar la inversión',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Valores calculados
  const currentValue = calculateCurrentValue();
  const profitLoss = calculateProfitLoss();
  const changePercentage = calculateChangePercentage();
  const isProfitable = profitLoss >= 0;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 pb-2 bg-muted/30">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-semibold">{investment.name}</CardTitle>
            <div className="text-xs text-muted-foreground">
              {investment.tickerSymbol ? investment.tickerSymbol : "Sin símbolo"}
            </div>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={`/investments/edit/${investment.id}`}>
                <Edit className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{isGold ? 'Jumlah (gram)' : 'Jumlah'}</div>
            <div>{investment.quantity}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tipe</div>
            <div>{getInvestmentType(investment.type)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{isGold ? 'Harga/Gram' : 'Harga Beli'}</div>
            <div>{formatCurrency(investment.averagePurchasePrice)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tanggal Beli</div>
            <div>{formatDate(investment.purchaseDate)}</div>
          </div>
        </div>

        <div className="border-t pt-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Nilai Saat Ini</div>
              <div className="font-medium">{formatCurrency(currentValue)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Keuntungan/Kerugian</div>
              <div className={`font-medium flex items-center justify-end gap-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatCurrency(Math.abs(profitLoss))}
                <span className="text-xs">({isProfitable ? '+' : '-'}{Math.abs(changePercentage).toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {investment.notes && (
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-muted-foreground">Catatan</div>
            <div className="text-sm">{investment.notes}</div>
          </div>
        )}
      </CardContent>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus investasi?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus investasi "{investment.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InvestmentCard; 