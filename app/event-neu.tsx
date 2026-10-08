import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { EVENT_KINDS, EventDraft, seatOptions, validateEvent } from '../src/domain/events.ts';
import { backend } from '../src/lib/backend';
import { useCampus } from '../src/lib/campus';
import { eventStore } from '../src/lib/events';
import { useMatches } from '../src/lib/matches';
import { Button, Chip, Field, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

export default function NewEvent() {
  const matches = useMatches().filter((m) => !m.ended);
  const tonight = useLocalSearchParams<{ heute?: string }>().heute === '1';
  const campus = useCampus();
  const [d, setD] = useState<EventDraft>(
    tonight
      ? { title: '', kind: 'Feiern', place: '', when: 'Heute, 22 Uhr', seats: 6, price: 0, access: 'open', tonight: true }
      : { title: '', kind: EVENT_KINDS[1], place: '', when: '', seats: 10, price: 0, access: 'open' },
  );
  const [priceText, setPriceText] = useState('0');
  const [invite, setInvite] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const errors = validateEvent(d);
  const set = (p: Partial<EventDraft>) => setD({ ...d, ...p });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/treffen'));

  const publish = async () => {
    setTried(true);
    if (Object.keys(errors).length) return;
    const me = await backend.myProfile();
    eventStore.create(d, { name: me.displayName, gender: me.gender }, matches.filter((m) => invite.includes(m.id)).map((m) => m.name));
    back();
  };

  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12}>
        <Text style={{ color: colors.accent, fontSize: 28 }}>‹</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={font.title}>{d.tonight ? 'Heute feiern gehen' : 'Event erstellen'}</Text>
        {d.tonight && <Text style={[font.small, { marginTop: -12 }]}>Eine kleine Runde für heute Abend. Der Plan verschwindet morgen früh von selbst.</Text>}
        <Field label="Name" value={d.title} onChangeText={(title) => set({ title })} placeholder={d.tonight ? 'z. B. Zusammen zur Semesterparty' : 'z. B. Spieleabend im Café'} error={tried ? errors.title : undefined} />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Art</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EVENT_KINDS.map((k) => <Chip key={k} role="radio" label={k} a11y={k} selected={d.kind === k} onPress={() => set({ kind: k })} />)}
          </View>
        </View>
        <Field label={d.tonight ? 'Treffpunkt' : 'Ort'} value={d.place} onChangeText={(place) => set({ place })} placeholder={d.tonight ? 'z. B. Marktplatz, dann zusammen weiter' : 'Bar, Café oder Park'} error={tried ? errors.place : undefined} />
        <Text style={[font.small, { marginTop: -12 }]}>Nur öffentliche Orte, keine Privatwohnung.</Text>
        <Field label="Wann" value={d.when} onChangeText={(when) => set({ when })} placeholder="z. B. Freitag, 19 Uhr" error={tried ? errors.when : undefined} />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Plätze (halb Frauen, halb Männer)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {seatOptions(d.tonight).map((n) => <Chip key={n} role="radio" label={String(n)} a11y={`${n} Plätze`} selected={d.seats === n} onPress={() => set({ seats: n })} />)}
          </View>
        </View>
        {!d.tonight && (
          <Field
            label="Preis in Euro (0 = kostenlos)"
            value={priceText}
            keyboardType="decimal-pad"
            onChangeText={(t) => {
              setPriceText(t);
              set({ price: t.trim() === '' ? NaN : Number(t.replace(',', '.')) });
            }}
            error={tried ? errors.price : undefined}
          />
        )}
        {campus.uni && (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Campus</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip role="radio" label="Alle in der Nähe" a11y="Für alle in der Nähe" selected={!d.campus} onPress={() => set({ campus: undefined })} />
              <Chip role="radio" label={`Nur ${campus.uni}`} a11y={`Nur für Studierende der ${campus.uni}`} selected={d.campus === campus.uni} onPress={() => set({ campus: campus.uni ?? undefined })} />
            </View>
          </View>
        )}
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Wer kann kommen?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip role="radio" label="Offen" a11y="Offen für alle in der Nähe" selected={d.access === 'open'} onPress={() => set({ access: 'open' })} />
            <Chip role="radio" label="Auf Einladung" a11y="Auf Einladung" selected={d.access === 'invite'} onPress={() => set({ access: 'invite' })} />
          </View>
          <Text style={font.small}>
            {d.access === 'open'
              ? 'Alle verifizierten Mitglieder in der Nähe sehen dein Event. Wer passende Interessen hat, bekommt eine Nachricht.'
              : 'Nur Eingeladene können sich anmelden. Freie Plätze kommen später in die offene Liste.'}
          </Text>
          {d.access === 'invite' && matches.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {matches.map((m) => (
                <Chip key={m.id} label={m.name} a11y={`${m.name} einladen`} selected={invite.includes(m.id)} onPress={() => setInvite(invite.includes(m.id) ? invite.filter((x) => x !== m.id) : [...invite, m.id])} />
              ))}
            </View>
          )}
        </View>
        <Button title="Event veröffentlichen" onPress={publish} />
        <Text style={font.small}>Nach dem Event bewerten dich nur die Leute, die wirklich da waren. Bei schlechten Bewertungen kannst du keine Events mehr anlegen.</Text>
      </ScrollView>
    </Screen>
  );
}
