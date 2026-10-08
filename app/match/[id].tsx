import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { chatUnlocked } from '../../src/domain/conversation.ts';
import { backend } from '../../src/lib/backend';
import { matchStore, useMatch } from '../../src/lib/matches';
import { usePlus } from '../../src/lib/plus';
import { Chat } from '../../src/ui/Chat';
import { Button, Screen } from '../../src/ui/kit';
import { QuestionRound } from '../../src/ui/QuestionRound';
import { colors, font } from '../../src/ui/theme';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = useMatch(id);
  useEffect(() => matchStore.watch(id), [id]);
  // Ein neues Match kommt erst mit dem nächsten Laden vom Server.
  const [waited, setWaited] = useState(backend.demo);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const plus = usePlus();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/matches'));
  if (!match && !waited) {
    return (
      <Screen>
        <Text style={font.small}>Lädt …</Text>
      </Screen>
    );
  }
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
            testTools={backend.demo || backend.beta}
            plus={plus}
            onUpgrade={() => router.push('/plus')}
            send={(t) => matchStore.send(id, t)}
            proposeDate={(i, p, w, r) => matchStore.proposeDate(id, i, p, w, r)}
            acceptDate={() => matchStore.acceptDate(id)}
            markDatePast={() => matchStore.markDatePast(id)}
            answerAfterDate={(a) => matchStore.answerAfterDate(id, a)}
            endKindly={(t) => matchStore.endKindly(id, t)}
          />
        ) : (
          <QuestionRound name={match.name} opener={match.opener} answers={match.answers} onAnswer={(k, t) => matchStore.answer(id, k, t)} />
        )}
      </ScrollView>
    </Screen>
  );
}
