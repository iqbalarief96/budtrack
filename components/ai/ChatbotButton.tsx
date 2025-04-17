'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useWallet } from '@/app/providers/WalletProvider';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedQuestion {
  text: string;
  category: 'budget' | 'transaction' | 'general' | 'savings' | 'investment';
  icon?: string;
}

const suggestedQuestions: SuggestedQuestion[] = [
  { 
    text: 'Berapa total pengeluaran gw bulan ini?', 
    category: 'transaction',
    icon: '💰'
  },
  { 
    text: 'Gimana cara atur budget lebih efektif?', 
    category: 'budget',
    icon: '📊'
  },
  { 
    text: 'Kategori apa yang paling boros bulan ini?', 
    category: 'transaction',
    icon: '📈'
  },
  { 
    text: 'Berapa dana darurat yang sebaiknya disiapin?', 
    category: 'savings',
    icon: '🛡️'
  }
];

export default function ChatbotButton() {
  const { data: session } = useSession();
  const { selectedWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Hai! Gw adalah BudTrack Assistant. Tanya apa aja soal keuangan personal lu dan gw akan bantu. Contohnya: "Gimana cara atur budget bulanan yang efektif?" atau "Jelasin apa itu investasi reksadana"' 
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    if (!session) {
      toast.error('Login dulu ya bro biar bisa pake chatbot!');
      return;
    }
    
    if (!selectedWallet) {
      toast.error('Pilih dompet dulu ya biar dapat jawaban yang lebih personal!');
      return;
    }
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: message };
    setChatHistory([...chatHistory, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Get last 5 messages for context
      const recentHistory = chatHistory.slice(-5);
      
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          walletId: selectedWallet.id,
          history: recentHistory
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      
    } catch (error) {
      console.error('Error in chatbot request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      
      // Add error message to chat
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'Maaf, gw lagi ada kendala teknis nih. Coba lagi nanti ya!' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setMessage(question);
    setShowSuggestions(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Open financial assistant"
      >
        <MessageCircle size={24} />
      </button>
      
      {/* Chat modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 md:p-0">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Financial Assistant</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-[80%]">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggested Questions */}
              {showSuggestions && chatHistory.length <= 1 && !isLoading && (
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-2">Pertanyaan yang bisa lu tanyain:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuestionClick(q.text)}
                        className="text-left p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <span className="mr-2">{q.icon}</span>
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Input form */}
            <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a financial question..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 