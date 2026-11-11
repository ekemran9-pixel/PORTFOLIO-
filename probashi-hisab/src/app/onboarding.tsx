import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { COUNTRIES, CURRENCY_CODES, parseAmount, parseRate, type CurrencyCode } from '../domain/money';
import { toDateString } from '../domain/summary';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Card, Chip, Chips, Field, IconBadge, Notice, ProgressBar, Row, Screen, Txt } from '../ui/components';
import { RADIUS, SPACE, usePalette } from '../ui/theme';

const STEPS = 4;

export default function Onboarding() {
  const p = usePalette();
  const router = useRouter();
  const { t, lang, num } = useT();
  const settings = useApp((s) => s.data.settings);
  const saveSettings = useApp((s) => s.saveSettings);
  const startDemo = useApp((s) => s.startDemo);

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(settings.country);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.baseCurrency);
  const [rate, setRate] = useState('');
  const [salary, setSalary] = useState('');
  const [target, setTarget] = useState('');
  const [trackHome, setTrackHome] = useState(false);
  const [busy, setBusy] = useState(false);

  if (settings.onboarded) return <Redirect href="/" />;

  const rateMicro = parseRate(rate);
  const salaryMinor = salary.trim() === '' ? 0 : parseAmount(salary, currency);
  const targetMinor = target.trim() === '' ? 0 : parseAmount(target, currency);
  const canNext = step === 1 ? rateMicro !== null : step === 2 ? salaryMinor !== null && targetMinor !== null : true;

  async function finish() {
    setBusy(true);
    await saveSettings({
      onboarded: true,
      country,
      baseCurrency: currency,
      baseRateMicro: rateMicro ?? 0,
      baseRateDate: toDateString(new Date()),
      salaryMinor: salaryMinor ?? 0,
      savingsTargetMinor: targetMinor ?? 0,
      trackHome,
      demo: false,
    });
    router.replace('/' as never);
  }

  async function demo() {
    setBusy(true);
    await startDemo();
    router.replace('/' as never);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      {step > 0 ? (
        <Row>
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={24} color={p.text} />
          </Pressable>
          <View style={{ flex: 1 }}><ProgressBar bp={((step + 1) / STEPS) * 10000} height={6} /></View>
          <Txt v="small" color={p.muted}>{num(step + 1)}/{num(STEPS)}</Txt>
        </Row>
      ) : null}

      {step === 0 ? (
        <>
          <View style={{ backgroundColor: p.hero, borderRadius: 28, padding: SPACE.xl, gap: SPACE.md, marginTop: SPACE.lg }}>
            <IconBadge name="wallet" color={p.hero} bg="#FFFFFF" size={60} />
            <Txt v="hero" color="#FFFFFF">{t('app.name')}</Txt>
            <Txt color={p.heroSub} style={{ fontSize: 16, lineHeight: 26 }}>{t('onb.tagline')}</Txt>
          </View>
          <Card>
            <Notice tone="good" icon="phone-portrait-outline" text={t('onb.point1')} />
            <Notice tone="good" icon="swap-horizontal-outline" text={t('onb.point2')} />
            <Notice tone="good" icon="lock-closed-outline" text={t('onb.point3')} />
          </Card>
          <Txt v="label" color={p.sub}>{t('onb.language')}</Txt>
          <Row>
            <Chip label="বাংলা" active={lang === 'bn'} onPress={() => saveSettings({ language: 'bn' })} />
            <Chip label="English" active={lang === 'en'} onPress={() => saveSettings({ language: 'en' })} />
          </Row>
          <Button title={t('onb.start')} icon="arrow-forward" onPress={() => setStep(1)} />
          <Button title={t('onb.demo')} kind="ghost" icon="flask-outline" onPress={demo} loading={busy} />
          <Txt v="small" color={p.muted} style={{ textAlign: 'center' }}>{t('onb.demoHint')}</Txt>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Txt v="title">{t('onb.whereTitle')}</Txt>
          <Txt color={p.sub}>{t('onb.whereBody')}</Txt>
          <Txt v="label" color={p.sub}>{t('onb.country')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {COUNTRIES.map((c) => (
              <Chip key={c.code} label={c[lang]} active={c.code === country} onPress={() => { setCountry(c.code); setCurrency(c.currency); }} />
            ))}
          </View>
          <Txt v="label" color={p.sub}>{t('onb.currency')}</Txt>
          <Chips>
            {CURRENCY_CODES.filter((c) => c !== 'BDT').map((c) => (
              <Chip key={c} label={c} active={c === currency} onPress={() => setCurrency(c)} />
            ))}
          </Chips>
          <Field
            label={t('entry.rateLabel', { cur: currency })}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder={num('32.40')}
            testID="onb-rate"
            error={rate !== '' && rateMicro === null ? t('entry.err.rate') : null}
            hint={t('onb.rateHint')}
          />
          <Card style={{ backgroundColor: p.cardAlt }}>
            <Row><Ionicons name="flag-outline" size={18} color={p.primary} /><Txt v="label">{t('onb.homeCountry')}</Txt></Row>
            <Txt v="small" color={p.sub}>{t('onb.homeCountryNote')}</Txt>
          </Card>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Txt v="title">{t('onb.incomeTitle')}</Txt>
          <Txt color={p.sub}>{t('onb.incomeBody')}</Txt>
          <Field label={t('onb.salary', { cur: currency })} value={salary} onChangeText={setSalary} keyboardType="decimal-pad" placeholder={num('0')} testID="onb-salary" error={salaryMinor === null ? t('entry.err.amount') : null} hint={t('onb.optional')} />
          <Field label={t('onb.target', { cur: currency })} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={num('0')} error={targetMinor === null ? t('entry.err.amount') : null} hint={t('onb.targetHint')} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Txt v="title">{t('onb.modeTitle')}</Txt>
          <Txt color={p.sub}>{t('onb.modeBody')}</Txt>
          {([false, true] as const).map((v) => {
            const active = trackHome === v;
            return (
              <Pressable
                key={String(v)}
                onPress={() => setTrackHome(v)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                testID={v ? 'mode-track' : 'mode-simple'}
                style={{ backgroundColor: active ? p.tint : p.card, borderRadius: RADIUS.lg, borderWidth: active ? 2 : 1, borderColor: active ? p.primary : p.border, padding: SPACE.lg, gap: 6 }}
              >
                <Row>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? p.primary : p.muted} />
                  <Txt v="h2" style={{ flex: 1 }}>{t(v ? 'onb.modeTrack' : 'onb.modeSimple')}</Txt>
                </Row>
                <Txt color={p.sub}>{t(v ? 'onb.modeTrackBody' : 'onb.modeSimpleBody')}</Txt>
              </Pressable>
            );
          })}
          <Txt v="small" color={p.muted}>{t('onb.modeNote')}</Txt>
        </>
      ) : null}

      {step > 0 ? (
        <Button
          title={t(step === STEPS - 1 ? 'onb.finish' : 'common.next')}
          icon={step === STEPS - 1 ? 'checkmark' : 'arrow-forward'}
          onPress={() => (step === STEPS - 1 ? finish() : setStep(step + 1))}
          disabled={!canNext}
          loading={busy}
        />
      ) : null}
    </Screen>
  );
}
