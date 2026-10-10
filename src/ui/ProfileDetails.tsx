import Feather from '@expo/vector-icons/Feather';
import { Linking, Pressable, Text, View } from 'react-native';
import { MusicLink, providerName } from '../domain/music.ts';
import { GoalId, goalLabel, sharedInterests } from '../domain/profileContent.ts';
import { Print, ProfileCard } from './ProfileCard';
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
  /** Bild-Adressen; das erste kommt auf die Karte, die übrigen stehen zwischen den Antworten. */
  photos?: string[];
  dimmed?: boolean;
}

function Photo({ uri, name }: { uri: string; name: string }) {
  return <Print uri={uri} name={name} style={{ width: '100%', aspectRatio: 4 / 5 }} />;
}

// Ein ganzes Profil: oben die Karte, darunter Fragen und Interessen zum Anknüpfen.
export function ProfileDetails({ name, age, eyebrow, bio, goal, prompts, interests, myInterests, music, photos = [], dimmed }: Props) {
  const more = photos.slice(1);
  const shared = myInterests ? sharedInterests(myInterests, interests) : [];
  return (
    <View style={{ gap: 16, opacity: dimmed ? 0.5 : 1 }}>
      <ProfileCard name={name} age={age} bio={bio} eyebrow={eyebrow} photo={photos[0]} style={{ aspectRatio: 4 / 5 }} />
      {goal && (
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: colors.text, fontFamily: fontFamily.semibold, fontSize: 15 }}>
            {`Sucht: ${goalLabel(goal)}`}
          </Text>
        </View>
      )}
      {prompts.map((p, i) => (
        <View key={p.question} style={{ gap: 16 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14, gap: 6 }}>
            <Text style={font.small}>{p.question}</Text>
            <Text style={font.quote}>{p.answer}</Text>
          </View>
          {more[i] && <Photo uri={more[i]} name={name} />}
        </View>
      ))}
      {more.slice(prompts.length).map((uri) => <Photo key={uri} uri={uri} name={name} />)}
      {music && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14, gap: 6 }}>
          <Text style={font.small}>{`Läuft gerade bei ${name}`}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="music" size={16} color={colors.accent} />
            <Text style={[font.body, { flex: 1 }]} numberOfLines={2}>{music.title}</Text>
          </View>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(music.url)} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={[font.small, { color: colors.hint }]}>{`In ${providerName(music.provider)} öffnen`}</Text>
          </Pressable>
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
                  style={{ fontSize: 14, fontFamily: fontFamily.medium, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden', color: both ? colors.onAccent : colors.text, backgroundColor: both ? colors.accent : colors.surface, borderWidth: 1, borderColor: both ? colors.accent : colors.line }}
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
