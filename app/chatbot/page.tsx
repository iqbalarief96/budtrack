import React from 'react';
import FinanceChatbot from '@/app/components/FinanceChatbot';

export const metadata = {
  title: 'Finance Assistant - BudTrack',
  description: 'Chat dengan asisten keuangan pribadi kamu'
};

export default function ChatbotPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <FinanceChatbot />
      </div>
    </main>
  );
}
