import { z } from 'zod';

import {
  CURRENCY_CODES,
  RATE_SCALE,
  fromBdtMinor,
  parseAmount,
  parseRate,
  toBdtMinor,
  type CurrencyCode,
} from './money';
import type { Settings, Tx, TxKind, Wallet } from './types';

export const TX_KINDS = [
  'income',
  'expense',
  'remittance',
  'debt_given',
  'debt_collected',
  'debt_taken',
  'debt_repaid',
  'goal_deposit',
  'goal_withdraw',
] as const satisfies readonly TxKind[];

const optionalText = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

/** Raw form input. Amounts and rates are the strings the user typed (Bengali digits allowed). */
export const txInputSchema = z.object({
  id: z.string().min(1).optional(),
  kind: z.enum(TX_KINDS),
  wallet: z.enum(['abroad', 'home']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string(),
  currency: z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]),
  /** BDT per 1 unit of the earning currency (or of `currency` when it is a third currency). */
  rate: z.string().optional(),
  fee: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  person: optionalText,
  method: optionalText,
  reference: optionalText,
  note: optionalText,
  debtId: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  createdAt: z.number().optional(),
});

export type TxInput = z.input<typeof txInputSchema>;

export type TxError = 'invalid' | 'amount' | 'rate' | 'fee' | 'date' | 'category' | 'person';

export type BuildResult = { ok: true; tx: Tx } | { ok: false; error: TxError };

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function newId(): string {
  const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${Date.now().toString(36)}-${rand()}${rand()}`;
}

/**
 * Validates form input and freezes every converted value on the transaction, so later
 * exchange-rate changes never alter history.
 */
export function buildTx(
  input: TxInput,
  settings: Pick<Settings, 'baseCurrency' | 'baseRateMicro'>,
): BuildResult {
  const parsed = txInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const v = parsed.data;
  if (!isValidDate(v.date)) return { ok: false, error: 'date' };

  const amountMinor = parseAmount(v.amount, v.currency);
  if (amountMinor === null || amountMinor <= 0) return { ok: false, error: 'amount' };

  const base = settings.baseCurrency;
  const typedRate = v.rate && v.rate.trim() !== '' ? parseRate(v.rate) : null;
  if (v.rate && v.rate.trim() !== '' && typedRate === null) return { ok: false, error: 'rate' };

  // Rate of the transaction currency, and the earning-currency rate at this moment.
  let rateMicro: number;
  let baseRateMicro: number;
  if (v.currency === 'BDT') {
    rateMicro = RATE_SCALE;
    baseRateMicro = base === 'BDT' ? RATE_SCALE : (typedRate ?? settings.baseRateMicro);
  } else if (v.currency === base) {
    rateMicro = typedRate ?? settings.baseRateMicro;
    baseRateMicro = rateMicro;
  } else {
    if (typedRate === null) return { ok: false, error: 'rate' };
    rateMicro = typedRate;
    baseRateMicro = base === 'BDT' ? RATE_SCALE : settings.baseRateMicro;
  }
  if (!(rateMicro > 0) || !(baseRateMicro > 0)) return { ok: false, error: 'rate' };

  const bdtMinor = toBdtMinor(amountMinor, v.currency, rateMicro);
  const baseMinor = v.currency === base ? amountMinor : fromBdtMinor(bdtMinor, base, baseRateMicro);

  let feeBdtMinor = 0;
  let feeBaseMinor = 0;
  if (v.kind === 'remittance' && v.fee && v.fee.trim() !== '') {
    // The fee is charged by the sender's bank/exchange, so it is typed in the earning currency.
    const feeMinor = parseAmount(v.fee, base);
    if (feeMinor === null) return { ok: false, error: 'fee' };
    feeBaseMinor = feeMinor;
    feeBdtMinor = toBdtMinor(feeMinor, base, baseRateMicro);
  }

  const needsCategory = v.kind === 'income' || v.kind === 'expense' || v.kind === 'remittance';
  if (needsCategory && !v.categoryId) return { ok: false, error: 'category' };
  if (v.kind.startsWith('debt_') && !v.debtId) return { ok: false, error: 'person' };
  if (v.kind.startsWith('goal_') && !v.goalId) return { ok: false, error: 'invalid' };

  const wallet: Wallet = v.kind === 'remittance' ? 'abroad' : v.wallet;
  return {
    ok: true,
    tx: {
      id: v.id ?? newId(),
      kind: v.kind,
      wallet,
      date: v.date,
      amountMinor,
      currency: v.currency,
      rateMicro,
      bdtMinor,
      baseCurrency: base,
      baseMinor,
      feeBdtMinor,
      feeBaseMinor,
      categoryId: needsCategory ? (v.categoryId ?? null) : null,
      person: v.person ?? null,
      method: v.method ?? null,
      reference: v.reference ?? null,
      note: v.note ?? null,
      debtId: v.kind.startsWith('debt_') ? (v.debtId ?? null) : null,
      goalId: v.kind.startsWith('goal_') ? (v.goalId ?? null) : null,
      createdAt: v.createdAt ?? Date.now(),
    },
  };
}
