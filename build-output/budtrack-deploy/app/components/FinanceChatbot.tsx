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
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

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

// Custom styles untuk membuat markdown lebih compact
const markdownStyles = {
  wrapper: "prose prose-sm prose-slate max-w-none overflow-visible [&>*]:!my-0 [&>*]:!py-0 [&>*]:!mt-0 [&>*]:!mb-0 [&>h3]:!m-0 [&>h2]:!m-0 leading-tight",
};

// Simplified function to preprocess markdown - just for emoji headings
const preprocessMarkdown = (content: string): string => {
  // Make sure emoji headings and tables are tightly packed
  let processed = content.replace(/(📊.*|🔥.*)\s*\n+\s*(\|)/g, '$1\n$2');
  
  return processed;
};

// Custom CSS untuk menghilangkan spacing di list items
const customListStyles = {
  container: {
    lineHeight: '1',
  },
  listItemContent: {
    display: 'inline',
    lineHeight: '1',
  }
};

// Fix table spacing by manually processing the content
const fixTableSpacing = (content: string): string => {
  // Handle emoji heading + table case
  let fixedContent = content.replace(/(📊.*|🔥.*)\s*\n+\s*(\|.*\|.*\n\|[-:\s]+\|)/g, 
    '<div style="margin:0; padding:0;">\n<h3 style="margin:0; padding:0; font-size:14px; font-weight:600;">$1</h3>\n$2</div>');
  
  return fixedContent;
};

