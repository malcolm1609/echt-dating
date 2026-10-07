import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../../src/lib/backend';
import { matchStore } from '../../src/lib/matches';
import { Button, Screen, s } from '../../src/ui/kit';
import { colors, font } from '../../src/ui/theme';

export default function Me() {
  const [paused, setPaused] = useState<boolean>();
  const [error, setError] = useState<string>();
  useFocusEffect(
    useCallback(() => {
      backend.isPaused().then(setPaused, () => setError('Dein Profil konnte nicht geladen werden.'));
    }, []),
  );

  const toggle = async () => {
    setError(undefined);
    try {
      await backend.setPaused(!paused);
      setPaused(!paused);
    } catch {
      setError('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    }
  };

  const restartDemo = () => {
    backend.reset?.();
    matchStore.reset();
    router.replace('/');
  };

  return (
    <Screen>
      <Text style={font.display}>Du<Text style={{ color: colors.accent }}>.</Text></Text>
      {paused !== undefined && (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: paused ? colors.muted : '#7BE0A6' }} />
          <Text style={[font.body, { flex: 1 }]}>{paused ? 'Pausiert: du bekommst keine Vorschläge und wirst nicht gezeigt.' : 'Verifiziert und aktiv'}</Text>
        </View>
      )}
      <View style={s.hint}>
        <Text style={font.small}>
          So bleibt Echt echt: Wer 7 Tage nicht reinschaut, wird nicht mehr vorgeschlagen. Nach 14 Tagen wird das Profil pausiert und der Platz geht an die Warteliste.
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {error && <Text style={s.error}>{error}</Text>}
      {paused !== undefined && <Button title={paused ? 'Wieder aktiv werden' : 'Profil pausieren'} variant="ghost" onPress={toggle} />}
      {backend.demo && <Button title="Demo neu starten" variant="ghost" onPress={restartDemo} />}
    </Screen>
  );
}
