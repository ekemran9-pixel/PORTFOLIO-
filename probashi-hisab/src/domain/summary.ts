import { fromBdtMinor, ratioBp, toBdtMinor, type CurrencyCode } from './money';
import type { AppData, Category, Debt, Goal, Settings, Tx } from './types';

/** An aggregate carried in both reporting currencies: BDT paisa and earning-currency minor. */
export interface Amt {
  bdt: number;
  base: number;
}

export const ZERO: Amt = { bdt: 0, base: 0 };
export const add = (a: Amt, b: Amt): Amt => ({ bdt: a.bdt + b.bdt, base: a.base + b.base });
export const sub = (a: Amt, b: Amt): Amt => ({ bdt: a.bdt - b.bdt, base: a.base - b.base });

type RateCtx = Pick<Settings, 'baseCurrency' | 'baseRateMicro'>;

/**
 * The transaction's value. BDT is always the frozen historical value. The earning-currency
 * value is the frozen one when the transaction was recorded under the same earning currency,
 * otherwise it is derived from BDT with the user's latest rate.
 */
export function txAmt(tx: Tx, s: RateCtx): Amt {
  const base =
    tx.baseCurrency === s.baseCurrency
      ? tx.baseMinor
      : fromBdtMinor(tx.bdtMinor, s.baseCurrency, s.baseRateMicro);
  return { bdt: tx.bdtMinor, base };
}

export function feeAmt(tx: Tx, s: RateCtx): Amt {
  const base =
    tx.baseCurrency === s.baseCurrency
      ? tx.feeBaseMinor
      : fromBdtMinor(tx.feeBdtMinor, s.baseCurrency, s.baseRateMicro);
  return { bdt: tx.feeBdtMinor, base };
}

export interface Period {
  /** inclusive, YYYY-MM-DD */
  from: string;
  to: string;
}

export const inPeriod = (tx: Tx, p: Period) => tx.date >= p.from && tx.date <= p.to;

export interface Summary {
  income: Amt;
  homeIncome: Amt;
  /** Spending abroad, split by category group. */
  abroadPersonal: Amt;
  abroadSocial: Amt;
  abroadExpense: Amt;
  /** Money transferred to Bangladesh (excluding fees) and the fees paid for it. */
  remitted: Amt;
  fees: Amt;
  remitFamily: Amt;
  remitAsset: Amt;
  /** Spending recorded from the Bangladesh account, by category group. */
  homeFamily: Amt;
  homeSocial: Amt;
  homeAsset: Amt;
  /** Family cost for the dashboard – depends on the tracking mode. */
  familyExpense: Amt;
  /** Friends, relatives, gifts, donations (abroad + home). */
  socialExpense: Amt;
  debtRepaid: Amt;
  debtGiven: Amt;
  debtCollected: Amt;
  debtTaken: Amt;
  goalNet: Amt;
  /** Money that is gone: consumption + transfer fees. Counted exactly once. */
  totalSpending: Amt;
  totalIncome: Amt;
  netSavings: Amt;
  /** netSavings / totalIncome in basis points, null when there is no income. */
  savingsRateBp: number | null;
  /** Cash movement abroad in the period (what is left in hand from this period). */
  remaining: Amt;
  count: number;
}

