import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { homeLedger, monthPeriod, summarize, toDateString } from '../domain/summary';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Card, Divider, Empty, Notice, Row, Screen, SectionTitle, Txt } from '../ui/components';
import { kindLabelKey } from '../ui/kinds';
import { SPACE, usePalette } from '../ui/theme';

/** The spreadsheet's "দেশের হিসাব" sheet: money sent home, what the family spent, what is left. */
export default function HomeAccountScreen() {
  const p = usePalette();
  const router = useRouter();
  const { t, money, cat, date, month } = useT();
  const data = useApp((s) => s.data);
  const saveSettings = useApp((s) => s.saveSettings);
  const s = data.settings;
  const ym = toDateString(new Date()).slice(0, 7);

  const { ledger, all, thisMonth } = useMemo(
    () => ({
      ledger: homeLedger(data.txs),
      all: summarize(data.txs, data.categories, { ...s, trackHome: true }, null),
      thisMonth: summarize(data.txs, data.categories, { ...s, trackHome: true }, monthPeriod(ym)),
    }),
    [data.txs, data.categories, s, ym],
  );
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const balance = ledger.length ? ledger[ledger.length - 1].balanceBdt : 0;
  const bdt = (v: number) => money(v, 'BDT', { compact: true });
  const spentAll = all.homeFamily.bdt + all.homeSocial.bdt + all.homeAsset.bdt;
  const spentMonth = thisMonth.homeFamily.bdt + thisMonth.homeSocial.bdt + thisMonth.homeAsset.bdt;

  return (
    <Screen edges={['bottom']}>
      {!s.trackHome ? (
        <Card style={{ borderColor: p.warn }}>
          <Notice tone="warn" text={t('home.offNote')} />
          <Button title={t('home.turnOn')} onPress={() => saveSettings({ trackHome: true })} />
        </Card>
      ) : null}

      <View style={{ backgroundColor: p.hero, borderRadius: 24, padding: SPACE.xl, gap: 4 }}>
        <Txt v="label" color={p.heroSub}>{t('home.balance')}</Txt>
        <Txt v="hero" color="#FFFFFF" testID="home-balance" numberOfLines={1} adjustsFontSizeToFit>{bdt(balance)}</Txt>
        <Txt v="small" color={p.heroSub}>{t('home.balanceHint')}</Txt>
      </View>

      <Card>
        {[
          [t('home.totalSent'), bdt(all.remitted.bdt)],
          [t('home.otherIn'), bdt(all.homeIncome.bdt)],
          [t('home.totalSpent'), bdt(spentAll)],
          [t('home.sentMonth', { month: month(ym) }), bdt(thisMonth.remitted.bdt)],
          [t('home.spentMonth', { month: month(ym) }), bdt(spentMonth)],
        ].map(([label, value]) => (
          <Row key={label} style={{ justifyContent: 'space-between' }}>
            <Txt color={p.sub} style={{ flex: 1 }}>{label}</Txt>
            <Txt v="label">{value}</Txt>
          </Row>
        ))}
      </Card>

      <Row>
        <Button style={{ flex: 1 }} title={t('quick.family')} icon="remove-circle-outline" onPress={() => router.push('/entry?kind=expense&wallet=home' as never)} />
        <Button style={{ flex: 1 }} title={t('home.addDeposit')} kind="ghost" icon="add-circle-outline" onPress={() => router.push('/entry?kind=income&wallet=home' as never)} />
      </Row>

      <SectionTitle title={t('home.ledger')} />
      <Card style={{ gap: SPACE.sm }}>
        {ledger.length === 0 ? <Empty icon="flag-outline" title={t('home.emptyTitle')} body={t('home.emptyBody')} /> : null}
        {[...ledger].reverse().map((r, i) => (
          <View key={r.tx.id} style={{ gap: SPACE.sm }}>
            {i > 0 ? <Divider /> : null}
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Txt v="label" onPress={() => router.push(`/entry?id=${r.tx.id}` as never)}>
                  {r.tx.categoryId && r.tx.kind !== 'remittance' ? cat(catById.get(r.tx.categoryId)) : t(kindLabelKey(r.tx))}
                </Txt>
                <Txt v="small" color={p.muted}>{[date(r.tx.date), r.tx.person, r.tx.note].filter(Boolean).join(' · ')}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt v="label" color={r.deltaBdt >= 0 ? p.income : p.expense}>{(r.deltaBdt >= 0 ? '+' : '−') + bdt(Math.abs(r.deltaBdt))}</Txt>
                <Txt v="small" color={p.muted}>{t('home.runBalance', { v: bdt(r.balanceBdt) })}</Txt>
              </View>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
