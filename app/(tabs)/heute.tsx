import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { GoalId, PROMPTS, sharedInterests } from '../../src/domain/profileContent.ts';
import { backend } from '../../src/lib/backend';
import { matchStore } from '../../src/lib/matches';
import { ActiveNearby } from '../../src/ui/ActiveNearby';
import { Button, Screen } from '../../src/ui/kit';
import { Pick, TodayDeck } from '../../src/ui/TodayDeck';
import { colors, font } from '../../src/ui/theme';

export default function Today() {
  const [data, setData] = useState<{ picks: Pick[]; used: number }>();
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nearby, setNearby] = useState<number | null>();
  const [me, setMe] = useState<{ interests: string[]; goal?: GoalId }>({ interests: [] });

  const load = useCallback(() => {
    setFailed(false);
    backend.touchActivity().catch(() => {});
    backend.isPaused().then(setPaused, () => {});
    backend.myProfile().then(setMe, () => {});
    backend.todaysPicks().then(setData, () => setFailed(true));
    backend.activeNearby().then(setNearby, () => {});
  }, []);
  useFocusEffect(load);

  return (
    <Screen>
      <Text style={font.display}>Heute<Text style={{ color: colors.accent }}>.</Text></Text>
      <ActiveNearby bucket={nearby} />
      {failed && (
        <>
          <Text style={font.body}>Deine Vorschläge konnten nicht geladen werden.</Text>
          <Button title="Noch einmal" variant="ghost" onPress={load} />
        </>
      )}
      {!data && !failed && <Text style={font.small}>Lädt …</Text>}
      {paused && <Text style={font.body}>Dein Profil ist pausiert. Im Profil-Tab kannst du wieder aktiv werden.</Text>}
      {data && !paused && (
        <TodayDeck
          picks={data.picks}
          usedBefore={data.used}
          myInterests={me.interests}
          myGoal={me.goal}
          onDecide={async (id, decision) => {
            const result = await backend.decide(id, decision);
            const pick = data.picks.find((p) => p.id === id);
            if (result.matched && pick) matchStore.add({ id: pick.id, name: pick.displayName, age: pick.age, opener: openerFor(pick), shared: sharedInterests(me.interests, pick.interests ?? []) });
            return result;
          }}
          onOpenMatch={(pick) => router.push(`/match/${pick.id}`)}
        />
      )}
    </Screen>
  );
}

// Die Fragenrunde beginnt mit der Antwort, die am meisten zum Anknüpfen einlädt.
const openerFor = (pick: Pick) =>
  pick.prompts?.find((p) => PROMPTS.find((x) => x.text === p.question)?.category === 'anknuepfen') ?? pick.prompts?.[0];