export function summarize(
  txs: Tx[],
  categories: Category[],
  settings: Settings,
  period: Period | null,
): Summary {
  const groupOf = new Map(categories.map((c) => [c.id, c.group]));
  const z = () => ({ bdt: 0, base: 0 });
  const acc = {
    income: z(),
    homeIncome: z(),
    abroadPersonal: z(),
    abroadSocial: z(),
    remitted: z(),
    fees: z(),
    remitFamily: z(),
    remitAsset: z(),
    homeFamily: z(),
    homeSocial: z(),
    homeAsset: z(),
    debtRepaid: z(),
    debtGiven: z(),
    debtCollected: z(),
    debtTaken: z(),
    goalNet: z(),
    remaining: z(),
  };
  const plus = (t: Amt, a: Amt) => {
    t.bdt += a.bdt;
    t.base += a.base;
  };
  const minus = (t: Amt, a: Amt) => {
    t.bdt -= a.bdt;
    t.base -= a.base;
  };
  let count = 0;

  for (const tx of txs) {
    if (period && !inPeriod(tx, period)) continue;
    count++;
    const a = txAmt(tx, settings);
    const group = tx.categoryId ? groupOf.get(tx.categoryId) : undefined;
    const abroad = tx.wallet === 'abroad';
    switch (tx.kind) {
      case 'income':
        plus(abroad ? acc.income : acc.homeIncome, a);
        if (abroad) plus(acc.remaining, a);
        break;
      case 'expense':
        if (abroad) {
          plus(group === 'social' ? acc.abroadSocial : acc.abroadPersonal, a);
          minus(acc.remaining, a);
        } else {
          plus(group === 'asset' ? acc.homeAsset : group === 'social' ? acc.homeSocial : acc.homeFamily, a);
        }
        break;
      case 'remittance': {
        const fee = feeAmt(tx, settings);
        plus(acc.remitted, a);
        plus(acc.fees, fee);
        plus(group === 'asset' ? acc.remitAsset : acc.remitFamily, a);
        minus(acc.remaining, a);
        minus(acc.remaining, fee);
        break;
      }
      case 'debt_given':
        plus(acc.debtGiven, a);
        if (abroad) minus(acc.remaining, a);
        break;
      case 'debt_collected':
        plus(acc.debtCollected, a);
        if (abroad) plus(acc.remaining, a);
        break;
      case 'debt_taken':
        plus(acc.debtTaken, a);
        if (abroad) plus(acc.remaining, a);
        break;
      case 'debt_repaid':
        plus(acc.debtRepaid, a);
        if (abroad) minus(acc.remaining, a);
        break;
      case 'goal_deposit':
        plus(acc.goalNet, a);
        if (abroad) minus(acc.remaining, a);
        break;
      case 'goal_withdraw':
        minus(acc.goalNet, a);
        if (abroad) plus(acc.remaining, a);
        break;
    }
  }

  const abroadExpense = add(acc.abroadPersonal, acc.abroadSocial);
  const track = settings.trackHome;
  // Counting rule: a remittance and the family's later spending of it are never both counted.
  //  - trackHome: consumption at home = what the family recorded (asset purchases excluded).
  //  - simple:    consumption at home = money sent for family purposes, at the time it is sent.
  const familyExpense = track ? acc.homeFamily : acc.remitFamily;
  const socialExpense = track ? add(acc.abroadSocial, acc.homeSocial) : acc.abroadSocial;
  const homeConsumption = track ? add(acc.homeFamily, acc.homeSocial) : acc.remitFamily;
  const totalSpending = add(add(abroadExpense, acc.fees), homeConsumption);
  const totalIncome = track ? add(acc.income, acc.homeIncome) : acc.income;
  const netSavings = sub(totalIncome, totalSpending);

  return {
    ...acc,
    abroadExpense,
    familyExpense,
    socialExpense,
    totalSpending,
    totalIncome,
    netSavings,
    savingsRateBp: ratioBp(netSavings.bdt, totalIncome.bdt),
    count,
  };
}

export interface Balances {
  /** Cash in hand / bank abroad. */
  abroadCash: Amt;
  /** Balance of the Bangladesh account (meaningful when trackHome is on). */
  homeCash: Amt;
  /** Total held in savings goals (including opening amounts). */
  goals: Amt;
  /** Others owe the user. */
  receivable: Amt;
  /** The user owes others. */
  payable: Amt;
}

export function balances(data: AppData, upTo?: string): Balances {
  const s = data.settings;
  const b: Balances = {
    abroadCash: { ...ZERO },
    homeCash: { ...ZERO },
    goals: { ...ZERO },
    receivable: { ...ZERO },
    payable: { ...ZERO },
  };
  const bump = (t: Amt, a: Amt, sign: 1 | -1) => {
    t.bdt += sign * a.bdt;
    t.base += sign * a.base;
  };
  for (const tx of data.txs) {
    if (upTo && tx.date > upTo) continue;
    const a = txAmt(tx, s);
    const cash = tx.wallet === 'abroad' ? b.abroadCash : b.homeCash;
    switch (tx.kind) {
      case 'income':
        bump(cash, a, 1);
        break;
      case 'expense':
        bump(cash, a, -1);
        break;
      case 'remittance':
        bump(b.abroadCash, a, -1);
        bump(b.abroadCash, feeAmt(tx, s), -1);
        bump(b.homeCash, a, 1);
        break;
      case 'debt_given':
        bump(cash, a, -1);
        bump(b.receivable, a, 1);
        break;
      case 'debt_collected':
        bump(cash, a, 1);
        bump(b.receivable, a, -1);
        break;
      case 'debt_taken':
        bump(cash, a, 1);
        bump(b.payable, a, 1);
        break;
      case 'debt_repaid':
        bump(cash, a, -1);
        bump(b.payable, a, -1);
        break;
      case 'goal_deposit':
        bump(cash, a, -1);
        bump(b.goals, a, 1);
        break;
      case 'goal_withdraw':
        bump(cash, a, 1);
        bump(b.goals, a, -1);
        break;
    }
  }
  for (const g of data.goals) {
    const bdt = g.currency === 'BDT' ? g.openingMinor : toBdtViaBase(g.openingMinor, g.currency, s);
    bump(b.goals, { bdt, base: fromBdtMinor(bdt, s.baseCurrency, s.baseRateMicro) }, 1);
  }
  return b;
}

