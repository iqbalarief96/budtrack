'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import TransactionModal from '../components/TransactionModal';

type TransactionModalOptions =
  | 'INCOME'
  | 'EXPENSE'
  | {
      type?: 'INCOME' | 'EXPENSE';
      quick?: boolean;
    };

interface TransactionModalContextType {
  openTransactionModal: (options?: TransactionModalOptions) => void;
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

/**
 * Non-throwing variant. Returns null when no provider is mounted (e.g. the
 * root layout only mounts TransactionModalProvider for authenticated
 * sessions). Callers that must render unconditionally should fall back to
 * their own local modal state instead of crashing the page.
 */
export const useOptionalTransactionModal = () => {
  return useContext(TransactionModalContext);
};

interface TransactionModalProviderProps {
  children: ReactNode;
}

export function TransactionModalProvider({ children }: TransactionModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const openTransactionModal = (options?: TransactionModalOptions) => {
    let payload: Record<string, unknown> = {};

    if (typeof options === 'string') {
      payload.type = options;
      payload.quick = true;
    } else if (options) {
      if (options.type) {
        payload.type = options.type;
      }
      if (typeof options.quick === 'boolean') {
        payload.quick = options.quick;
      }
    }

    if (payload.quick === undefined) {
      payload.quick = true;
    }

    setInitialData(payload);
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
        isQuickAction={initialData?.quick !== false}
      />
    </TransactionModalContext.Provider>
  );
} 
