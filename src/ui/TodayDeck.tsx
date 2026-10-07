import { useState } from 'react';
import { Text, View } from 'react-native';
import { DAILY_LIMIT } from '../domain/dailyPicks.ts';
import { Button, s } from './kit';
import { colors, font } from './theme';

export interface Pick {
  id: string;
  displayName: string;
  age: number;
  bio: string;
  distanceKm: number;
}

export type Decision = 'like' | 'pass';

interface Props {
  picks: Pick[];
  usedBefore: number;
  onDecide: (id: string, decision: Decision) => Promise<{ matched: boolean }>;
  onOpenMatch?: (pick: Pick) => void;
}

export function TodayDeck({ picks, usedBefore, onDecide, onOpenMatch }: Props) {
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const current = picks[index];

  const decide = async (decision: Decision) => {
    setBusy(true);
    setError(undefined);
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
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Text style={[font.small, { color: colors.hint }]}>MATCH</Text>
        <Text style={font.display}>Ihr mögt euch beide</Text>
        <Text style={font.body}>Du und {match.displayName} startet mit einer kurzen Fragenrunde statt mit Smalltalk.</Text>
        <View style={{ flex: 1 }} />
        {onOpenMatch && <Button title="Zur Fragenrunde" onPress={() => { setMatch(null); onOpenMatch(match); }} />}
        <Button title="Später schreiben" variant="ghost" onPress={() => setMatch(null)} />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text style={font.title}>Das war’s für heute</Text>
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
      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 28, padding: 24, justifyContent: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 120, fontWeight: '800', color: colors.line }}>{current.displayName[0]}</Text>
        </View>
        <Text style={font.title}>{`${current.displayName}, ${current.age}`}</Text>
        <Text style={[font.small, { color: colors.hint }]}>{`${current.distanceKm} km entfernt`}</Text>
        {current.bio ? <Text style={font.body}>{current.bio}</Text> : null}
      </View>
      {error && <Text style={s.error}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title="Weiter" variant="ghost" disabled={busy} onPress={() => decide('pass')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Gefällt mir" disabled={busy} onPress={() => decide('like')} />
        </View>
      </View>
    </View>
  );
}
