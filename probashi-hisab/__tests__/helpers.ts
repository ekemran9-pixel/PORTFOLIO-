import { DEFAULT_CATEGORIES } from '../src/domain/categories';
import { buildTx, type TxInput } from '../src/domain/txBuilder';
import { DEFAULT_SETTINGS, type AppData, type Settings, type Tx } from '../src/domain/types';

export const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  onboarded: true,
  baseCurrency: 'SAR',
  baseRateMicro: 32_400_000,
  baseRateDate: '2026-11-01',
  trackHome: true,
};

let seq = 0;
export function tx(input: Partial<TxInput> & Pick<TxInput, 'kind' | 'date' | 'amount'>, s: Settings = SETTINGS): Tx {
  const r = buildTx(
    { wallet: 'abroad', currency: 'SAR', id: `t${++seq}`, createdAt: seq, ...input },
    s,
  );
  if (!r.ok) throw new Error(`buildTx failed: ${r.error}`);
  return r.tx;
}

/**
 * The rows of the user's own spreadsheet for November 2026 (sheets "লেনদেন" and "দেশের হিসাব"),
 * plus the October loan that the 20 SAR repayment belongs to.
 */
export function sheetData(settings: Settings = SETTINGS): AppData {
  const txs: Tx[] = [
    tx({ kind: 'debt_taken', date: '2026-10-20', amount: '20', debtId: 'd_shamim' }, settings),
    tx({ kind: 'income', date: '2026-11-01', amount: '4200', categoryId: 'inc_salary' }, settings),
    tx({ kind: 'remittance', date: '2026-11-01', amount: '62000', currency: 'BDT', rate: '32.40', categoryId: 'rem_family' }, settings),
    tx({ kind: 'debt_given', date: '2026-11-02', amount: '1800', debtId: 'd_rizwan' }, settings),
    tx({ kind: 'expense', date: '2026-11-02', amount: '20', categoryId: 'exp_mobile' }, settings),
    tx({ kind: 'debt_repaid', date: '2026-11-02', amount: '20', debtId: 'd_shamim' }, settings),
    tx({ kind: 'debt_given', date: '2026-11-09', amount: '100', debtId: 'd_rasel' }, settings),
    tx({ kind: 'expense', date: '2026-11-09', amount: '100', categoryId: 'exp_charity' }, settings),
    tx({ kind: 'expense', date: '2026-11-09', amount: '80', categoryId: 'exp_transport' }, settings),
    tx({ kind: 'expense', wallet: 'home', date: '2026-11-02', amount: '10000', currency: 'BDT', rate: '32.40', categoryId: 'home_household', person: 'মা' }, settings),
  ];
  const debt = (id: string, direction: 'lent' | 'borrowed', person: string) => ({
    id, direction, person, wallet: 'abroad' as const, currency: 'SAR' as const, dueDate: null, monthlyMinor: 0, note: null, createdAt: 1,
  });
  return {
    settings,
    categories: DEFAULT_CATEGORIES,
    txs,
    debts: [debt('d_shamim', 'borrowed', 'Shamim'), debt('d_rizwan', 'lent', 'Rizwan'), debt('d_rasel', 'lent', 'Rasel')],
    goals: [],
    budgets: [],
  };
}
