'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import TransactionModal from '../components/TransactionModal';

interface TransactionModalContextType {
  openTransactionModal: (type: 'INCOME' | 'EXPENSE') => void;
  closeTransactionModal: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextType | null>(null);

export const useTransactionModal = () => {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error('useTransactionModal must be used within a TransactionModalProvider');
  }
  return context;
};

interface TransactionModalProviderProps {
  children: ReactNode;
}

export function TransactionModalProvider({ children }: TransactionModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const openTransactionModal = (type: 'INCOME' | 'EXPENSE') => {
    setInitialData({ type });
    setIsOpen(true);
  };

  const closeTransactionModal = () => {
    setIsOpen(false);
    // Reset initialData after modal is closed
    setTimeout(() => {
      setInitialData(null);
    }, 300);
  };

  const handleSave = (transaction: any) => {
    // Could handle global state updates here if needed
    closeTransactionModal();
    // Dispatch an event to notify components about the transaction
    const event = new CustomEvent('transaction:saved', { detail: transaction });
    window.dispatchEvent(event);
  };

  return (
    <TransactionModalContext.Provider value={{ openTransactionModal, closeTransactionModal }}>
      {children}
      
      <TransactionModal
        isOpen={isOpen}
        onClose={closeTransactionModal}
        onSave={handleSave}
        initialData={initialData}
        isQuickAction={true}
      />
    </TransactionModalContext.Provider>
  );
} 