import { txsToCsv } from '../src/domain/csv';
import { buildInsights, healthScore, monthsToRepay, projectSavings } from '../src/domain/insights';
import { buildTx } from '../src/domain/txBuilder';
import { SETTINGS, sheetData, tx } from './helpers';

describe('health score', () => {
  it('is null without income', () => {
    expect(healthScore({ ...sheetData(), txs: [] }, '2026-11').total).toBeNull();
  });
  it('scores the sheet month with explainable parts', () => {
    const h = healthScore(sheetData(), '2026-11');
    const part = (k: string) => h.parts.find((p) => p.key === k)!.score;
    expect(part('savings')).toBe(40); // 87.9% saved
    expect(part('debt')).toBe(20); // nothing owed
    expect(part('spending')).toBe(15);
    expect(part('buffer')).toBe(2); // 186.42 SAR cash vs ~508 SAR spending
    expect(part('budget')).toBe(5); // no budgets → neutral
    expect(h.total).toBe(82);
    expect(h.band).toBe('excellent');
  });
  it('drops when spending exceeds income', () => {
    const data = sheetData();
    data.txs.push(tx({ kind: 'expense', date: '2026-11-20', amount: '6000', categoryId: 'exp_shopping' }));
    const h = healthScore(data, '2026-11');
    expect(h.parts.find((p) => p.key === 'savings')!.score).toBe(0);
    expect(h.total!).toBeLessThan(40);
  });
});

describe('projection', () => {
  it('500 SAR a month for 5 years without profit is exactly 30,000 SAR', () => {
    const p = projectSavings(50_000, 5);
    expect(p).toHaveLength(5);
    expect(p[4]).toEqual({ year: 5, depositedMinor: 3_000_000, valueMinor: 3_000_000 });
  });
  it('compounds monthly when a rate is given', () => {
    const p = projectSavings(100_000, 1, 1200); // 1%/month, deposits at month end
    // future value of annuity: 1000 × ((1.01^12 − 1) / 0.01) = 12,682.50
    expect(p[0].valueMinor).toBeGreaterThanOrEqual(1_268_240);
    expect(p[0].valueMinor).toBeLessThanOrEqual(1_268_260);
    expect(p[0].depositedMinor).toBe(1_200_000);
  });
  it('months to repay', () => {
    expect(monthsToRepay(150_000, 50_000)).toBe(3);
    expect(monthsToRepay(150_001, 50_000)).toBe(4);
    expect(monthsToRepay(1, 0)).toBeNull();
  });
});

describe('insights', () => {
  it('flags overspending, budget overrun and savings target', () => {
    const data = sheetData({ ...SETTINGS, savingsTargetMinor: 100_000 });
    data.budgets = [{ categoryId: 'exp_mobile', limitMinor: 1_000, currency: 'SAR' }];
    const keys = buildInsights(data, '2026-11').map((i) => i.key);
    expect(keys).toContain('targetMet');
    expect(keys).toContain('budgetOver');
    data.txs.push(tx({ kind: 'expense', date: '2026-11-20', amount: '9000', categoryId: 'exp_shopping' }));
    expect(buildInsights(data, '2026-11').map((i) => i.key)).toContain('negative');
  });
  it('notices a category that jumped versus last month', () => {
    const data = sheetData();
    data.txs.push(tx({ kind: 'income', date: '2026-10-01', amount: '4200', categoryId: 'inc_salary' }));
    data.txs.push(tx({ kind: 'expense', date: '2026-10-09', amount: '50', categoryId: 'exp_transport' }));
    const i = buildInsights(data, '2026-11').find((x) => x.key === 'categoryUp');
    expect(i).toMatchObject({ categoryId: 'exp_transport', params: { pct: 60 } });
  });
  it('is silent with no data', () => {
    expect(buildInsights({ ...sheetData(), txs: [] }, '2026-11')).toEqual([]);
  });
});

describe('buildTx validation', () => {
  const base = { kind: 'expense' as const, wallet: 'abroad' as const, date: '2026-11-11', amount: '10', currency: 'SAR' as const, categoryId: 'exp_food' };
  it('rejects bad input with a specific reason', () => {
    expect(buildTx({ ...base, amount: '0' }, SETTINGS)).toEqual({ ok: false, error: 'amount' });
    expect(buildTx({ ...base, amount: 'x' }, SETTINGS)).toEqual({ ok: false, error: 'amount' });
    expect(buildTx({ ...base, date: '2026-02-30' }, SETTINGS)).toEqual({ ok: false, error: 'date' });
    expect(buildTx({ ...base, categoryId: null }, SETTINGS)).toEqual({ ok: false, error: 'category' });
    expect(buildTx({ ...base, rate: 'abc' }, SETTINGS)).toEqual({ ok: false, error: 'rate' });
    expect(buildTx({ ...base, currency: 'USD' }, SETTINGS)).toEqual({ ok: false, error: 'rate' }); // third currency needs a rate
    expect(buildTx(base, { baseCurrency: 'SAR', baseRateMicro: 0 })).toEqual({ ok: false, error: 'rate' });
    expect(buildTx({ ...base, kind: 'debt_given' }, SETTINGS)).toEqual({ ok: false, error: 'person' });
  });
  it('stores a third-currency transaction with its own rate', () => {
    const r = buildTx({ ...base, currency: 'USD', rate: '121.50', amount: '100' }, SETTINGS);
    expect(r.ok && r.tx.bdtMinor).toBe(1_215_000);
    expect(r.ok && r.tx.baseMinor).toBe(37_500); // ৳12,150 / 32.40
  });
  it('exports CSV with a BOM, escaped text and frozen values', () => {
    const t = tx({ kind: 'expense', date: '2026-11-09', amount: '80', categoryId: 'exp_transport', note: 'Jubail, "1st" trip' });
    const csv = txsToCsv([t], sheetData().categories, 'en');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('2026-11-09,expense,abroad,Transport,80.00,SAR,32.40,2592.00,SAR,80.00,0.00,,,,"Jubail, ""1st"" trip"');
  });
});
