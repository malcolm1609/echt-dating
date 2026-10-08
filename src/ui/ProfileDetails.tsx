import Feather from '@expo/vector-icons/Feather';
import { Linking, Pressable, Text, View } from 'react-native';
import { MusicLink, musicKindLabel, providerName } from '../domain/music.ts';
import { GoalId, goalLabel, sharedInterests } from '../domain/profileContent.ts';
import { ProfileCard } from './ProfileCard';
import { colors, font, fontFamily } from './theme';

export interface ShownPrompt {
  question: string;
  answer: string;
}

interface Props {
  name: string;
  age: number;
  eyebrow: string;
  bio: string;
  goal?: GoalId;
  prompts: ShownPrompt[];
  interests: string[];
  myInterests?: string[];
  music?: MusicLink;
  dimmed?: boolean;
}

// Ein ganzes Profil: oben die Karte, darunter Fragen und Interessen zum Anknüpfen.
export function ProfileDetails({ name, age, eyebrow, bio, goal, prompts, interests, myInterests, music, dimmed }: Props) {
  const shared = myInterests ? sharedInterests(myInterests, interests) : [];
  return (
    <View style={{ gap: 14, opacity: dimmed ? 0.5 : 1 }}>
      <ProfileCard name={name} age={age} bio={bio} eyebrow={eyebrow} style={{ minHeight: 400 }} />
      {goal && (
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: colors.text, fontFamily: fontFamily.semibold, fontSize: 15 }}>
            {`Sucht: ${goalLabel(goal)}`}
          </Text>
        </View>
      )}
      {prompts.map((p) => (
        <View key={p.question} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 18, gap: 6 }}>
          <Text style={[font.small, { color: colors.muted }]}>{p.question}</Text>
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 21, lineHeight: 28, color: colors.text }}>{p.answer}</Text>
        </View>
      ))}
      {music && (
        <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 18, gap: 14, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="music" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[font.small, { color: colors.muted }]}>{`Lieblings${musicKindLabel(music.kind).toLowerCase()}`}</Text>
            <Text style={[font.body, { fontFamily: fontFamily.semibold }]} numberOfLines={2}>{music.title}</Text>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(music.url)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Text style={[font.small, { color: colors.hint }]}>{`In ${providerName(music.provider)} öffnen`}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {interests.length > 0 && (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {shared.length > 0 && <Text style={[font.label, { color: colors.accent }]}>{shared.length === 1 ? '1 Gemeinsamkeit' : `${shared.length} Gemeinsamkeiten`}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {interests.map((i) => {
              const both = shared.includes(i);
              return (
                <Text
                  key={i}
                  accessibilityLabel={both ? `${i}, gemeinsam` : i}
                  style={{ fontSize: 14, fontFamily: fontFamily.medium, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', color: both ? colors.onAccent : colors.text, backgroundColor: both ? colors.accent : colors.surface }}
                >
                  {i}
                </Text>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
