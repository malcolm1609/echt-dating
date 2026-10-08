import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { mapAppsFor, mapUrl, placeQuery } from '../domain/maps.ts';
import { Chip } from './kit';
import { colors, font, fontFamily } from './theme';

/** Name und Adresse eines Treffpunkts; antippen bietet die Karten-Apps zur Navigation an. */
export function PlaceLink({ place, address }: { place: string; address?: string }) {
  const [open, setOpen] = useState(false);
  const query = placeQuery(place, address);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${place}${address ? `, ${address}` : ''}. Route anzeigen`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        hitSlop={6}
        style={({ pressed }) => ({ flexDirection: 'row', gap: 8, alignItems: 'flex-start', opacity: pressed ? 0.6 : 1 })}
      >
        <Feather name="map-pin" size={16} color={colors.accent} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[font.small, { color: colors.text, fontFamily: fontFamily.semibold }]}>{place}</Text>
          {!!address && <Text style={font.small}>{address}</Text>}
        </View>
        <Text style={[font.small, { color: colors.accent }]}>Route</Text>
      </Pressable>
      {open && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {mapAppsFor(Platform.OS).map((a) => (
            <Chip key={a.id} label={a.label} a11y={`Mit ${a.label} öffnen`} selected={false} onPress={() => { setOpen(false); Linking.openURL(mapUrl(a.id, query)); }} />
          ))}
        </View>
      )}
    </View>
  );
}
