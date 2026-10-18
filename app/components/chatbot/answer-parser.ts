import type { AnswerAction, AnswerMetric, InsightSeverity, ParsedAnswer } from './types';

const moneyPattern = /Rp\s?[\d.,]+/gi;
const percentPattern = /\b\d+(?:[.,]\d+)?%\b/g;

function detectSeverity(text: string): InsightSeverity | undefined {
  const lower = text.toLowerCase();
  if (/(critical|kritis|bahaya|utang|debt|over budget|melebihi budget|jebol|100%)/i.test(lower)) return 'critical';
  if (/(warning|perhatian|risiko|risk|boros|anomali|waspada|tinggi)/i.test(lower)) return 'warning';
  if (/(aman|on track|sehat|surplus|bagus|good)/i.test(lower)) return 'success';
  return undefined;
}

function firstUsefulLine(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
    .find((line) => line.length > 8);
}

function dedupeActions(actions: AnswerAction[]) {
  return Array.from(new Map(actions.map((action) => [action.id, action])).values()).slice(0, 5);
}

export function parseAssistantAnswer(markdown: string): ParsedAnswer {
  const clean = markdown.trim();
  const lower = clean.toLowerCase();
  const severity = detectSeverity(clean);
  const metrics: AnswerMetric[] = [];
  const warnings: AnswerMetric[] = [];
  const actions: AnswerAction[] = [];

  const money = clean.match(moneyPattern) ?? [];
  const percentages = clean.match(percentPattern) ?? [];

  money.slice(0, 4).forEach((value, index) => {
    metrics.push({
      label: index === 0 ? 'Main amount' : `Amount ${index + 1}`,
      value,
      severity: index === 0 ? severity : undefined,
    });
  });

  percentages.slice(0, 3).forEach((value, index) => {
    metrics.push({
      label: index === 0 ? 'Main ratio' : `Ratio ${index + 1}`,
      value,
      severity,
    });
  });

  if (severity === 'critical' || severity === 'warning') {
    warnings.push({
      label: severity === 'critical' ? 'Critical issue' : 'Needs attention',
      value: severity === 'critical' ? 'High risk' : 'Watch this',
      detail: firstUsefulLine(clean),
      severity,
    });
  }

  if (lower.includes('budget')) actions.push({ id: 'budget', label: 'Lihat Budget', href: '/budgets', kind: 'navigate' });
  if (lower.includes('transaction') || lower.includes('pengeluaran') || lower.includes('spending')) actions.push({ id: 'transactions', label: 'Lihat Transaksi', href: '/transactions', kind: 'navigate' });
  if (lower.includes('goal') || lower.includes('target')) actions.push({ id: 'goals', label: 'Lihat Goal', href: '/goals', kind: 'navigate' });
  if (lower.includes('alert') || lower.includes('risiko') || lower.includes('risk')) actions.push({ id: 'alert', label: 'Buat Alert Plan', prompt: 'Bantu bikin alert plan dari risiko yang kamu temukan tadi.', kind: 'prompt', severity });
  actions.push({ id: 'analyze-3m', label: 'Analisis 3 Bulan', prompt: 'Analisis pengeluaran saya 3 bulan terakhir dengan detail.', kind: 'prompt' });

  return {
    summary: firstUsefulLine(clean),
    metrics: metrics.slice(0, 6),
    warnings,
    actions: dedupeActions(actions),
    markdown: clean,
  };
}
