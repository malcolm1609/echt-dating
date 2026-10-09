import Feather from '@expo/vector-icons/Feather';
import { Image, Linking, Text, View } from 'react-native';
import { clock, DateCheckView, sinceText } from '../domain/dateCheck.ts';
import { Button, s } from './kit';
import { PlaceLink } from './PlaceLink';
import { colors, font, fontFamily } from './theme';

const mapLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Seite für die Vertrauensperson: mit wem, wo und wann, Standort und ob alles okay ist. */
export function TrustedView({ view, now = new Date() }: { view: DateCheckView | null; now?: Date }) {
  if (!view) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={font.title}>Link ungültig</Text>
        <Text style={font.body}>Diesen Date-Check gibt es nicht. Prüf, ob du den ganzen Link geöffnet hast.</Text>
      </View>
    );
  }
  const { name, match, status, location } = view;
  const banner = {
    active: { color: colors.text, icon: 'shield' as const, title: `${name} hat ein Date`, text: `Um ${clock(view.checkAt)} Uhr fragen wir ${name}, ob alles okay ist. Bittet ${name} um Hilfe oder antwortet nicht, bekommst du eine SMS.` },
    overdue: { color: colors.error, icon: 'alert-circle' as const, title: `${name} hat sich nicht gemeldet`, text: `Wir haben um ${clock(view.checkAt)} Uhr gefragt, ob alles okay ist, und keine Antwort bekommen. Ruf ${name} an. Erreichst du niemanden und machst dir Sorgen, ruf die Polizei unter 110.` },
    help: { color: colors.error, icon: 'alert-triangle' as const, title: `${name} bittet um Hilfe`, text: `Ruf ${name} sofort an. Erreichst du niemanden, ruf die Polizei unter 110 und nenn ihr den Standort unten.` },
    ended: { color: colors.text, icon: 'check-circle' as const, title: 'Alles gut', text: `${name} hat den Date-Check beendet. Der Standort ist gelöscht.` },
  }[status];

  return (
    <View style={{ gap: 16 }}>
      <View style={[s.hint, { gap: 8 }, banner.color === colors.error && { borderWidth: 2, borderColor: colors.error }]}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Feather name={banner.icon} size={20} color={banner.color} />
          <Text style={[font.title, { color: banner.color, flex: 1 }]}>{banner.title}</Text>
        </View>
        <Text style={font.body}>{banner.text}</Text>
        {(status === 'help' || status === 'overdue') && <Button title="Notruf 110 anrufen" icon="phone" onPress={() => Linking.openURL('tel:110')} />}
      </View>

      {status !== 'ended' && (
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Standort</Text>
          {location ? (
            <>
              <Text style={font.body}>{`Zuletzt gesehen ${sinceText(location.at, now)}.`}</Text>
              <Button title="Auf der Karte ansehen" variant="ghost" icon="map-pin" onPress={() => Linking.openURL(mapLink(location.lat, location.lng))} />
            </>
          ) : (
            <Text style={font.small}>{`Noch kein Standort. Er erscheint, sobald ${name} die App offen hat und den Standort freigibt.`}</Text>
          )}
        </View>
      )}

      <View style={{ gap: 10 }}>
        <Text style={s.label}>Das Date</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {match.photo && <Image source={{ uri: match.photo }} style={{ width: 56, height: 56, borderRadius: 28 }} accessibilityLabel={`Foto von ${match.name}`} />}
          <Text style={[font.body, { fontFamily: fontFamily.semibold, flex: 1 }]}>{`${name} trifft ${match.name}${match.age ? `, ${match.age}` : ''}`}</Text>
        </View>
        {view.when && <Text style={font.body}>{view.when}</Text>}
        {view.place && <PlaceLink place={view.place} />}
      </View>
      <Text style={font.small}>Diese Seite aktualisiert sich von selbst. Echt ist eine Dating-App, bei der alle Profile mit Ausweis geprüft sind.</Text>
    </View>
  );
}
