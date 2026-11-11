import { useColorScheme } from 'react-native';

import { useApp } from '../store/useApp';

export interface Palette {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  sub: string;
  muted: string;
  primary: string;
  onPrimary: string;
  hero: string;
  heroSub: string;
  income: string;
  expense: string;
  remit: string;
  good: string;
  warn: string;
  bad: string;
  tint: string;
  /** Categorical chart colours, fixed order (validated palette, see docs/DESIGN.md). */
  series: string[];
  grid: string;
}

export const LIGHT: Palette = {
  dark: false,
  bg: '#F4F6F5',
  card: '#FFFFFF',
  cardAlt: '#EEF2F0',
  border: '#E1E6E3',
  text: '#0E1B16',
  sub: '#52605A',
  muted: '#7F8A85',
  primary: '#0B7A5B',
  onPrimary: '#FFFFFF',
  hero: '#0A5C45',
  heroSub: '#BFE6D8',
  income: '#0B7A5B',
  expense: '#C73A3A',
  remit: '#2A78D6',
  good: '#0B7A5B',
  warn: '#9A5B00',
  bad: '#C73A3A',
  tint: '#E3F3EC',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  grid: '#E1E0D9',
};

export const DARK: Palette = {
  dark: true,
  bg: '#0C1110',
  card: '#161C1A',
  cardAlt: '#1E2623',
  border: '#28322E',
  text: '#F0EFEC',
  sub: '#B4BFBA',
  muted: '#8A9690',
  primary: '#35C297',
  onPrimary: '#06241A',
  hero: '#0F4A39',
  heroSub: '#A9DCCB',
  income: '#35C297',
  expense: '#F07A7A',
  remit: '#5B9FEA',
  good: '#35C297',
  warn: '#F2B544',
  bad: '#F07A7A',
  tint: '#16332A',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  grid: '#2C2C2A',
};

export function usePalette(): Palette {
  const system = useColorScheme();
  const pref = useApp((s) => s.data.settings.theme);
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return dark ? DARK : LIGHT;
}

export const FONT = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const RADIUS = { sm: 10, md: 14, lg: 20, pill: 999 };
