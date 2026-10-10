import Feather from '@expo/vector-icons/Feather';
import { Text, View } from 'react-native';
import { MeetupEvent, placeHint, placeShown } from '../domain/events.ts';
import { PlaceLink } from './PlaceLink';
import { colors, font, fontFamily } from './theme';

/** Treffpunkt eines Events, oder solange er verborgen ist nur die Stadt mit einem Hinweis, ab wann man ihn sieht. */
export function EventPlace({ e, joined }: { e: MeetupEvent; joined: boolean }) {
  // Der Server liefert placeHidden; ohne Server (Beispieldaten) gilt dieselbe Regel hier.
  const hidden = e.placeHidden ?? !placeShown(e, joined);
  if (!hidden && e.place) return <PlaceLink place={e.place} address={e.address} />;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Feather name="lock" size={16} color={colors.muted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[font.small, { color: colors.text, fontFamily: fontFamily.semibold }]}>{`Treffpunkt in ${e.city ?? 'Gießen'}`}</Text>
        <Text style={font.small}>{placeHint(e, joined)}</Text>
      </View>
    </View>
  );
}
