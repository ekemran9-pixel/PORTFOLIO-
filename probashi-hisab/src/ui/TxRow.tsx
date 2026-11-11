import { useRouter } from 'expo-router';
import React from 'react';

import type { Tx } from '../domain/types';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { ListItem } from './components';
import { KIND, kindColor, kindLabelKey, kindSign } from './kinds';
import { usePalette } from './theme';

/** One transaction in a list: original amount first, BDT value underneath. */
export function TxRow({ tx, showDate = false }: { tx: Tx; showDate?: boolean }) {
  const p = usePalette();
  const router = useRouter();
  const { t, money, cat, date } = useT();
  const categories = useApp((s) => s.data.categories);
  const debts = useApp((s) => s.data.debts);
  const goals = useApp((s) => s.data.goals);
  const category = categories.find((c) => c.id === tx.categoryId);
  const linked = tx.debtId ? debts.find((d) => d.id === tx.debtId)?.person : tx.goalId ? goals.find((g) => g.id === tx.goalId)?.name : null;
  const title = category ? cat(category) : (linked ?? t(kindLabelKey(tx)));
  const bits = [t(kindLabelKey(tx)), tx.person && tx.person !== linked ? tx.person : null, tx.note, showDate ? date(tx.date) : null].filter(Boolean);
  const color = kindColor(tx, p);
  return (
    <ListItem
      icon={(category?.icon as never) ?? KIND[tx.kind].icon}
      iconColor={color}
      iconBg={p.cardAlt}
      title={title}
      subtitle={bits.join(' · ')}
      right={kindSign(tx) + money(tx.amountMinor, tx.currency)}
      rightSub={tx.currency === 'BDT' ? money(tx.baseMinor, tx.baseCurrency) : money(tx.bdtMinor, 'BDT', { compact: true })}
      rightColor={color}
      onPress={() => router.push(`/entry?id=${tx.id}` as never)}
    />
  );
}
