import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT, type TKey } from '../../i18n';
import { useApp } from '../../store/useApp';
import { IconBadge, Txt, type IconName } from '../../ui/components';
import { FONT, RADIUS, SPACE, usePalette } from '../../ui/theme';

interface QuickAction {
  key: TKey;
  hint: TKey;
  icon: IconName;
  href: string;
  tone: 'income' | 'expense' | 'remit';
}

const ACTIONS: QuickAction[] = [
  { key: 'quick.income', hint: 'quick.incomeHint', icon: 'arrow-down-circle-outline', href: '/entry?kind=income', tone: 'income' },
  { key: 'quick.expense', hint: 'quick.expenseHint', icon: 'arrow-up-circle-outline', href: '/entry?kind=expense', tone: 'expense' },
  { key: 'quick.remit', hint: 'quick.remitHint', icon: 'paper-plane-outline', href: '/entry?kind=remittance', tone: 'remit' },
  { key: 'quick.family', hint: 'quick.familyHint', icon: 'home-outline', href: '/entry?kind=expense&wallet=home', tone: 'expense' },
  { key: 'quick.loan', hint: 'quick.loanHint', icon: 'swap-horizontal-outline', href: '/debts?new=1', tone: 'remit' },
  { key: 'quick.savings', hint: 'quick.savingsHint', icon: 'wallet-outline', href: '/goals', tone: 'income' },
];

export default function TabsLayout() {
  const p = usePalette();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarded = useApp((s) => s.data.settings.onboarded);
  const [open, setOpen] = useState(false);

  if (!onboarded) return <Redirect href="/onboarding" />;

  const icon = (name: IconName, nameActive: IconName) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return <Ionicons name={focused ? nameActive : name} size={24} color={focused ? p.primary : p.muted} />;
    };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: p.primary,
          tabBarInactiveTintColor: p.muted,
          tabBarStyle: { backgroundColor: p.card, borderTopColor: p.border, height: 64 + insets.bottom, paddingTop: 6 },
          tabBarLabelStyle: { fontFamily: FONT.medium, fontSize: 12 },
          sceneStyle: { backgroundColor: p.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tab.home'), tabBarIcon: icon('home-outline', 'home') }} />
        <Tabs.Screen name="transactions" options={{ title: t('tab.transactions'), tabBarIcon: icon('list-outline', 'list') }} />
        <Tabs.Screen
          name="add"
          options={{
            title: t('tab.add'),
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  onPress={() => setOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('tab.add')}
                  testID="tab-add"
                  style={({ pressed }) => ({
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    marginTop: -18,
                    backgroundColor: p.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: p.card,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="add" size={32} color={p.onPrimary} />
                </Pressable>
              </View>
            ),
          }}
        />
        <Tabs.Screen name="reports" options={{ title: t('tab.reports'), tabBarIcon: icon('bar-chart-outline', 'bar-chart') }} />
        <Tabs.Screen name="profile" options={{ title: t('tab.profile'), tabBarIcon: icon('person-outline', 'person') }} />
      </Tabs>

      <Modal visible={open} transparent animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
        <View
          style={{
            backgroundColor: p.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: SPACE.lg,
            paddingBottom: SPACE.lg + insets.bottom,
            gap: SPACE.md,
            marginTop: -24,
          }}
        >
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: p.border }} />
          <Txt v="title">{t('quick.title')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                accessibilityRole="button"
                accessibilityLabel={t(a.key)}
                onPress={() => {
                  setOpen(false);
                  router.push(a.href as never);
                }}
                style={({ pressed }) => ({
                  width: '47.5%',
                  flexGrow: 1,
                  backgroundColor: p.card,
                  borderRadius: RADIUS.lg,
                  borderWidth: 1,
                  borderColor: p.border,
                  padding: SPACE.md,
                  gap: 6,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <IconBadge name={a.icon} color={p[a.tone]} bg={p.cardAlt} />
                <Txt v="label" style={{ fontSize: 15 }}>{t(a.key)}</Txt>
                <Txt v="small" color={p.muted}>{t(a.hint)}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
