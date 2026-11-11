import { divRound, ratioBp } from './money';
import {
  addMonths,
  balances,
  budgetStatus,
  monthPeriod,
  spendingByCategory,
  summarize,
  type Summary,
} from './summary';
import type { AppData } from './types';

export interface HealthPart {
  key: 'savings' | 'debt' | 'spending' | 'buffer' | 'budget';
  score: number;
  max: number;
}

export interface HealthScore {
  /** 0–100, or null when there is not enough data (no income recorded). */
  total: number | null;
  parts: HealthPart[];
  band: 'none' | 'weak' | 'fair' | 'good' | 'excellent';
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Financial health score – every point is explainable (shown to the user in the app):
 *
 *  savings  (40): savings rate of the month. 30% or more = 40 points, scaled linearly, <0% = 0.
 *  debt     (20): money owed vs monthly income. No debt = 20; owing 6+ months of income = 0.
 *  spending (15): spending within income = 15; spending 150%+ of income = 0.
 *  buffer   (15): savings goals + cash abroad vs monthly spending. 3+ months covered = 15.
 *  budget   (10): share of budgets not exceeded. No budgets set = 5 (neutral).
 */
export function healthScore(data: AppData, ym: string): HealthScore {
  const s = summarize(data.txs, data.categories, data.settings, monthPeriod(ym));
  if (s.totalIncome.bdt <= 0) {
    return { total: null, parts: [], band: 'none' };
  }
  const bal = balances(data, monthPeriod(ym).to);
  const income = s.totalIncome.bdt;
  const spend = s.totalSpending.bdt;

  const rate = (s.savingsRateBp ?? 0) / 100; // percent
  const savings = clamp(Math.round((rate / 30) * 40), 0, 40);

  const debtMonths = Math.max(0, bal.payable.bdt) / income;
  const debt = clamp(Math.round(20 * (1 - debtMonths / 6)), 0, 20);

  const spendRatio = spend / income;
  const spending = spendRatio <= 1 ? 15 : clamp(Math.round(15 * (1 - (spendRatio - 1) / 0.5)), 0, 15);

  const cushion = Math.max(0, bal.goals.bdt) + Math.max(0, bal.abroadCash.bdt);
  const buffer = spend <= 0 ? 15 : clamp(Math.round((cushion / spend / 3) * 15), 0, 15);

  const budgets = budgetStatus(data, ym);
  const budget =
    budgets.length === 0 ? 5 : Math.round((budgets.filter((b) => !b.over).length / budgets.length) * 10);

  const parts: HealthPart[] = [
    { key: 'savings', score: savings, max: 40 },
    { key: 'debt', score: debt, max: 20 },
    { key: 'spending', score: spending, max: 15 },
    { key: 'buffer', score: buffer, max: 15 },
    { key: 'budget', score: budget, max: 10 },
  ];
  const total = parts.reduce((t, p) => t + p.score, 0);
  const band = total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'fair' : 'weak';
  return { total, parts, band };
}

export interface ProjectionPoint {
  year: number;
  /** Total deposited so far (minor units). */
  depositedMinor: number;
  /** Value including the assumed profit (minor units). */
  valueMinor: number;
}

/**
 * Future savings simulator. Deposits are made at the end of each month; profit (if any)
 * compounds monthly at annualRateBp / 12. Integer arithmetic throughout.
 * This is an illustration, never a promise – the UI says so.
 */
export function projectSavings(
  monthlyMinor: number,
  years: number,
  annualRateBp = 0,
  startingMinor = 0,
): ProjectionPoint[] {
  const out: ProjectionPoint[] = [];
  let value = BigInt(Math.max(0, startingMinor));
  let deposited = BigInt(Math.max(0, startingMinor));
  const m = BigInt(Math.max(0, monthlyMinor));
  const rate = BigInt(Math.max(0, annualRateBp));
  for (let month = 1; month <= years * 12; month++) {
    // monthly growth = value × (annualRateBp / 10000) / 12
    value += divRound(value * rate, 120000n);
    value += m;
    deposited += m;
    if (month % 12 === 0) {
      out.push({ year: month / 12, depositedMinor: Number(deposited), valueMinor: Number(value) });
    }
  }
  return out;
}

/** Months needed to clear a debt with a fixed monthly payment (no interest). */
export function monthsToRepay(outstandingMinor: number, monthlyMinor: number): number | null {
  if (monthlyMinor <= 0) return null;
  return Math.ceil(Math.max(0, outstandingMinor) / monthlyMinor);
}

export type InsightTone = 'good' | 'warn' | 'bad' | 'info';

export interface Insight {
  /** i18n key under `insight.*`; params are substituted into the message. */
  key:
    | 'savingsUp'
    | 'savingsDown'
    | 'negative'
    | 'belowTarget'
    | 'targetMet'
    | 'familyShare'
    | 'categoryUp'
    | 'budgetOver'
    | 'budgetNear'
    | 'feeHigh'
    | 'noIncome';
  tone: InsightTone;
  params: Record<string, string | number>;
  categoryId?: string;
}

/** Rule-based observations for one month compared with the previous one. */
export function buildInsights(data: AppData, ym: string): Insight[] {
  const out: Insight[] = [];
  const s = data.settings;
  const cur = summarize(data.txs, data.categories, s, monthPeriod(ym));
  const prevYm = addMonths(ym, -1);
  const prev: Summary = summarize(data.txs, data.categories, s, monthPeriod(prevYm));

  if (cur.count === 0) return out;
  if (cur.totalIncome.bdt <= 0) {
    out.push({ key: 'noIncome', tone: 'info', params: {} });
  }

  if (cur.netSavings.bdt < 0) {
    out.push({ key: 'negative', tone: 'bad', params: {} });
  } else if (prev.count > 0 && prev.totalIncome.bdt > 0 && cur.totalIncome.bdt > 0) {
    if (cur.netSavings.bdt > prev.netSavings.bdt) out.push({ key: 'savingsUp', tone: 'good', params: {} });
    else if (cur.netSavings.bdt < prev.netSavings.bdt) out.push({ key: 'savingsDown', tone: 'warn', params: {} });
  }

  if (s.savingsTargetMinor > 0 && cur.totalIncome.bdt > 0) {
    if (cur.netSavings.base >= s.savingsTargetMinor) out.push({ key: 'targetMet', tone: 'good', params: {} });
    else out.push({ key: 'belowTarget', tone: 'warn', params: {} });
  }

  const famBp = ratioBp(cur.familyExpense.bdt, cur.totalIncome.bdt);
  if (famBp !== null && famBp >= 3000) {
    out.push({ key: 'familyShare', tone: famBp >= 6000 ? 'warn' : 'info', params: { pct: Math.round(famBp / 100) } });
  }

  // A category that grew 25%+ over last month and matters (≥5% of this month's spending).
  const prevCats = new Map(
    spendingByCategory(data.txs, data.categories, s, monthPeriod(prevYm)).map((c) => [c.categoryId, c.amount.bdt]),
  );
  for (const c of spendingByCategory(data.txs, data.categories, s, monthPeriod(ym))) {
    const before = prevCats.get(c.categoryId) ?? 0;
    if (!c.categoryId || before <= 0) continue;
    const growBp = ratioBp(c.amount.bdt - before, before) ?? 0;
    const shareBp = ratioBp(c.amount.bdt, cur.totalSpending.bdt) ?? 0;
    if (growBp >= 2500 && shareBp >= 500) {
      out.push({ key: 'categoryUp', tone: 'warn', params: { pct: Math.round(growBp / 100) }, categoryId: c.categoryId });
      break;
    }
  }

  for (const b of budgetStatus(data, ym)) {
    if (b.over) out.push({ key: 'budgetOver', tone: 'bad', params: {}, categoryId: b.categoryId });
    else if (b.usedBp >= 8000) out.push({ key: 'budgetNear', tone: 'warn', params: { pct: Math.round(b.usedBp / 100) }, categoryId: b.categoryId });
  }

  const feeBp = ratioBp(cur.fees.bdt, cur.remitted.bdt);
  if (feeBp !== null && feeBp >= 200) {
    out.push({ key: 'feeHigh', tone: 'info', params: { pct: (feeBp / 100).toFixed(1) } });
  }
  return out;
}
