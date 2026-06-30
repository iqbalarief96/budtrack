'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiActionExecutionResult, AiValidatedAction } from '@/lib/ai/actions/types';

interface ActionCardsProps {
  actions: AiValidatedAction[];
  onNavigate: (href: string) => void;
  onPrompt: (prompt: string) => void;
}

export function ActionCards({ actions, onNavigate, onPrompt }: ActionCardsProps) {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiActionExecutionResult>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  if (!actions.length) return null;

  async function execute(action: AiValidatedAction) {
    if (action.tool === 'open_page') {
      const href = (action.payload as any)?.href;
      if (href) onNavigate(href);
      return;
    }
    if (action.tool === 'ask_followup') {
      const prompt = (action.payload as any)?.prompt;
      if (prompt) onPrompt(prompt);
      return;
    }

    setExecutingId(action.id);
    setErrorById((current) => ({ ...current, [action.id]: '' }));
    try {
      const response = await fetch('/api/ai/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: action.id, tool: action.tool, label: action.label, payload: action.payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to execute action');
      setResults((current) => ({ ...current, [action.id]: data }));
    } catch (error) {
      setErrorById((current) => ({ ...current, [action.id]: error instanceof Error ? error.message : 'Failed to execute action' }));
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-950">
        <Sparkles className="h-4 w-4" /> Suggested actions
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const result = results[action.id];
          const error = errorById[action.id];
          const disabledReason = action.warnings.concat(action.missingFields).join(', ');
          return (
            <div key={action.id} className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-white"
                disabled={executingId === action.id || action.status === 'needs_review'}
                onClick={() => execute(action)}
                title={disabledReason}
              >
                {executingId === action.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : result ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : <ArrowRight className="mr-2 h-3.5 w-3.5" />}
                {result ? result.message : action.label}
              </Button>
              {error && <span className="max-w-[220px] text-xs text-red-600">{error}</span>}
              {!error && disabledReason && <span className="max-w-[220px] text-xs text-amber-700">Needs review: {disabledReason}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
