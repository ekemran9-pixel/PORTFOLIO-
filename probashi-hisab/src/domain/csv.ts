import { minorToDecimalString, rateToString } from './money';
import type { Category, Tx } from './types';

const esc = (v: string | null | undefined) => {
  const s = v ?? '';
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Transaction history as CSV (UTF-8 with BOM so Excel shows Bengali correctly). */
export function txsToCsv(txs: Tx[], categories: Category[], lang: 'bn' | 'en'): string {
  const cat = new Map(categories.map((c) => [c.id, c[lang]]));
  const head = [
    'date', 'kind', 'wallet', 'category', 'amount', 'currency', 'rate_bdt', 'amount_bdt',
    'base_currency', 'amount_base', 'fee_bdt', 'person', 'method', 'reference', 'note',
  ];
  const rows = [...txs]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map((t) =>
      [
        t.date,
        t.kind,
        t.wallet,
        esc(t.categoryId ? cat.get(t.categoryId) : ''),
        minorToDecimalString(t.amountMinor, t.currency),
        t.currency,
        rateToString(t.rateMicro),
        minorToDecimalString(t.bdtMinor, 'BDT'),
        t.baseCurrency,
        minorToDecimalString(t.baseMinor, t.baseCurrency),
        minorToDecimalString(t.feeBdtMinor, 'BDT'),
        esc(t.person),
        esc(t.method),
        esc(t.reference),
        esc(t.note),
      ].join(','),
    );
  return '﻿' + [head.join(','), ...rows].join('\r\n') + '\r\n';
}
