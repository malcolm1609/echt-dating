import { Text, View } from 'react-native';
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
  dimmed?: boolean;
}

// Ein ganzes Profil: oben die Karte, darunter Fragen und Interessen zum Anknüpfen.
export function ProfileDetails({ name, age, eyebrow, bio, goal, prompts, interests, myInterests, dimmed }: Props) {
  const shared = myInterests ? sharedInterests(myInterests, interests) : [];
  return (
    <View style={{ gap: 14, opacity: dimmed ? 0.5 : 1 }}>
      <ProfileCard name={name} age={age} bio={bio} eyebrow={eyebrow} style={{ minHeight: 340 }} />
      {goal && (
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontWeight: '600', fontSize: 14 }}>
            {`Sucht: ${goalLabel(goal)}`}
          </Text>
        </View>
      )}
      {prompts.map((p) => (
        <View key={p.question} style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 10 }}>
          <Text style={[font.small, { color: colors.muted }]}>{p.question}</Text>
          <Text style={{ fontFamily: fontFamily.medium, fontSize: 22, lineHeight: 29, color: colors.text }}>{p.answer}</Text>
        </View>
      ))}
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
                  style={{ fontSize: 14, fontWeight: '600', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', color: both ? colors.bg : colors.text, backgroundColor: both ? colors.accent : colors.surface }}
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
