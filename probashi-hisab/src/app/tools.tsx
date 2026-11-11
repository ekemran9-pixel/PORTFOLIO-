import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { monthsToRepay, projectSavings } from '../domain/insights';
import { CURRENCY_CODES, fromBdtMinor, parseAmount, parseRate, parseScaled, rateToString, toBdtMinor, type CurrencyCode } from '../domain/money';
import { addMonths, toDateString } from '../domain/summary';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { GroupedBars } from '../ui/charts';
import { Card, Chip, Chips, Divider, Field, Notice, Row, Screen, Txt } from '../ui/components';
import { usePalette } from '../ui/theme';

const YEARS = [1, 3, 5, 10];

export default function ToolsScreen() {
  const p = usePalette();
  const { t, money, num, month } = useT();
  const s = useApp((st) => st.data.settings);
  const base = s.baseCurrency;
  const today = toDateString(new Date());

  // --- Future savings simulator
  const [monthly, setMonthly] = useState('500');
  const [years, setYears] = useState(5);
  const [profit, setProfit] = useState('');
  const [start, setStart] = useState('');
  const monthlyMinor = parseAmount(monthly, base);
  const startMinor = start.trim() === '' ? 0 : parseAmount(start, base);
  const profitBp = profit.trim() === '' ? 0 : parseScaled(profit, 2);
  const points = useMemo(
    () => (monthlyMinor !== null && startMinor !== null && profitBp !== null && profitBp <= 5000 ? projectSavings(monthlyMinor, 10, profitBp, startMinor) : []),
    [monthlyMinor, startMinor, profitBp],
  );
  const chosen = points.find((x) => x.year === years);

  // --- Currency converter
  const [cur, setCur] = useState<CurrencyCode>(base);
  const [amount, setAmount] = useState('1000');
  const [rate, setRate] = useState(s.baseRateMicro > 0 ? rateToString(s.baseRateMicro) : '');
  const [reverse, setReverse] = useState(false);
  const rateMicro = parseRate(rate);
  const convMinor = parseAmount(amount, reverse ? 'BDT' : cur);
  const converted = convMinor !== null && rateMicro !== null ? (reverse ? fromBdtMinor(convMinor, cur, rateMicro) : toBdtMinor(convMinor, cur, rateMicro)) : null;

  // --- Remittance calculator
  const [send, setSend] = useState('1500');
  const [fee, setFee] = useState('15');
  const sendMinor = parseAmount(send, base);
  const feeMinor = fee.trim() === '' ? 0 : parseAmount(fee, base);
  const baseRate = parseRate(rate);
  const received = sendMinor !== null && baseRate !== null && cur === base ? toBdtMinor(sendMinor, base, baseRate) : null;

  // --- Debt payoff
  const [owed, setOwed] = useState('');
  const [pay, setPay] = useState('');
  const owedMinor = parseAmount(owed, base);
  const payMinor = parseAmount(pay, base);
  const months = owedMinor !== null && payMinor !== null ? monthsToRepay(owedMinor, payMinor) : null;

  return (
    <Screen edges={['bottom']}>
      <Card>
        <Txt v="h2">{t('tools.sim.title')}</Txt>
        <Txt v="small" color={p.sub}>{t('tools.sim.body')}</Txt>
        <Field label={t('tools.sim.monthly', { cur: base })} value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" testID="sim-monthly" error={monthlyMinor === null ? t('entry.err.amount') : null} />
        <Chips>
          {['500', '1000', '1500', '2000'].map((v) => (
            <Chip key={v} label={num(v)} active={monthly === v} onPress={() => setMonthly(v)} />
          ))}
        </Chips>
        <Field label={t('tools.sim.start', { cur: base })} value={start} onChangeText={setStart} keyboardType="decimal-pad" placeholder={num('0')} error={startMinor === null ? t('entry.err.amount') : null} />
        <Field label={t('tools.sim.profit')} value={profit} onChangeText={setProfit} keyboardType="decimal-pad" placeholder={num('0')} hint={t('tools.sim.profitHint')} error={profitBp === null || (profitBp ?? 0) > 5000 ? t('tools.sim.profitError') : null} />
        <Chips>
          {YEARS.map((y) => (
            <Chip key={y} label={t('tools.sim.years', { n: y })} active={y === years} onPress={() => setYears(y)} />
          ))}
        </Chips>
        {chosen ? (
          <>
            <View style={{ backgroundColor: p.tint, borderRadius: 16, padding: 16, gap: 2 }}>
              <Txt v="small" color={p.sub}>{t('tools.sim.result', { n: years })}</Txt>
              <Txt v="title" color={p.primary} testID="sim-result">{money(chosen.valueMinor, base)}</Txt>
              {s.baseRateMicro > 0 ? <Txt v="small" color={p.sub}>≈ {money(toBdtMinor(chosen.valueMinor, base, s.baseRateMicro), 'BDT', { compact: true })} ({t('tools.sim.atTodayRate')})</Txt> : null}
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt color={p.sub}>{t('tools.sim.deposited')}</Txt>
              <Txt v="label">{money(chosen.depositedMinor, base)}</Txt>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt color={p.sub}>{t('tools.sim.growth')}</Txt>
              <Txt v="label">{money(chosen.valueMinor - chosen.depositedMinor, base)}</Txt>
            </Row>
            <GroupedBars
              height={150}
              series={[{ label: t('tools.sim.valueSeries', { cur: base }), color: p.series[0] }]}
              groups={points.filter((x) => YEARS.includes(x.year)).map((x) => ({
                label: t('tools.sim.years', { n: x.year }),
                values: [x.valueMinor],
                display: [money(x.valueMinor, base)],
              }))}
            />
            <Txt v="small" color={p.sub}>{t('tools.sim.formula')}</Txt>
          </>
        ) : null}
        <Notice tone="warn" text={t('tools.sim.disclaimer')} />
      </Card>

      <Card>
        <Txt v="h2">{t('tools.conv.title')}</Txt>
        <Chips>
          {CURRENCY_CODES.filter((c) => c !== 'BDT').map((c) => (
            <Chip key={c} label={c} active={c === cur} onPress={() => { setCur(c); setRate(c === base && s.baseRateMicro > 0 ? rateToString(s.baseRateMicro) : ''); }} />
          ))}
        </Chips>
        <Row>
          <Chip label={`${cur} → BDT`} active={!reverse} onPress={() => setReverse(false)} />
          <Chip label={`BDT → ${cur}`} active={reverse} onPress={() => setReverse(true)} />
        </Row>
        <Field label={`${t('entry.amount')} (${reverse ? 'BDT' : cur})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={convMinor === null ? t('entry.err.amount') : null} />
        <Field label={t('entry.rateLabel', { cur })} value={rate} onChangeText={setRate} keyboardType="decimal-pad" error={rate !== '' && rateMicro === null ? t('entry.err.rate') : null} hint={t('tools.conv.rateHint')} />
        {converted !== null ? (
          <Txt v="title" color={p.primary} testID="conv-result">= {money(converted, reverse ? cur : 'BDT')}</Txt>
        ) : null}
        <Txt v="small" color={p.sub}>{t(reverse ? 'tools.conv.formulaRev' : 'tools.conv.formula')}</Txt>
      </Card>

      {cur === base ? (
        <Card>
          <Txt v="h2">{t('tools.remit.title')}</Txt>
          <Field label={t('tools.remit.send', { cur: base })} value={send} onChangeText={setSend} keyboardType="decimal-pad" error={sendMinor === null ? t('entry.err.amount') : null} />
          <Field label={t('entry.fee', { cur: base })} value={fee} onChangeText={setFee} keyboardType="decimal-pad" error={feeMinor === null ? t('entry.err.fee') : null} />
          {received !== null && sendMinor !== null && feeMinor !== null ? (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt color={p.sub}>{t('tools.remit.received')}</Txt>
                <Txt v="label">{money(received, 'BDT')}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt color={p.sub}>{t('tools.remit.cost')}</Txt>
                <Txt v="label">{money(sendMinor + feeMinor, base)}</Txt>
              </Row>
              <Divider />
              <Txt v="small" color={p.sub}>{t('tools.remit.formula')}</Txt>
            </>
          ) : (
            <Txt v="small" color={p.muted}>{t('tools.remit.needRate')}</Txt>
          )}
        </Card>
      ) : null}

      <Card>
        <Txt v="h2">{t('tools.debt.title')}</Txt>
        <Field label={t('tools.debt.owed', { cur: base })} value={owed} onChangeText={setOwed} keyboardType="decimal-pad" placeholder={num('0')} />
        <Field label={t('tools.debt.pay', { cur: base })} value={pay} onChangeText={setPay} keyboardType="decimal-pad" placeholder={num('0')} />
        {months !== null ? (
          <Txt v="label" color={p.primary}>{t('tools.debt.result', { n: months, month: month(addMonths(today.slice(0, 7), months)) })}</Txt>
        ) : null}
        <Txt v="small" color={p.sub}>{t('tools.debt.formula')}</Txt>
      </Card>
    </Screen>
  );
}
