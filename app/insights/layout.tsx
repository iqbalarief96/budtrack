'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function InsightsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  
  return (
    <div className="space-y-6">
      <div className="border-b">
        <div className="container flex gap-6 py-4">
          <Link
            href="/insights"
            className={pathname === '/insights' 
              ? "text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-4" 
              : "text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors pb-4"}
          >
            Basic Insights
          </Link>
          <Link
            href="/insights/advanced"
            className={pathname === '/insights/advanced' 
              ? "text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-4" 
              : "text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors pb-4"}
          >
            Advanced Analytics
          </Link>
          <Link
            href="/insights/financial-advice"
            className={pathname === '/insights/financial-advice' 
              ? "text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-4" 
              : "text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors pb-4"}
          >
            Financial Advice
          </Link>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
} 