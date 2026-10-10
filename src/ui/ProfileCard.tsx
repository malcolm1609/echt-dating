import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Seal } from './Seal';
import { colors, font, fontFamily } from './theme';

// Ruhige Fototöne, solange (oder falls) kein Foto lädt. Weiße Schrift bleibt auf allen lesbar.
const PHOTO_TONES: [string, string][] = [
  ['#B49C86', '#6B5646'],
  ['#9AAA94', '#4F5E4B'],
  ['#A99BB6', '#584C67'],
  ['#93A8B8', '#465A6B'],
  ['#C29C8E', '#6E4D43'],
  ['#ABA894', '#5C5A4B'],
];
const toneIndex = (name: string) => [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PHOTO_TONES.length;
export const photoTone = (name: string) => PHOTO_TONES[toneIndex(name)][1];
export const photoGradient = (name: string) => PHOTO_TONES[toneIndex(name)];

/** Ein Foto wie ein Abzug mit weißem Rand: wirkt bei jedem Handyfoto gewollt, und nichts liegt auf dem Gesicht. */
export function Print({ uri, name, style, children }: { uri?: string; name: string; style?: ViewStyle; children?: ReactNode }) {
  const [broken, setBroken] = useState<string>();
  const shown = uri && uri !== broken ? uri : undefined;
  return (
    <View style={[{ backgroundColor: colors.print, padding: 8, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, style]}>
      <LinearGradient accessibilityLabel={`Foto von ${name}`} colors={photoGradient(name)} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}>
        {shown && <Image source={{ uri: shown }} resizeMode="cover" onError={() => setBroken(shown)} style={StyleSheet.absoluteFill} />}
      </LinearGradient>
      {children}
    </View>
  );
}

// Eine Person, wie sie in „Heute“ erscheint: Foto als Abzug mit Siegel, darunter Name und das Wichtigste.
export function ProfileCard({ name, age, bio, eyebrow, photo, style }: { name: string; age: number; bio: string; eyebrow: string; photo?: string; style?: ViewStyle }) {
  return (
    <View style={{ gap: 6 }}>
      <Print uri={photo} name={name} style={style}>
        <Seal size={60} style={{ position: 'absolute', right: -12, bottom: -18 }} />
      </Print>
      <Text accessibilityRole="header" style={[font.display, { fontSize: 44, lineHeight: 50, marginTop: 10 }]}>
        {name}
        <Text style={{ color: colors.muted }}>{`, ${age}`}</Text>
      </Text>
      <Text style={font.small}>{eyebrow}</Text>
      {bio ? <Text style={[font.body, { fontSize: 17, lineHeight: 25, marginTop: 6 }]}>{bio}</Text> : null}
    </View>
  );
}

/** Runder Kopf für Listen: Foto, sonst Fototon mit Initiale. */
export function Avatar({ name, photo, size = 52 }: { name: string; photo?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: photoTone(name), alignItems: 'center', justifyContent: 'center' }}>
      {photo && !broken ? (
        <Image accessibilityLabel={`Foto von ${name}`} source={{ uri: photo }} onError={() => setBroken(true)} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.semibold, fontSize: size * 0.38 }}>{name[0]}</Text>
      )}
    </View>
  );
}
