import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONT, RADIUS, SPACE, usePalette } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Variant = 'title' | 'h2' | 'body' | 'label' | 'small' | 'num' | 'hero';

const VARIANT: Record<Variant, TextStyle> = {
  hero: { fontFamily: FONT.bold, fontSize: 32, lineHeight: 42 },
  title: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 32 },
  h2: { fontFamily: FONT.semibold, fontSize: 17, lineHeight: 26 },
  num: { fontFamily: FONT.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: FONT.medium, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 19 },
};

export function Txt({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string }) {
  const p = usePalette();
  return <Text {...rest} style={[VARIANT[v], { color: color ?? p.text }, style]} />;
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  pad = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  pad?: boolean;
}) {
  const p = usePalette();
  const inner = { padding: pad ? SPACE.lg : 0, gap: SPACE.md, paddingBottom: 40 };
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: p.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, styles.maxWidth]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, styles.maxWidth]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View
      style={[
        { backgroundColor: p.card, borderRadius: RADIUS.lg, padding: SPACE.lg, borderWidth: 1, borderColor: p.border, gap: SPACE.sm },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: SPACE.sm }}>
      <Txt v="h2">{title}</Txt>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Txt v="label" color={p.primary}>{action}</Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const bg = kind === 'primary' ? p.primary : kind === 'danger' ? 'transparent' : p.cardAlt;
  const fg = kind === 'primary' ? p.onPrimary : kind === 'danger' ? p.bad : p.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: RADIUS.md,
          minHeight: 52,
          paddingHorizontal: SPACE.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: SPACE.sm,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: kind === 'danger' ? 1 : 0,
          borderColor: p.bad,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Txt v="label" color={fg} style={{ fontSize: 16 }}>{title}</Txt>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        minHeight: 40,
        borderRadius: RADIUS.pill,
        backgroundColor: active ? p.primary : p.card,
        borderWidth: 1,
        borderColor: active ? p.primary : p.border,
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={active ? p.onPrimary : p.sub} /> : null}
      <Txt v="label" color={active ? p.onPrimary : p.text}>{label}</Txt>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.sm, paddingRight: SPACE.lg }}>
      {children}
    </ScrollView>
  );
}

export function Field({
  label,
  hint,
  error,
  right,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; right?: React.ReactNode }) {
  const p = usePalette();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt v="label" color={p.sub}>{label}</Txt>
      <Row
        style={{
          backgroundColor: p.card,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: error ? p.bad : focused ? p.primary : p.border,
          paddingHorizontal: SPACE.md,
          minHeight: 52,
        }}
      >
        <TextInput
          placeholderTextColor={p.muted}
          accessibilityLabel={label}
          {...input}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
          style={[{ flex: 1, color: p.text, fontFamily: FONT.medium, fontSize: 16, paddingVertical: 12, minWidth: 0 }, WEB_NO_OUTLINE, input.style]}
        />
        {right}
      </Row>
      {error ? <Txt v="small" color={p.bad}>{error}</Txt> : hint ? <Txt v="small" color={p.muted}>{hint}</Txt> : null}
    </View>
  );
}

export function IconBadge({ name, color, bg, size = 40 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function ProgressBar({ bp, color, height = 8 }: { bp: number; color?: string; height?: number }) {
  const p = usePalette();
  const pct = Math.max(0, Math.min(100, bp / 100));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: p.cardAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, borderRadius: height, backgroundColor: color ?? p.primary }} />
    </View>
  );
}

export function Empty({ icon, title, body, action, onAction }: { icon: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xl, paddingHorizontal: SPACE.lg }}>
      <IconBadge name={icon} color={p.primary} bg={p.tint} size={56} />
      <Txt v="h2" style={{ textAlign: 'center' }}>{title}</Txt>
      {body ? <Txt color={p.sub} style={{ textAlign: 'center' }}>{body}</Txt> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: SPACE.sm, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

export function ListItem({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  right,
  rightSub,
  rightColor,
  onPress,
}: {
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: string;
  rightSub?: string;
  rightColor?: string;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
    >
      <IconBadge name={icon} color={iconColor ?? p.primary} bg={iconBg ?? p.tint} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="label" numberOfLines={1} style={{ fontSize: 15 }}>{title}</Txt>
        {subtitle ? <Txt v="small" color={p.muted} numberOfLines={1}>{subtitle}</Txt> : null}
      </View>
      {right ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="label" color={rightColor ?? p.text} style={{ fontFamily: FONT.semibold, fontSize: 15 }}>{right}</Txt>
          {rightSub ? <Txt v="small" color={p.muted}>{rightSub}</Txt> : null}
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={p.muted} />
      ) : null}
    </Pressable>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />;
}

export function Notice({ tone = 'info', text, icon }: { tone?: 'info' | 'good' | 'warn' | 'bad'; text: string; icon?: IconName }) {
  const p = usePalette();
  const color = tone === 'good' ? p.good : tone === 'warn' ? p.warn : tone === 'bad' ? p.bad : p.remit;
  const defIcon: IconName =
    tone === 'good' ? 'checkmark-circle' : tone === 'warn' ? 'alert-circle' : tone === 'bad' ? 'warning' : 'information-circle';
  return (
    <Row style={{ alignItems: 'flex-start', gap: SPACE.md }}>
      <Ionicons name={icon ?? defIcon} size={20} color={color} style={{ marginTop: 2 }} />
      <Txt style={{ flex: 1 }} color={p.text}>{text}</Txt>
    </Row>
  );
}

// The field's own border shows focus; the browser's default outline would double it on web.
const WEB_NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const styles = StyleSheet.create({
  maxWidth: { width: '100%', maxWidth: 560, alignSelf: 'center' },
});
