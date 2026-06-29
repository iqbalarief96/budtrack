'use client';

import { useEffect, useState } from 'react';
import type { ChatbotSummaryResponse } from './types';

export function useChatbotSummary(walletId?: string) {
  const [data, setData] = useState<ChatbotSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!walletId) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/ai/chatbot/summary?walletId=${encodeURIComponent(walletId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      })
      .then((payload) => setData(payload))
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load chatbot summary');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [walletId, tick]);

  return { data, isLoading, error, refresh: () => setTick((value) => value + 1) };
}
