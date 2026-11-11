import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { minorToDecimalString, parseAmount } from '../domain/money';
import { budgetStatus, monthPeriod, inPeriod, toDateString, txAmt } from '../domain/summary';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Card, Field, ProgressBar, Row, Screen, Txt } from '../ui/components';
import { SPACE, usePalette } from '../ui/theme';

export default function BudgetsScreen() {
  const p = usePalette();
  const { t, money, cat, month, pct, num } = useT();
  const data = useApp((s) => s.data);
  const setBudget = useApp((s) => s.setBudget);
  const s = data.settings;
  const ym = toDateString(new Date()).slice(0, 7);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const cats = useMemo(() => data.categories.filter((c) => c.scope === 'expense_abroad'), [data.categories]);
  const limits = useMemo(() => new Map(data.budgets.map((b) => [b.categoryId, b.limitMinor])), [data.budgets]);
  const status = useMemo(() => new Map(budgetStatus(data, ym).map((b) => [b.categoryId, b])), [data, ym]);
  const spent = useMemo(() => {
    const m = new Map<string, number>();
    const period = monthPeriod(ym);
    for (const x of data.txs) {
      if (x.kind === 'expense' && x.wallet === 'abroad' && x.categoryId && inPeriod(x, period)) {
        m.set(x.categoryId, (m.get(x.categoryId) ?? 0) + txAmt(x, s).base);
      }
    }
    return m;
  }, [data.txs, s, ym]);

  const totalLimit = data.budgets.reduce((a, b) => a + b.limitMinor, 0);
  const totalSpent = [...status.values()].reduce((a, b) => a + b.spentMinor, 0);
  const invalid = Object.entries(draft).some(([, v]) => v.trim() !== '' && parseAmount(v, s.baseCurrency) === null);

  async function onSave() {
    for (const [categoryId, v] of Object.entries(draft)) {
      const limitMinor = v.trim() === '' ? 0 : parseAmount(v, s.baseCurrency);
      if (limitMinor === null) continue;
      await setBudget({ categoryId, limitMinor, currency: s.baseCurrency });
    }
    setDraft({});
    setSaved(true);
  }

  return (
    <Screen edges={['bottom']}>
      <Txt color={p.sub}>{t('budgets.intro', { month: month(ym), cur: s.baseCurrency })}</Txt>
      {totalLimit > 0 ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="label">{t('budgets.total')}</Txt>
            <Txt v="label" color={totalSpent > totalLimit ? p.bad : p.text}>{money(totalSpent, s.baseCurrency)} / {money(totalLimit, s.baseCurrency, { compact: true })}</Txt>
          </Row>
          <ProgressBar bp={(totalSpent / totalLimit) * 10000} color={totalSpent > totalLimit ? p.bad : p.good} />
          <Txt v="small" color={p.muted}>{t('budgets.left', { v: money(Math.max(0, totalLimit - totalSpent), s.baseCurrency) })}</Txt>
        </Card>
      ) : null}

      <Card style={{ gap: SPACE.lg }}>
        {cats.map((c) => {
          const st = status.get(c.id);
          const limit = limits.get(c.id) ?? 0;
          const value = draft[c.id] ?? (limit > 0 ? minorToDecimalString(limit, s.baseCurrency) : '');
          return (
            <View key={c.id} style={{ gap: 6 }}>
              <Field
                label={cat(c)}
                value={value}
                onChangeText={(v) => { setDraft({ ...draft, [c.id]: v }); setSaved(false); }}
                keyboardType="decimal-pad"
                placeholder={t('budgets.noLimit')}
                error={value.trim() !== '' && parseAmount(value, s.baseCurrency) === null ? t('entry.err.amount') : null}
                hint={t('budgets.spent', { v: money(spent.get(c.id) ?? 0, s.baseCurrency) })}
                right={<Txt v="small" color={p.muted}>{s.baseCurrency}</Txt>}
              />
              {st ? (
                <>
                  <ProgressBar bp={st.usedBp} color={st.over ? p.bad : st.usedBp >= 8000 ? p.warn : p.good} height={6} />
                  <Txt v="small" color={st.over ? p.bad : p.muted}>{st.over ? t('budgets.over') : t('budgets.used', { pct: pct(st.usedBp) })}</Txt>
                </>
              ) : null}
            </View>
          );
        })}
      </Card>
      <Button title={t(saved ? 'common.saved' : 'common.save')} icon="checkmark" onPress={onSave} disabled={invalid || Object.keys(draft).length === 0} />
      <Txt v="small" color={p.muted}>{t('budgets.note', { n: num(cats.length) })}</Txt>
    </Screen>
  );
}
