import React from 'react';
import FinanceChatbot from '@/app/components/FinanceChatbot';

export const metadata = {
  title: 'Finance Assistant - BudTrack',
  description: 'Chat dengan asisten keuangan pribadi kamu'
};

export default function ChatbotPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Finance Assistant</h1>
      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-1">
          <FinanceChatbot />
        </div>
      </div>
    </div>
  );
} 