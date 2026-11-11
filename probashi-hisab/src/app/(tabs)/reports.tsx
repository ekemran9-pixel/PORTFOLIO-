import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { txsToCsv } from '../../domain/csv';
import { ratioBp } from '../../domain/money';
import {
  inPeriod,
  monthlySeries,
  periodFor,
  spendingByCategory,
  summarize,
  toDateString,
  txAmt,
  type Amt,
  type Period,
  type PeriodKey,
} from '../../domain/summary';
import { isValidDate } from '../../domain/txBuilder';
import { useT, type TKey } from '../../i18n';
import { useApp } from '../../store/useApp';
import { GroupedBars, RankedBars } from '../../ui/charts';
import { Button, Card, Chip, Chips, Divider, Empty, Field, Row, Screen, SectionTitle, Txt } from '../../ui/components';
import { exportText } from '../../ui/platform';
import { SPACE, usePalette } from '../../ui/theme';

type Key = PeriodKey | 'custom';
const PERIODS: { key: Key; label: TKey }[] = [
  { key: 'this', label: 'period.this' },
  { key: 'last', label: 'period.last' },
  { key: '3m', label: 'period.3m' },
  { key: '6m', label: 'period.6m' },
  { key: '12m', label: 'period.12m' },
  { key: 'all', label: 'period.all' },
  { key: 'custom', label: 'period.custom' },
];

