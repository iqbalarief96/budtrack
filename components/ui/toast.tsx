'use client';

import React from 'react';
import { ToastProps, useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';

export function Toast({ toast }: { toast: { id: number; props: ToastProps } }) {
  const { dismissToast } = useToast();
  const { title, description, variant = 'default' } = toast.props;

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md animate-in fade-in slide-in-from-top-5 
      ${variant === 'destructive' ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-white border text-gray-900'}`}
    >
      <div className="flex justify-between items-start">
        <div>
          {title && <h5 className="font-semibold">{title}</h5>}
          {description && <p className="text-sm">{description}</p>}
        </div>
        <button
          onClick={() => dismissToast(toast.id)}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </>
  );
}

export { useToast };
export type { ToastProps as ToastPropsExport }; 