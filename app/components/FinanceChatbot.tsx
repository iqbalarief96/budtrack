'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Copy, Download, MoreHorizontal, RefreshCw, RotateCcw, Save, Send, Sparkles, User, WalletCards } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWallet } from '@/app/providers/WalletProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActionCards } from './chatbot/ActionCards';
import { AnswerCards } from './chatbot/AnswerCards';
import { InsightRail } from './chatbot/InsightRail';
import { parseAssistantAnswer } from './chatbot/answer-parser';
import { formatCompactCurrency, formatCurrency } from './chatbot/format';
import { getContextPrompts } from './chatbot/prompts';
import { useChatbotSummary } from './chatbot/useChatbotSummary';
import type { AiValidatedAction } from '@/lib/ai/actions/types';
import type { ChatMessage } from './chatbot/types';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Halo! Gw siap bantu baca kondisi keuangan lo: budget, spending, saving, goal, sampai pola transaksi.',
  timestamp: new Date(),
  status: 'done',
};

const cleanAssistantText = (text: string) => text
  .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .trim();

function parseSseEvents(buffer: string) {
  const events: Array<{ event: string; data: any }> = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const part of parts) {
    const lines = part.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event:'));
    const dataLine = lines.find((line) => line.startsWith('data:'));
    if (!eventLine || !dataLine) continue;

    try {
      events.push({
        event: eventLine.slice(6).trim(),
        data: JSON.parse(dataLine.slice(5).trim()),
      });
    } catch {
      // Ignore malformed event.
    }
  }

  return { events, rest };
}

