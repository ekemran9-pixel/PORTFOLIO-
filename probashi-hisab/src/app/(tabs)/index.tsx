import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { buildInsights, healthScore } from '../../domain/insights';
import { ratioBp } from '../../domain/money';
import {
  balances,
  budgetStatus,
  debtStatus,
  goalStatus,
  monthlySeries,
  periodFor,
  spendingByCategory,
  summarize,
  toDateString,
  type Amt,
  type PeriodKey,
} from '../../domain/summary';
import { useT, type TKey } from '../../i18n';
import { useApp } from '../../store/useApp';
import { GroupedBars, RankedBars, ScoreRing, SplitBar } from '../../ui/charts';
import { Card, Chip, Chips, Empty, IconBadge, Notice, ProgressBar, Row, Screen, SectionTitle, Txt, type IconName } from '../../ui/components';
import { TxRow } from '../../ui/TxRow';
import { RADIUS, SPACE, usePalette } from '../../ui/theme';

const PERIODS: { key: PeriodKey; label: TKey }[] = [
  { key: 'this', label: 'period.this' },
  { key: 'last', label: 'period.last' },
  { key: '3m', label: 'period.3m' },
  { key: '6m', label: 'period.6m' },
  { key: '12m', label: 'period.12m' },
  { key: 'all', label: 'period.all' },
];

