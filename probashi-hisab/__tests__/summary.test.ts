import {
  addMonths,
  balances,
  budgetStatus,
  debtStatus,
  goalStatus,
  homeLedger,
  monthPeriod,
  periodFor,
  spendingByCategory,
  summarize,
} from '../src/domain/summary';
import { SETTINGS, sheetData, tx } from './helpers';

const NOV = monthPeriod('2026-11');

describe('summary — the user\'s spreadsheet month (দেশের হিসাব mode)', () => {
  const data = sheetData();
  const s = summarize(data.txs, data.categories, data.settings, NOV);

  it('income', () => {
    expect(s.income).toEqual({ bdt: 13_608_000, base: 420_000 });
  });
  it('lending money and repaying a loan are NOT expenses (the sheet counted them as expenses)', () => {
    expect(s.abroadExpense.base).toBe(20_000); // 20 + 100 + 80 SAR
    expect(s.debtGiven.base).toBe(190_000);
    expect(s.debtRepaid.base).toBe(2_000);
  });
  it('remittance is a transfer; the family spending of it is the expense — never both', () => {
    expect(s.remitted).toEqual({ bdt: 6_200_000, base: 191_358 });
    expect(s.familyExpense.bdt).toBe(1_000_000); // ৳10,000 actually spent at home
    // spending = 200 SAR abroad (৳6,480) + ৳10,000 at home
    expect(s.totalSpending.bdt).toBe(648_000 + 1_000_000);
  });
  it('net savings = income − real spending', () => {
    expect(s.netSavings.bdt).toBe(13_608_000 - 1_648_000);
    expect(s.savingsRateBp).toBe(8789); // 87.89%
  });
  it('cash left abroad equals the sheet\'s "এ মাসের সঞ্চয়" cell: 166.42 SAR', () => {
    expect(s.remaining.base).toBe(16_642);
  });
  it('donation counts as social spending', () => {
    expect(s.abroadSocial.base).toBe(10_000);
    expect(s.socialExpense.base).toBe(10_000);
  });
  it('balances: Bangladesh account matches the sheet (৳52,000), receivables 1,900 SAR, nothing owed', () => {
    const b = balances(data);
    expect(b.homeCash.bdt).toBe(5_200_000);
    expect(b.receivable.base).toBe(190_000);
    expect(b.payable.base).toBe(0);
    expect(b.abroadCash.base).toBe(16_642 + 2_000); // + the 20 SAR borrowed in October
  });
  it('home ledger keeps the running balance column', () => {
    const rows = homeLedger(data.txs);
    expect(rows.map((r) => r.balanceBdt)).toEqual([6_200_000, 5_200_000]);
  });
  it('category breakdown excludes transfers and loans', () => {
    const cats = spendingByCategory(data.txs, data.categories, data.settings, NOV);
    expect(cats.map((c) => c.categoryId)).toEqual(['home_household', 'exp_charity', 'exp_transport', 'exp_mobile']);
    expect(cats.reduce((t, c) => t + c.amount.bdt, 0)).toBe(s.totalSpending.bdt - s.fees.bdt);
  });
});

describe('summary — simple mode (family spending not tracked)', () => {
  const settings = { ...SETTINGS, trackHome: false };
  const data = sheetData(settings);
  const s = summarize(data.txs, data.categories, settings, NOV);

  it('money sent for the family counts as spent when sent; home rows are ignored', () => {
    expect(s.familyExpense.bdt).toBe(6_200_000);
    expect(s.totalSpending.bdt).toBe(648_000 + 6_200_000);
    expect(s.netSavings.base).toBe(420_000 - 20_000 - 191_358);
  });
  it('money sent for assets (land, savings) is not consumption', () => {
    const extra = tx({ kind: 'remittance', date: '2026-11-15', amount: '500', rate: '32.40', fee: '15', categoryId: 'rem_land' }, settings);
    const s2 = summarize([...data.txs, extra], data.categories, settings, NOV);
    expect(s2.remitAsset.base).toBe(50_000);
    expect(s2.totalSpending.base).toBe(s.totalSpending.base + 1_500); // only the fee is a cost
    expect(s2.fees).toEqual({ bdt: 48_600, base: 1_500 });
    expect(s2.remaining.base).toBe(s.remaining.base - 50_000 - 1_500);
  });
});

