import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { backend } from '../../src/lib/backend';
import { matchStore } from '../../src/lib/matches';
import { Button, Screen } from '../../src/ui/kit';
import { Pick, TodayDeck } from '../../src/ui/TodayDeck';
import { font } from '../../src/ui/theme';

export default function Today() {
  const [data, setData] = useState<{ picks: Pick[]; used: number }>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    backend.touchActivity().catch(() => {});
    backend.todaysPicks().then(setData, () => setFailed(true));
  }, []);
  useFocusEffect(load);

  return (
    <Screen>
      <Text style={font.title}>Heute</Text>
      {failed && (
        <>
          <Text style={font.body}>Deine Vorschläge konnten nicht geladen werden.</Text>
          <Button title="Noch einmal" variant="ghost" onPress={load} />
        </>
      )}
      {!data && !failed && <Text style={font.small}>Lädt …</Text>}
      {data && (
        <TodayDeck
          picks={data.picks}
          usedBefore={data.used}
          onDecide={async (id, decision) => {
            const result = await backend.decide(id, decision);
            const pick = data.picks.find((p) => p.id === id);
            if (result.matched && pick) matchStore.add({ id: pick.id, name: pick.displayName, age: pick.age });
            return result;
          }}
          onOpenMatch={(pick) => router.push(`/match/${pick.id}`)}
        />
      )}
    </Screen>
  );
}
