import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { DAILY_LIMIT } from '../domain/dailyPicks.ts';
import type { MusicLink } from '../domain/music.ts';
import type { GoalId } from '../domain/profileContent.ts';
import { pickReason } from '../domain/ranking.ts';
import type { ShownPrompt } from './ProfileDetails';
import { Glass } from './Glass';
import { Button, s } from './kit';
import { LikeKnob } from './LikeKnob';
import { useEntrance, usePulse, useReducedMotion } from './motion';
import { ProfileDetails } from './ProfileDetails';
import { ReportPanel } from './ReportPanel';
import type { ReportReason } from '../domain/safety.ts';
import { colors, font, fontFamily } from './theme';

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
  /** Bild-Adressen, das erste ist das Hauptfoto. */
  photos?: string[];
}

export type Decision = 'like' | 'pass';

interface Props {
  picks: Pick[];
  usedBefore: number;
  onDecide: (id: string, decision: Decision) => Promise<{ matched: boolean }>;
  onOpenMatch?: (pick: Pick) => void;
  myInterests?: string[];
  myGoal?: GoalId;
  title?: string;
  /** Meldet und blendet die Person aus, ohne einen der Vorschläge zu verbrauchen. */
  onReport?: (id: string, reason: ReportReason) => Promise<void>;
}

export function TodayDeck({ picks, usedBefore, onDecide, onOpenMatch, myInterests = [], myGoal, title, onReport }: Props) {
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
  const [reporting, setReporting] = useState(false);
  // Gemeldete zählen nicht als Vorschlag: der Zähler oben läuft nur über echte Entscheidungen.
  const [reported, setReported] = useState(0);
  const current = picks[index];
  const enterCard = useEntrance(current?.id);
  const enterMatch = useEntrance(match?.id);
  const like = usePulse();
  const reduced = useReducedMotion();
  const screenWidth = useWindowDimensions().width;
  // drag: wie weit der Knopf gezogen ist, die Karte geht ein Stück mit.
  // exit: -1 = Karte fliegt nach links (Weiter), 1 = hebt sich und verblasst (Gefällt mir).
  const drag = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    exit.setValue(0);
    drag.setValue(0);
  }, [current?.id, exit, drag]);

  const decide = async (decision: Decision) => {
    setBusy(true);
    setError(undefined);
    if (decision === 'like') like.pulse();
    const out = new Promise<void>((done) => {
      if (reduced) return done();
      Animated.timing(exit, { toValue: decision === 'pass' ? -1 : 1, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() => done());
    });
    try {
      const [{ matched }] = await Promise.all([onDecide(current.id, decision), out]);
      if (matched) setMatch(current);
      setIndex((i) => i + 1);
    } catch {
      exit.setValue(0);
      setError('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  if (match) {
    return (
      <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 16 }, enterMatch]}>
        <Text style={[font.label, { color: colors.hint }]}>Match</Text>
        <Text style={[font.display, { fontSize: 40, lineHeight: 46 }]}>Ihr mögt euch beide</Text>
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
        <Text style={font.display}>Das war’s für heute</Text>
        <Text style={font.body}>Morgen bekommst du neue Vorschläge. Weniger Auswahl heißt mehr Aufmerksamkeit für jede Person.</Text>
      </View>
    );
  }

  const position = usedBefore + index - reported + 1;
  const reason = pickReason({ goal: myGoal, interests: myInterests }, { goal: current.goal, interests: current.interests ?? [] });
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {title && <Text accessibilityRole="header" style={font.display}>{title}</Text>}
        <Glass style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text accessibilityLabel={`${position} von ${DAILY_LIMIT} Vorschlägen`} style={[font.small, { fontFamily: fontFamily.semibold, color: colors.text }]}>{`${position} von ${DAILY_LIMIT}`}</Text>
        </Glass>
      </View>
      <Animated.View style={[{ flex: 1 }, enterCard]}>
        <Animated.View
          style={{
            flex: 1,
            opacity: exit.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: Animated.add(
                drag.interpolate({ inputRange: [-300, 0], outputRange: [-40, 0], extrapolate: 'clamp' }),
                exit.interpolate({ inputRange: [-1, 0, 1], outputRange: [-screenWidth, 0, 0] }),
              ) },
              { translateY: exit.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, -28] }) },
              { rotate: drag.interpolate({ inputRange: [-300, 0], outputRange: ['-2deg', '0deg'], extrapolate: 'clamp' }) },
              { rotate: exit.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-6deg', '0deg', '0deg'] }) },
              { scale: exit.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 1, 1.03] }) },
            ],
          }}
        >
        <ScrollView key={current.id} contentContainerStyle={{ paddingBottom: 96, paddingTop: 4, paddingHorizontal: 2 }} showsVerticalScrollIndicator={false}>
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
            photos={current.photos}
          />
          {reason && <Text style={[font.label, { color: colors.accent, marginTop: 14 }]}>{reason}</Text>}
          {onReport && (reporting ? (
            <View style={{ marginTop: 20 }}>
              <ReportPanel
                name={current.displayName}
                onReport={async (r) => {
                  await onReport(current.id, r);
                  setReporting(false);
                  setReported((n) => n + 1);
                  setIndex((i) => i + 1);
                }}
                onCancel={() => setReporting(false)}
              />
            </View>
          ) : (
            <Text accessibilityRole="button" onPress={() => setReporting(true)} style={[font.small, { marginTop: 20, textDecorationLine: 'underline' }]}>{`${current.displayName} melden`}</Text>
          ))}
        </ScrollView>
        </Animated.View>
      </Animated.View>
      {error && <Text style={s.error}>{error}</Text>}
      {/* Die Entscheidung schwebt als Glasleiste über dem Profil, damit das Foto bis unten durchscheint.
          Ein Knopf: antippen = Gefällt mir, nach links ziehen = Weiter. */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 4 }, like.style]}>
        <LikeKnob x={drag} disabled={busy} onLike={() => decide('like')} onPass={() => decide('pass')} />
      </Animated.View>
    </View>
  );
}
