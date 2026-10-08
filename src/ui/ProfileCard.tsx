import { Text, View, ViewStyle } from 'react-native';
import { colors, font, fontFamily } from './theme';

// Ruhige Fototöne als Platzhalter, bis es echte Fotos gibt. Weiße Schrift bleibt auf allen lesbar.
const PHOTO_TONES = ['#7D6A5A', '#5F6E5C', '#6C6178', '#566A7A', '#7E6158', '#6A6A5E'];
export const photoTone = (name: string) => PHOTO_TONES[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PHOTO_TONES.length];

// Eine Person, wie sie in „Heute“ erscheint: großes Foto, Name darauf, kurzer Satz darunter.
export function ProfileCard({ name, age, bio, eyebrow, style }: { name: string; age: number; bio: string; eyebrow: string; style?: ViewStyle }) {
  return (
    <View style={{ gap: 12 }}>
      <View accessibilityLabel={`Foto von ${name}`} style={[{ backgroundColor: photoTone(name), borderRadius: 16, padding: 18, justifyContent: 'flex-end', overflow: 'hidden' }, style]}>
        <Text style={{ fontFamily: fontFamily.title, fontSize: 30, lineHeight: 36, color: '#FFFFFF' }}>{`${name}, ${age}`}</Text>
        <Text style={{ fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 20, color: '#FFFFFF' }}>{eyebrow}</Text>
      </View>
      {bio ? <Text style={[font.body, { fontSize: 17, lineHeight: 25, color: colors.text }]}>{bio}</Text> : null}
    </View>
  );
}
