import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PAYMENT_METHODS_ABROAD, PAYMENT_METHODS_HOME, TRANSFER_METHODS } from '../domain/categories';
import {
  CURRENCY_CODES,
  formatMoney,
  fromBdtMinor,
  minorToDecimalString,
  parseAmount,
  parseRate,
  rateToString,
  toBdtMinor,
  type CurrencyCode,
} from '../domain/money';
import { addMonths, toDateString } from '../domain/summary';
import { TX_KINDS, isValidDate, type TxError } from '../domain/txBuilder';
import type { CategoryScope, TxKind, Wallet } from '../domain/types';
import { useT, type TKey } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Chip, Chips, Field, Row, Screen, Txt } from '../ui/components';
import { kindLabelKey } from '../ui/kinds';
import { confirm } from '../ui/platform';
import { FONT, RADIUS, SPACE, usePalette } from '../ui/theme';

const ERROR_KEY: Record<TxError | 'storage', TKey> = {
  invalid: 'entry.err.invalid',
  amount: 'entry.err.amount',
  rate: 'entry.err.rate',
  fee: 'entry.err.fee',
  date: 'entry.err.date',
  category: 'entry.err.category',
  person: 'entry.err.person',
  storage: 'entry.err.storage',
};

function shiftDay(date: string, by: number): string {
  if (!isValidDate(date)) return date;
  const [y, m, d] = date.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + by));
}

