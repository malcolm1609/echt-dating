import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isOriginal, Look, LOOK_STEPS, ORIGINAL, stepLabel, Suggestion, suggestLook } from '../domain/photoLook.ts';
import { photoBrightness } from '../lib/photoLook';
import { Button } from './kit';
import { LookPreview } from './LookPreview';
import { RangeSlider } from './RangeSlider';
import { LockableScrollView } from './ScrollLock';
import { colors, font } from './theme';

const SLIDERS: { key: keyof Look; label: string }[] = [
  { key: 'brightness', label: 'Helligkeit' },
  { key: 'contrast', label: 'Kontrast' },
  { key: 'warmth', label: 'Wärme' },
];

interface Props {
  uri: string;
  busy?: boolean;
  onDone: (look: Look) => void;
  onCancel: () => void;
}

// Nach dem Auswählen: Das Foto bleibt, wie es ist. Wer mag, stellt Helligkeit, Kontrast und Wärme nach.
// Bei deutlich zu dunklen oder zu hellen Fotos macht die App einen Vorschlag, mehr nicht.
export function PhotoAdjuster({ uri, busy, onDone, onCancel }: Props) {
  const [look, setLook] = useState<Look>(ORIGINAL);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    let alive = true;
    photoBrightness(uri)
      .then((luma) => alive && setSuggestion(suggestLook(luma)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uri]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LockableScrollView contentContainerStyle={{ padding: 24, paddingTop: 16, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={font.title}>Dein Foto</Text>
          <Text style={font.small}>So sieht es aus wie auf deinem Handy. Anpassen ist freiwillig, Ort und Aufnahmezeit sind schon entfernt.</Text>
        </View>

        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 340, padding: 8, borderRadius: 6, backgroundColor: colors.print, borderWidth: 1, borderColor: colors.line }}>
          <LookPreview uri={uri} look={look} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 2 }} />
        </View>

        {suggestion && isOriginal(look) && (
          <View style={{ gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.accentSoft }}>
            <Text style={font.body}>{suggestion.text}</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable accessibilityRole="button" onPress={() => setLook(suggestion.look)} hitSlop={8} style={{ minHeight: 36, justifyContent: 'center' }}>
                <Text style={[font.label, { color: colors.accent }]}>{suggestion.action}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setSuggestion(null)} hitSlop={8} style={{ minHeight: 36, justifyContent: 'center' }}>
                <Text style={[font.label, { color: colors.text }]}>Nein, danke</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ gap: 18 }}>
          {SLIDERS.map(({ key, label }) => (
            <View key={key} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[font.label, { color: colors.text }]}>{label}</Text>
                <Text style={font.small}>{stepLabel(look[key])}</Text>
              </View>
              <RangeSlider
                min={-LOOK_STEPS}
                max={LOOK_STEPS}
                origin={0}
                values={[look[key]]}
                onChange={([v]) => setLook((cur) => ({ ...cur, [key]: v }))}
                labels={(v) => `${label} ${stepLabel(v)}`}
              />
            </View>
          ))}
          {!isOriginal(look) && (
            <Pressable accessibilityRole="button" onPress={() => setLook(ORIGINAL)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Text style={[font.small, { color: colors.text }]}>Zurück zum Original</Text>
            </Pressable>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Button title="Foto verwenden" busy={busy} onPress={() => onDone(look)} />
          <Button title="Abbrechen" variant="clear" disabled={busy} onPress={onCancel} />
        </View>
      </LockableScrollView>
    </SafeAreaView>
  );
}
