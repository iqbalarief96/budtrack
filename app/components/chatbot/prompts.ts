import type { ChatbotSummaryResponse } from './types';
import { formatCurrency } from './format';

export interface PromptChip {
  icon: string;
  label: string;
  prompt: string;
}

const fallbackPrompts: PromptChip[] = [
  { icon: '📊', label: 'Ringkas bulan ini', prompt: 'Ringkas kondisi keuangan saya bulan ini: pemasukan, pengeluaran, sisa budget, dan risiko terbesar.' },
  { icon: '🔥', label: 'Cari pemborosan', prompt: 'Cari kategori pengeluaran yang paling boros dan kasih 3 aksi konkret untuk ngurangin.' },
  { icon: '🛡️', label: 'Dana darurat', prompt: 'Hitung estimasi dana darurat ideal saya dan langkah mencapainya.' },
  { icon: '🎯', label: 'Cek goal', prompt: 'Apakah target keuangan saya realistis? Jelaskan gap dan prioritas bulan ini.' },
  { icon: '💸', label: 'Safe to spend', prompt: 'Berapa uang yang aman saya pakai sampai akhir bulan tanpa ganggu budget dan goal?' },
  { icon: '🧾', label: 'Analisis 3 bulan', prompt: 'Analisis pengeluaran saya 3 bulan terakhir. Fokus ke tren, anomali, dan rekomendasi.' },
];

export function getContextPrompts(summary?: ChatbotSummaryResponse | null): PromptChip[] {
  if (!summary) return fallbackPrompts;

  const prompts: PromptChip[] = [];

  if (summary.debtRisk === 'critical') {
    prompts.push({ icon: '🚨', label: 'Prioritasin utang', prompt: 'Bikin debt control plan bulan ini dari data wallet saya. Prioritaskan pembayaran, batas spending, dan risiko.' });
  }

  if (summary.budgetStatus === 'over' || summary.budgetStatus === 'near') {
    prompts.push({ icon: '⚠️', label: 'Budget jebol?', prompt: 'Cari kategori yang bikin budget saya hampir jebol atau sudah over, lalu kasih rencana perbaikan.' });
  }

  if (typeof summary.safeToSpend === 'number' && summary.safeToSpend < 0) {
    prompts.push({ icon: '🧯', label: 'Survival plan', prompt: 'Bikin survival spending plan sampai akhir bulan karena safe-to-spend saya negatif.' });
  } else if (typeof summary.safeToSpend === 'number') {
    prompts.push({ icon: '💸', label: 'Safe spend', prompt: `Safe-to-spend saya sekitar ${formatCurrency(summary.safeToSpend)}. Bantu alokasikan sampai akhir bulan.` });
  }

  if (summary.topCategory) {
    prompts.push({ icon: '🔎', label: `Audit ${summary.topCategory.name}`, prompt: `Audit kategori ${summary.topCategory.name} bulan ini dan cari transaksi yang bisa ditekan.` });
  }

  return [...prompts, ...fallbackPrompts].filter((prompt, index, arr) => arr.findIndex((item) => item.label === prompt.label) === index).slice(0, 6);
}