export default function EntryScreen() {
  const params = useLocalSearchParams<{ kind?: string; wallet?: string; id?: string; debtId?: string; goalId?: string }>();
  const router = useRouter();
  const p = usePalette();
  const { t, lang, cat, num, date: fmtDate } = useT();
  const data = useApp((s) => s.data);
  const saveTx = useApp((s) => s.saveTx);
  const deleteTx = useApp((s) => s.deleteTx);
  const addCategory = useApp((s) => s.addCategory);
  const settings = data.settings;
  const base = settings.baseCurrency;

  const editing = useMemo(() => data.txs.find((x) => x.id === params.id), [data.txs, params.id]);
  const kind: TxKind = editing?.kind ?? ((TX_KINDS as readonly string[]).includes(params.kind ?? '') ? (params.kind as TxKind) : 'expense');
  const debt = data.debts.find((d) => d.id === (editing?.debtId ?? params.debtId));
  const goal = data.goals.find((g) => g.id === (editing?.goalId ?? params.goalId));
  const wallet: Wallet = editing?.wallet ?? debt?.wallet ?? (params.wallet === 'home' ? 'home' : 'abroad');
  const lockedCurrency = debt?.currency ?? goal?.currency ?? null;
  const today = toDateString(new Date());

  const [amount, setAmount] = useState(editing ? minorToDecimalString(editing.amountMinor, editing.currency) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(
    editing?.currency ?? lockedCurrency ?? (wallet === 'home' ? 'BDT' : base),
  );
  const initialRate = () => {
    if (editing) {
      if (editing.currency !== 'BDT') return rateToString(editing.rateMicro);
      // Recover the earning-currency rate that was used for a BDT entry.
      if (editing.baseMinor > 0 && editing.baseCurrency !== 'BDT') {
        const micro = Math.round((editing.bdtMinor / editing.baseMinor) * 1_000_000);
        return rateToString(Math.round(micro / 100) * 100);
      }
    }
    return settings.baseRateMicro > 0 ? rateToString(settings.baseRateMicro) : '';
  };
  const [rate, setRate] = useState(initialRate);
  const [date, setDate] = useState(editing?.date ?? today);
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [person, setPerson] = useState(editing?.person ?? debt?.person ?? '');
  const [method, setMethod] = useState(editing?.method ?? '');
  const [fee, setFee] = useState(editing && editing.feeBaseMinor > 0 ? minorToDecimalString(editing.feeBaseMinor, editing.baseCurrency) : '');
  const [reference, setReference] = useState(editing?.reference ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<TxError | 'storage' | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);

  const scope: CategoryScope | null =
    kind === 'income' ? 'income' : kind === 'remittance' ? 'remittance' : kind === 'expense' ? (wallet === 'home' ? 'expense_home' : 'expense_abroad') : null;
  // Money received at home has no category list of its own; reuse "other income".
  const categories = useMemo(
    () => (scope ? data.categories.filter((c) => c.scope === scope) : []),
    [data.categories, scope],
  );

  // Which currency the rate field describes.
  const rateCurrency: CurrencyCode | null = currency !== 'BDT' ? currency : base !== 'BDT' ? base : null;
  const amountMinor = parseAmount(amount, currency);
  const rateMicro = parseRate(rate);
  let preview: string | null = null;
  if (amountMinor && rateMicro && rateCurrency) {
    preview =
      currency === 'BDT'
        ? formatMoney(fromBdtMinor(amountMinor, base, rateMicro), base, { bnDigits: lang === 'bn' && settings.bnDigits })
        : formatMoney(toBdtMinor(amountMinor, currency, rateMicro), 'BDT', { bnDigits: lang === 'bn' && settings.bnDigits });
  }

  const methods = kind === 'remittance' ? TRANSFER_METHODS : wallet === 'home' ? PAYMENT_METHODS_HOME : PAYMENT_METHODS_ABROAD;
  const knownPeople = [
    ...new Set(
      data.txs
        .filter((x) => x.person && (kind === 'remittance' ? x.kind === 'remittance' : x.wallet === wallet))
        .map((x) => x.person as string),
    ),
  ].slice(0, 8);

  const currencyChoices: CurrencyCode[] = lockedCurrency
    ? [lockedCurrency]
    : showAllCurrencies
      ? CURRENCY_CODES
      : [...new Set<CurrencyCode>([base, 'BDT', currency])];

  const titleKey: TKey = editing ? 'entry.edit' : kindLabelKey({ kind, wallet });
  const personLabel: TKey = kind === 'remittance' ? 'entry.recipient' : wallet === 'home' && kind === 'expense' ? 'entry.spentBy' : 'entry.person';
  const showPerson = kind === 'remittance' || (wallet === 'home' && (kind === 'expense' || kind === 'income'));

  async function onSave() {
    setSaving(true);
    setError(null);
    const res = await saveTx({
      id: editing?.id,
      createdAt: editing?.createdAt,
      kind,
      wallet,
      date,
      amount,
      currency,
      rate: rateCurrency ? rate : undefined,
      fee: kind === 'remittance' ? fee : undefined,
      categoryId:
        kind === 'income' && wallet === 'home' ? (categoryId ?? 'inc_other') : categoryId,
      person,
      method,
      reference,
      note,
      debtId: debt?.id ?? null,
      goalId: goal?.id ?? null,
    });
    setSaving(false);
    if (res.ok) router.back();
    else setError(res.error);
  }

  async function onDelete() {
    if (!editing) return;
    if (await confirm(t('entry.deleteTitle'), t('entry.deleteBody'), t('common.delete'), t('common.cancel'))) {
      await deleteTx(editing.id);
      router.back();
    }
  }

  async function onAddCategory() {
    const name = (newCat ?? '').trim();
    if (!name || !scope) return;
    const id = await addCategory({
      scope,
      group: scope === 'income' ? 'income' : scope === 'expense_abroad' ? 'personal' : 'family',
      bn: name,
      en: name,
      icon: 'pricetag-outline',
    });
    setCategoryId(id);
    setNewCat(null);
  }

  if (params.id && !editing) {
    return (
      <Screen edges={['bottom']}>
        <Txt color={p.sub}>{t('entry.notFound')}</Txt>
        <Button title={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t(titleKey) }} />

      {debt ? <Txt color={p.sub}>{t(debt.direction === 'lent' ? 'entry.debtLent' : 'entry.debtBorrowed', { name: debt.person })}</Txt> : null}
      {goal ? <Txt color={p.sub}>{t('entry.goalFor', { name: goal.name })}</Txt> : null}
      {kind === 'remittance' ? <Txt color={p.sub}>{t('entry.remitHelp')}</Txt> : null}
      {kind === 'expense' && wallet === 'home' && !settings.trackHome ? (
        <Txt color={p.warn}>{t('entry.homeOffNote')}</Txt>
      ) : null}

      <View style={{ backgroundColor: p.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: error === 'amount' ? p.bad : p.border, padding: SPACE.lg, gap: SPACE.sm }}>
        <Field
          label={t(kind === 'remittance' ? 'entry.amountSent' : 'entry.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={num('0.00')}
          autoFocus={!editing}
          testID="amount"
          style={{ fontSize: 30, fontFamily: FONT.bold }}
          right={<Txt v="h2" color={p.sub}>{currency}</Txt>}
        />
        <Chips>
          {currencyChoices.map((c) => (
            <Chip key={c} label={c} active={c === currency} onPress={() => setCurrency(c)} />
          ))}
          {!lockedCurrency && !showAllCurrencies ? (
            <Chip label={t('entry.moreCurrencies')} icon="add" onPress={() => setShowAllCurrencies(true)} />
          ) : null}
        </Chips>
        {rateCurrency ? (
          <Field
            label={t('entry.rateLabel', { cur: rateCurrency })}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder={num('32.40')}
            testID="rate"
            error={error === 'rate' ? t('entry.err.rate') : null}
            hint={preview ? `= ${preview}` : t('entry.rateHint')}
          />
        ) : null}
      </View>

      {scope ? (
        <View style={{ gap: SPACE.sm }}>
          <Txt v="label" color={error === 'category' ? p.bad : p.sub}>
            {t(kind === 'remittance' ? 'entry.purpose' : 'entry.category')}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={cat(c)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    minHeight: 44,
                    borderRadius: RADIUS.md,
                    borderWidth: 1,
                    borderColor: active ? p.primary : p.border,
                    backgroundColor: active ? p.tint : p.card,
                  }}
                >
                  <Ionicons name={c.icon as never} size={18} color={active ? p.primary : p.sub} />
                  <Txt v="label" color={active ? p.primary : p.text}>{cat(c)}</Txt>
                </Pressable>
              );
            })}
            {scope !== 'remittance' ? (
              <Chip label={t('entry.newCategory')} icon="add" onPress={() => setNewCat(newCat === null ? '' : null)} />
            ) : null}
          </View>
          {newCat !== null ? (
            <Row style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label={t('entry.newCategoryName')} value={newCat} onChangeText={setNewCat} autoFocus maxLength={40} />
              </View>
              <Button title={t('common.add')} onPress={onAddCategory} disabled={!newCat.trim()} />
            </Row>
          ) : null}
          {error === 'category' ? <Txt v="small" color={p.bad}>{t('entry.err.category')}</Txt> : null}
        </View>
      ) : null}

      <View style={{ gap: SPACE.sm }}>
        <Field
          label={t('entry.date')}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          maxLength={10}
          error={error === 'date' ? t('entry.err.date') : null}
          hint={isValidDate(date) ? fmtDate(date) : undefined}
          right={
            <Row>
              <Pressable onPress={() => setDate(shiftDay(date, -1))} hitSlop={8} accessibilityLabel={t('entry.prevDay')} accessibilityRole="button">
                <Ionicons name="chevron-back-circle-outline" size={28} color={p.primary} />
              </Pressable>
              <Pressable onPress={() => setDate(shiftDay(date, 1))} hitSlop={8} accessibilityLabel={t('entry.nextDay')} accessibilityRole="button">
                <Ionicons name="chevron-forward-circle-outline" size={28} color={p.primary} />
              </Pressable>
            </Row>
          }
        />
        <Chips>
          <Chip label={t('entry.today')} active={date === today} onPress={() => setDate(today)} />
          <Chip label={t('entry.yesterday')} active={date === shiftDay(today, -1)} onPress={() => setDate(shiftDay(today, -1))} />
          <Chip label={t('entry.monthStart')} active={date === today.slice(0, 8) + '01'} onPress={() => setDate(today.slice(0, 8) + '01')} />
          <Chip label={t('entry.lastMonth')} onPress={() => setDate(addMonths(today.slice(0, 7), -1) + '-01')} />
        </Chips>
      </View>

      {showPerson ? (
        <View style={{ gap: SPACE.sm }}>
          <Field label={t(personLabel)} value={person} onChangeText={setPerson} maxLength={60} placeholder={t('entry.personPlaceholder')} />
          {knownPeople.length > 0 ? (
            <Chips>
              {knownPeople.map((n) => (
                <Chip key={n} label={n} active={n === person} onPress={() => setPerson(n)} />
              ))}
            </Chips>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: SPACE.sm }}>
        <Txt v="label" color={p.sub}>{t(kind === 'remittance' ? 'entry.transferMethod' : 'entry.method')}</Txt>
        <Chips>
          {methods.map((m) => (
            <Chip key={m.en} label={m[lang]} active={method === m[lang]} onPress={() => setMethod(method === m[lang] ? '' : m[lang])} />
          ))}
        </Chips>
      </View>

      {kind === 'remittance' ? (
        <>
          <Field
            label={t('entry.fee', { cur: base })}
            value={fee}
            onChangeText={setFee}
            keyboardType="decimal-pad"
            placeholder={num('0.00')}
            error={error === 'fee' ? t('entry.err.fee') : null}
            hint={t('entry.feeHint')}
          />
          <Field label={t('entry.reference')} value={reference} onChangeText={setReference} maxLength={60} autoCapitalize="characters" hint={t('entry.referenceHint')} />
        </>
      ) : null}

      <Field label={t('entry.note')} value={note} onChangeText={setNote} maxLength={200} placeholder={t('entry.notePlaceholder')} />

      {error && !['rate', 'date', 'fee', 'category'].includes(error) ? (
        <Txt color={p.bad}>{t(ERROR_KEY[error])}</Txt>
      ) : null}

      <Button title={t(editing ? 'common.saveChanges' : 'common.save')} icon="checkmark" onPress={onSave} loading={saving} />
      {editing ? <Button title={t('common.delete')} kind="danger" icon="trash-outline" onPress={onDelete} /> : null}
    </Screen>
  );
}
