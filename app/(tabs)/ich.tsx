import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../../src/lib/backend';
import { Button, Screen, s } from '../../src/ui/kit';
import { colors, font } from '../../src/ui/theme';

export default function Me() {
  const [paused, setPaused] = useState(false);
  return (
    <Screen>
      <Text style={font.title}>Dein Profil</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: paused ? colors.muted : '#7BE0A6' }} />
        <Text style={font.body}>{paused ? 'Pausiert: du bekommst keine Vorschläge und wirst nicht gezeigt.' : 'Verifiziert und aktiv'}</Text>
      </View>
      <View style={s.hint}>
        <Text style={font.small}>
          So bleibt Echt echt: Wer 7 Tage nicht reinschaut, wird nicht mehr vorgeschlagen. Nach 14 Tagen wird das Profil pausiert und der Platz geht an die Warteliste.
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      <Button title={paused ? 'Wieder aktiv werden' : 'Profil pausieren'} variant="ghost" onPress={() => setPaused((p) => !p)} />
      {backend.demo && <Button title="Demo neu starten" variant="ghost" onPress={() => router.replace('/')} />}
    </Screen>
  );
}
