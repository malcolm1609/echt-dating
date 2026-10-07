import Feather from '@expo/vector-icons/Feather';
import { useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Coords, LocateResult } from '../lib/location';
import { Button, s } from './kit';
import { useEntrance } from './motion';
import { colors, font } from './theme';

type Problem = Exclude<LocateResult, { ok: true }>['reason'] | 'save';

const PROBLEMS: Record<Problem, string> = {
  denied: 'Ohne Standort können wir dir niemanden in deiner Nähe zeigen. Du kannst die Freigabe jederzeit wieder entziehen.',
  blocked: 'Dein Handy fragt nicht mehr nach. Erlaube den Standort für Echt in den Einstellungen und komm dann zurück.',
  unavailable: 'Wir finden gerade kein GPS-Signal. Schalte die Ortungsdienste ein oder geh kurz ans Fenster.',
  save: 'Speichern hat nicht geklappt. Bitte versuch es noch einmal.',
};

const PROMISES: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'eye-off', text: 'Niemand sieht, wo du genau bist. Andere sehen nur die Entfernung in Kilometern.' },
  { icon: 'users', text: 'Damit halten wir das Verhältnis in deinem Umkreis fair.' },
  { icon: 'shield', text: 'Nur per GPS, damit niemand einen falschen Wohnort angeben kann.' },
];

interface Props {
  onLocate: () => Promise<LocateResult>;
  onDone: (coords: Coords) => Promise<void>;
  onOpenSettings: () => void;
}

export function LocationStep({ onLocate, onDone, onOpenSettings }: Props) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>();
  const running = useRef(false);
  const enter = useEntrance(problem);

  const ask = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setProblem(undefined);
    try {
      const result = await onLocate();
      if (!result.ok) return setProblem(result.reason);
      await onDone(result.coords).catch(() => setProblem('save'));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, gap: 28 }}>
      <View style={{ gap: 12 }}>
        <Text style={font.display}>Wo bist du{'\n'}zu Hause<Text style={{ color: colors.accent }}>?</Text></Text>
        <Text style={font.body}>Wir zeigen dir Menschen im Umkreis von 25 km.</Text>
      </View>
      <View style={{ gap: 18 }}>
        {PROMISES.map((p) => (
          <View key={p.icon} style={{ flexDirection: 'row', gap: 14 }}>
            <Feather name={p.icon} size={20} color={colors.hint} style={{ marginTop: 2 }} />
            <Text style={[font.body, { flex: 1, color: colors.muted }]}>{p.text}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      {problem && (
        <Animated.View style={[s.hint, { borderLeftColor: problem === 'save' ? colors.error : colors.hint }, enter]} accessibilityLiveRegion="polite">
          <Text style={font.body}>{PROBLEMS[problem]}</Text>
        </Animated.View>
      )}
      {problem === 'blocked' ? (
        <View style={{ gap: 10 }}>
          <Button title="Einstellungen öffnen" icon="settings" onPress={onOpenSettings} />
          <Button title="Ich habe es erlaubt" variant="ghost" busy={busy} onPress={ask} />
        </View>
      ) : (
        <Button
          title={busy ? 'Standort wird bestimmt …' : problem && problem !== 'save' ? 'Nochmal fragen' : 'Standort freigeben'}
          icon="map-pin"
          busy={busy}
          onPress={ask}
        />
      )}
    </View>
  );
}
