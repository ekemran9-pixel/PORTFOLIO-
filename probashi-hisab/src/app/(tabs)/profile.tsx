import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Switch, View } from 'react-native';

import { txsToCsv } from '../../domain/csv';
import { COUNTRIES, CURRENCY_CODES, minorToDecimalString, parseAmount, parseRate, rateToString } from '../../domain/money';
import { toDateString } from '../../domain/summary';
import { useT } from '../../i18n';
import { useApp } from '../../store/useApp';
import { Button, Card, Chip, Chips, Divider, Field, ListItem, Row, Screen, SectionTitle, Txt } from '../../ui/components';
import { confirm, exportText } from '../../ui/platform';
import { usePalette } from '../../ui/theme';

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <Row style={{ justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt v="label">{label}</Txt>
        {hint ? <Txt v="small" color={p.muted}>{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: p.primary, false: p.border }} accessibilityLabel={label} />
    </Row>
  );
}

export default function ProfileScreen() {
  const p = usePalette();
  const router = useRouter();
  const { t, lang, date, num } = useT();
  const data = useApp((s) => s.data);
  const saveSettings = useApp((s) => s.saveSettings);
  const wipe = useApp((s) => s.wipe);
  const s = data.settings;
  const today = toDateString(new Date());

  const [rate, setRate] = useState(s.baseRateMicro > 0 ? rateToString(s.baseRateMicro) : '');
  const [salary, setSalary] = useState(s.salaryMinor > 0 ? minorToDecimalString(s.salaryMinor, s.baseCurrency) : '');
  const [target, setTarget] = useState(s.savingsTargetMinor > 0 ? minorToDecimalString(s.savingsTargetMinor, s.baseCurrency) : '');
  const [saved, setSaved] = useState(false);
  const [showCurrencies, setShowCurrencies] = useState(false);

  const rateMicro = parseRate(rate);
  const salaryMinor = salary.trim() === '' ? 0 : parseAmount(salary, s.baseCurrency);
  const targetMinor = target.trim() === '' ? 0 : parseAmount(target, s.baseCurrency);
  const valid = rateMicro !== null && salaryMinor !== null && targetMinor !== null;

  async function saveNumbers() {
    if (!valid) return;
    await saveSettings({
      baseRateMicro: rateMicro!,
      baseRateDate: rateMicro !== s.baseRateMicro ? today : s.baseRateDate,
      salaryMinor: salaryMinor!,
      savingsTargetMinor: targetMinor!,
    });
    setSaved(true);
  }

  async function onWipe() {
    if (await confirm(t('profile.wipeTitle'), t('profile.wipeBody'), t('profile.wipeOk'), t('common.cancel'))) {
      await wipe();
      router.replace('/onboarding' as never);
    }
  }

  return (
    <Screen>
      <Txt v="title">{t('profile.title')}</Txt>

      {s.demo ? (
        <Card style={{ borderColor: p.primary, backgroundColor: p.tint }}>
          <Txt v="h2">{t('demo.title')}</Txt>
          <Txt color={p.sub}>{t('demo.exitBody')}</Txt>
          <Button title={t('demo.exit')} icon="exit-outline" onPress={async () => { await wipe(); router.replace('/onboarding' as never); }} />
        </Card>
      ) : null}

      <SectionTitle title={t('profile.modules')} />
      <Card style={{ gap: 0 }}>
        <ListItem icon="flag-outline" title={t('home.title')} subtitle={t('home.menuHint')} onPress={() => router.push('/home-account' as never)} />
        <ListItem icon="swap-horizontal-outline" title={t('debts.title')} subtitle={t('debts.menuHint')} onPress={() => router.push('/debts' as never)} />
        <ListItem icon="wallet-outline" title={t('goals.title')} subtitle={t('goals.menuHint')} onPress={() => router.push('/goals' as never)} />
        <ListItem icon="pie-chart-outline" title={t('budgets.title')} subtitle={t('budgets.menuHint')} onPress={() => router.push('/budgets' as never)} />
        <ListItem icon="calculator-outline" title={t('tools.title')} subtitle={t('tools.menuHint')} onPress={() => router.push('/tools' as never)} />
      </Card>

      <SectionTitle title={t('profile.money')} />
      <Card>
        <Txt v="label" color={p.sub}>{t('onb.country')}</Txt>
        <Chips>
          {COUNTRIES.map((c) => (
            <Chip key={c.code} label={c[lang]} active={c.code === s.country} onPress={() => saveSettings({ country: c.code })} />
          ))}
        </Chips>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label" color={p.sub}>{t('onb.currency')}: {s.baseCurrency}</Txt>
          <Txt v="label" color={p.primary} onPress={() => setShowCurrencies(!showCurrencies)} accessibilityRole="button">{t('common.change')}</Txt>
        </Row>
        {showCurrencies ? (
          <>
            <Chips>
              {CURRENCY_CODES.filter((c) => c !== 'BDT').map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={c === s.baseCurrency}
                  onPress={() => {
                    if (c === s.baseCurrency) return;
                    // A new earning currency needs its own rate, salary and target.
                    saveSettings({ baseCurrency: c, baseRateMicro: 0, baseRateDate: '', salaryMinor: 0, savingsTargetMinor: 0 });
                    setRate('');
                    setSalary('');
                    setTarget('');
                  }}
                />
              ))}
            </Chips>
            <Txt v="small" color={p.muted}>{t('profile.currencyNote')}</Txt>
          </>
        ) : null}
        <Field
          label={t('entry.rateLabel', { cur: s.baseCurrency })}
          value={rate}
          onChangeText={(v) => { setRate(v); setSaved(false); }}
          keyboardType="decimal-pad"
          error={rate !== '' && rateMicro === null ? t('entry.err.rate') : null}
          hint={s.baseRateDate ? t('profile.rateDate', { date: date(s.baseRateDate) }) : t('profile.rateMissing')}
        />
        <Field label={t('onb.salary', { cur: s.baseCurrency })} value={salary} onChangeText={(v) => { setSalary(v); setSaved(false); }} keyboardType="decimal-pad" placeholder={num('0')} error={salaryMinor === null ? t('entry.err.amount') : null} />
        <Field label={t('onb.target', { cur: s.baseCurrency })} value={target} onChangeText={(v) => { setTarget(v); setSaved(false); }} keyboardType="decimal-pad" placeholder={num('0')} error={targetMinor === null ? t('entry.err.amount') : null} />
        <Button title={t(saved ? 'common.saved' : 'common.save')} icon={saved ? 'checkmark-circle' : 'checkmark'} onPress={saveNumbers} disabled={!valid} />
        <Txt v="small" color={p.muted}>{t('profile.rateNote')}</Txt>
        <Divider />
        <Toggle label={t('profile.trackHome')} hint={t('profile.trackHomeHint')} value={s.trackHome} onChange={(v) => saveSettings({ trackHome: v })} />
        <Toggle label={t('profile.showInBdt')} hint={t('profile.showInBdtHint')} value={s.showInBdt} onChange={(v) => saveSettings({ showInBdt: v })} />
      </Card>

      <SectionTitle title={t('profile.appearance')} />
      <Card>
        <Txt v="label" color={p.sub}>{t('onb.language')}</Txt>
        <Chips>
          <Chip label="বাংলা" active={lang === 'bn'} onPress={() => saveSettings({ language: 'bn' })} />
          <Chip label="English" active={lang === 'en'} onPress={() => saveSettings({ language: 'en' })} />
        </Chips>
        {lang === 'bn' ? <Toggle label={t('profile.bnDigits')} hint={t('profile.bnDigitsHint')} value={s.bnDigits} onChange={(v) => saveSettings({ bnDigits: v })} /> : null}
        <Txt v="label" color={p.sub}>{t('profile.theme')}</Txt>
        <Chips>
          {(['system', 'light', 'dark'] as const).map((k) => (
            <Chip key={k} label={t(`profile.theme.${k}`)} active={s.theme === k} onPress={() => saveSettings({ theme: k })} />
          ))}
        </Chips>
      </Card>

      <SectionTitle title={t('profile.data')} />
      <Card>
        <Txt color={p.sub}>{t('profile.dataNote')}</Txt>
        <Button
          title={t('profile.exportAll', { n: data.txs.length })}
          icon="download-outline"
          kind="ghost"
          disabled={data.txs.length === 0}
          onPress={() => exportText(`probashi-hisab-${today}.csv`, txsToCsv(data.txs, data.categories, lang))}
        />
        <Button title={t('profile.wipe')} icon="trash-outline" kind="danger" onPress={onWipe} />
      </Card>

      <Card style={{ gap: 0 }}>
        <ListItem icon="shield-checkmark-outline" title={t('about.title')} subtitle={t('about.menuHint')} onPress={() => router.push('/about' as never)} />
      </Card>
    </Screen>
  );
}
