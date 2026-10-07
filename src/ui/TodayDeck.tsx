import { useState } from 'react';
import { Animated, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { DAILY_LIMIT } from '../domain/dailyPicks.ts';
import type { MusicLink } from '../domain/music.ts';
import type { GoalId } from '../domain/profileContent.ts';
import type { ShownPrompt } from './ProfileDetails';
import { Button, s } from './kit';
import { useEntrance, usePulse } from './motion';
import { ProfileDetails } from './ProfileDetails';
import { colors, font } from './theme';

export interface Pick {
  id: string;
  displayName: string;
  age: number;
  bio: string;
  distanceKm: number;
  goal?: GoalId;
  prompts?: ShownPrompt[];
  interests?: string[];
  music?: MusicLink;
}

export type Decision = 'like' | 'pass';

interface Props {
  picks: Pick[];
  usedBefore: number;
  onDecide: (id: string, decision: Decision) => Promise<{ matched: boolean }>;
  onOpenMatch?: (pick: Pick) => void;
  myInterests?: string[];
}

export function TodayDeck({ picks, usedBefore, onDecide, onOpenMatch, myInterests }: Props) {
  const [index, setIndex] = useState(0);
  // Neu geladene Vorschläge enthalten nur noch offene Personen: dann wieder vorne anfangen.
  const [shownPicks, setShownPicks] = useState(picks);
  if (shownPicks !== picks) {
    setShownPicks(picks);
    setIndex(0);
  }
  const [match, setMatch] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const current = picks[index];
  const enterCard = useEntrance(current?.id);
  const enterMatch = useEntrance(match?.id);
  const like = usePulse();
  const roomy = useWindowDimensions().width >= 360;

  const decide = async (decision: Decision) => {
    setBusy(true);
    setError(undefined);
    if (decision === 'like') like.pulse();
    try {
      const { matched } = await onDecide(current.id, decision);
      if (matched) setMatch(current);
      setIndex((i) => i + 1);
    } catch {
      setError('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  if (match) {
    return (
      <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 16 }, enterMatch]}>
        <Text style={[font.label, { color: colors.hint }]}>Match</Text>
        <Text style={[font.display, { fontSize: 56, lineHeight: 56 }]}>Ihr mögt euch beide<Text style={{ color: colors.accent }}>.</Text></Text>
        <Text style={font.body}>Du und {match.displayName} startet mit einer kurzen Fragenrunde statt mit Smalltalk.</Text>
        <View style={{ flex: 1 }} />
        {onOpenMatch && <Button title="Zur Fragenrunde" onPress={() => { setMatch(null); onOpenMatch(match); }} />}
        <Button title="Später schreiben" variant="ghost" onPress={() => setMatch(null)} />
      </Animated.View>
    );
  }

  if (!current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text style={font.display}>Das war’s für heute<Text style={{ color: colors.accent }}>.</Text></Text>
        <Text style={font.body}>Morgen bekommst du neue Vorschläge. Weniger Auswahl heißt mehr Aufmerksamkeit für jede Person.</Text>
      </View>
    );
  }

  const position = usedBefore + index + 1;
  return (
    <View style={{ flex: 1, gap: 20 }}>
      <View accessibilityLabel={`${position} von ${DAILY_LIMIT} Vorschlägen`} style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: DAILY_LIMIT }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < position ? colors.accent : colors.line }} />
        ))}
      </View>
      <Animated.View style={[{ flex: 1 }, enterCard]}>
        <ScrollView key={current.id} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <ProfileDetails
            name={current.displayName}
            age={current.age}
            bio={current.bio}
            eyebrow={`${current.distanceKm} km entfernt`}
            goal={current.goal}
            prompts={current.prompts ?? []}
            interests={current.interests ?? []}
            myInterests={myInterests}
            music={current.music}
          />
        </ScrollView>
      </Animated.View>
      {error && <Text style={s.error}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title="Weiter" variant="ghost" disabled={busy} onPress={() => decide('pass')} />
        </View>
        <Animated.View style={[{ flex: 1.4 }, like.style]}>
          <Button title="Gefällt mir" icon={roomy ? 'heart' : undefined} disabled={busy} onPress={() => decide('like')} />
        </Animated.View>
      </View>
    </View>
  );
}
