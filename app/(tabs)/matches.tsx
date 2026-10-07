import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { chatUnlocked, QUESTION_ROUNDS, roundState } from '../../src/domain/conversation.ts';
import { Match, useMatches } from '../../src/lib/matches';
import { Screen } from '../../src/ui/kit';
import { colors, font } from '../../src/ui/theme';

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
      <Text style={font.title}>Matches</Text>
      {matches.length === 0 && <Text style={font.body}>Noch keine Matches. Schau in deine Vorschläge von heute.</Text>}
      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {matches.map((m) => (
          <Pressable key={m.id} accessibilityRole="button" onPress={() => router.push(`/match/${m.id}`)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>{m.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font.body, { fontWeight: '700' }]}>{`${m.name}, ${m.age}`}</Text>
              <Text style={font.small} numberOfLines={1}>{stageOf(m)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