const formatTime = (timestamp: Date | string) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
        h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-semibold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1.5">{children}</ol>,
        li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
        a: ({ children, href }) => <a className="text-blue-600 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">{children}</a>,
        code: ({ children, className }) => className
          ? <code className={`${className} block overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50`}>{children}</code>
          : <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.85em] font-medium text-slate-800">{children}</code>,
        pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-xl bg-slate-950 p-0">{children}</pre>,
        table: ({ children }) => <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-sm">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 align-top">{children}</td>,
        blockquote: ({ children }) => <blockquote className="mb-4 border-l-4 border-blue-200 pl-4 text-slate-600">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function FinanceChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Avoid SSR/client hydration mismatch on time labels (React #418/#425)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const { selectedWallet } = useWallet();
  const { toast } = useToast();
  const summary = useChatbotSummary(selectedWallet?.id);

  const storageKey = useMemo(
    () => selectedWallet ? `chat-history-${selectedWallet.id}` : null,
    [selectedWallet]
  );
  const promptChips = useMemo(() => getContextPrompts(summary.data), [summary.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!session || !storageKey) return;

    try {
      const savedChat = localStorage.getItem(storageKey);
      if (!savedChat) {
        setMessages([welcomeMessage]);
        setChatHistory([]);
        return;
      }

      const savedMessages = JSON.parse(savedChat) as ChatMessage[];
      setMessages(savedMessages.length ? savedMessages : [welcomeMessage]);
      setChatHistory(savedMessages
        .filter((msg) => msg.id !== 'welcome')
        .map((msg) => ({ role: msg.role, content: msg.content }))
        .slice(-10));
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }, [session, storageKey]);

  const saveMessages = (nextMessages: ChatMessage[]) => {
    if (!session || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMessages));
    } catch (err) {
      console.error('Error saving chat history:', err);
    }
  };

  const sendMessage = async (messageText = inputMessage, options?: { appendUser?: boolean }) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    if (!session) {
      toast({ title: 'Login dulu', description: 'Chatbot butuh akun aktif.', variant: 'destructive' });
      return;
    }

    if (!selectedWallet) {
      toast({ title: 'Pilih wallet dulu', description: 'Biar jawaban bisa pakai data wallet lo.', variant: 'destructive' });
      return;
    }

    const shouldAppendUser = options?.appendUser !== false;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      status: 'done',
    };

    const baseMessages = shouldAppendUser ? [...messages, userMessage] : messages.filter((msg) => msg.status !== 'streaming');
    const nextHistory = [
      ...chatHistory,
      ...(shouldAppendUser ? [{ role: 'user' as const, content: text }] : []),
    ].slice(-10);

    setMessages(baseMessages);
    setChatHistory(nextHistory);
    setInputMessage('');
    setIsLoading(true);
    saveMessages(baseMessages);

    try {
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, walletId: selectedWallet.id, history: nextHistory, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(typeof errorData?.error === 'string' ? errorData.error : 'Failed to get chatbot response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Chatbot stream unavailable');

      const assistantId = crypto.randomUUID();
      const placeholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'streaming',
      };
      setMessages([...baseMessages, placeholder]);

      const decoder = new TextDecoder();
      const isEventStream = response.headers.get('content-type')?.includes('text/event-stream');
      let reply = '';
      let finalActions: AiValidatedAction[] = [];

      if (isEventStream) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseEvents(buffer);
          buffer = parsed.rest;

          for (const event of parsed.events) {
            if (event.event === 'text') {
              reply += typeof event.data?.delta === 'string' ? event.data.delta : '';
              setMessages([...baseMessages, { ...placeholder, content: cleanAssistantText(reply), actions: finalActions }]);
            }
            if (event.event === 'actions' && Array.isArray(event.data?.actions)) {
              finalActions = event.data.actions;
              setMessages([...baseMessages, { ...placeholder, content: cleanAssistantText(reply), actions: finalActions }]);
            }
            if (event.event === 'error') {
              throw new Error(event.data?.message || 'Chatbot stream error');
            }
          }
        }
      } else {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          reply += decoder.decode(value, { stream: true });
          const cleanReply = cleanAssistantText(reply);
          setMessages([...baseMessages, { ...placeholder, content: cleanReply }]);
        }

        reply += decoder.decode();
      }

      const finalReply = cleanAssistantText(reply);
      if (!finalReply) throw new Error('Chatbot returned an empty response');

      const finalMessage: ChatMessage = { ...placeholder, content: finalReply, actions: finalActions, status: 'done' };
      const finalMessages = [...baseMessages, finalMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);

      const finalHistory = [...nextHistory, { role: 'assistant' as const, content: finalMessage.content }].slice(-10);
      setChatHistory(finalHistory);
      summary.refresh();
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Gw belum bisa jawab sekarang. Coba ulang sebentar lagi, atau cek API key/model di Settings.',
        timestamp: new Date(),
        status: 'error',
      };
      const finalMessages = [...baseMessages, errorMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      toast({
        title: 'Chatbot error',
        description: error instanceof Error ? error.message : 'Failed to get chatbot response.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([welcomeMessage]);
    setChatHistory([]);
    if (storageKey) localStorage.removeItem(storageKey);
    toast({ title: 'Chat reset', description: 'Riwayat chat wallet ini dibersihkan.' });
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: 'Copied', description: 'Jawaban disalin ke clipboard.' });
  };

  const saveInsight = async (content: string) => {
    await copyMessage(content);
    toast({ title: 'Insight copied', description: 'Persistent insight save belum aktif. Gw salin dulu ke clipboard.' });
  };

  const exportChat = () => {
    const markdown = messages.map((message) => `## ${message.role}\n\n${message.content}`).join('\n\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `budtrack-chat-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const regenerateLatest = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    const lastUserIndex = messages.findIndex((message) => message.id === lastUser.id);
    setMessages(messages.slice(0, lastUserIndex + 1));
    sendMessage(lastUser.content, { appendUser: false });
  };

  const disabled = isLoading || !session || !selectedWallet;
  const hasOnlyWelcome = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <section className="relative h-[calc(100vh-9rem)] min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-blue-50 via-cyan-50 to-white" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-5 py-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Bot className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-slate-950">Finance Assistant</h2>
                <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">AI</Badge>
                {summary.data && <Badge variant="outline" className="rounded-full">{summary.data.monthLabel}</Badge>}
              </div>
              <p className="truncate text-sm text-slate-500">
                {summary.data
                  ? `${summary.data.walletName} • spent ${formatCompactCurrency(summary.data.totalExpense)} • balance ${formatCompactCurrency(summary.data.balance)}`
                  : selectedWallet ? `Context: ${selectedWallet.name}` : 'Pilih wallet buat jawaban personal'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label="Chat actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={regenerateLatest} disabled={isLoading || !messages.some((msg) => msg.role === 'user')}>
                <RotateCcw className="mr-2 h-4 w-4" /> Regenerate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportChat}>
                <Download className="mr-2 h-4 w-4" /> Export chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearChat} className="text-red-600 focus:text-red-600">
                <RefreshCw className="mr-2 h-4 w-4" /> Reset chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="grid flex-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="overflow-y-auto px-4 py-5 md:px-6">
            {hasOnlyWelcome && (
              <div className="mb-6 max-w-5xl rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">Tanya finansial pake data wallet lo</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Bisa minta rangkuman, audit spending, safe-to-spend, dana darurat, goal check, atau rekomendasi budget.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {promptChips.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      disabled={disabled}
                      className="group rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="mt-2 block text-sm font-medium text-slate-900 group-hover:text-blue-700">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex max-w-none flex-col gap-4">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                const clean = cleanAssistantText(message.content);
                const parsed = parseAssistantAnswer(clean);
                return (
                  <article key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 sm:flex">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}

                    <div className={`group max-w-[92%] ${isUser ? 'order-first md:max-w-[68%]' : 'md:max-w-[88%] xl:max-w-[92%]'}`}>
                      <div className={isUser
                        ? 'rounded-3xl rounded-br-lg bg-blue-600 px-4 py-3 text-white shadow-sm'
                        : `rounded-3xl rounded-bl-lg border px-4 py-3 text-slate-800 shadow-sm ${message.status === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words leading-7">{message.content}</p>
                        ) : (
                          <div className="break-words text-sm md:text-[15px]">
                            {message.id !== 'welcome' && message.status !== 'streaming' && (
                              <AnswerCards parsed={parsed} onPrompt={sendMessage} onNavigate={router.push} onCopy={copyMessage} />
                            )}
                            {message.status === 'streaming' && !clean && <span className="inline-flex h-5 w-16 animate-pulse rounded-full bg-slate-100" />}
                            {clean && <MarkdownMessage content={clean} />}
                            {!isUser && message.actions && message.actions.length > 0 && (
                              <ActionCards actions={message.actions} onPrompt={sendMessage} onNavigate={router.push} />
                            )}
                            {message.status === 'error' && (
                              <button type="button" onClick={() => router.push('/settings')} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 underline underline-offset-2">
                                Buka Settings → AI &amp; Integrations
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={`mt-1 flex items-center gap-2 text-xs text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span suppressHydrationWarning>{message.status === 'streaming' ? 'typing…' : (mounted ? formatTime(message.timestamp) : '')}</span>
                        {!isUser && message.id !== 'welcome' && message.status !== 'streaming' && (
                          <>
                            <button type="button" onClick={() => copyMessage(message.content)} className="opacity-0 transition hover:text-slate-700 group-hover:opacity-100" aria-label="Copy assistant response">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => saveInsight(message.content)} className="opacity-0 transition hover:text-slate-700 group-hover:opacity-100" aria-label="Save insight">
                              <Save className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:flex">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </article>
                );
              })}

              {isLoading && !messages.some((message) => message.status === 'streaming') && (
                <div className="flex items-center gap-3">
                  <div className="hidden h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 sm:flex">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="rounded-3xl rounded-bl-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Lagi baca data wallet...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <InsightRail summary={summary.data} isLoading={summary.isLoading} onAsk={sendMessage} onRefresh={summary.refresh} />
        </main>

        <footer className="border-t border-slate-200 bg-white/90 p-3 backdrop-blur-xl md:p-4">
          {!selectedWallet && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <WalletCards className="h-4 w-4" />
              Pilih wallet dulu buat aktifin chatbot.
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-inner"
          >
            <Textarea
              ref={inputRef}
              placeholder="Tanya: 'safe to spend bulan ini berapa?'"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              disabled={disabled}
              className="max-h-36 min-h-11 resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" disabled={!inputMessage.trim() || disabled} className="h-11 w-11 shrink-0 rounded-2xl p-0" aria-label="Send message">
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 px-2 text-xs text-slate-400">
            Enter kirim, Shift+Enter baris baru. Jawaban AI bisa salah — cek angka penting sebelum dipakai.
          </p>
        </footer>
      </div>
    </section>
  );
}
