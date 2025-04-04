import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function calculateProgress(spent: number, budget: number): number {
  return (spent / budget) * 100;
}

export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-red-500';
  if (progress >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function getProgressTextColor(progress: number): string {
  if (progress >= 100) return 'text-red-500';
  if (progress >= 80) return 'text-yellow-500';
  return 'text-green-500';
} 