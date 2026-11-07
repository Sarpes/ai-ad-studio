import { router } from 'expo-router';
import { useId, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Image, PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { setLang, useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';

/** Brand kit logo A "Portal V": Ad + gradient V (lilac -> lime) + erse. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const v = size * 0.82;
  // Unique gradient id: on web, two mounted screens with the same SVG id hide one V.
  const gid = `v${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexShrink: 0 }} accessibilityLabel="AdVerse">
      <Text style={[s.word, { fontSize: size }]}>Ad</Text>
      <Svg width={v * 0.9} height={v} viewBox="0 0 90 100" style={{ marginBottom: size * 0.12, marginHorizontal: 1, flexShrink: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.lilac} />
            <Stop offset="1" stopColor={C.lime} />
          </LinearGradient>
        </Defs>
        <Path d="M10 8 L45 92 L80 8" stroke={`url(#${gid})`} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
      <Text style={[s.word, { fontSize: size }]}>erse</Text>
    </View>
  );
}

export function Header() {
  const { t, lang } = useT();
  const ses = useSession();
  // Short form for the header; the full sentence lives on the paywall.
  const label =
    ses.tier === 'free'
      ? ses.freeActive ? `${ses.freeLeft}/3 FREE` : t.freeOver.toUpperCase()
      : t.credits(ses.credits);
  return (
    <View style={s.header}>
      <Wordmark size={24} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable onPress={() => setLang(lang === 'en' ? 'tr' : 'en')} style={s.pill} accessibilityRole="button"
          accessibilityLabel="Language">
          <Text style={s.pillText}>{lang === 'en' ? 'TR' : 'EN'}</Text>
        </Pressable>
        {ses.userId && (
          <Pressable onPress={() => router.push('/paywall')} style={s.pill} accessibilityRole="button">
            <Text style={[s.pillText, { color: C.lime }]}>{label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', busy, disabled, style,
}: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost'; busy?: boolean; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'secondary' && s.btnSecondary,
        kind === 'ghost' && s.btnGhost,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? C.void : C.lilac} />
      ) : (
        <Text style={[s.btnText, kind === 'primary' ? { color: C.void } : { color: C.star }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, color }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[s.chip, on && { backgroundColor: C.plum, borderColor: color ?? C.lilac }]}
    >
      {color && <View style={[s.dot, { backgroundColor: color }]} />}
      <Text style={[s.chipText, on && { color: C.star }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={s.h2}>{title}</Text>
      {hint && <Text style={s.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

/** Drag the handle to compare the plain photo (left) with the ad (right). */
export function BeforeAfter({ before, after, height = 420 }: { before: string; after: string; height?: number }) {
  const [w, setW] = useState(0);
  const [x, setX] = useState(0.5);
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => w && setX(Math.min(1, Math.max(0, e.nativeEvent.locationX / w))),
    onPanResponderMove: (e) => w && setX(Math.min(1, Math.max(0, e.nativeEvent.locationX / w))),
  });
  return (
    <View
      style={[s.ba, { height }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <Image source={{ uri: after }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { width: `${x * 100}%`, overflow: 'hidden' }]} pointerEvents="none">
        <Image source={{ uri: before }} style={{ width: w || 1, height }} resizeMode="cover" />
      </View>
      <View style={[s.baHandle, { left: `${x * 100}%` }]} pointerEvents="none" />
      <Text style={[s.baLabel, { left: 10 }]}>BEFORE</Text>
      <Text style={[s.baLabel, { right: 10 }]}>AFTER</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  word: { fontFamily: F.display, color: C.star, letterSpacing: -0.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  pill: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.dust },
  btn: { borderRadius: 999, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: C.lime },
  btnSecondary: { borderWidth: 1.5, borderColor: C.lilac },
  btnGhost: { borderWidth: 1, borderColor: C.line },
  btnText: { fontFamily: F.bodyBold, fontSize: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, backgroundColor: C.deep, borderWidth: 1, borderColor: C.line,
  },
  dot: { width: 9, height: 9, borderRadius: 9 },
  chipText: { fontFamily: F.bodyBold, color: C.dust, fontSize: 14 },
  h1: { fontFamily: F.display, color: C.star, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h2: { fontFamily: F.heading, color: C.star, fontSize: 18, lineHeight: 24, marginBottom: 6 },
  hint: { fontFamily: F.body, color: C.dust, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  body: { fontFamily: F.body, color: C.star, fontSize: 15, lineHeight: 22 },
  mono: { fontFamily: F.mono, color: C.dust, fontSize: 11, letterSpacing: 1.1 },
  error: { fontFamily: F.bodyBold, color: C.error, fontSize: 15, marginTop: 12 },
  card: { backgroundColor: C.deep, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14 },
  ba: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: C.deep },
  baHandle: { position: 'absolute', top: 0, bottom: 0, width: 3, marginLeft: -1.5, backgroundColor: C.lime },
  baLabel: {
    position: 'absolute', top: 10, fontFamily: F.mono, fontSize: 11, color: C.star, letterSpacing: 1,
    backgroundColor: 'rgba(18,11,31,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
});