describe('history is frozen', () => {
  it('changing today\'s rate does not change past BDT or SAR values', () => {
    const data = sheetData();
    const before = summarize(data.txs, data.categories, data.settings, NOV);
    const later = { ...data.settings, baseRateMicro: 35_000_000 };
    const after = summarize(data.txs, data.categories, later, NOV);
    expect(after.income).toEqual(before.income);
    expect(after.remitted).toEqual(before.remitted);
    expect(after.netSavings).toEqual(before.netSavings);
  });
  it('after moving to another earning currency, old rows are shown through BDT', () => {
    const data = sheetData();
    const moved = { ...data.settings, baseCurrency: 'AED' as const, baseRateMicro: 33_000_000 };
    const s = summarize(data.txs, data.categories, moved, NOV);
    expect(s.income.bdt).toBe(13_608_000);
    expect(s.income.base).toBe(412_364); // ৳136,080 / 33.00
  });
});

describe('debts, goals, budgets, periods', () => {
  it('debt status tracks principal, repayments and instalment months', () => {
    const data = sheetData();
    const rizwan = { ...data.debts[1], monthlyMinor: 50_000 };
    const back = tx({ kind: 'debt_collected', date: '2026-12-01', amount: '300', debtId: 'd_rizwan' });
    const st = debtStatus(rizwan, [...data.txs, back]);
    expect(st).toMatchObject({ principalMinor: 180_000, paidMinor: 30_000, outstandingMinor: 150_000, settled: false, monthsLeft: 3 });
    expect(debtStatus(data.debts[0], data.txs).settled).toBe(true);
  });
  it('goal progress and estimated months at the recent pace', () => {
    const goal = { id: 'g1', name: 'জমি', icon: 'map-outline', currency: 'SAR' as const, targetMinor: 1_000_000, openingMinor: 100_000, targetDate: null, createdAt: 1 };
    const txs = [
      tx({ kind: 'goal_deposit', date: '2026-09-05', amount: '1000', goalId: 'g1' }),
      tx({ kind: 'goal_deposit', date: '2026-10-05', amount: '1000', goalId: 'g1' }),
      tx({ kind: 'goal_withdraw', date: '2026-11-05', amount: '400', goalId: 'g1' }),
    ];
    const st = goalStatus(goal, txs, '2026-11-11');
    expect(st.savedMinor).toBe(260_000);
    expect(st.progressBp).toBe(2600);
    expect(st.monthlyPaceMinor).toBe(40_000); // 1,600 net over 4 months
    expect(st.monthsLeft).toBe(19); // 7,400 / 400
    expect(balances({ ...sheetData(), txs, goals: [goal] }).goals.base).toBe(260_000);
  });
  it('budget usage', () => {
    const data = sheetData();
    data.budgets = [
      { categoryId: 'exp_transport', limitMinor: 10_000, currency: 'SAR' },
      { categoryId: 'exp_mobile', limitMinor: 1_500, currency: 'SAR' },
    ];
    const b = budgetStatus(data, '2026-11');
    expect(b[0]).toMatchObject({ spentMinor: 8_000, usedBp: 8000, over: false });
    expect(b[1]).toMatchObject({ spentMinor: 2_000, over: true });
  });
  it('period helpers', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(monthPeriod('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(periodFor('3m', '2026-11-11')).toEqual({ from: '2026-09-01', to: '2026-11-30' });
    expect(periodFor('all', '2026-11-11')).toBeNull();
  });
});
