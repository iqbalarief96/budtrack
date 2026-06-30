'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AiActionExecutionResult, AiValidatedAction } from '@/lib/ai/actions/types';

interface ActionCardsProps {
  actions: AiValidatedAction[];
  onNavigate: (href: string) => void;
  onPrompt: (prompt: string) => void;
}

function payloadRows(payload: Record<string, unknown>) {
  return Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '');
}

export function ActionCards({ actions, onNavigate, onPrompt }: ActionCardsProps) {
  const [reviewAction, setReviewAction] = useState<AiValidatedAction | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiActionExecutionResult>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  if (!actions.length) return null;

  async function execute(action: AiValidatedAction) {
    if (action.tool === 'open_page') {
      const href = (action.payload as any)?.href;
      if (href) onNavigate(href);
      setReviewAction(null);
      return;
    }
    if (action.tool === 'ask_followup') {
      const prompt = (action.payload as any)?.prompt;
      if (prompt) onPrompt(prompt);
      setReviewAction(null);
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
      setReviewAction(null);
    } catch (error) {
      setErrorById((current) => ({ ...current, [action.id]: error instanceof Error ? error.message : 'Failed to execute action' }));
    } finally {
      setExecutingId(null);
    }
  }

  const reviewPayload = reviewAction ? payloadRows(reviewAction.payload as Record<string, unknown>) : [];

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
                onClick={() => setReviewAction(action)}
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

      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review action dulu</DialogTitle>
            <DialogDescription>
              AI cuma propose. Data baru dibuat setelah lo approve.
            </DialogDescription>
          </DialogHeader>

          {reviewAction && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{reviewAction.label}</div>
                <div className="mt-1 text-xs text-slate-500">Tool: {reviewAction.tool}</div>
              </div>

              <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200">
                {reviewPayload.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                    <span className="font-medium text-slate-500">{key}</span>
                    <span className="break-words text-slate-900">{String(value)}</span>
                  </div>
                ))}
              </div>

              {(reviewAction.warnings.length > 0 || reviewAction.missingFields.length > 0) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {[...reviewAction.warnings, ...reviewAction.missingFields].join(', ')}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewAction(null)}>Cancel</Button>
            <Button type="button" disabled={!reviewAction || executingId === reviewAction.id || reviewAction.status === 'needs_review'} onClick={() => reviewAction && execute(reviewAction)}>
              {reviewAction && executingId === reviewAction.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
