import { Text, View, ViewStyle } from 'react-native';
import { colors, font, fontFamily } from './theme';

// Eine Person, wie sie in „Heute“ erscheint. Die große Initiale steht für das Foto, bis es Fotos gibt.
export function ProfileCard({ name, age, bio, eyebrow, style }: { name: string; age: number; bio: string; eyebrow: string; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 28, padding: 24, justifyContent: 'flex-end', gap: 10, overflow: 'hidden' }, style]}>
      <Text accessible={false} style={{ position: 'absolute', top: 0, left: 18, fontFamily: fontFamily.display, fontSize: 220, color: colors.raised }}>{name[0]}</Text>
      <Text style={[font.label, { color: colors.hint }]}>{eyebrow}</Text>
      <Text style={[font.display, { fontSize: 44, lineHeight: 46 }]}>{`${name}, ${age}`}</Text>
      {bio ? <Text style={[font.body, { fontSize: 18, lineHeight: 26 }]}>{bio}</Text> : null}
    </View>
  );
}
