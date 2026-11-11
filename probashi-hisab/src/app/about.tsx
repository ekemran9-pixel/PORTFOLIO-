import React from 'react';

import { useT, type TKey } from '../i18n';
import { Card, Notice, Screen, Txt } from '../ui/components';
import { usePalette } from '../ui/theme';

const POINTS: TKey[] = ['about.p1', 'about.p2', 'about.p3', 'about.p4', 'about.p5'];

export default function AboutScreen() {
  const p = usePalette();
  const { t } = useT();
  return (
    <Screen edges={['bottom']}>
      <Txt v="title">{t('app.name')}</Txt>
      <Txt color={p.sub}>{t('about.intro')}</Txt>
      <Card>
        <Txt v="h2">{t('about.privacy')}</Txt>
        {POINTS.map((k) => (
          <Notice key={k} tone="good" text={t(k)} />
        ))}
      </Card>
      <Card>
        <Txt v="h2">{t('about.rules')}</Txt>
        <Txt color={p.sub}>{t('about.rulesBody')}</Txt>
      </Card>
      <Card>
        <Notice tone="warn" text={t('about.disclaimer')} />
      </Card>
      <Txt v="small" color={p.muted}>{t('about.version', { v: '0.1.0' })}</Txt>
    </Screen>
  );
}
