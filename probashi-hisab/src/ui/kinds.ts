import type { TKey } from '../i18n';
import type { Tx, TxKind } from '../domain/types';
import type { IconName } from './components';
import type { Palette } from './theme';

interface KindMeta {
  label: TKey;
  icon: IconName;
  /** How the row reads in a list: money coming in, going out, or moving between pockets. */
  flow: 'in' | 'out' | 'move';
}

export const KIND: Record<TxKind, KindMeta> = {
  income: { label: 'kind.income', icon: 'arrow-down-circle-outline', flow: 'in' },
  expense: { label: 'kind.expense', icon: 'arrow-up-circle-outline', flow: 'out' },
  remittance: { label: 'kind.remittance', icon: 'paper-plane-outline', flow: 'move' },
  debt_given: { label: 'kind.debt_given', icon: 'hand-left-outline', flow: 'move' },
  debt_collected: { label: 'kind.debt_collected', icon: 'return-down-back-outline', flow: 'move' },
  debt_taken: { label: 'kind.debt_taken', icon: 'download-outline', flow: 'move' },
  debt_repaid: { label: 'kind.debt_repaid', icon: 'checkmark-done-outline', flow: 'move' },
  goal_deposit: { label: 'kind.goal_deposit', icon: 'wallet-outline', flow: 'move' },
  goal_withdraw: { label: 'kind.goal_withdraw', icon: 'exit-outline', flow: 'move' },
};

export function kindColor(tx: Pick<Tx, 'kind'>, p: Palette): string {
  const f = KIND[tx.kind].flow;
  return f === 'in' ? p.income : f === 'out' ? p.expense : p.remit;
}

export function kindSign(tx: Pick<Tx, 'kind'>): string {
  const f = KIND[tx.kind].flow;
  return f === 'in' ? '+' : f === 'out' ? '−' : '';
}

export function kindLabelKey(tx: Pick<Tx, 'kind' | 'wallet'>): TKey {
  if (tx.kind === 'expense' && tx.wallet === 'home') return 'kind.home_expense';
  if (tx.kind === 'income' && tx.wallet === 'home') return 'kind.home_income';
  return KIND[tx.kind].label;
}
