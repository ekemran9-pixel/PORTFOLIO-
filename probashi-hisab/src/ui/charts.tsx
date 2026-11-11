import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { Row, Txt } from './components';
import { SPACE, usePalette } from './theme';

export interface BarGroup {
  label: string;
  /** Values per series, same order as `series`. */
  values: number[];
  /** Preformatted values for the detail row. */
  display: string[];
}

/**
 * Grouped bars for a few periods × 2–3 series. One shared y-axis starting at zero.
 * Tapping a group shows its exact values below the plot (the touch equivalent of a tooltip);
 * the legend always names the series, so colour is never the only cue.
 */
export function GroupedBars({
  groups,
  series,
  height = 170,
}: {
  groups: BarGroup[];
  series: { label: string; color: string }[];
  height?: number;
}) {
  const p = usePalette();
  const [sel, setSel] = useState(groups.length - 1);
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => Math.max(0, v))));
  const plotH = height - 24;
  const groupW = width > 0 ? width / groups.length : 0;
  const barGap = 2;
  const barW = Math.max(4, Math.min(18, (groupW * 0.72 - barGap * (series.length - 1)) / series.length));
  const active = groups[Math.min(sel, groups.length - 1)];

  return (
    <View style={{ gap: SPACE.sm }}>
      <Row style={{ flexWrap: 'wrap', gap: SPACE.md }}>
        {series.map((s) => (
          <Row key={s.label} style={{ gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Txt v="small" color={p.sub}>{s.label}</Txt>
          </Row>
        ))}
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <>
            <Svg width={width} height={plotH}>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <Line key={f} x1={0} x2={width} y1={plotH - plotH * f + 0.5} y2={plotH - plotH * f + 0.5} stroke={p.grid} strokeWidth={1} />
              ))}
              {groups.map((g, gi) => {
                const total = barW * series.length + barGap * (series.length - 1);
                const x0 = gi * groupW + (groupW - total) / 2;
                return (
                  <G key={g.label + gi} opacity={gi === sel ? 1 : 0.55}>
                    {g.values.map((v, si) => {
                      const h = Math.max(v > 0 ? 2 : 0, (Math.max(0, v) / max) * (plotH - 6));
                      const x = x0 + si * (barW + barGap);
                      const r = Math.min(4, barW / 2, h);
                      // Rounded top, square bottom anchored on the baseline.
                      const d = `M${x},${plotH} V${plotH - h + r} Q${x},${plotH - h} ${x + r},${plotH - h} H${x + barW - r} Q${x + barW},${plotH - h} ${x + barW},${plotH - h + r} V${plotH} Z`;
                      return h > 0 ? <Path key={si} d={d} fill={series[si].color} /> : null;
                    })}
                  </G>
                );
              })}
              <Line x1={0} x2={width} y1={plotH - 0.5} y2={plotH - 0.5} stroke={p.muted} strokeWidth={1} />
            </Svg>
            <View style={{ flexDirection: 'row', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
              {groups.map((g, gi) => (
                <Pressable
                  key={g.label + gi}
                  onPress={() => setSel(gi)}
                  accessibilityRole="button"
                  accessibilityLabel={`${g.label}: ${g.display.join(', ')}`}
                  style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}
                >
                  <Txt v="small" color={gi === sel ? p.text : p.muted} numberOfLines={1}>{g.label}</Txt>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>
      {active ? (
        <View style={{ backgroundColor: p.cardAlt, borderRadius: 12, padding: SPACE.md, gap: 4 }}>
          <Txt v="label">{active.label}</Txt>
          {series.map((s, i) => (
            <Row key={s.label} style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
                <Txt v="small" color={p.sub}>{s.label}</Txt>
              </Row>
              <Txt v="label">{active.display[i]}</Txt>
            </Row>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface Slice {
  label: string;
  value: number;
  display: string;
  share: string;
}

/**
 * Share-of-total as a ranked list with proportional bars. Chosen over a pie because the
 * categories are many and their Bengali names are long: the list reads exactly, in order.
 * Bars use one hue (magnitude, not identity); everything past `limit` folds into "Other".
 */
export function RankedBars({ slices, limit = 6, otherLabel }: { slices: Slice[]; limit?: number; otherLabel: string }) {
  const p = usePalette();
  const max = Math.max(1, ...slices.map((s) => s.value));
  const shown = slices.slice(0, limit);
  const rest = slices.slice(limit);
  return (
    <View style={{ gap: SPACE.md }}>
      {shown.map((s) => (
        <View key={s.label} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="label" numberOfLines={1} style={{ flex: 1 }}>{s.label}</Txt>
            <Txt v="label">{s.display}</Txt>
            <Txt v="small" color={p.muted} style={{ width: 48, textAlign: 'right' }}>{s.share}</Txt>
          </Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: p.cardAlt }}>
            <View style={{ height: 8, borderRadius: 4, width: `${Math.max(2, (s.value / max) * 100)}%`, backgroundColor: p.series[0] }} />
          </View>
        </View>
      ))}
      {rest.length > 0 ? (
        <Txt v="small" color={p.muted}>
          {otherLabel}: {rest.map((r) => `${r.label} ${r.display}`).join(' · ')}
        </Txt>
      ) : null}
    </View>
  );
}

/** A single 0–100 score as a ring with the number in the middle. */
export function ScoreRing({ score, color, size = 96, label }: { score: number | null; color: string; size?: number; label: string }) {
  const p = usePalette();
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = score === null ? 0 : Math.max(0, Math.min(1, score / 100));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={label}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p.cardAlt} strokeWidth={stroke} fill="none" />
        {frac > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <Txt v="title" style={{ fontSize: 26 }}>{label}</Txt>
    </View>
  );
}

/** One measure split into parts, as a single segmented bar with 2px gaps. */
export function SplitBar({ parts, height = 12 }: { parts: { value: number; color: string }[]; height?: number }) {
  const p = usePalette();
  const total = parts.reduce((t, x) => t + Math.max(0, x.value), 0);
  if (total <= 0) return <View style={{ height, borderRadius: height / 2, backgroundColor: p.cardAlt }} />;
  return (
    <View style={{ flexDirection: 'row', height, gap: 2 }}>
      {parts
        .filter((x) => x.value > 0)
        .map((x, i) => (
          <View key={i} style={{ flex: x.value / total, backgroundColor: x.color, borderRadius: 4, minWidth: 3 }} />
        ))}
    </View>
  );
}