export default function ReportsScreen() {
  const p = usePalette();
  const T = useT();
  const { t, amt, amtAlt, pct, cat, month, lang } = T;
  const data = useApp((s) => s.data);
  const s = data.settings;
  const today = toDateString(new Date());
  const [key, setKey] = useState<Key>('this');
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [exported, setExported] = useState<string | null>(null);

  const customOk = isValidDate(from) && isValidDate(to) && from <= to;
  const period: Period | null = key === 'custom' ? (customOk ? { from, to } : { from: '9999-01-01', to: '9999-01-01' }) : periodFor(key, today);

  const { sum, cats, series, recipients, inRange } = useMemo(() => {
    const inRange = data.txs.filter((x) => !period || inPeriod(x, period));
    const rec = new Map<string, { amount: Amt; count: number }>();
    for (const x of inRange) {
      if (x.kind !== 'remittance') continue;
      const name = x.person ?? '';
      const cur = rec.get(name) ?? { amount: { bdt: 0, base: 0 }, count: 0 };
      const a = txAmt(x, s);
      rec.set(name, { amount: { bdt: cur.amount.bdt + a.bdt, base: cur.amount.base + a.base }, count: cur.count + 1 });
    }
    return {
      inRange,
      sum: summarize(data.txs, data.categories, s, period),
      cats: spendingByCategory(data.txs, data.categories, s, period),
      series: monthlySeries(data, today.slice(0, 7), 12),
      recipients: [...rec.entries()].sort((a, b) => b[1].amount.bdt - a[1].amount.bdt),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, s, key, from, to, today]);
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);

  const rows: { label: TKey; value: Amt; bold?: boolean; indent?: boolean }[] = [
    { label: 'dash.income', value: sum.totalIncome, bold: true },
    { label: 'dash.abroadExpense', value: sum.abroadPersonal, indent: true },
    { label: 'dash.social', value: sum.socialExpense, indent: true },
    { label: 'dash.family', value: sum.familyExpense, indent: true },
    { label: 'report.fees', value: sum.fees, indent: true },
    { label: 'dash.totalSpending', value: sum.totalSpending, bold: true },
    { label: 'dash.netSavings', value: sum.netSavings, bold: true },
  ];
  const moves: { label: TKey; value: Amt }[] = [
    { label: 'dash.remitted', value: sum.remitted },
    { label: 'report.remitAsset', value: sum.remitAsset },
    { label: 'report.homeAsset', value: sum.homeAsset },
    { label: 'kind.debt_given', value: sum.debtGiven },
    { label: 'kind.debt_collected', value: sum.debtCollected },
    { label: 'kind.debt_taken', value: sum.debtTaken },
    { label: 'kind.debt_repaid', value: sum.debtRepaid },
    { label: 'report.goalNet', value: sum.goalNet },
  ];

  async function onExport() {
    const csv = txsToCsv(inRange, data.categories, lang);
    const ok = await exportText(`probashi-hisab-${today}.csv`, csv);
    setExported(ok ? t('report.exported', { n: inRange.length }) : null);
  }

  return (
    <Screen>
      <Txt v="title">{t('report.title')}</Txt>
      <Chips>
        {PERIODS.map((x) => (
          <Chip key={x.key} label={t(x.label)} active={x.key === key} onPress={() => setKey(x.key)} />
        ))}
      </Chips>
      {key === 'custom' ? (
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field label={t('report.from')} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" maxLength={10} error={isValidDate(from) ? null : t('entry.err.date')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('report.to')} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" maxLength={10} error={!isValidDate(to) ? t('entry.err.date') : from > to ? t('report.rangeError') : null} />
          </View>
        </Row>
      ) : null}

      {data.txs.length === 0 ? (
        <Card><Empty icon="bar-chart-outline" title={t('report.emptyTitle')} body={t('report.emptyBody')} /></Card>
      ) : (
        <>
          <Card>
            <Txt v="h2">{t('report.summary')}</Txt>
            {rows.map((r) => (
              <Row key={r.label} style={{ justifyContent: 'space-between', paddingLeft: r.indent ? SPACE.md : 0 }}>
                <Txt v={r.bold ? 'label' : 'body'} color={r.bold ? p.text : p.sub} style={{ flex: 1 }}>{t(r.label)}</Txt>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt v="label" color={r.label === 'dash.netSavings' ? (r.value.bdt < 0 ? p.bad : p.good) : p.text}>{amt(r.value)}</Txt>
                  {r.bold ? <Txt v="small" color={p.muted}>≈ {amtAlt(r.value)}</Txt> : null}
                </View>
              </Row>
            ))}
            <Divider />
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="label">{t('dash.savingsRate')}</Txt>
              <Txt v="label">{pct(sum.savingsRateBp)}</Txt>
            </Row>
            <Txt v="small" color={p.muted}>{t(s.trackHome ? 'report.ruleTrack' : 'report.ruleSimple')}</Txt>
          </Card>

          <Card>
            <Txt v="h2">{t('report.moves')}</Txt>
            <Txt v="small" color={p.muted}>{t('report.movesNote')}</Txt>
            {moves.filter((m) => m.value.bdt !== 0).length === 0 ? <Txt color={p.sub}>{t('report.none')}</Txt> : null}
            {moves.filter((m) => m.value.bdt !== 0).map((m) => (
              <Row key={m.label} style={{ justifyContent: 'space-between' }}>
                <Txt color={p.sub} style={{ flex: 1 }}>{t(m.label)}</Txt>
                <Txt v="label">{amt(m.value)}</Txt>
              </Row>
            ))}
          </Card>

          <SectionTitle title={t('report.byMonth')} />
          <Card>
            <GroupedBars
              height={190}
              series={[
                { label: t('dash.income'), color: p.series[0] },
                { label: t('dash.totalSpending'), color: p.series[1] },
                { label: t('dash.netSavings'), color: p.series[2] },
              ]}
              groups={series.map((r) => ({
                label: month(r.ym, true),
                values: [T.amtValue(r.summary.totalIncome), T.amtValue(r.summary.totalSpending), T.amtValue(r.summary.netSavings)],
                display: [amt(r.summary.totalIncome), amt(r.summary.totalSpending), amt(r.summary.netSavings)],
              }))}
            />
            <Txt v="small" color={p.muted}>{t('report.byMonthNote')}</Txt>
          </Card>

          <SectionTitle title={t('dash.whereMoney')} />
          <Card>
            {cats.length === 0 ? (
              <Txt color={p.sub}>{t('dash.noSpending')}</Txt>
            ) : (
              <RankedBars
                limit={12}
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

          <SectionTitle title={t('report.remitByPerson')} />
          <Card>
            {recipients.length === 0 ? <Txt color={p.sub}>{t('report.none')}</Txt> : null}
            {recipients.map(([name, r]) => (
              <Row key={name || '-'} style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Txt v="label">{name || t('report.noRecipient')}</Txt>
                  <Txt v="small" color={p.muted}>{t('report.times', { n: r.count })}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt v="label">{amt(r.amount)}</Txt>
                  <Txt v="small" color={p.muted}>≈ {amtAlt(r.amount)}</Txt>
                </View>
              </Row>
            ))}
            {sum.remitted.bdt > 0 ? (
              <>
                <Divider />
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt color={p.sub}>{t('report.fees')}</Txt>
                  <Txt v="label">{amt(sum.fees)} ({pct(ratioBp(sum.fees.bdt, sum.remitted.bdt))})</Txt>
                </Row>
              </>
            ) : null}
          </Card>

          <Button title={t('report.export', { n: inRange.length })} icon="download-outline" kind="ghost" onPress={onExport} disabled={inRange.length === 0} />
          {exported ? <Txt v="small" color={p.good}>{exported}</Txt> : null}
          <Txt v="small" color={p.muted}>{t('report.exportNote')}</Txt>
        </>
      )}
    </Screen>
  );
}
