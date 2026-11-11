import { create } from 'zustand';

import type { Repo } from '../db/repo';
import { DEFAULT_CATEGORIES } from '../domain/categories';
import { buildDemo } from '../domain/demo';
import { parseRate } from '../domain/money';
import { toDateString } from '../domain/summary';
import { buildTx, newId, type TxError, type TxInput } from '../domain/txBuilder';
import {
  DEFAULT_SETTINGS,
  type AppData,
  type Budget,
  type Category,
  type Debt,
  type Goal,
  type Settings,
} from '../domain/types';

const EMPTY: AppData = {
  settings: DEFAULT_SETTINGS,
  categories: DEFAULT_CATEGORIES,
  txs: [],
  debts: [],
  goals: [],
  budgets: [],
};

type SaveResult = { ok: true } | { ok: false; error: TxError | 'storage' };

interface AppState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  data: AppData;
  repo: Repo | null;
  init: (open: () => Promise<Repo>) => Promise<void>;
  reload: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  saveTx: (input: TxInput) => Promise<SaveResult>;
  deleteTx: (id: string) => Promise<void>;
  /** Creates the debt and its opening transaction together. */
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>, opening: Pick<TxInput, 'amount' | 'date' | 'rate' | 'note'>) => Promise<SaveResult>;
  deleteDebt: (id: string) => Promise<void>;
  saveGoal: (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setBudget: (b: Budget) => Promise<void>;
  addCategory: (c: Omit<Category, 'id' | 'sort' | 'custom'>) => Promise<string>;
  wipe: () => Promise<void>;
  startDemo: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => {
  const repo = () => {
    const r = get().repo;
    if (!r) throw new Error('database is not ready');
    return r;
  };
  const reload = async () => set({ data: await repo().loadAll() });

  return {
    status: 'loading',
    error: null,
    data: EMPTY,
    repo: null,

    init: async (open) => {
      if (get().repo) return;
      try {
        const r = await open();
        await r.init();
        set({ repo: r, data: await r.loadAll(), status: 'ready' });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },
    reload,

    saveSettings: async (patch) => {
      // Optimistic: settings drive language/theme and must feel instant.
      set((s) => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } }));
      await repo().saveSettings(patch);
    },

    saveTx: async (input) => {
      const s = get().data.settings;
      const built = buildTx(input, s);
      if (!built.ok) return built;
      try {
        await repo().upsertTx(built.tx);
        // Remember the newest earning-currency rate the user typed.
        const t = built.tx;
        // For a BDT entry the typed rate is the earning-currency rate too.
        const typedBaseRate =
          t.currency === s.baseCurrency
            ? t.rateMicro
            : t.currency === 'BDT' && t.baseMinor > 0 && input.rate
              ? parseRate(input.rate)
              : null;
        if (typedBaseRate && typedBaseRate !== s.baseRateMicro && t.date >= s.baseRateDate) {
          await repo().saveSettings({ baseRateMicro: typedBaseRate, baseRateDate: t.date });
        }
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: 'storage' };
      }
    },

    deleteTx: async (id) => {
      await repo().deleteTx(id);
      await reload();
    },

    addDebt: async (debt, opening) => {
      const s = get().data.settings;
      const id = newId();
      const built = buildTx(
        {
          kind: debt.direction === 'lent' ? 'debt_given' : 'debt_taken',
          wallet: debt.wallet,
          currency: debt.currency,
          debtId: id,
          person: debt.person,
          ...opening,
        },
        s,
      );
      if (!built.ok) return built;
      try {
        await repo().upsertDebt({ ...debt, id, createdAt: Date.now() });
        await repo().upsertTx(built.tx);
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: 'storage' };
      }
    },

    deleteDebt: async (id) => {
      await repo().deleteDebt(id);
      await reload();
    },

    saveGoal: async (goal) => {
      await repo().upsertGoal({ ...goal, id: goal.id ?? newId(), createdAt: Date.now() });
      await reload();
    },

    deleteGoal: async (id) => {
      await repo().deleteGoal(id);
      await reload();
    },

    setBudget: async (b) => {
      await repo().setBudget(b);
      await reload();
    },

    addCategory: async (c) => {
      const id = 'cus_' + newId();
      const sort = get().data.categories.filter((x) => x.scope === c.scope).length;
      await repo().addCategory({ ...c, id, sort, custom: true });
      await reload();
      return id;
    },

    wipe: async () => {
      await repo().wipe();
      await reload();
    },

    startDemo: async () => {
      const r = repo();
      await r.wipe();
      const demo = buildDemo(toDateString(new Date()), get().data.settings.language);
      await r.saveSettings(demo.settings);
      for (const d of demo.debts) await r.upsertDebt(d);
      for (const g of demo.goals) await r.upsertGoal(g);
      for (const t of demo.txs) await r.upsertTx(t);
      for (const b of demo.budgets) await r.setBudget(b);
      await reload();
    },
  };
});