// Super robust table renderer that handles all edge cases
const SuperTableRenderer = ({ content }: { content: string }) => {
  // Pre-process the content to remove stray ** markers
  content = content.replace(/^\*\*\s*/m, ''); // Remove ** at start of any line
  content = content.replace(/\s*\*\*$/m, ''); // Remove ** at end of any line
  content = content.replace(/\*\*(\s*\n)/g, '$1'); // Remove ** before line breaks
  
  // Step 1: Check if table has an emoji header
  const emojiHeaderMatch = content.match(/^(📊[\s\S]*?|🔥[\s\S]*?)(?=\n\s*\|)/);
  const hasEmojiHeader = !!emojiHeaderMatch;
  
  // Step 2: Extract header if present
  let header = '';
  let tableContent = content;
  
  if (hasEmojiHeader && emojiHeaderMatch) {
    header = emojiHeaderMatch[0].trim();
    // Clean up any lingering ** in the header
    header = header.replace(/^\*\*\s*/, '').replace(/\s*\*\*$/, '');
    tableContent = content.substring(emojiHeaderMatch[0].length).trim();
  }
  
  // Step 3: Parse the table
  // Split into rows - every line starting with |
  const tableRows = tableContent
    .split('\n')
    .map(row => row.trim())
    .filter(row => row.startsWith('|') && row.endsWith('|'));
  
  if (tableRows.length < 2) {
    // Not a valid table, render as normal text
    return <div>{content}</div>;
  }
  
  // Step 4: Extract header row and data rows
  const headerRow = tableRows[0];
  // Skip separator row (row 2)
  const dataRows = tableRows.slice(2);
  
  // Step 5: Process cells
  const headerCells = headerRow
    .split('|')
    .filter(cell => cell.trim() !== '')
    .map(cell => cell.trim());
  
  const tableDataRows = dataRows.map(row => 
    row
      .split('|')
      .filter(cell => cell.trim() !== '')
      .map(cell => cell.trim())
  );
  
  // Step 6: Generate the table HTML manually
  return (
    <div style={{ margin: 0, padding: 0 }}>
      {/* Render emoji header if present */}
      {hasEmojiHeader && (
        <h3 className="text-sm font-semibold my-0" style={{ margin: 0, padding: 0, marginBottom: '2px' }}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw]}
            components={{
              p: ({node, children, ...props}) => <span {...props}>{children}</span>,
              strong: ({node, ...props}) => <span className="font-bold" {...props} />,
              em: ({node, ...props}) => <span className="italic" {...props} />,
              code: ({node, ...props}) => <code className="bg-gray-200 px-0.5 py-0 rounded text-xs text-blue-700 font-medium" {...props} />
            }}
          >
            {header}
          </ReactMarkdown>
        </h3>
      )}
      
      {/* Render the table */}
      <table className="border-collapse w-full text-xs" style={{ margin: 0, padding: 0, border: '1px solid #e5e7eb' }}>
        <thead className="bg-gray-100">
          <tr>
            {headerCells.map((cell, i) => (
              <th 
                key={i} 
                className="text-left border border-gray-300" 
                style={{ padding: '2px 6px', margin: 0, fontSize: '11px', fontWeight: 500 }}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableDataRows.map((row, i) => (
            <tr key={i} className="border-b border-gray-200" style={{ padding: 0, margin: 0 }}>
              {row.map((cell, j) => {
                // Handle formatting in cells
                let formattedCell = cell;
                
                // Process simple formatting
                // Bold: *text*
                formattedCell = formattedCell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formattedCell = formattedCell.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
                
                // Italic: _text_
                formattedCell = formattedCell.replace(/_(.*?)_/g, '<em>$1</em>');
                
                // Code: `text`
                formattedCell = formattedCell.replace(/`(.*?)`/g, '<code style="background-color:#f1f1f1;padding:0 2px;border-radius:2px;font-size:10px;">$1</code>');
                
                // Detect if cell contains Markdown that needs ReactMarkdown
                const needsReactMarkdown = cell.includes('**') || cell.includes('_') || cell.includes('`') || 
                                           cell.includes('[') || cell.includes('![');
                
                return (
                  <td 
                    key={j} 
                    className="border border-gray-200 text-gray-800" 
                    style={{ padding: '2px 6px', margin: 0, fontSize: '11px' }}
                  >
                    {needsReactMarkdown ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {cell}
                      </ReactMarkdown>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: formattedCell }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Custom Markdown Renderer with special handling for tables
const CustomMarkdownRenderer = ({ content }: { content: string }) => {
  // First, handle tables specifically by extracting them completely from the content
  let processedContent = content;
  const extractedTables: {start: number, end: number, content: string}[] = [];
  
  // Function to find tables in content
  const findTables = () => {
    // Reset extracted tables
    extractedTables.length = 0;
    
    // Multiple patterns to catch different table formats
    // Pattern 1: Tables with emoji headers
    const emojiHeaderTableRegex = /(📊[\s\S]*?|🔥[\s\S]*?)(\n\s*\|[\s\S]*?\|\s*\n\s*\|[-:| ]+\|[\s\S]*?(?=\n\s*\n|\n\s*[^|]|$))/g;
    // Pattern 2: Standalone tables
    const standaloneTableRegex = /(?:^|\n\s*)\|[\s\S]*?\|\s*\n\s*\|[-:| ]+\|[\s\S]*?(?=\n\s*\n|\n\s*[^|]|$)/g;
    
    // Find tables with emoji headers
    let match;
    while ((match = emojiHeaderTableRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const start = match.index;
      const end = start + fullMatch.length;
      
      extractedTables.push({
        start,
        end,
        content: fullMatch
      });
    }
    
    // Find standalone tables
    while ((match = standaloneTableRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const start = match.index;
      const end = start + fullMatch.length;
      
      // Check if this table is already part of a table with header
      const alreadyCaptured = extractedTables.some(
        table => start >= table.start && end <= table.end
      );
      
      if (!alreadyCaptured) {
        extractedTables.push({
          start,
          end,
          content: fullMatch
        });
      }
    }
    
    // Sort tables by start position
    extractedTables.sort((a, b) => a.start - b.start);
  };
  
  // Extract all tables
  findTables();
  
  // Replace tables with placeholders
  for (let i = extractedTables.length - 1; i >= 0; i--) {
    const table = extractedTables[i];
    processedContent = 
      processedContent.substring(0, table.start) + 
      `__TABLE_PLACEHOLDER_${i}__` + 
      processedContent.substring(table.end);
  }
  
  // Additional cleanup for asterisks at the beginning of the content
  processedContent = processedContent.replace(/^\*\*\s*/, '');
  processedContent = processedContent.replace(/\n\*\*\s*/g, '\n');
  processedContent = processedContent.replace(/\*\*\s*$/g, '');
  
  // Split content by table placeholders
  const parts = processedContent.split(/(__TABLE_PLACEHOLDER_\d+__)/);
  
  return (
    <>
      {parts.map((part, idx) => {
        // Check if this is a table placeholder
        const tablePlaceholderMatch = part.match(/__TABLE_PLACEHOLDER_(\d+)__/);
        
        if (tablePlaceholderMatch) {
          // Render table
          const tableIndex = parseInt(tablePlaceholderMatch[1]);
          const tableContent = extractedTables[tableIndex].content;
          return <SuperTableRenderer key={`table-${tableIndex}`} content={tableContent} />;
        } else if (part.trim()) {
          // Render normal markdown
          return (
            <ReactMarkdown
              key={`markdown-${idx}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]} 
              components={{
                // All the component overrides for non-table content
                p: ({node, children, ...props}) => {
                  // Check if paragraph is empty or just whitespace
                  const content = React.Children.toArray(children).map(child => 
                    typeof child === 'string' ? child.trim() : child
                  ).filter(Boolean);
                  
                  if (content.length === 0) {
                    return null; // Don't render empty paragraphs
                  }
                  return <p className="my-0 mb-0 leading-tight text-sm" {...props}>{children}</p>;
                },
                h1: ({node, ...props}) => <h1 className="text-lg font-bold !my-0" style={{ margin: 0 }} {...props} />,
                h2: ({node, ...props}) => <h2 className="text-base font-semibold !my-0" style={{ margin: 0 }} {...props} />,
                h3: ({node, ...props}) => <h3 className="text-sm font-semibold !my-0" style={{ margin: 0 }} {...props} />,
                ul: ({node, ...props}) => (
                  <div style={{ margin: 0, padding: 0 }}>
                    <ul className="list-disc ml-4 mt-0 mb-0 py-0 space-y-0" style={customListStyles.container} {...props} />
                  </div>
                ),
                ol: ({node, ...props}) => (
                  <div style={{ margin: 0, padding: 0 }}>
                    <ol className="list-decimal ml-5 mt-0 mb-0 py-0 space-y-0" style={customListStyles.container} {...props} />
                  </div>
                ),
                li: ({node, children, ...props}) => (
                  <li 
                    className="m-0 p-0 marker:text-gray-500 text-sm"
                    style={{ lineHeight: '1', marginTop: '-2px', marginBottom: '-2px' }}
                    {...props}
                  >
                    <span style={customListStyles.listItemContent}>{children}</span>
                  </li>
                ),
                strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                em: ({node, ...props}) => <span className="italic" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-2 py-0 my-0 text-gray-700 italic" {...props} />,
                hr: ({node, ...props}) => <hr className="my-0.5 border-gray-300" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 rounded p-0.5 my-0 overflow-visible text-sm" {...props} />,
                code: ({node, children, className, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return className?.includes('language-') ? (
                    <code className={className + " block p-0.5 text-sm"} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="bg-gray-200 px-0.5 py-0 rounded text-xs text-blue-700 font-medium" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {part}
            </ReactMarkdown>
          );
        }
        return null;
      })}
    </>
  );
};

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
    <div className="relative" style={{ height: 'calc(100vh - 200px)' }}>
      <Card className="w-full flex flex-col h-full">
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
        
        <CardContent className="flex-grow overflow-auto p-1">
          <div className="flex flex-col gap-0">
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
                  <div className="whitespace-pre-wrap break-words overflow-visible">
                    {message.role === 'assistant' ? (
                      <div className={markdownStyles.wrapper}>
                        {/* Replace ReactMarkdown with our custom renderer */}
                        <CustomMarkdownRenderer content={message.content} />
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
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
    </div>
  );
} 