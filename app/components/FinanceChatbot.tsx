'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, RefreshCw, Bot, User, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useWallet } from '@/app/providers/WalletProvider';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SuggestedQuestion {
  text: string;
  category: 'budget' | 'transaction' | 'general' | 'savings' | 'investment';
  icon?: string;
}

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions: SuggestedQuestion[] = [
  { 
    text: 'Berapa total pengeluaran saya bulan ini?', 
    category: 'transaction',
    icon: '💰'
  },
  { 
    text: 'Apakah saya masih dalam budget yang tepat?', 
    category: 'budget',
    icon: '📊'
  },
  { 
    text: 'Kategori apa yang paling banyak saya keluarkan uang bulan ini?', 
    category: 'transaction',
    icon: '📈'
  },
  { 
    text: 'Berapa dana darurat yang sebaiknya saya sisihkan?', 
    category: 'savings',
    icon: '🛡️'
  },
  { 
    text: 'Bagaimana cara mengatur budget lebih efektif?', 
    category: 'general',
    icon: '💡'
  },
  { 
    text: 'Produk investasi apa yang cocok untuk saya?', 
    category: 'investment',
    icon: '📈'
  },
  { 
    text: 'Apakah saya bisa mencapai target keuangan saya?', 
    category: 'general', 
    icon: '🎯'
  },
  { 
    text: 'Bisakah kamu analisis pengeluaran saya selama 3 bulan terakhir?', 
    category: 'transaction',
    icon: '🔍'
  }
];

export default function FinanceChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Halo! Saya asisten keuangan pribadi kamu. Apa yang ingin kamu ketahui tentang keuangan kamu hari ini?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { selectedWallet } = useWallet();
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load chat history from localStorage when component mounts
  useEffect(() => {
    if (session && selectedWallet) {
      try {
        const storageKey = `chat-history-${selectedWallet.id}`;
        const savedChat = localStorage.getItem(storageKey);
        
        if (savedChat) {
          const savedMessages = JSON.parse(savedChat) as Message[];
          setMessages(savedMessages);
          
          // Build chat history for context
          const history = savedMessages
            .filter((msg: Message) => msg.id !== '1') // Skip welcome message
            .map((msg: Message) => ({ 
              role: msg.role, 
              content: msg.content 
            }));
          
          setChatHistory(history);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    }
  }, [session, selectedWallet]);
  
  // Save messages to localStorage
  const saveMessages = (msgs: Message[]) => {
    if (session && selectedWallet) {
      try {
        const storageKey = `chat-history-${selectedWallet.id}`;
        localStorage.setItem(storageKey, JSON.stringify(msgs));
      } catch (err) {
        console.error('Error saving chat history:', err);
      }
    }
  };
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!inputMessage.trim()) return;
    if (!session) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to use the chatbot',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedWallet) {
      toast({
        title: 'Select a wallet',
        description: 'Please select a wallet to get personalized responses',
        variant: 'destructive',
      });
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    // Update messages and clear input
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    
    // Update chat history for context
    const newHistory: ChatHistoryItem[] = [
      ...chatHistory,
      { role: 'user', content: inputMessage }
    ];
    setChatHistory(newHistory);
    
    try {
      // Call API to get assistant response
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputMessage,
          walletId: selectedWallet.id,
          history: newHistory.slice(-10) // Send last 10 messages for context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get chatbot response');
      }
      
      const data = await response.json();
      
      // Add assistant response to messages
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      // Update chat history with assistant response
      setChatHistory([
        ...newHistory,
        { role: 'assistant', content: data.response }
      ]);
      
      // Save chat history to localStorage
      saveMessages(updatedMessages);
      
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, saya tidak bisa menjawab sekarang. Coba lagi nanti ya!',
        timestamp: new Date(),
      };
      
      setMessages([...newMessages, errorMessage]);
      saveMessages([...newMessages, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to get chatbot response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuestionClick = (question: string) => {
    setInputMessage(question);
    setShowWelcome(false);
  };
  
  const clearChat = () => {
    if (session && selectedWallet) {
      // Reset to just the welcome message
      const initialMessages = [{
        id: '1',
        role: 'assistant' as const,
        content: 'Halo! Saya asisten keuangan pribadi kamu. Apa yang ingin kamu ketahui tentang keuangan kamu hari ini?',
        timestamp: new Date(),
      }];
      
      setMessages(initialMessages);
      setChatHistory([]);
      
      // Clear localStorage
      const storageKey = `chat-history-${selectedWallet.id}`;
      localStorage.removeItem(storageKey);
      
      toast({
        title: 'Chat history cleared',
        description: 'Your chat history has been reset',
      });
      
      setShowWelcome(true);
    }
  };
  
  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    // Use explicit format instead of locale-dependent formatting
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  return (
    <Card className="w-full h-[700px] max-h-[80vh] flex flex-col">
      <CardHeader className="border-b px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-lg font-medium">Finance Assistant</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500 hover:text-gray-700"
            onClick={clearChat}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                <div 
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Welcome section with suggested questions */}
          {showWelcome && messages.length <= 2 && !isLoading && (
            <div className="mt-6 mb-2">
              <div className="text-sm font-medium text-gray-500 mb-2">Pertanyaan yang bisa kamu tanyakan:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="justify-start text-left h-auto py-2 font-normal hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => handleQuestionClick(q.text)}
                  >
                    <div className="mr-2">{q.icon}</div>
                    {q.text}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-3">
        <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
          <Input
            placeholder="Tanyakan tentang keuangan kamu..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-grow"
            disabled={isLoading || !session || !selectedWallet}
          />
          <Button 
            type="submit" 
            disabled={!inputMessage.trim() || isLoading || !session || !selectedWallet}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 