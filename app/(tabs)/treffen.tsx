import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Gender } from '../../src/domain/admission.ts';
import { averageRating, euro, eventPrice, joinState, MeetupEvent, NO_SHOW_LIMIT, seatsLeft } from '../../src/domain/events.ts';
import { backend } from '../../src/lib/backend';
import { eventStore, useEvents } from '../../src/lib/events';
import { useCampus } from '../../src/lib/campus';
import { usePlus } from '../../src/lib/plus';
import { Button, Chip, Screen, s } from '../../src/ui/kit';
import { PlaceLink } from '../../src/ui/PlaceLink';
import { colors, font, fontFamily, shadow } from '../../src/ui/theme';

type Filter = 'alle' | 'heute' | 'campus';
const FILTERS: [Filter, string][] = [['alle', 'Alle'], ['heute', 'Heute Abend'], ['campus', 'Campus']];

function Tag({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <Text style={{ alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontFamily: fontFamily.semibold, fontSize: 12, color: strong ? colors.onAccent : colors.accent, backgroundColor: strong ? colors.accent : colors.accentSoft }}>{label}</Text>
  );
}

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
  const stats = e.host.events === 0 ? 'Erstes Event' : `${rating !== null ? `${String(rating).replace('.', ',')} ★ · ` : ''}${e.host.events} ${e.host.events === 1 ? 'Event' : 'Events'}`;
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
  const campus = useCampus();
  const [filter, setFilter] = useState<Filter>('alle');
  const [gender, setGender] = useState<Gender>('f');
  const [failed, setFailed] = useState<string>();
  useFocusEffect(useCallback(() => {
    backend.myProfile().then((p) => setGender(p.gender), () => {});
    eventStore.refresh();
  }, []));
  const join = (id: string) => {
    setFailed(undefined);
    eventStore.join(id, gender, plus.active, campus.uni).then(() => router.push(`/event/${id}`), () => setFailed(id));
  };
  const toReview = past.filter((p) => !p.review);
  // Spontanes für heute Abend zuerst, Campus-Events nur zeigen, wenn man dazugehört oder danach filtert.
  const shown = events
    .filter((e) => (filter === 'heute' ? e.tonight : filter === 'campus' ? e.campus : true))
    .filter((e) => !e.campus || e.campus === campus.uni || filter === 'campus')
    .sort((a, b) => Number(!!b.tonight) - Number(!!a.tonight));

  return (
    <Screen tabs>
      <Text style={font.display}>Treffen</Text>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        <Text style={font.body}>Kleine Runden mit verifizierten Leuten aus deiner Nähe. Die Plätze sind immer zur Hälfte für Frauen und Männer.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Heute feiern" icon="moon" onPress={() => router.push('/event-neu?heute=1')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Event" variant="ghost" icon="plus" onPress={() => router.push('/event-neu')} />
          </View>
        </View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map(([key, label]) => <Chip key={key} role="radio" label={label} a11y={label} selected={filter === key} onPress={() => setFilter(key)} />)}
        </View>
        {filter === 'campus' && !campus.uni && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/einstellungen')} style={[s.hint, { gap: 4 }]}>
            <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>Studierst du?</Text>
            <Text style={font.small}>Bestätige deine Uni-Mail in den Einstellungen, dann kannst du bei Campus-Events mitmachen ›</Text>
          </Pressable>
        )}
        {shown.length === 0 && <Text style={font.small}>Gerade nichts in dieser Ecke. Leg doch selbst was an.</Text>}

        {toReview.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/rueckblick/${p.id}`)} style={[s.hint, { gap: 4 }]}>
            <Text style={s.label}>{`${p.when} · ${p.title}`}</Text>
            <Text style={font.body}>Wie war’s? Bewerte den Abend und sag, wen du wiedersehen möchtest ›</Text>
          </Pressable>
        ))}

        {shown.map((e) => {
          const state = joinState(e, gender, { joined: mine.has(e.id), plus: plus.active, invited: invited.has(e.id), noShows, campus: campus.uni });
          const price = eventPrice(e, plus.active);
          return (
            <View key={e.id} style={[{ backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 12, borderWidth: state === 'joined' ? 1.5 : 0, borderColor: colors.accent }, shadow]}>
              <View style={{ gap: 4 }}>
                {(e.tonight || e.campus) && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    {e.tonight && <Tag label="Heute Abend" strong />}
                    {e.campus && <Tag label={`Campus · ${e.campus}`} />}
                  </View>
                )}
                <Text style={s.label}>{`${e.kind} · ${e.seats} Leute${e.access === 'invite' ? ' · Auf Einladung' : ''}`}</Text>
                <Text style={font.title}>{e.title}</Text>
                <Text style={font.body}>{e.when}</Text>
              </View>
              <PlaceLink place={e.place} address={e.address} />
              <HostLine e={e} />
              <Seats e={e} />
              <Text style={font.small}>
                {price !== e.price ? `${euro(price)} mit Plus statt ${euro(e.price)}` : euro(price)}
                {state === 'open' && ` · noch ${seatsLeft(e, gender)} ${seatsLeft(e, gender) === 1 ? 'Platz' : 'Plätze'} für dich`}
              </Text>
              {e.invitees?.length ? <Text style={[font.small, { color: colors.hint }]}>{`Eingeladen: ${e.invitees.join(', ')}`}</Text> : null}
              {state === 'open' && e.access === 'invite' && <Text style={[font.small, { color: colors.hint }]}>{`${e.host.name} hat dich eingeladen.`}</Text>}
              {failed === e.id && <Text style={s.error}>Das hat nicht geklappt. Vielleicht war jemand schneller, schau auf die Plätze.</Text>}
              {state === 'open' && <Button title="Platz sichern" onPress={() => join(e.id)} />}
              {state === 'joined' && (
                <>
                  <Text style={[font.body, { color: colors.accent }]}>{e.isHost ? 'Dein Event. Du bist Gastgeber.' : 'Du bist dabei. Wir erinnern dich am Vortag.'}</Text>
                  <Button title="Wer kommt mit? · Gruppenchat" icon="message-circle" onPress={() => router.push(`/event/${e.id}`)} />
                </>
              )}
              {state === 'full' && <Text style={font.small}>Deine Hälfte ist voll. Sobald jemand absagt, rückst du nach.</Text>}
              {state === 'campus_only' && <Text style={font.small}>{`Nur für Studierende der ${e.campus}. Bestätige deine Uni-Mail in den Einstellungen.`}</Text>}
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
