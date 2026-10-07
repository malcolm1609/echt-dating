import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { chatUnlocked } from '../../src/domain/conversation.ts';
import { backend } from '../../src/lib/backend';
import { matchStore, useMatch } from '../../src/lib/matches';
import { Chat } from '../../src/ui/Chat';
import { Button, Screen } from '../../src/ui/kit';
import { QuestionRound } from '../../src/ui/QuestionRound';
import { colors, font } from '../../src/ui/theme';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/matches'));
  if (!match) {
    return (
      <Screen>
        <Text style={font.body}>Dieses Match gibt es nicht mehr.</Text>
        <Button title="Zu deinen Matches" variant="ghost" onPress={() => router.replace('/matches')} />
      </Screen>
    );
  }
  const unlocked = chatUnlocked(match.answers);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12}>
          <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
        </Pressable>
        <Text style={font.title}>{`${match.name}, ${match.age}`}</Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {unlocked ? (
          <Chat
            match={match}
            demo={backend.demo}
            send={(t) => matchStore.send(id, t)}
            proposeDate={(p, w) => matchStore.proposeDate(id, p, w)}
            markDatePast={() => matchStore.markDatePast(id)}
            answerAfterDate={(a) => matchStore.answerAfterDate(id, a)}
            endKindly={(t) => matchStore.endKindly(id, t)}
          />
        ) : (
          <QuestionRound name={match.name} answers={match.answers} onAnswer={(k, t) => matchStore.answer(id, k, t)} />
        )}
      </ScrollView>
    </Screen>
  );
}
