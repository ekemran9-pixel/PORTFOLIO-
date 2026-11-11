import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
  useFonts,
} from '@expo-google-fonts/hind-siliguri';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { openExpoDriver } from '../db/expoDriver';
import { Repo } from '../db/repo';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { Button, Txt } from '../ui/components';
import { FONT, usePalette } from '../ui/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);
  const init = useApp((s) => s.init);
  const p = usePalette();
  const { t } = useT();

  useEffect(() => {
    init(async () => new Repo(await openExpoDriver()));
  }, [init]);

  if (status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Txt v="h2">{t('error.storageTitle')}</Txt>
        <Txt color={p.sub} style={{ textAlign: 'center' }}>{t('error.storageBody')}</Txt>
        <Txt v="small" color={p.muted} style={{ textAlign: 'center' }}>{error}</Txt>
        <Button title={t('common.retry')} onPress={() => { useApp.setState({ status: 'loading', error: null, repo: null }); init(async () => new Repo(await openExpoDriver())); }} />
      </View>
    );
  }
  if (status === 'loading' || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={p.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={p.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.bg },
          headerTintColor: p.text,
          headerTitleStyle: { fontFamily: FONT.semibold, fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: p.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="entry" options={{ title: '' }} />
        <Stack.Screen name="debts" options={{ title: t('debts.title') }} />
        <Stack.Screen name="goals" options={{ title: t('goals.title') }} />
        <Stack.Screen name="home-account" options={{ title: t('home.title') }} />
        <Stack.Screen name="budgets" options={{ title: t('budgets.title') }} />
        <Stack.Screen name="tools" options={{ title: t('tools.title') }} />
        <Stack.Screen name="about" options={{ title: t('about.title') }} />
      </Stack>
    </SafeAreaProvider>
  );
}
