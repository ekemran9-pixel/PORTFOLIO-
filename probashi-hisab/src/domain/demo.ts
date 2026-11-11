import { addMonths } from './summary';
import { buildTx, type TxInput } from './txBuilder';
import { DEFAULT_SETTINGS, type Budget, type Debt, type Goal, type Settings, type Tx } from './types';

/**
 * Sample data for the optional demo mode only. It is generated on request, clearly
 * labelled in the UI, and removed completely when the user leaves demo mode.
 */
export function buildDemo(today: string, language: 'bn' | 'en') {
  const bn = language === 'bn';
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    onboarded: true,
    language,
    demo: true,
    country: 'SA',
    baseCurrency: 'SAR',
    baseRateMicro: 32_400_000,
    baseRateDate: today,
    salaryMinor: 300_000,
    savingsTargetMinor: 60_000,
    trackHome: true,
  };
  const ym = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const txs: Tx[] = [];
  let seq = 0;
  const push = (monthsAgo: number, d: number, input: Partial<TxInput> & Pick<TxInput, 'kind' | 'amount'>) => {
    if (monthsAgo === 0 && d > day) return; // nothing in the future
    const date = `${addMonths(ym, -monthsAgo)}-${String(d).padStart(2, '0')}`;
    const r = buildTx({ wallet: 'abroad', currency: 'SAR', rate: '32.40', date, createdAt: ++seq, ...input }, settings);
    if (r.ok) txs.push(r.tx);
  };

  const debts: Debt[] = [
    { id: 'demo_lent', direction: 'lent', person: bn ? 'রাসেল' : 'Rasel', wallet: 'abroad', currency: 'SAR', dueDate: null, monthlyMinor: 0, note: null, createdAt: 1 },
    { id: 'demo_borrowed', direction: 'borrowed', person: bn ? 'ভিসার ঋণ' : 'Visa loan', wallet: 'home', currency: 'BDT', dueDate: null, monthlyMinor: 1_000_000, note: null, createdAt: 2 },
  ];
  const goals: Goal[] = [
    { id: 'demo_goal', name: bn ? 'জমি কেনা' : 'Buy land', icon: 'map-outline', currency: 'SAR', targetMinor: 4_000_000, openingMinor: 350_000, targetDate: null, createdAt: 1 },
    { id: 'demo_goal2', name: bn ? 'জরুরি তহবিল' : 'Emergency fund', icon: 'shield-checkmark-outline', currency: 'SAR', targetMinor: 600_000, openingMinor: 120_000, targetDate: null, createdAt: 2 },
  ];
  const budgets: Budget[] = [
    { categoryId: 'exp_food', limitMinor: 45_000, currency: 'SAR' },
    { categoryId: 'exp_mobile', limitMinor: 8_000, currency: 'SAR' },
    { categoryId: 'exp_transport', limitMinor: 10_000, currency: 'SAR' },
  ];

  push(5, 3, { kind: 'debt_taken', wallet: 'home', currency: 'BDT', amount: '80000', debtId: 'demo_borrowed' });
  const food = ['410', '455', '430', '520', '470', '380'];
  for (let m = 5; m >= 0; m--) {
    push(m, 1, { kind: 'income', amount: '3000', categoryId: 'inc_salary' });
    push(m, 1, { kind: 'income', amount: m % 2 ? '350' : '520', categoryId: 'inc_overtime' });
    push(m, 2, { kind: 'expense', amount: '400', categoryId: 'exp_rent', method: bn ? 'নগদ' : 'Cash' });
    push(m, 3, { kind: 'remittance', amount: '1500', fee: '15', categoryId: 'rem_family', person: bn ? 'মা' : 'Mother', method: bn ? 'ব্যাংক ট্রান্সফার' : 'Bank transfer' });
    push(m, 4, { kind: 'expense', amount: '65', categoryId: 'exp_mobile' });
    push(m, 5, { kind: 'expense', wallet: 'home', currency: 'BDT', amount: '22000', categoryId: 'home_household', person: bn ? 'মা' : 'Mother' });
    push(m, 6, { kind: 'expense', wallet: 'home', currency: 'BDT', amount: '4500', categoryId: 'home_education', person: bn ? 'ছোট ভাই' : 'Brother' });
    push(m, 7, { kind: 'debt_repaid', wallet: 'home', currency: 'BDT', amount: '10000', debtId: 'demo_borrowed' });
    push(m, 8, { kind: 'expense', amount: food[m], categoryId: 'exp_food' });
    push(m, 9, { kind: 'expense', amount: m === 0 ? '95' : '70', categoryId: 'exp_transport' });
    push(m, 10, { kind: 'goal_deposit', amount: '500', goalId: 'demo_goal' });
    if (m % 2 === 0) push(m, 12, { kind: 'expense', amount: '50', categoryId: 'exp_charity' });
    if (m === 3) push(m, 14, { kind: 'expense', amount: '260', categoryId: 'exp_iqama' });
    if (m === 2) push(m, 15, { kind: 'debt_given', amount: '300', debtId: 'demo_lent' });
    if (m === 1) push(m, 16, { kind: 'debt_collected', amount: '100', debtId: 'demo_lent' });
    if (m === 1) push(m, 18, { kind: 'expense', wallet: 'home', currency: 'BDT', amount: '6000', categoryId: 'home_medical', person: bn ? 'বাবা' : 'Father' });
    if (m === 4) push(m, 20, { kind: 'goal_deposit', amount: '200', goalId: 'demo_goal2' });
  }
  return { settings, txs, debts, goals, budgets };
}