function toBdtViaBase(minor: number, currency: CurrencyCode, s: RateCtx): number {
  // Opening amounts have no transaction rate; the latest earning-currency rate is used.
  if (currency !== s.baseCurrency || s.baseRateMicro <= 0) return 0;
  return toBdtMinor(minor, currency, s.baseRateMicro);
}

export interface DebtStatus {
  debt: Debt;
  /** In the debt's own currency, minor units. */
  principalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  settled: boolean;
  /** Months to clear at the planned instalment, null when no instalment is set. */
  monthsLeft: number | null;
}

export function debtStatus(debt: Debt, txs: Tx[]): DebtStatus {
  let principal = 0;
  let paid = 0;
  for (const tx of txs) {
    if (tx.debtId !== debt.id) continue;
    const v = tx.currency === debt.currency ? tx.amountMinor : 0;
    if (tx.kind === 'debt_given' || tx.kind === 'debt_taken') principal += v;
    if (tx.kind === 'debt_collected' || tx.kind === 'debt_repaid') paid += v;
  }
  const outstanding = Math.max(0, principal - paid);
  return {
    debt,
    principalMinor: principal,
    paidMinor: paid,
    outstandingMinor: outstanding,
    settled: principal > 0 && outstanding === 0,
    monthsLeft: debt.monthlyMinor > 0 ? Math.ceil(outstanding / debt.monthlyMinor) : null,
  };
}

export interface GoalStatus {
  goal: Goal;
  savedMinor: number;
  remainingMinor: number;
  /** 0–10000 */
  progressBp: number;
  /** Average net deposit per month over the last 3 full months + current month. */
  monthlyPaceMinor: number;
  /** Estimated months to reach the target at the current pace; null when no pace. */
  monthsLeft: number | null;
}

export function goalStatus(goal: Goal, txs: Tx[], today: string): GoalStatus {
  let saved = goal.openingMinor;
  let recent = 0;
  const since = addMonths(today.slice(0, 7), -3) + '-01';
  for (const tx of txs) {
    if (tx.goalId !== goal.id || tx.currency !== goal.currency) continue;
    const sign = tx.kind === 'goal_deposit' ? 1 : tx.kind === 'goal_withdraw' ? -1 : 0;
    saved += sign * tx.amountMinor;
    if (tx.date >= since) recent += sign * tx.amountMinor;
  }
  const remaining = Math.max(0, goal.targetMinor - saved);
  const pace = Math.round(recent / 4);
  return {
    goal,
    savedMinor: saved,
    remainingMinor: remaining,
    progressBp: goal.targetMinor > 0 ? Math.min(10000, ratioBp(Math.max(0, saved), goal.targetMinor) ?? 0) : 0,
    monthlyPaceMinor: pace,
    monthsLeft: remaining === 0 ? 0 : pace > 0 ? Math.ceil(remaining / pace) : null,
  };
}

/** "2026-11" + n months → "YYYY-MM" */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

