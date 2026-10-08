import { LinearGradient } from 'expo-linear-gradient';
import { Text, View, ViewStyle } from 'react-native';
import { Glass } from './Glass';
import { colors, font, fontFamily, shadow } from './theme';

// Ruhige Fototöne als Platzhalter, bis es echte Fotos gibt. Weiße Schrift bleibt auf allen lesbar.
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

// Eine Person, wie sie in „Heute“ erscheint: großes Foto mit Glas-Chip, Name groß darauf, kurzer Satz darunter.
export function ProfileCard({ name, age, bio, eyebrow, style }: { name: string; age: number; bio: string; eyebrow: string; style?: ViewStyle }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={[{ borderRadius: 28, backgroundColor: colors.surface }, shadow, style]}>
        <LinearGradient accessibilityLabel={`Foto von ${name}`} colors={photoGradient(name)} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', padding: 14 }}>
            <Glass tone="dark" style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: '#FFFFFF' }}>{eyebrow}</Text>
            </Glass>
          </View>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.42)']} style={{ paddingHorizontal: 22, paddingTop: 60, paddingBottom: 22 }}>
            <Text style={{ fontFamily: fontFamily.title, fontSize: 38, lineHeight: 42, letterSpacing: -0.8, color: '#FFFFFF' }}>
              {name}
              <Text style={{ fontFamily: fontFamily.regular, color: 'rgba(255,255,255,0.85)' }}>{`, ${age}`}</Text>
            </Text>
          </LinearGradient>
        </LinearGradient>
      </View>
      {bio ? <Text style={[font.body, { fontSize: 17, lineHeight: 25, paddingHorizontal: 4 }]}>{bio}</Text> : null}
    </View>
  );
}
