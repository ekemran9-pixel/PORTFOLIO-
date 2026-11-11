import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normalizeNumberInput } from '../../domain/money';
import type { Tx } from '../../domain/types';
import { useT, type TKey } from '../../i18n';
import { useApp } from '../../store/useApp';
import { Chip, Chips, Empty, Field, Txt } from '../../ui/components';
import { kindLabelKey } from '../../ui/kinds';
import { TxRow } from '../../ui/TxRow';
import { SPACE, usePalette } from '../../ui/theme';

type Filter = 'all' | 'income' | 'expense' | 'remittance' | 'home' | 'debt' | 'goal';
const FILTERS: { key: Filter; label: TKey }[] = [
  { key: 'all', label: 'filter.all' },
  { key: 'income', label: 'filter.income' },
  { key: 'expense', label: 'filter.expense' },
  { key: 'remittance', label: 'filter.remittance' },
  { key: 'home', label: 'filter.home' },
  { key: 'debt', label: 'filter.debt' },
  { key: 'goal', label: 'filter.goal' },
];

function matches(tx: Tx, f: Filter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'income':
      return tx.kind === 'income' && tx.wallet === 'abroad';
    case 'expense':
      return tx.kind === 'expense' && tx.wallet === 'abroad';
    case 'remittance':
      return tx.kind === 'remittance';
    case 'home':
      return tx.wallet === 'home';
    case 'debt':
      return tx.kind.startsWith('debt_');
    case 'goal':
      return tx.kind.startsWith('goal_');
  }
}

export default function TransactionsScreen() {
  const p = usePalette();
  const router = useRouter();
  const { t, cat, date, lang } = useT();
  const txs = useApp((s) => s.data.txs);
  const categories = useApp((s) => s.data.categories);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const catById = new Map(categories.map((c) => [c.id, c]));
    const q = normalizeNumberInput(query).toLowerCase();
    const list = txs.filter((tx) => {
      if (!matches(tx, filter)) return false;
      if (!q) return true;
      const hay = [
        cat(catById.get(tx.categoryId ?? '')),
        t(kindLabelKey(tx)),
        tx.person,
        tx.note,
        tx.method,
        tx.reference,
        tx.currency,
        tx.date,
        String(tx.amountMinor / 100),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    const byDate = new Map<string, Tx[]>();
    for (const tx of list) byDate.set(tx.date, [...(byDate.get(tx.date) ?? []), tx]);
    return [...byDate.entries()].map(([d, data]) => ({ title: d, data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, categories, filter, query, lang]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ padding: SPACE.lg, paddingBottom: SPACE.sm, gap: SPACE.md }}>
          <Txt v="title">{t('tx.title')}</Txt>
          <Field label={t('tx.search')} value={query} onChangeText={setQuery} placeholder={t('tx.searchPlaceholder')} autoCapitalize="none" />
          <Chips>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={t(f.label)} active={f.key === filter} onPress={() => setFilter(f.key)} />
            ))}
          </Chips>
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingBottom: 40 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Txt v="label" color={p.muted} style={{ marginTop: SPACE.md, marginBottom: 2 }}>{date(section.title)}</Txt>
          )}
          renderItem={({ item }) => <TxRow tx={item} />}
          ListEmptyComponent={
            txs.length === 0 ? (
              <Empty icon="receipt-outline" title={t('tx.emptyTitle')} body={t('tx.emptyBody')} action={t('dash.emptyAction')} onAction={() => router.push('/entry?kind=income' as never)} />
            ) : (
              <Empty icon="search-outline" title={t('tx.noMatch')} />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
