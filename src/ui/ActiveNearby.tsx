import { Text, View } from 'react-native';
import { activeNearbyLabel } from '../domain/activeNearby.ts';
import { colors, font } from './theme';

/** Ruhige Zeile statt Live-Zähler; unter der Mindestzahl erscheint nichts. */
export function ActiveNearby({ bucket }: { bucket: number | null | undefined }) {
  if (bucket == null) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D4F' }} />
      <Text style={[font.small, { flex: 1 }]}>{activeNearbyLabel(bucket)}</Text>
    </View>
  );
}
