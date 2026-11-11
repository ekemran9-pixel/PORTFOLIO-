import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { parseAmount, rateToString, type CurrencyCode } from '../domain/money';
import { balances, debtStatus, toDateString } from '../domain/summary';
import { isValidDate } from '../domain/txBuilder';
import type { DebtDirection, Wallet } from '../domain/types';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Card, Chip, Empty, Field, ProgressBar, Row, Screen, SectionTitle, Txt } from '../ui/components';
import { confirm } from '../ui/platform';
import { SPACE, usePalette } from '../ui/theme';

export default function DebtsScreen() {
  const p = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string }>();
  const { t, money, amt, date, num } = useT();
  const data = useApp((s) => s.data);
  const addDebt = useApp((s) => s.addDebt);
  const deleteDebt = useApp((s) => s.deleteDebt);
  const s = data.settings;
  const today = toDateString(new Date());

  const [open, setOpen] = useState(params.new === '1');
  const [direction, setDirection] = useState<DebtDirection>('lent');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState<Wallet>('abroad');
  const [when, setWhen] = useState(today);
  const [due, setDue] = useState('');
  const [monthly, setMonthly] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currency: CurrencyCode = wallet === 'home' ? 'BDT' : s.baseCurrency;

  const statuses = useMemo(() => data.debts.map((d) => debtStatus(d, data.txs)), [data.debts, data.txs]);
  const bal = useMemo(() => balances(data), [data]);
  const active = statuses.filter((x) => !x.settled);
  const settled = statuses.filter((x) => x.settled);

  async function onAdd() {
    setError(null);
    if (!person.trim()) return setError(t('entry.err.person'));
    if (due && !isValidDate(due)) return setError(t('entry.err.date'));
    const monthlyMinor = monthly.trim() === '' ? 0 : parseAmount(monthly, currency);
    if (monthlyMinor === null) return setError(t('entry.err.amount'));
    setBusy(true);
    const res = await addDebt(
      { direction, person: person.trim(), wallet, currency, dueDate: due || null, monthlyMinor, note: note.trim() || null },
      { amount, date: when, rate: s.baseRateMicro > 0 ? rateToString(s.baseRateMicro) : undefined, note },
    );
    setBusy(false);
    if (!res.ok) return setError(t(`entry.err.${res.error}`));
    setOpen(false);
    setPerson('');
    setAmount('');
    setDue('');
    setMonthly('');
    setNote('');
  }

  const renderDebt = (st: (typeof statuses)[number]) => {
    const d = st.debt;
    const lent = d.direction === 'lent';
    const overdue = !st.settled && d.dueDate !== null && d.dueDate < today;
    return (
      <Card key={d.id}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt v="h2">{d.person}</Txt>
            <Txt v="small" color={p.muted}>
              {t(lent ? 'debts.iLent' : 'debts.iBorrowed')} · {t(d.wallet === 'home' ? 'debts.inHome' : 'debts.inAbroad')}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="num" color={st.settled ? p.muted : lent ? p.income : p.expense}>{money(st.outstandingMinor, d.currency)}</Txt>
            <Txt v="small" color={p.muted}>{t(st.settled ? 'debts.settled' : 'debts.left')}</Txt>
          </View>
        </Row>
        <ProgressBar bp={st.principalMinor > 0 ? (st.paidMinor / st.principalMinor) * 10000 : 0} color={lent ? p.income : p.remit} />
        <Txt v="small" color={p.sub}>
          {t('debts.progress', { paid: money(st.paidMinor, d.currency), total: money(st.principalMinor, d.currency) })}
        </Txt>
        {d.dueDate ? <Txt v="small" color={overdue ? p.bad : p.sub}>{t(overdue ? 'debts.overdue' : 'debts.due', { date: date(d.dueDate) })}</Txt> : null}
        {!st.settled && st.monthsLeft !== null ? (
          <Txt v="small" color={p.sub}>{t('debts.months', { n: st.monthsLeft, m: money(d.monthlyMinor, d.currency) })}</Txt>
        ) : null}
        {d.note ? <Txt v="small" color={p.muted}>{d.note}</Txt> : null}
        <Row>
          {!st.settled ? (
            <Button
              style={{ flex: 1 }}
              title={t(lent ? 'debts.gotBack' : 'debts.payBack')}
              icon={lent ? 'return-down-back-outline' : 'checkmark-done-outline'}
              onPress={() => router.push(`/entry?kind=${lent ? 'debt_collected' : 'debt_repaid'}&debtId=${d.id}` as never)}
            />
          ) : null}
          <Button
            title={t(lent ? 'debts.more' : 'debts.moreBorrow')}
            kind="ghost"
            onPress={() => router.push(`/entry?kind=${lent ? 'debt_given' : 'debt_taken'}&debtId=${d.id}` as never)}
          />
          <Button
            title=""
            icon="trash-outline"
            kind="danger"
            onPress={async () => {
              if (await confirm(t('debts.deleteTitle'), t('debts.deleteBody', { name: d.person }), t('common.delete'), t('common.cancel'))) await deleteDebt(d.id);
            }}
          />
        </Row>
      </Card>
    );
  };

  return (
    <Screen edges={['bottom']}>
      <Row style={{ gap: SPACE.md }}>
        <Card style={{ flex: 1 }}>
          <Txt v="small" color={p.sub}>{t('debts.receivable')}</Txt>
          <Txt v="num" color={p.income} numberOfLines={1} adjustsFontSizeToFit>{amt(bal.receivable)}</Txt>
        </Card>
        <Card style={{ flex: 1 }}>
          <Txt v="small" color={p.sub}>{t('debts.payable')}</Txt>
          <Txt v="num" color={bal.payable.bdt > 0 ? p.expense : p.text} numberOfLines={1} adjustsFontSizeToFit>{amt(bal.payable)}</Txt>
        </Card>
      </Row>
      <Txt v="small" color={p.muted}>{t('debts.note')}</Txt>

      {open ? (
        <Card>
          <Txt v="h2">{t('debts.new')}</Txt>
          <Row>
            <Chip label={t('debts.iLent')} active={direction === 'lent'} onPress={() => setDirection('lent')} />
            <Chip label={t('debts.iBorrowed')} active={direction === 'borrowed'} onPress={() => setDirection('borrowed')} />
          </Row>
          <Field label={t(direction === 'lent' ? 'debts.toWhom' : 'debts.fromWhom')} value={person} onChangeText={setPerson} maxLength={60} testID="debt-person" />
          <Row>
            <Chip label={t('debts.inAbroad') + ` (${s.baseCurrency})`} active={wallet === 'abroad'} onPress={() => setWallet('abroad')} />
            <Chip label={t('debts.inHome') + ' (BDT)'} active={wallet === 'home'} onPress={() => setWallet('home')} />
          </Row>
          <Field label={`${t('entry.amount')} (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={num('0.00')} testID="debt-amount" />
          <Field label={t('entry.date')} value={when} onChangeText={setWhen} placeholder="YYYY-MM-DD" maxLength={10} />
          <Field label={t('debts.dueOptional')} value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" maxLength={10} />
          <Field label={t('debts.monthlyOptional', { cur: currency })} value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" placeholder={num('0')} hint={t('debts.monthlyHint')} />
          <Field label={t('entry.note')} value={note} onChangeText={setNote} maxLength={200} />
          {error ? <Txt color={p.bad}>{error}</Txt> : null}
          <Row>
            <Button style={{ flex: 1 }} title={t('common.save')} icon="checkmark" onPress={onAdd} loading={busy} />
            <Button title={t('common.cancel')} kind="ghost" onPress={() => setOpen(false)} />
          </Row>
        </Card>
      ) : (
        <Button title={t('debts.new')} icon="add" onPress={() => setOpen(true)} />
      )}

      {statuses.length === 0 && !open ? <Card><Empty icon="swap-horizontal-outline" title={t('debts.emptyTitle')} body={t('debts.emptyBody')} /></Card> : null}
      {active.map(renderDebt)}
      {settled.length > 0 ? <SectionTitle title={t('debts.settledTitle')} /> : null}
      {settled.map(renderDebt)}
    </Screen>
  );
}
