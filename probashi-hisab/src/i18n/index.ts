import { useMemo } from 'react';

import {
  CURRENCIES,
  formatMoney,
  formatPercentBp,
  toBnDigits,
  type CurrencyCode,
  type FormatOptions,
} from '../domain/money';
import type { Amt } from '../domain/summary';
import type { Category } from '../domain/types';
import { useApp } from '../store/useApp';
import { bn, type Dict } from './bn';
import { en } from './en';

export type TKey = keyof Dict;
const DICTS: Record<'bn' | 'en', Dict> = { bn, en };

const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function translate(lang: 'bn' | 'en', key: TKey, params?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

/** Language, number and money formatting bound to the user's settings. */
export function useT() {
  const lang = useApp((s) => s.data.settings.language);
  const bnDigits = useApp((s) => s.data.settings.bnDigits) && lang === 'bn';
  const showInBdt = useApp((s) => s.data.settings.showInBdt);
  const base = useApp((s) => s.data.settings.baseCurrency);

  return useMemo(() => {
    const num = (v: string | number) => (bnDigits ? toBnDigits(String(v)) : String(v));
    return {
      lang,
      bnDigits,
      t: (key: TKey, params?: Record<string, string | number>) => {
        const s = translate(lang, key, params);
        return params ? num(s) : s;
      },
      num,
      money: (minor: number, currency: CurrencyCode, opts: FormatOptions = {}) =>
        formatMoney(minor, currency, { bnDigits, ...opts }),
      /** An aggregate in the dashboard's chosen display currency. */
      amt: (a: Amt, opts: FormatOptions = {}) =>
        showInBdt
          ? formatMoney(a.bdt, 'BDT', { bnDigits, compact: true, ...opts })
          : formatMoney(a.base, base, { bnDigits, ...opts }),
      /** The same aggregate in the other currency, for the small secondary line. */
      amtAlt: (a: Amt) =>
        showInBdt
          ? formatMoney(a.base, base, { bnDigits })
          : formatMoney(a.bdt, 'BDT', { bnDigits, compact: true }),
      amtValue: (a: Amt) => (showInBdt ? a.bdt : a.base),
      pct: (bp: number | null) => formatPercentBp(bp, bnDigits),
      cat: (c: Category | undefined | null) => (c ? c[lang] : translate(lang, 'common.uncategorized')),
      curName: (c: CurrencyCode) => CURRENCIES[c][lang],
      /** "2026-11" → "নভেম্বর ২০২৬" */
      month: (ym: string, short = false) => {
        const [y, m] = ym.split('-').map(Number);
        const name = (lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m - 1];
        return short ? (lang === 'bn' ? name.slice(0, 3) : name.slice(0, 3)) : `${name} ${num(y)}`;
      },
      /** "2026-11-09" → "৯ নভেম্বর ২০২৬" */
      date: (d: string) => {
        const [y, m, day] = d.split('-').map(Number);
        const name = (lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m - 1];
        return lang === 'bn' ? `${num(day)} ${name} ${num(y)}` : `${day} ${name} ${y}`;
      },
    };
  }, [lang, bnDigits, showInBdt, base]);
}

export type T = ReturnType<typeof useT>;
