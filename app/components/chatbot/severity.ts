import type { InsightSeverity } from './types';

export function severityClasses(severity: InsightSeverity = 'info') {
  const map = {
    critical: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  } satisfies Record<InsightSeverity, string>;
  return map[severity];
}

export function severityDotClasses(severity: InsightSeverity = 'info') {
  const map = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
  } satisfies Record<InsightSeverity, string>;
  return map[severity];
}

export function severityLabel(severity: InsightSeverity = 'info') {
  const map = {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    success: 'Good',
  } satisfies Record<InsightSeverity, string>;
  return map[severity];
}