export function monthPeriod(ym: string): Period {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type PeriodKey = 'this' | 'last' | '3m' | '6m' | '12m' | 'all';

export function periodFor(key: PeriodKey, today: string): Period | null {
  const ym = today.slice(0, 7);
  switch (key) {
    case 'this':
      return monthPeriod(ym);
    case 'last':
      return monthPeriod(addMonths(ym, -1));
    case '3m':
      return { from: addMonths(ym, -2) + '-01', to: monthPeriod(ym).to };
    case '6m':
      return { from: addMonths(ym, -5) + '-01', to: monthPeriod(ym).to };
    case '12m':
      return { from: addMonths(ym, -11) + '-01', to: monthPeriod(ym).to };
    case 'all':
      return null;
  }
}

export interface MonthRow {
  ym: string;
  summary: Summary;
}

/** Month-by-month summaries, oldest first, ending at `endYm`. */
export function monthlySeries(data: AppData, endYm: string, months: number): MonthRow[] {
  const rows: MonthRow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ym = addMonths(endYm, -i);
    rows.push({ ym, summary: summarize(data.txs, data.categories, data.settings, monthPeriod(ym)) });
  }
  return rows;
}

export interface CategorySlice {
  categoryId: string | null;
  amount: Amt;
  count: number;
}

/**
 * Where the money went, largest first. Follows the same counting rule as `summarize`:
 * abroad expenses + (home expenses | family-purpose remittances) + transfer fees are
 * NOT included here – this is a category view of consumption only.
 */
export function spendingByCategory(
  txs: Tx[],
  categories: Category[],
  settings: Settings,
  period: Period | null,
): CategorySlice[] {
  const groupOf = new Map(categories.map((c) => [c.id, c.group]));
  const map = new Map<string | null, CategorySlice>();
  for (const tx of txs) {
    if (period && !inPeriod(tx, period)) continue;
    const group = tx.categoryId ? groupOf.get(tx.categoryId) : undefined;
    const counted =
      (tx.kind === 'expense' && tx.wallet === 'abroad') ||
      (tx.kind === 'expense' && tx.wallet === 'home' && settings.trackHome && group !== 'asset') ||
      (tx.kind === 'remittance' && !settings.trackHome && group !== 'asset');
    if (!counted) continue;
    const cur = map.get(tx.categoryId) ?? { categoryId: tx.categoryId, amount: { ...ZERO }, count: 0 };
    cur.amount = add(cur.amount, txAmt(tx, settings));
    cur.count++;
    map.set(tx.categoryId, cur);
  }
  return [...map.values()].sort((a, b) => b.amount.bdt - a.amount.bdt);
}

export interface HomeLedgerRow {
  tx: Tx;
  /** + money in, − money out (BDT paisa) */
  deltaBdt: number;
  /** Running balance after this row – the spreadsheet's "বাকি ছিল" column. */
  balanceBdt: number;
}

/** The Bangladesh account as a ledger: remittances in, family spending out. Oldest first. */
export function homeLedger(txs: Tx[]): HomeLedgerRow[] {
  const rows = txs
    .filter((t) => t.kind === 'remittance' || t.wallet === 'home')
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
  let bal = 0;
  return rows.map((tx) => {
    const inflow =
      tx.kind === 'remittance' ||
      tx.kind === 'income' ||
      tx.kind === 'debt_collected' ||
      tx.kind === 'debt_taken' ||
      tx.kind === 'goal_withdraw';
    const delta = inflow ? tx.bdtMinor : -tx.bdtMinor;
    bal += delta;
    return { tx, deltaBdt: delta, balanceBdt: bal };
  });
}

export interface BudgetStatus {
  categoryId: string;
  limitMinor: number;
  spentMinor: number;
  /** spent / limit in basis points (can exceed 10000). */
  usedBp: number;
  over: boolean;
}

/** Budgets are monthly limits on abroad-expense categories, in the earning currency. */
export function budgetStatus(data: AppData, ym: string): BudgetStatus[] {
  const p = monthPeriod(ym);
  const spent = new Map<string, number>();
  for (const tx of data.txs) {
    if (tx.kind !== 'expense' || tx.wallet !== 'abroad' || !tx.categoryId || !inPeriod(tx, p)) continue;
    spent.set(tx.categoryId, (spent.get(tx.categoryId) ?? 0) + txAmt(tx, data.settings).base);
  }
  return data.budgets
    .filter((b) => b.limitMinor > 0)
    .map((b) => {
      const s = spent.get(b.categoryId) ?? 0;
      return {
        categoryId: b.categoryId,
        limitMinor: b.limitMinor,
        spentMinor: s,
        usedBp: ratioBp(s, b.limitMinor) ?? 0,
        over: s > b.limitMinor,
      };
    });
}