export default function HomeScreen() {
  const p = usePalette();
  const router = useRouter();
  const T = useT();
  const { t, amt, amtAlt, pct, cat, month, money, num } = T;
  const data = useApp((s) => s.data);
  const saveSettings = useApp((s) => s.saveSettings);
  const [periodKey, setPeriodKey] = useState<PeriodKey>('this');
  const [showCriteria, setShowCriteria] = useState(false);
  const s = data.settings;
  const today = toDateString(new Date());
  const ym = today.slice(0, 7);

  const view = useMemo(() => {
    const period = periodFor(periodKey, today);
    return {
      sum: summarize(data.txs, data.categories, s, period),
      cats: spendingByCategory(data.txs, data.categories, s, period),
      bal: balances(data),
      series: monthlySeries(data, ym, 6),
      health: healthScore(data, ym),
      insights: buildInsights(data, ym),
      budgets: budgetStatus(data, ym),
      debts: data.debts.map((d) => debtStatus(d, data.txs)).filter((d) => !d.settled),
      goals: data.goals.map((g) => goalStatus(g, data.txs, today)),
    };
  }, [data, s, periodKey, today, ym]);
  const { sum, cats, bal, series, health, insights, budgets, debts, goals } = view;
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const empty = data.txs.length === 0;
  const healthColor = health.band === 'excellent' || health.band === 'good' ? p.good : health.band === 'fair' ? p.warn : health.band === 'weak' ? p.bad : p.muted;

  const tiles: { label: TKey; value: Amt; icon: IconName; color: string; sign?: string }[] = [
    { label: 'dash.income', value: sum.totalIncome, icon: 'arrow-down-circle-outline', color: p.income },
    { label: 'dash.abroadExpense', value: sum.abroadPersonal, icon: 'cart-outline', color: p.expense },
    { label: 'dash.remitted', value: sum.remitted, icon: 'paper-plane-outline', color: p.remit },
    { label: 'dash.family', value: sum.familyExpense, icon: 'home-outline', color: p.expense },
    { label: 'dash.social', value: sum.socialExpense, icon: 'people-outline', color: p.expense },
    { label: 'dash.debtPaid', value: sum.debtRepaid, icon: 'checkmark-done-outline', color: p.remit },
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="small" color={p.muted}>{month(ym)}</Txt>
          <Txt v="title">{t('app.name')}</Txt>
        </View>
        <Pressable
          onPress={() => saveSettings({ showInBdt: !s.showInBdt })}
          accessibilityRole="button"
          accessibilityLabel={t('dash.switchCurrency')}
          testID="switch-currency"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: p.card, borderWidth: 1, borderColor: p.border, borderRadius: RADIUS.pill, paddingHorizontal: 14, minHeight: 40 }}
        >
          <Ionicons name="swap-horizontal" size={16} color={p.primary} />
          <Txt v="label" color={p.primary}>{s.showInBdt ? 'BDT ৳' : s.baseCurrency}</Txt>
        </Pressable>
      </Row>

      {s.demo ? (
        <Card style={{ backgroundColor: p.tint, borderColor: p.primary }}>
          <Notice tone="info" icon="flask-outline" text={t('demo.banner')} />
          <Pressable onPress={() => router.push('/profile' as never)} accessibilityRole="button">
            <Txt v="label" color={p.primary}>{t('demo.exitLink')}</Txt>
          </Pressable>
        </Card>
      ) : null}

      <Chips>
        {PERIODS.map((x) => (
          <Chip key={x.key} label={t(x.label)} active={x.key === periodKey} onPress={() => setPeriodKey(x.key)} />
        ))}
      </Chips>

      <View style={{ backgroundColor: p.hero, borderRadius: 24, padding: SPACE.xl, gap: SPACE.md }}>
        <View>
          <Txt v="label" color={p.heroSub}>{t('dash.netSavings')} · {t(PERIODS.find((x) => x.key === periodKey)!.label)}</Txt>
          <Txt v="hero" color="#FFFFFF" testID="net-savings" adjustsFontSizeToFit numberOfLines={1}>{amt(sum.netSavings)}</Txt>
          <Txt v="small" color={p.heroSub}>≈ {amtAlt(sum.netSavings)}</Txt>
        </View>
        <Row style={{ gap: SPACE.lg }}>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={p.heroSub}>{t('dash.savingsRate')}</Txt>
            <Txt v="num" color="#FFFFFF">{pct(sum.savingsRateBp)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={p.heroSub}>{t('dash.totalSpending')}</Txt>
            <Txt v="num" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit>{amt(sum.totalSpending)}</Txt>
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <Row style={{ gap: SPACE.lg }}>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={p.heroSub}>{t('dash.cashAbroad')}</Txt>
            <Txt v="num" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit>{money(bal.abroadCash.base, s.baseCurrency)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="small" color={p.heroSub}>{t('dash.remaining')}</Txt>
            <Txt v="num" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit>{amt(sum.remaining)}</Txt>
          </View>
        </Row>
      </View>

      {empty ? (
        <Card>
          <Empty icon="sparkles-outline" title={t('dash.emptyTitle')} body={t('dash.emptyBody')} action={t('dash.emptyAction')} onAction={() => router.push('/entry?kind=income' as never)} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        {tiles.map((x) => (
          <View key={x.label} style={{ width: '47%', flexGrow: 1, backgroundColor: p.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: p.border, padding: SPACE.md, gap: 4 }}>
            <Row>
              <IconBadge name={x.icon} color={x.color} bg={p.cardAlt} size={32} />
              <Txt v="small" color={p.sub} style={{ flex: 1 }} numberOfLines={2}>{t(x.label)}</Txt>
            </Row>
            <Txt v="num" numberOfLines={1} adjustsFontSizeToFit>{amt(x.value)}</Txt>
            <Txt v="small" color={p.muted} numberOfLines={1}>≈ {amtAlt(x.value)}</Txt>
          </View>
        ))}
      </View>
      {sum.fees.bdt > 0 ? <Txt v="small" color={p.muted}>{t('dash.feesLine', { fee: amt(sum.fees) })}</Txt> : null}

      <SectionTitle title={t('health.title')} action={t(showCriteria ? 'health.hide' : 'health.how')} onAction={() => setShowCriteria(!showCriteria)} />
      <Card>
        <Row style={{ gap: SPACE.lg }}>
          <ScoreRing score={health.total} color={healthColor} label={health.total === null ? '—' : num(health.total)} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h2" color={healthColor}>{t(`health.band.${health.band}` as TKey)}</Txt>
            <Txt v="small" color={p.sub}>{t(health.total === null ? 'health.noData' : 'health.subtitle', { month: month(ym) })}</Txt>
          </View>
        </Row>
        {showCriteria ? (
          <View style={{ gap: SPACE.md, marginTop: SPACE.sm }}>
            {(health.parts.length ? health.parts : (['savings', 'debt', 'spending', 'buffer', 'budget'] as const).map((key) => ({ key, score: 0, max: { savings: 40, debt: 20, spending: 15, buffer: 15, budget: 10 }[key] }))).map((part) => (
              <View key={part.key} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="label">{t(`health.part.${part.key}` as TKey)}</Txt>
                  <Txt v="label">{health.total === null ? `— / ${num(part.max)}` : `${num(part.score)} / ${num(part.max)}`}</Txt>
                </Row>
                <ProgressBar bp={(part.score / part.max) * 10000} color={healthColor} height={6} />
                <Txt v="small" color={p.muted}>{t(`health.rule.${part.key}` as TKey)}</Txt>
              </View>
            ))}
            <Txt v="small" color={p.muted}>{t('health.disclaimer')}</Txt>
          </View>
        ) : null}
      </Card>

      {insights.length > 0 ? (
        <>
          <SectionTitle title={t('insight.title')} />
          <Card style={{ gap: SPACE.md }}>
            {insights.slice(0, 5).map((i, idx) => (
              <Notice key={idx} tone={i.tone} text={t(`insight.${i.key}` as TKey, { ...i.params, cat: i.categoryId ? cat(catById.get(i.categoryId)) : '' })} />
            ))}
          </Card>
        </>
      ) : null}

      {!empty ? (
        <>
          <SectionTitle title={t('dash.trend')} action={t('dash.allReports')} onAction={() => router.push('/reports' as never)} />
          <Card>
            <GroupedBars
              series={[
                { label: t('dash.income'), color: p.series[0] },
                { label: t('dash.totalSpending'), color: p.series[1] },
                { label: t('dash.remitted'), color: p.series[2] },
              ]}
              groups={series.map((r) => ({
                label: month(r.ym, true),
                values: [T.amtValue(r.summary.totalIncome), T.amtValue(r.summary.totalSpending), T.amtValue(r.summary.remitted)],
                display: [amt(r.summary.totalIncome), amt(r.summary.totalSpending), amt(r.summary.remitted)],
              }))}
            />
          </Card>

          <SectionTitle title={t('dash.whereMoney')} />
          <Card>
            {cats.length === 0 ? (
              <Txt color={p.sub}>{t('dash.noSpending')}</Txt>
            ) : (
              <RankedBars
                otherLabel={t('common.others')}
                slices={cats.map((c) => ({
                  label: cat(catById.get(c.categoryId ?? '')),
                  value: c.amount.bdt,
                  display: amt(c.amount),
                  share: pct(ratioBp(c.amount.bdt, sum.totalSpending.bdt - sum.fees.bdt)),
                }))}
              />
            )}
          </Card>
        </>
      ) : null}

      {budgets.length > 0 ? (
        <>
          <SectionTitle title={t('budgets.thisMonth')} action={t('common.manage')} onAction={() => router.push('/budgets' as never)} />
          <Card style={{ gap: SPACE.md }}>
            {budgets.map((b) => (
              <View key={b.categoryId} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="label" style={{ flex: 1 }} numberOfLines={1}>{cat(catById.get(b.categoryId))}</Txt>
                  <Txt v="small" color={b.over ? p.bad : p.sub}>
                    {money(b.spentMinor, s.baseCurrency, { compact: true })} / {money(b.limitMinor, s.baseCurrency, { compact: true })}
                  </Txt>
                </Row>
                <ProgressBar bp={b.usedBp} color={b.over ? p.bad : b.usedBp >= 8000 ? p.warn : p.good} />
                {b.over ? <Txt v="small" color={p.bad}>{t('budgets.over')}</Txt> : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle title={t('dash.accounts')} />
      <Card style={{ gap: 0 }}>
        {s.trackHome ? (
          <Pressable onPress={() => router.push('/home-account' as never)} accessibilityRole="button" style={{ paddingVertical: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row><IconBadge name="flag-outline" color={p.primary} bg={p.tint} size={36} /><Txt v="label">{t('home.balance')}</Txt></Row>
              <Txt v="num">{money(bal.homeCash.bdt, 'BDT', { compact: true })}</Txt>
            </Row>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push('/debts' as never)} accessibilityRole="button" style={{ paddingVertical: 8, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row><IconBadge name="swap-horizontal-outline" color={p.remit} bg={p.cardAlt} size={36} /><Txt v="label">{t('debts.receivable')}</Txt></Row>
            <Txt v="num" color={p.income}>{amt(bal.receivable)}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row><View style={{ width: 36 }} /><Txt v="label">{t('debts.payable')}</Txt></Row>
            <Txt v="num" color={bal.payable.bdt > 0 ? p.expense : p.text}>{amt(bal.payable)}</Txt>
          </Row>
          {debts.length > 0 ? <Txt v="small" color={p.muted}>{t('debts.openCount', { n: debts.length })}</Txt> : null}
        </Pressable>
        <Pressable onPress={() => router.push('/goals' as never)} accessibilityRole="button" style={{ paddingVertical: 8, gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row><IconBadge name="wallet-outline" color={p.primary} bg={p.tint} size={36} /><Txt v="label">{t('goals.saved')}</Txt></Row>
            <Txt v="num">{amt(bal.goals)}</Txt>
          </Row>
          {goals.slice(0, 2).map((g) => (
            <View key={g.goal.id} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="small" color={p.sub}>{g.goal.name}</Txt>
                <Txt v="small" color={p.sub}>{pct(g.progressBp)}</Txt>
              </Row>
              <ProgressBar bp={g.progressBp} height={6} />
            </View>
          ))}
        </Pressable>
        {!empty ? (
          <View style={{ paddingTop: 8, gap: 6 }}>
            <Txt v="small" color={p.muted}>{t('dash.split')}</Txt>
            <SplitBar
              parts={[
                { value: sum.abroadExpense.bdt, color: p.series[0] },
                { value: (s.trackHome ? sum.familyExpense.bdt + sum.homeSocial.bdt : sum.familyExpense.bdt), color: p.series[1] },
                { value: Math.max(0, sum.netSavings.bdt), color: p.series[2] },
              ]}
            />
            <Row style={{ flexWrap: 'wrap', gap: SPACE.md }}>
              {[t('dash.splitAbroad'), t('dash.splitHome'), t('dash.splitSaved')].map((label, i) => (
                <Row key={label} style={{ gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.series[i] }} />
                  <Txt v="small" color={p.sub}>{label}</Txt>
                </Row>
              ))}
            </Row>
          </View>
        ) : null}
      </Card>

      {!empty ? (
        <>
          <SectionTitle title={t('dash.recent')} action={t('common.seeAll')} onAction={() => router.push('/transactions' as never)} />
          <Card style={{ gap: 0 }}>
            {data.txs.slice(0, 5).map((x) => (
              <TxRow key={x.id} tx={x} showDate />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
