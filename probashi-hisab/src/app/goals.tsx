import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { parseAmount, type CurrencyCode } from '../domain/money';
import { addMonths, goalStatus, toDateString } from '../domain/summary';
import { useT, type TKey } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Card, Chip, Empty, Field, IconBadge, ProgressBar, Row, Screen, Txt, type IconName } from '../ui/components';
import { confirm } from '../ui/platform';
import { RADIUS, SPACE, usePalette } from '../ui/theme';

const PRESETS: { key: TKey; icon: IconName }[] = [
  { key: 'goals.preset.emergency', icon: 'shield-checkmark-outline' },
  { key: 'goals.preset.house', icon: 'construct-outline' },
  { key: 'goals.preset.land', icon: 'map-outline' },
  { key: 'goals.preset.vehicle', icon: 'car-outline' },
  { key: 'goals.preset.family', icon: 'people-outline' },
  { key: 'goals.preset.deposit', icon: 'business-outline' },
];

export default function GoalsScreen() {
  const p = usePalette();
  const router = useRouter();
  const { t, money, pct, month, num } = useT();
  const data = useApp((s) => s.data);
  const saveGoal = useApp((s) => s.saveGoal);
  const deleteGoal = useApp((s) => s.deleteGoal);
  const s = data.settings;
  const today = toDateString(new Date());

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('wallet-outline');
  const [currency, setCurrency] = useState<CurrencyCode>(s.baseCurrency);
  const [target, setTarget] = useState('');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState<string | null>(null);

  const statuses = useMemo(() => data.goals.map((g) => goalStatus(g, data.txs, today)), [data.goals, data.txs, today]);

  async function onAdd() {
    setError(null);
    const targetMinor = parseAmount(target, currency);
    const openingMinor = opening.trim() === '' ? 0 : parseAmount(opening, currency);
    if (!name.trim()) return setError(t('goals.errName'));
    if (!targetMinor || openingMinor === null) return setError(t('entry.err.amount'));
    await saveGoal({ name: name.trim(), icon, currency, targetMinor, openingMinor, targetDate: null });
    setOpen(false);
    setName('');
    setTarget('');
    setOpening('');
  }

  return (
    <Screen edges={['bottom']}>
      <Txt color={p.sub}>{t('goals.intro')}</Txt>

      {open ? (
        <Card>
          <Txt v="h2">{t('goals.new')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {PRESETS.map((x) => (
              <Chip key={x.key} label={t(x.key)} icon={x.icon} active={name === t(x.key)} onPress={() => { setName(t(x.key)); setIcon(x.icon); }} />
            ))}
          </View>
          <Field label={t('goals.name')} value={name} onChangeText={setName} maxLength={40} testID="goal-name" />
          <Row>
            <Chip label={s.baseCurrency} active={currency === s.baseCurrency} onPress={() => setCurrency(s.baseCurrency)} />
            <Chip label="BDT" active={currency === 'BDT'} onPress={() => setCurrency('BDT')} />
          </Row>
          <Field label={`${t('goals.target')} (${currency})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={num('0')} testID="goal-target" />
          <Field label={`${t('goals.opening')} (${currency})`} value={opening} onChangeText={setOpening} keyboardType="decimal-pad" placeholder={num('0')} hint={t('goals.openingHint')} />
          {error ? <Txt color={p.bad}>{error}</Txt> : null}
          <Row>
            <Button style={{ flex: 1 }} title={t('common.save')} icon="checkmark" onPress={onAdd} />
            <Button title={t('common.cancel')} kind="ghost" onPress={() => setOpen(false)} />
          </Row>
        </Card>
      ) : (
        <Button title={t('goals.new')} icon="add" onPress={() => setOpen(true)} />
      )}

      {statuses.length === 0 && !open ? <Card><Empty icon="wallet-outline" title={t('goals.emptyTitle')} body={t('goals.emptyBody')} /></Card> : null}

      {statuses.map((g) => (
        <Card key={g.goal.id}>
          <Row style={{ gap: SPACE.md }}>
            <IconBadge name={g.goal.icon as IconName} color={p.primary} bg={p.tint} size={44} />
            <View style={{ flex: 1 }}>
              <Txt v="h2">{g.goal.name}</Txt>
              <Txt v="small" color={p.muted}>{t('goals.targetLine', { target: money(g.goal.targetMinor, g.goal.currency, { compact: true }) })}</Txt>
            </View>
            <Txt v="title" color={p.primary}>{pct(g.progressBp)}</Txt>
          </Row>
          <ProgressBar bp={g.progressBp} height={10} />
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Txt v="small" color={p.sub}>{t('goals.savedLabel')}</Txt>
              <Txt v="num">{money(g.savedMinor, g.goal.currency)}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="small" color={p.sub}>{t('goals.remainingLabel')}</Txt>
              <Txt v="num">{money(g.remainingMinor, g.goal.currency)}</Txt>
            </View>
          </Row>
          <Txt v="small" color={p.sub}>
            {g.remainingMinor === 0
              ? t('goals.done')
              : g.monthsLeft === null
                ? t('goals.noPace')
                : t('goals.eta', { pace: money(g.monthlyPaceMinor, g.goal.currency, { compact: true }), month: month(addMonths(today.slice(0, 7), g.monthsLeft)) })}
          </Txt>
          <Row>
            <Button style={{ flex: 1 }} title={t('goals.deposit')} icon="add" onPress={() => router.push(`/entry?kind=goal_deposit&goalId=${g.goal.id}` as never)} />
            <Button title={t('goals.withdraw')} kind="ghost" onPress={() => router.push(`/entry?kind=goal_withdraw&goalId=${g.goal.id}` as never)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
              hitSlop={8}
              onPress={async () => {
                if (await confirm(t('goals.deleteTitle'), t('goals.deleteBody', { name: g.goal.name }), t('common.delete'), t('common.cancel'))) await deleteGoal(g.goal.id);
              }}
              style={{ width: 52, height: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: p.bad, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="trash-outline" size={20} color={p.bad} />
            </Pressable>
          </Row>
        </Card>
      ))}
      <Txt v="small" color={p.muted}>{t('goals.etaNote')}</Txt>
    </Screen>
  );
}
