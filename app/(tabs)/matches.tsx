import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { chatUnlocked, QUESTION_ROUNDS, roundState } from '../../src/domain/conversation.ts';
import { Match, useMatches } from '../../src/lib/matches';
import { Screen } from '../../src/ui/kit';
import { photoTone } from '../../src/ui/ProfileCard';
import { colors, font, fontFamily } from '../../src/ui/theme';

function stageOf(m: Match): string {
  if (m.ended) return 'Beendet';
  if (m.date?.past) return 'Nach dem Date';
  if (m.date) return `Date: ${m.date.when}`;
  if (chatUnlocked(m.answers)) return m.messages.at(-1)?.text ?? 'Chat offen';
  const open = QUESTION_ROUNDS.findIndex((_, r) => roundState(m.answers, r) !== 'done');
  return `Fragenrunde ${open + 1} von ${QUESTION_ROUNDS.length}`;
}

export default function Matches() {
  const matches = useMatches();
  return (
    <Screen>
      <Text style={font.display}>Matches</Text>
      {matches.length === 0 && <Text style={font.body}>Noch keine Matches. Schau in deine Vorschläge von heute.</Text>}
      <ScrollView>
        {matches.map((m) => (
          <Pressable key={m.id} accessibilityRole="button" onPress={() => router.push(`/match/${m.id}`)} style={({ pressed }) => ({ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: photoTone(m.name), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.semibold, fontSize: 20 }}>{m.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>{`${m.name}, ${m.age}`}</Text>
              <Text style={font.small} numberOfLines={1}>{stageOf(m)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
