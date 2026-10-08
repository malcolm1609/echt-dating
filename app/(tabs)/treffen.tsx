import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Gender } from '../../src/domain/admission.ts';
import { averageRating, euro, eventPrice, joinState, MeetupEvent, NO_SHOW_LIMIT, seatsLeft } from '../../src/domain/events.ts';
import { backend } from '../../src/lib/backend';
import { eventStore, useEvents } from '../../src/lib/events';
import { usePlus } from '../../src/lib/plus';
import { Button, Screen, s } from '../../src/ui/kit';
import { colors, font } from '../../src/ui/theme';

function Seats({ e }: { e: MeetupEvent }) {
  const half = Math.floor(e.seats / 2);
  return (
    <View style={{ gap: 6 }}>
      {(['f', 'm'] as const).map((g) => (
        <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[font.small, { width: 64 }]}>{g === 'f' ? 'Frauen' : 'Männer'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: half }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < e.joined[g] ? colors.hint : colors.line }} />
            ))}
          </View>
          <Text style={[font.small, { width: 40, textAlign: 'right' }]}>{`${e.joined[g]}/${half}`}</Text>
        </View>
      ))}
    </View>
  );
}

function HostLine({ e }: { e: MeetupEvent }) {
  const rating = averageRating(e.host);
  const stats = e.host.events === 0 ? 'Erstes Event' : `${rating !== null ? `${String(rating).replace('.', ',')} ★ · ` : ''}${e.host.events} Events`;
  return (
    <View style={{ gap: 4 }}>
      <Text style={font.small}>{`Gastgeber: ${e.host.name} · ${stats}`}</Text>
      {e.host.reviews[0] && <Text style={[font.small, { fontStyle: 'italic' }]}>{`„${e.host.reviews[0]}“`}</Text>}
    </View>
  );
}

export default function Treffen() {
  const { events, past, mine, invited, noShows } = useEvents();
  const plus = usePlus();
  const [gender, setGender] = useState<Gender>('f');
  useFocusEffect(useCallback(() => {
    backend.myProfile().then((p) => setGender(p.gender), () => {});
  }, []));
  const toReview = past.filter((p) => !p.review);

  return (
    <Screen>
      <Text style={font.display}>Treffen<Text style={{ color: colors.accent }}>.</Text></Text>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        <Text style={font.body}>Kleine Runden mit verifizierten Leuten aus deiner Nähe. Die Plätze sind immer zur Hälfte für Frauen und Männer.</Text>
        <Button title="Event erstellen" variant="ghost" icon="plus" onPress={() => router.push('/event-neu')} />

        {toReview.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/rueckblick/${p.id}`)} style={[s.hint, { gap: 4 }]}>
            <Text style={s.label}>{`${p.when} · ${p.title}`}</Text>
            <Text style={font.body}>Wie war’s? Bewerte den Abend und sag, wen du wiedersehen möchtest ›</Text>
          </Pressable>
        ))}

        {events.map((e) => {
          const state = joinState(e, gender, { joined: mine.has(e.id), plus: plus.active, invited: invited.has(e.id), noShows });
          const price = eventPrice(e, plus.active);
          return (
            <View key={e.id} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 12, borderWidth: state === 'joined' ? 1 : 0, borderColor: colors.accent }}>
              <View style={{ gap: 4 }}>
                <Text style={s.label}>{`${e.kind} · ${e.seats} Leute${e.access === 'invite' ? ' · Auf Einladung' : ''}`}</Text>
                <Text style={font.title}>{e.title}</Text>
                <Text style={font.body}>{e.when}</Text>
                <Text style={font.small}>{e.place}</Text>
              </View>
              <HostLine e={e} />
              <Seats e={e} />
              <Text style={font.small}>
                {price !== e.price ? `${euro(price)} mit Plus statt ${euro(e.price)}` : euro(price)}
                {state === 'open' && ` · noch ${seatsLeft(e, gender)} ${seatsLeft(e, gender) === 1 ? 'Platz' : 'Plätze'} für dich`}
              </Text>
              {e.invitees?.length ? <Text style={[font.small, { color: colors.hint }]}>{`Eingeladen: ${e.invitees.join(', ')}`}</Text> : null}
              {state === 'open' && e.access === 'invite' && <Text style={[font.small, { color: colors.hint }]}>{`${e.host.name} hat dich eingeladen.`}</Text>}
              {state === 'open' && <Button title="Platz sichern" onPress={() => eventStore.join(e.id, gender, plus.active)} />}
              {state === 'joined' && (
                <>
                  <Text style={[font.body, { color: colors.accent }]}>Du bist dabei. Wir erinnern dich am Vortag.</Text>
                  <Button title="Doch absagen" variant="ghost" onPress={() => eventStore.leave(e.id, gender)} />
                </>
              )}
              {state === 'full' && <Text style={font.small}>Deine Hälfte ist voll. Sobald jemand absagt, rückst du nach.</Text>}
              {state === 'invite_only' && <Text style={font.small}>Nur auf Einladung. Freie Plätze kommen später in die offene Liste.</Text>}
              {state === 'blocked' && <Text style={font.small}>{`Du hast ${NO_SHOW_LIMIT}-mal ohne Absage gefehlt und kannst eine Woche lang nicht buchen.`}</Text>}
              {state === 'plus_first' && <Button title="Morgen für alle · jetzt mit Plus" variant="ghost" icon="star" onPress={() => router.push('/plus')} />}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
