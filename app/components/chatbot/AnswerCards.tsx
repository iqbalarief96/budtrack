'use client';

import { ArrowRight, BarChart3, Copy, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnswerAction, ParsedAnswer } from './types';
import { severityClasses, severityDotClasses } from './severity';

interface AnswerCardsProps {
  parsed: ParsedAnswer;
  onPrompt: (prompt: string) => void;
  onNavigate: (href: string) => void;
  onCopy: (content: string) => void;
}

export function AnswerCards({ parsed, onPrompt, onNavigate, onCopy }: AnswerCardsProps) {
  const hasCards = parsed.metrics.length > 0 || parsed.warnings.length > 0 || parsed.actions.length > 0;
  if (!hasCards) return null;

  return (
    <div className="mb-4 space-y-3">
      {parsed.warnings.map((warning, index) => (
        <div key={`${warning.label}-${index}`} className={`rounded-2xl border p-3 ${severityClasses(warning.severity)}`}>
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{warning.label}</div>
              <div className="text-base font-bold">{warning.value}</div>
              {warning.detail && <p className="mt-1 line-clamp-2 text-xs opacity-80">{warning.detail}</p>}
            </div>
          </div>
        </div>
      ))}

      {parsed.metrics.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {parsed.metrics.map((metric, index) => (
            <div key={`${metric.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span className={`h-2 w-2 rounded-full ${severityDotClasses(metric.severity ?? 'info')}`} />
                {metric.label}
              </div>
              <div className="mt-1 break-words text-lg font-semibold text-slate-950">{metric.value}</div>
              {metric.detail && <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>}
            </div>
          ))}
        </div>
      )}

      {parsed.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {parsed.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant={action.severity === 'critical' ? 'destructive' : 'outline'}
              className="rounded-full"
              onClick={() => runAction(action, parsed.markdown, onPrompt, onNavigate, onCopy)}
              disabled={action.kind === 'disabled'}
            >
              {action.kind === 'copy' ? <Copy className="mr-2 h-3.5 w-3.5" /> : <ArrowRight className="mr-2 h-3.5 w-3.5" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function runAction(
  action: AnswerAction,
  markdown: string,
  onPrompt: (prompt: string) => void,
  onNavigate: (href: string) => void,
  onCopy: (content: string) => void,
) {
  if (action.kind === 'prompt' && action.prompt) onPrompt(action.prompt);
  if (action.kind === 'navigate' && action.href) onNavigate(action.href);
  if (action.kind === 'copy') onCopy(markdown);
}
